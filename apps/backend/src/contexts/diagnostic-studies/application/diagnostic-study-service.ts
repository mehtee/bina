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
import {
  validatePersianClinicalReport,
  type EvidencePacketInput,
  type ValidatedPersianReportDraft,
} from "../../ai-copilot/index.js";
import type { PersianReportGeneratorPort } from "../../ai-copilot/ports/index.js";
import type { AuditLogPort } from "../../audit-compliance/ports/index.js";
import { formatJalaliDate } from "../../tenancy/index.js";
import type { TriageCaseCreatorPort } from "../../triage-operations/ports/index.js";
import type {
  ClinicianFeedbackAgreement,
  ClinicianFeedbackLayer,
  ClinicianFeedbackRecord,
  ClinicianSignoffView,
  DiagnosticStudyDetailView,
  DiagnosticStudyRepoPort,
  DiagnosticStudyWorklistItem,
  DiagnosticWorklistFilter,
  ExplainabilityView,
  FusionResultView,
  PatientSignedDiagnosticSummary,
  PersianReportDraftView,
  QcDecisionView,
  SignoffAction,
  SpecialistOutputView,
  StudyAssetSubmission,
  StudyComparisonView,
  StudyInferenceJobRecord,
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

  private async runPipelineForJob(
    tx: DbTx,
    principal: StaffPrincipal,
    params: {
      studyId: string;
      jobId: string;
      patientId: string;
      eyeLaterality: StudyLaterality;
      assetsForInference: StudyAssetSubmission[];
      labs?: Record<string, unknown> | undefined;
    }
  ): Promise<void> {
    const receipt = await this.aiGateway.submitStudyAnalysis({
      studyId: asStudyId(params.studyId),
      jobId: asJobId(params.jobId),
      tenantId: asTenantId(principal.tenantId),
      eyeLaterality: params.eyeLaterality,
      assets: params.assetsForInference as unknown as Record<string, unknown>[],
      labs: params.labs,
    });

    const aiResult = await this.aiGateway.getJobResult(receipt.jobId);
    const payload = aiResult.payload;
    const qcDecisions = (payload.qcDecisions ?? []) as QcDecisionView[];

    if (aiResult.status === "qc_failed") {
      await this.repo.markQcFailed(tx, params.studyId, params.jobId, qcDecisions);
      const firstFailed = qcDecisions.find((q) => !q.passed) ?? qcDecisions[0];
      if (firstFailed) {
        await insertOutboxEvent(tx, {
          tenantId: principal.tenantId,
          eventType: "diagnostic.qc-rejected.v1",
          correlationId: params.studyId,
          idempotencyKey: `study:${params.studyId}:job:${params.jobId}:qc-reject`,
          payload: {
            studyId: params.studyId,
            jobId: params.jobId,
            assetId: firstFailed.assetId,
            rejectionCodes: firstFailed.rejectionCodes.length > 0 ? firstFailed.rejectionCodes : ["blur"],
            rejectionReasonsFa:
              firstFailed.rejectionReasonsFa.length > 0
                ? firstFailed.rejectionReasonsFa
                : ["کیفیت تصویر ناکافی است"],
          },
        });
      }
      return;
    }

    const specialistOutputs = (payload.specialistOutputs ?? []) as SpecialistOutputView[];
    const rawFusion = payload.fusionResult as Omit<FusionResultView, "rawUrgency">;
    const explainability = (payload.explainability ?? {
      primarySegmentationMasks: [],
      auxiliaryGradCams: [],
    }) as ExplainabilityView;

    // Apply deterministic Pillar 2 Urgent Floor (cannot be downgraded by AI smoothing!)
    const urgentSignals = this.urgentFloorEvaluator.evaluate({
      patientId: asPatientId(params.patientId),
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
        studyId: params.studyId,
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
      studyId: params.studyId,
      jobId: params.jobId,
      qcDecisions,
      specialistOutputs,
      fusionResult,
      explainability,
      reportDraft,
    });

    await insertOutboxEvent(tx, {
      tenantId: principal.tenantId,
      eventType: "diagnostic.analysis-completed.v1",
      correlationId: params.studyId,
      idempotencyKey: `study:${params.studyId}:job:${params.jobId}:analyzed`,
      payload: {
        studyId: params.studyId,
        jobId: params.jobId,
        engineMode: receipt.engineMode,
        recommendedUrgency: finalUrgency,
        specialistsExecuted: specialistOutputs.map((s) => s.specialistId),
      },
    });

    if (finalUrgency === "urgent") {
      const triageCase = await this.triageCreator.createOrEscalateCase(tx, {
        tenantId: principal.tenantId,
        clinicId: principal.clinicId,
        patientId: params.patientId,
        sourcePillar: "pillar2_diagnostic",
        sourceRefId: params.studyId,
        eyeLaterality: params.eyeLaterality,
        urgencyTier: "urgent",
        ruleCode: urgentSignals[0]?.ruleCode ?? "PILLAR2_URGENT_FINDING",
        summaryFa:
          urgentSignals[0]?.summaryFa ??
          `یافته فوری در مطالعه تشخیصی ${eyeFa}: ${fusionResult.differential[0]?.conditionNameFa ?? ""}`,
      });

      await insertOutboxEvent(tx, {
        tenantId: principal.tenantId,
        eventType: "triage.urgent-triggered.v1",
        correlationId: params.studyId,
        idempotencyKey: `study:${params.studyId}:job:${params.jobId}:urgent-triage`,
        payload: {
          caseId: triageCase.id,
          patientId: params.patientId,
          sourcePillar: "pillar2_diagnostic",
          eyeLaterality: params.eyeLaterality,
          urgencyTier: "urgent",
          ruleCode: urgentSignals[0]?.ruleCode ?? "PILLAR2_URGENT_FINDING",
        },
      });
    }
  }

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

    await this.runPipelineForJob(tx, principal, {
      studyId,
      jobId,
      patientId: input.patientId,
      eyeLaterality: input.eyeLaterality,
      assetsForInference: input.assets,
      labs: input.labs,
    });

    const view = await this.repo.getStudyDetail(tx, studyId);
    return view!;
  }

  async addRecaptureAssetsAndReanalyze(
    tx: DbTx,
    principal: StaffPrincipal,
    studyId: string,
    input: {
      assets: StudyAssetSubmission[];
    }
  ): Promise<DiagnosticStudyDetailView> {
    const decision = authorizeStaffAction(principal, "study:upload", principal.tenantId);
    if (!decision.allowed) {
      throw new DiagnosticStudyError(403, decision.code, decision.reasonFa);
    }
    if (input.assets.length === 0) {
      throw new DiagnosticStudyError(400, "NO_STUDY_ASSETS", "حداقل یک تصویر جایگزین الزامی است.");
    }

    const study = await this.repo.getStudyDetail(tx, studyId);
    if (!study) {
      throw new DiagnosticStudyError(404, "STUDY_NOT_FOUND", "مطالعه تشخیصی یافت نشد.");
    }
    if (study.status === "signed_off") {
      throw new DiagnosticStudyError(409, "STUDY_ALREADY_SIGNED", "مطالعه امضاشده قابل بازتحلیل با تصویر جدید نیست.");
    }

    const jobId = randomUUID();
    await this.repo.appendAssetsAndJob(tx, {
      tenantId: principal.tenantId,
      studyId,
      jobId,
      engineMode: "cpu_stub",
      assets: input.assets,
    });

    // Retain previously QC-passed assets so multi-modality context stays intact without overwriting rejected rows
    const retainedPassedAssets: StudyAssetSubmission[] = (study.assets ?? [])
      .filter((a) => a.qcStatus === "pass")
      .map((a) => ({
        assetId: a.assetId,
        s3ObjectKey: a.s3ObjectKey,
        declaredModality: a.declaredModality,
        declaredEye: a.declaredEye,
      }));

    await this.runPipelineForJob(tx, principal, {
      studyId,
      jobId,
      patientId: study.patientId,
      eyeLaterality: study.eyeLaterality,
      assetsForInference: [...retainedPassedAssets, ...input.assets],
      labs: study.labs ?? undefined,
    });

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "diagnostic_study_recaptured",
      resourceType: "diagnostic_study",
      resourceId: studyId,
      metadata: {
        jobId,
        newAssetCount: input.assets.length,
        newAssetIds: input.assets.map((a) => a.assetId),
      },
    });

    const updated = await this.repo.getStudyDetail(tx, studyId);
    return updated!;
  }

  async listStudies(
    tx: DbTx,
    principal: StaffPrincipal,
    filter: DiagnosticWorklistFilter
  ): Promise<{ items: DiagnosticStudyWorklistItem[]; total: number }> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new DiagnosticStudyError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listStudies(tx, {
      ...filter,
      clinicId: filter.clinicId ?? principal.clinicId,
      limit: Math.min(100, Math.max(1, filter.limit)),
      offset: Math.max(0, filter.offset),
    });
  }

  async getStudy(tx: DbTx, studyId: string): Promise<DiagnosticStudyDetailView> {
    const study = await this.repo.getStudyDetail(tx, studyId);
    if (!study) {
      throw new DiagnosticStudyError(404, "STUDY_NOT_FOUND", "مطالعه تشخیصی یافت نشد.");
    }
    return study;
  }

  async listStudyJobs(
    tx: DbTx,
    principal: StaffPrincipal,
    studyId: string
  ): Promise<StudyInferenceJobRecord[]> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new DiagnosticStudyError(403, decision.code, decision.reasonFa);
    }
    const study = await this.repo.getStudyDetail(tx, studyId);
    if (!study) {
      throw new DiagnosticStudyError(404, "STUDY_NOT_FOUND", "مطالعه تشخیصی یافت نشد.");
    }
    return this.repo.listStudyJobs(tx, studyId);
  }

  async saveEditedReportDraft(
    tx: DbTx,
    principal: StaffPrincipal,
    studyId: string,
    input: {
      expectedDraftVersion: number;
      titleFa: string;
      modalityFindingsFa: string;
      differentialSummaryFa: string;
      crossModalCorrelationFa: string;
      followUpPlanFa: string;
      urgencyTier: UrgencyTier;
      evidenceIds?: string[] | undefined;
    }
  ): Promise<PersianReportDraftView> {
    const decision = authorizeStaffAction(principal, "diagnostic:signoff", principal.tenantId);
    if (!decision.allowed) {
      throw new DiagnosticStudyError(403, decision.code, decision.reasonFa);
    }

    const study = await this.repo.getStudyDetail(tx, studyId);
    if (!study) {
      throw new DiagnosticStudyError(404, "STUDY_NOT_FOUND", "مطالعه تشخیصی یافت نشد.");
    }
    if (study.status === "qc_failed") {
      throw new DiagnosticStudyError(400, "CANNOT_EDIT_QC_FAILED", "پیش‌نویس مطالعه ردشده در کنترل کیفیت قابل ویرایش نیست.");
    }
    if (study.status === "signed_off") {
      throw new DiagnosticStudyError(409, "STUDY_ALREADY_SIGNED", "گزارش پس از امضای نهایی قابل ویرایش نیست.");
    }

    const currentVersion = study.persianReportDraft?.draftVersion ?? 1;
    if (currentVersion !== input.expectedDraftVersion) {
      throw new DiagnosticStudyError(
        409,
        "DRAFT_VERSION_CONFLICT",
        "نسخه پیش‌نویس گزارش تغییر کرده است؛ لطفاً صفحه را تازه‌سازی کنید."
      );
    }

    const fusion = study.fusionResult;
    const allowedEvidenceIds =
      study.persianReportDraft?.evidenceIds && study.persianReportDraft.evidenceIds.length > 0
        ? study.persianReportDraft.evidenceIds
        : [
            ...study.specialistOutputs.map((s) => `spec:${s.specialistId}`),
            ...(fusion?.differential.map((d) => `diff:${d.conditionCode}`) ?? []),
          ];

    const candidateDraft: ValidatedPersianReportDraft = {
      titleFa: input.titleFa.trim(),
      modalityFindingsFa: input.modalityFindingsFa.trim(),
      differentialSummaryFa: input.differentialSummaryFa.trim(),
      crossModalCorrelationFa: input.crossModalCorrelationFa.trim(),
      followUpPlanFa: input.followUpPlanFa.trim(),
      urgencyTier: input.urgencyTier,
      urgencyLabelFa: URGENCY_LABELS_FA[input.urgencyTier],
      evidenceIds: input.evidenceIds && input.evidenceIds.length > 0 ? input.evidenceIds : allowedEvidenceIds,
    };

    const packet: EvidencePacketInput = {
      studyId: study.studyId,
      eyeLaterality: fusion?.eyeLaterality ?? study.eyeLaterality,
      finalUrgency: fusion?.recommendedUrgency ?? "routine",
      availableModalities: fusion?.availableModalities ?? [],
      missingModalities: fusion?.missingModalities ?? [],
      missingModalityNoticeFa: fusion?.missingModalityNoticeFa ?? "",
      specialists: study.specialistOutputs.map((s) => ({
        specialistId: s.specialistId,
        eyeLaterality: s.eyeLaterality,
        probabilities: s.probabilities,
        biomarkers: s.biomarkers,
        summaryFa: s.summaryFa,
      })),
      differential: (fusion?.differential ?? []).map((d) => ({
        conditionCode: d.conditionCode,
        conditionNameFa: d.conditionNameFa,
        confidence: d.confidence,
        severity: d.severity,
      })),
      discordanceFlagsFa: fusion?.discordanceFlagsFa ?? [],
      allowedEvidenceIds,
    };

    const safety = validatePersianClinicalReport(candidateDraft, packet);
    if (!safety.valid) {
      throw new DiagnosticStudyError(
        422,
        "REPORT_DRAFT_VALIDATION_FAILED",
        `پیش‌نویس گزارش با قواعد ایمنی بالینی سازگار نیست: ${safety.errors.join(" | ")}`
      );
    }

    const updated = await this.repo.updateReportDraftVersioned(tx, {
      studyId,
      expectedDraftVersion: input.expectedDraftVersion,
      editedByUserId: principal.userId,
      reportDraft: {
        modelProvider: study.persianReportDraft?.modelProvider ?? "clinician_editor",
        modelId: study.persianReportDraft?.modelId ?? "hitl-editor",
        ...candidateDraft,
        validationPassed: true,
      },
    });
    if (!updated) {
      throw new DiagnosticStudyError(
        409,
        "DRAFT_VERSION_CONFLICT",
        "نسخه پیش‌نویس گزارش تغییر کرده است؛ لطفاً صفحه را تازه‌سازی کنید."
      );
    }

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "diagnostic_report_draft_updated",
      resourceType: "diagnostic_study",
      resourceId: studyId,
      metadata: { draftVersion: updated.draftVersion, urgencyTier: updated.urgencyTier },
    });

    return updated;
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
      expectedDraftVersion?: number | undefined;
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
    if (
      input.expectedDraftVersion !== undefined &&
      study.persianReportDraft &&
      (study.persianReportDraft.draftVersion ?? 1) !== input.expectedDraftVersion
    ) {
      throw new DiagnosticStudyError(
        409,
        "DRAFT_VERSION_CONFLICT",
        "نسخه پیش‌نویس گزارش تغییر کرده است؛ لطفاً صفحه را تازه‌سازی کنید."
      );
    }

    // Re-evaluate deterministic Pillar 2 Urgent Floor and block illegal downgrades
    const urgentSignals = study.fusionResult
      ? this.urgentFloorEvaluator.evaluate({
          patientId: asPatientId(study.patientId),
          eyeLaterality: study.fusionResult.eyeLaterality,
          specialistFindings: study.specialistOutputs.map((s) => ({ probabilities: s.probabilities })),
          clinicalContext: { differential: study.fusionResult.differential },
        })
      : [];
    const floorActive =
      Boolean(study.urgentFloorActive) ||
      urgentSignals.length > 0 ||
      Boolean(study.fusionResult && study.fusionResult.recommendedUrgency === "urgent" && study.fusionResult.rawUrgency !== "urgent");
    if (floorActive && input.finalUrgency !== "urgent") {
      throw new DiagnosticStudyError(
        422,
        "URGENT_FLOOR_DOWNGRADE_FORBIDDEN",
        "کاهش سطح فوریت زیر حد اضطراری قطعی مجاز نیست."
      );
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

  async createFeedback(
    tx: DbTx,
    principal: StaffPrincipal,
    studyId: string,
    input: {
      targetLayer: ClinicianFeedbackLayer;
      agreementState: ClinicianFeedbackAgreement;
      correctedLabelCode?: string | undefined;
      noteFa: string;
    }
  ): Promise<ClinicianFeedbackRecord> {
    const decision = authorizeStaffAction(principal, "diagnostic:signoff", principal.tenantId);
    if (!decision.allowed) {
      throw new DiagnosticStudyError(403, decision.code, decision.reasonFa);
    }
    const study = await this.repo.getStudyDetail(tx, studyId);
    if (!study) {
      throw new DiagnosticStudyError(404, "STUDY_NOT_FOUND", "مطالعه تشخیصی یافت نشد.");
    }

    const record = await this.repo.insertFeedback(tx, {
      tenantId: principal.tenantId,
      studyId,
      clinicianUserId: principal.userId,
      targetLayer: input.targetLayer,
      agreementState: input.agreementState,
      correctedLabelCode: input.correctedLabelCode,
      noteFa: input.noteFa,
    });

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "diagnostic_clinician_feedback_recorded",
      resourceType: "clinician_feedback",
      resourceId: record.feedbackId,
      metadata: {
        studyId,
        targetLayer: input.targetLayer,
        agreementState: input.agreementState,
      },
    });

    return record;
  }

  async listFeedback(
    tx: DbTx,
    principal: StaffPrincipal,
    studyId: string
  ): Promise<ClinicianFeedbackRecord[]> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new DiagnosticStudyError(403, decision.code, decision.reasonFa);
    }
    const study = await this.repo.getStudyDetail(tx, studyId);
    if (!study) {
      throw new DiagnosticStudyError(404, "STUDY_NOT_FOUND", "مطالعه تشخیصی یافت نشد.");
    }
    return this.repo.listFeedback(tx, studyId);
  }

  async compareStudyWithPrior(
    tx: DbTx,
    principal: StaffPrincipal,
    studyId: string
  ): Promise<StudyComparisonView> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new DiagnosticStudyError(403, decision.code, decision.reasonFa);
    }
    const currentStudy = await this.repo.getStudyDetail(tx, studyId);
    if (!currentStudy) {
      throw new DiagnosticStudyError(404, "STUDY_NOT_FOUND", "مطالعه تشخیصی یافت نشد.");
    }

    const priorStudies = await this.repo.listPriorStudiesForPatientEye(
      tx,
      currentStudy.patientId,
      currentStudy.eyeLaterality,
      studyId,
      5
    );

    const biomarkerDeltas: Array<{
      metricKey: string;
      currentValue: number;
      priorValue: number;
      delta: number;
    }> = [];

    if (priorStudies[0]) {
      const currentBio: Record<string, number> = {};
      for (const s of currentStudy.specialistOutputs) {
        for (const [k, v] of Object.entries(s.biomarkers)) {
          currentBio[`${s.specialistId}.${k}`] = v;
        }
      }
      const priorBio: Record<string, number> = {};
      for (const s of priorStudies[0].specialistOutputs) {
        for (const [k, v] of Object.entries(s.biomarkers)) {
          priorBio[`${s.specialistId}.${k}`] = v;
        }
      }
      for (const [k, curr] of Object.entries(currentBio)) {
        const prev = priorBio[k];
        if (typeof prev === "number") {
          biomarkerDeltas.push({
            metricKey: k,
            currentValue: curr,
            priorValue: prev,
            delta: Number((curr - prev).toFixed(4)),
          });
        }
      }
    }

    return {
      currentStudy,
      priorStudies,
      biomarkerDeltas,
    };
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
