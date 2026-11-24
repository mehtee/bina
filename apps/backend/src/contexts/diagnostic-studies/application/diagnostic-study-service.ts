import { randomUUID } from "node:crypto";
import { authorizeStaffAction, type StaffPrincipal } from "../../../packages/authz/index.js";
import { computeFinalUrgencyTier, Pillar2UrgentFloorEvaluator } from "../../../packages/clinical-rules/index.js";
import { insertOutboxEvent, type DbTx } from "../../../packages/db/index.js";
import {
  asJobId,
  asPatientId,
  asStudyId,
  asTenantId,
  formatLateralityFa,
  URGENCY_LABELS_FA,
  type DiagnosticInferenceGatewayPort,
  type StudyLaterality,
  type UrgencyTier,
} from "../../../packages/domain-kernel/index.js";
import type { AuditLogPort } from "../../audit-compliance/ports/index.js";
import type { PersianReportGeneratorPort } from "../../ai-copilot/ports/index.js";
import { formatJalaliDate } from "../../tenancy/index.js";
import type { TriageCaseCreatorPort } from "../../triage-operations/ports/index.js";
import type {
  ClinicianSignoffView,
  DiagnosticStudyDetailView,
  DiagnosticStudyRepoPort,
  ExplainabilityView,
  FusionResultView,
  PatientSignedDiagnosticSummary,
  PersianReportDraftView,
  QcDecisionView,
  SignoffAction,
  SpecialistOutputView,
  StudyAssetSubmission,
} from "../ports/index.js";

export class DiagnosticStudyError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    messageFa: string
  ) {
    super(messageFa);
    this.name = "DiagnosticStudyError";
  }
}

export class DiagnosticStudyService {
  private readonly urgentFloorEvaluator = new Pillar2UrgentFloorEvaluator();

  constructor(
    private readonly repo: DiagnosticStudyRepoPort,
    private readonly aiGateway: DiagnosticInferenceGatewayPort,
    private readonly triageCreator: TriageCaseCreatorPort,
    private readonly auditLog: AuditLogPort,
    private readonly reportGenerator?: PersianReportGeneratorPort | undefined
  ) {}

  async submitStudy(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      patientId: string;
      eyeLaterality: StudyLaterality;
      assets: StudyAssetSubmission[];
      labs?: Record<string, unknown> | undefined;
    }
  ): Promise<DiagnosticStudyDetailView> {
    const decision = authorizeStaffAction(principal, "study:upload", principal.tenantId);
    if (!decision.allowed) {
      throw new DiagnosticStudyError(403, decision.code, decision.reasonFa);
    }
    if (input.assets.length === 0) {
      throw new DiagnosticStudyError(400, "NO_STUDY_ASSETS", "حداقل یک تصویر یا فایل معاینه الزامی است.");
    }

    const studyId = randomUUID();
    const jobId = randomUUID();

    await this.repo.createStudyWithAssetsAndJob(tx, {
      studyId,
      jobId,
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      patientId: input.patientId,
      eyeLaterality: input.eyeLaterality,
      engineMode: "cpu_stub",
      assets: input.assets,
      labs: input.labs,
    });

    await insertOutboxEvent(tx, {
      tenantId: principal.tenantId,
      eventType: "diagnostic.study-submitted.v1",
      correlationId: studyId,
      idempotencyKey: `study:${studyId}:submitted`,
      payload: {
        studyId,
        jobId,
        patientId: input.patientId,
        clinicId: principal.clinicId,
        eyeLaterality: input.eyeLaterality,
        assetCount: input.assets.length,
      },
    });

    const receipt = await this.aiGateway.submitStudyAnalysis({
      studyId: asStudyId(studyId),
      jobId: asJobId(jobId),
      tenantId: asTenantId(principal.tenantId),
      eyeLaterality: input.eyeLaterality,
      assets: input.assets as unknown as Record<string, unknown>[],
      labs: input.labs,
    });

    const aiResult = await this.aiGateway.getJobResult(receipt.jobId);
    const payload = aiResult.payload;
    const qcDecisions = (payload.qcDecisions ?? []) as QcDecisionView[];

    if (aiResult.status === "qc_failed") {
      await this.repo.markQcFailed(tx, studyId, jobId, qcDecisions);
      const firstFailed = qcDecisions.find((q) => !q.passed) ?? qcDecisions[0];
      if (firstFailed) {
        await insertOutboxEvent(tx, {
          tenantId: principal.tenantId,
          eventType: "diagnostic.qc-rejected.v1",
          correlationId: studyId,
          idempotencyKey: `study:${studyId}:qc-reject`,
          payload: {
            studyId,
            jobId,
            assetId: firstFailed.assetId,
            rejectionCodes: firstFailed.rejectionCodes.length > 0 ? firstFailed.rejectionCodes : ["blur"],
            rejectionReasonsFa:
              firstFailed.rejectionReasonsFa.length > 0
                ? firstFailed.rejectionReasonsFa
                : ["کیفیت تصویر ناکافی است"],
          },
        });
      }
      const failedView = await this.repo.getStudyDetail(tx, studyId);
      return failedView!;
    }

    const specialistOutputs = (payload.specialistOutputs ?? []) as SpecialistOutputView[];
    const rawFusion = payload.fusionResult as Omit<FusionResultView, "rawUrgency">;
    const explainability = (payload.explainability ?? {
      primarySegmentationMasks: [],
      auxiliaryGradCams: [],
    }) as ExplainabilityView;

    // Apply deterministic Pillar 2 Urgent Floor (cannot be downgraded by AI smoothing!)
    const urgentSignals = this.urgentFloorEvaluator.evaluate({
      patientId: asPatientId(input.patientId),
      eyeLaterality: rawFusion.eyeLaterality,
      specialistFindings: specialistOutputs.map((s) => ({ probabilities: s.probabilities })),
      clinicalContext: { differential: rawFusion.differential },
    });

    const rawUrgency: UrgencyTier = rawFusion.recommendedUrgency;
    const finalUrgency: UrgencyTier = computeFinalUrgencyTier(rawUrgency, urgentSignals);
    const fusionResult: FusionResultView = {
      ...rawFusion,
      rawUrgency,
      recommendedUrgency: finalUrgency,
      recommendedUrgencyLabelFa: URGENCY_LABELS_FA[finalUrgency],
    };

    const eyeFa = formatLateralityFa(fusionResult.eyeLaterality);
    const evidenceIds = [
      ...specialistOutputs.map((s) => `spec:${s.specialistId}`),
      ...fusionResult.differential.map((d) => `diff:${d.conditionCode}`),
    ];

    let reportDraft: PersianReportDraftView;
    if (this.reportGenerator) {
      const generated = await this.reportGenerator.generateReportDraft({
        studyId,
        eyeLaterality: fusionResult.eyeLaterality,
        finalUrgency,
        availableModalities: fusionResult.availableModalities,
        missingModalities: fusionResult.missingModalities,
        missingModalityNoticeFa: fusionResult.missingModalityNoticeFa,
        specialists: specialistOutputs.map((s) => ({
          specialistId: s.specialistId,
          eyeLaterality: s.eyeLaterality,
          probabilities: s.probabilities,
          biomarkers: s.biomarkers,
          summaryFa: s.summaryFa,
        })),
        differential: fusionResult.differential.map((d) => ({
          conditionCode: d.conditionCode,
          conditionNameFa: d.conditionNameFa,
          confidence: d.confidence,
          severity: d.severity,
        })),
        discordanceFlagsFa: fusionResult.discordanceFlagsFa,
        allowedEvidenceIds: evidenceIds,
      });
      reportDraft = {
        modelProvider: generated.modelProvider,
        modelId: generated.modelId,
        titleFa: generated.draft.titleFa,
        modalityFindingsFa: generated.draft.modalityFindingsFa,
        differentialSummaryFa: generated.draft.differentialSummaryFa,
        crossModalCorrelationFa: generated.draft.crossModalCorrelationFa,
        followUpPlanFa: generated.draft.followUpPlanFa,
        urgencyTier: generated.draft.urgencyTier,
        urgencyLabelFa: generated.draft.urgencyLabelFa,
        evidenceIds: generated.draft.evidenceIds,
        validationPassed: !generated.usedFallback,
      };
    } else {
      reportDraft = {
        modelProvider: "deterministic_template",
        modelId: "bina-wave1-template-v1",
        titleFa: `پیش‌نویس گزارش بالینی چندوجهی چشم‌پزشکی — ${eyeFa}`,
        modalityFindingsFa: specialistOutputs.map((s) => s.summaryFa).join(" "),
        differentialSummaryFa: fusionResult.differential
          .map((d) => `${d.conditionNameFa} (اطمینان ${Math.round(d.confidence * 100)}٪)`)
          .join("؛ "),
        crossModalCorrelationFa:
          fusionResult.discordanceFlagsFa.length > 0
            ? fusionResult.discordanceFlagsFa.join(" ")
            : fusionResult.missingModalityNoticeFa,
        followUpPlanFa: `سطح اولویت پیشنهادی: ${URGENCY_LABELS_FA[finalUrgency]} (نیازمند تایید نهایی چشم‌پزشک).`,
        urgencyTier: finalUrgency,
        urgencyLabelFa: URGENCY_LABELS_FA[finalUrgency],
        evidenceIds,
        validationPassed: true,
      };
    }

    await this.repo.persistAnalysisAndDraft(tx, {
      tenantId: principal.tenantId,
      studyId,
      jobId,
      qcDecisions,
      specialistOutputs,
      fusionResult,
      explainability,
      reportDraft,
    });

    await insertOutboxEvent(tx, {
      tenantId: principal.tenantId,
      eventType: "diagnostic.analysis-completed.v1",
      correlationId: studyId,
      idempotencyKey: `study:${studyId}:analyzed`,
      payload: {
        studyId,
        jobId,
        engineMode: receipt.engineMode,
        recommendedUrgency: finalUrgency,
        specialistsExecuted: specialistOutputs.map((s) => s.specialistId),
      },
    });

    if (finalUrgency === "urgent") {
      const triageCase = await this.triageCreator.createOrEscalateCase(tx, {
        tenantId: principal.tenantId,
        clinicId: principal.clinicId,
        patientId: input.patientId,
        sourcePillar: "pillar2_diagnostic",
        sourceRefId: studyId,
        eyeLaterality: input.eyeLaterality,
        urgencyTier: "urgent",
        ruleCode: urgentSignals[0]?.ruleCode ?? "PILLAR2_URGENT_FINDING",
        summaryFa:
          urgentSignals[0]?.summaryFa ??
          `یافته فوری در مطالعه تشخیصی ${eyeFa}: ${fusionResult.differential[0]?.conditionNameFa ?? ""}`,
      });

      await insertOutboxEvent(tx, {
        tenantId: principal.tenantId,
        eventType: "triage.urgent-triggered.v1",
        correlationId: studyId,
        idempotencyKey: `study:${studyId}:urgent-triage`,
        payload: {
          caseId: triageCase.id,
          patientId: input.patientId,
          sourcePillar: "pillar2_diagnostic",
          eyeLaterality: input.eyeLaterality,
          urgencyTier: "urgent",
          ruleCode: urgentSignals[0]?.ruleCode ?? "PILLAR2_URGENT_FINDING",
        },
      });
    }

    const view = await this.repo.getStudyDetail(tx, studyId);
    return view!;
  }

  async getStudy(tx: DbTx, studyId: string): Promise<DiagnosticStudyDetailView> {
    const study = await this.repo.getStudyDetail(tx, studyId);
    if (!study) {
      throw new DiagnosticStudyError(404, "STUDY_NOT_FOUND", "مطالعه تشخیصی یافت نشد.");
    }
    return study;
  }

  async signOffStudy(
    tx: DbTx,
    principal: StaffPrincipal,
    studyId: string,
    input: {
      action: SignoffAction;
      finalUrgency: UrgencyTier;
      finalReportTextFa: string;
      overrideReasonFa?: string | undefined;
    },
    now: Date = new Date()
  ): Promise<ClinicianSignoffView> {
    const decision = authorizeStaffAction(principal, "diagnostic:signoff", principal.tenantId);
    if (!decision.allowed) {
      throw new DiagnosticStudyError(403, decision.code, decision.reasonFa);
    }

    const study = await this.repo.getStudyDetail(tx, studyId);
    if (!study) {
      throw new DiagnosticStudyError(404, "STUDY_NOT_FOUND", "مطالعه تشخیصی یافت نشد.");
    }
    if (study.status === "qc_failed") {
      throw new DiagnosticStudyError(400, "CANNOT_SIGNOFF_QC_FAILED", "مطالعه ردشده در کنترل کیفیت قابل امضا نیست.");
    }
    if (input.action !== "approved" && (!input.overrideReasonFa || input.overrideReasonFa.trim().length < 5)) {
      throw new DiagnosticStudyError(400, "OVERRIDE_REASON_REQUIRED", "در صورت ویرایش یا رد خروجی، ثبت دلیل پزشک الزامی است.");
    }

    const signoff = await this.repo.saveSignoff(tx, {
      tenantId: principal.tenantId,
      studyId,
      ophthalmologistId: principal.userId,
      action: input.action,
      finalDifferential: study.fusionResult?.differential ?? [],
      finalUrgency: input.finalUrgency,
      finalReportTextFa: input.finalReportTextFa,
      overrideReasonFa: input.overrideReasonFa,
      signedAt: now,
    });

    if (input.finalUrgency === "urgent") {
      await this.triageCreator.createOrEscalateCase(tx, {
        tenantId: principal.tenantId,
        clinicId: principal.clinicId,
        patientId: study.patientId,
        sourcePillar: "pillar2_diagnostic",
        sourceRefId: studyId,
        eyeLaterality: study.eyeLaterality,
        urgencyTier: "urgent",
        ruleCode: "HITL_OPHTHALMOLOGIST_URGENT_SIGNOFF",
        summaryFa: `ارجاع فوری تاییدشده توسط چشم‌پزشک: ${input.overrideReasonFa ?? input.finalReportTextFa.slice(0, 80)}`,
        now,
      });
    }

    await insertOutboxEvent(tx, {
      tenantId: principal.tenantId,
      eventType: "diagnostic.clinician-signed-off.v1",
      correlationId: studyId,
      idempotencyKey: `signoff:${signoff.signoffId}`,
      payload: {
        signoffId: signoff.signoffId,
        studyId,
        ophthalmologistId: principal.userId,
        action: input.action,
        finalUrgency: input.finalUrgency,
        signedAt: signoff.signedAtIso,
      },
    });

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "diagnostic_study_signed_off",
      resourceType: "diagnostic_study",
      resourceId: studyId,
      reasonFa: input.overrideReasonFa,
      metadata: { signoffId: signoff.signoffId, action: input.action, finalUrgency: input.finalUrgency },
    });

    return signoff;
  }

  async listPatientSignedSummaries(
    tx: DbTx,
    patientId: string
  ): Promise<PatientSignedDiagnosticSummary[]> {
    const rows = await this.repo.listSignedPatientSummaries(tx, patientId);
    return rows.map((r) => {
      const nextStepFa =
        r.finalUrgency === "urgent"
          ? "فوراً با پذیرش یا خط اورژانس کلینیک تماس بگیرید و جهت ویزیت حضوری اقدام کنید."
          : r.finalUrgency === "followup_3_6m"
            ? "هماهنگی نوبت معاینه پیگیری طی ۳ تا ۶ ماه آینده با کلینیک."
            : "ادامه پیگیری روتین طبق برنامه پزشک.";

      return {
        studyId: r.studyId,
        signedAtJalali: formatJalaliDate(r.signedAt),
        eyeLabelFa: formatLateralityFa(r.eyeLaterality),
        urgencyTier: r.finalUrgency,
        urgencyLabelFa: URGENCY_LABELS_FA[r.finalUrgency],
        patientGuidanceFa: r.finalReportTextFa,
        nextStepFa,
      };
    });
  }
}
