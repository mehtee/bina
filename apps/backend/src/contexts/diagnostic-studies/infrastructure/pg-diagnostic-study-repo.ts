import type { DbTx } from "../../../packages/db/index.js";
import {
  URGENCY_LABELS_FA,
  type EyeLaterality,
  type StudyLaterality,
  type UrgencyTier,
} from "../../../packages/domain-kernel/index.js";
import type {
  ClinicianSignoffView,
  DiagnosticStudyDetailView,
  DiagnosticStudyRepoPort,
  DifferentialItemView,
  ExplainabilityView,
  FusionResultView,
  PersianReportDraftView,
  QcDecisionView,
  SignoffAction,
  SpecialistOutputView,
  StudyAssetSubmission,
  StudyStatus,
} from "../ports/index.js";

export class PgDiagnosticStudyRepo implements DiagnosticStudyRepoPort {
  async createStudyWithAssetsAndJob(
    tx: DbTx,
    input: {
      studyId: string;
      jobId: string;
      tenantId: string;
      clinicId: string;
      patientId: string;
      eyeLaterality: StudyLaterality;
      engineMode: string;
      assets: StudyAssetSubmission[];
      labs?: Record<string, unknown> | undefined;
    }
  ): Promise<void> {
    await tx.query(
      `INSERT INTO diagnostic_studies
        (id, tenant_id, clinic_id, patient_id, eye_laterality, labs_json, status)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'queued')`,
      [
        input.studyId,
        input.tenantId,
        input.clinicId,
        input.patientId,
        input.eyeLaterality,
        input.labs ? JSON.stringify(input.labs) : null,
      ]
    );

    for (const asset of input.assets) {
      await tx.query(
        `INSERT INTO study_assets
          (id, tenant_id, study_id, declared_modality, declared_eye, qc_status, s3_object_key)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
        [
          asset.assetId,
          input.tenantId,
          input.studyId,
          asset.declaredModality,
          asset.declaredEye,
          asset.s3ObjectKey,
        ]
      );
    }

    await tx.query(
      `INSERT INTO ai_inference_jobs (id, tenant_id, study_id, engine_mode, status, started_at)
       VALUES ($1, $2, $3, $4, 'running', now())`,
      [input.jobId, input.tenantId, input.studyId, input.engineMode]
    );
  }

  async markQcFailed(
    tx: DbTx,
    studyId: string,
    jobId: string,
    qcDecisions: QcDecisionView[]
  ): Promise<void> {
    for (const decision of qcDecisions) {
      await tx.query(
        `UPDATE study_assets
         SET detected_modality = $2,
             qc_status = $3,
             qc_reasons_json = $4::jsonb
         WHERE id = $1`,
        [
          decision.assetId,
          decision.modalityPrediction.detectedModality,
          decision.passed ? "pass" : "reject",
          JSON.stringify(decision),
        ]
      );
    }

    await tx.query(
      `UPDATE ai_inference_jobs SET status = 'qc_failed', completed_at = now() WHERE id = $1`,
      [jobId]
    );
    await tx.query(
      `UPDATE diagnostic_studies SET status = 'qc_failed', updated_at = now() WHERE id = $1`,
      [studyId]
    );
  }

  async persistAnalysisAndDraft(
    tx: DbTx,
    input: {
      tenantId: string;
      studyId: string;
      jobId: string;
      qcDecisions: QcDecisionView[];
      specialistOutputs: SpecialistOutputView[];
      fusionResult: FusionResultView;
      explainability: ExplainabilityView;
      reportDraft: PersianReportDraftView;
    }
  ): Promise<void> {
    for (const decision of input.qcDecisions) {
      await tx.query(
        `UPDATE study_assets
         SET detected_modality = $2,
             qc_status = 'pass',
             qc_reasons_json = $3::jsonb
         WHERE id = $1`,
        [decision.assetId, decision.modalityPrediction.detectedModality, JSON.stringify(decision)]
      );
    }

    for (const out of input.specialistOutputs) {
      await tx.query(
        `INSERT INTO specialist_outputs
          (tenant_id, job_id, study_id, specialist_id, backbone_id, eye_laterality, predictions_json, biomarkers_json, summary_fa, mask_s3_key, gradcam_s3_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11)`,
        [
          input.tenantId,
          input.jobId,
          input.studyId,
          out.specialistId,
          out.backboneId,
          out.eyeLaterality,
          JSON.stringify(out.probabilities),
          JSON.stringify(out.biomarkers),
          out.summaryFa,
          out.maskS3Key ?? null,
          out.gradcamS3Key ?? null,
        ]
      );
    }

    await tx.query(
      `INSERT INTO fusion_assessments
        (tenant_id, job_id, study_id, eye_laterality, available_modalities_json, missing_modalities_json, missing_notice_fa, differential_json, discordance_flags_json, explainability_json, raw_urgency, final_urgency)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12)`,
      [
        input.tenantId,
        input.jobId,
        input.studyId,
        input.fusionResult.eyeLaterality,
        JSON.stringify(input.fusionResult.availableModalities),
        JSON.stringify(input.fusionResult.missingModalities),
        input.fusionResult.missingModalityNoticeFa,
        JSON.stringify(input.fusionResult.differential),
        JSON.stringify(input.fusionResult.discordanceFlagsFa),
        JSON.stringify(input.explainability),
        input.fusionResult.rawUrgency,
        input.fusionResult.recommendedUrgency,
      ]
    );

    await tx.query(
      `INSERT INTO ai_report_drafts
        (tenant_id, study_id, model_provider, model_id, prompt_version, evidence_ids_json, persian_report_json, validation_status)
       VALUES ($1, $2, $3, $4, 'v1', $5::jsonb, $6::jsonb, $7)`,
      [
        input.tenantId,
        input.studyId,
        input.reportDraft.modelProvider,
        input.reportDraft.modelId,
        JSON.stringify(input.reportDraft.evidenceIds),
        JSON.stringify(input.reportDraft),
        input.reportDraft.validationPassed ? "valid" : "fallback",
      ]
    );

    await tx.query(
      `UPDATE ai_inference_jobs SET status = 'completed', completed_at = now() WHERE id = $1`,
      [input.jobId]
    );
    await tx.query(
      `UPDATE diagnostic_studies SET status = 'pending_hitl', updated_at = now() WHERE id = $1`,
      [input.studyId]
    );
  }

  async saveSignoff(
    tx: DbTx,
    input: {
      tenantId: string;
      studyId: string;
      ophthalmologistId: string;
      action: SignoffAction;
      finalDifferential: DifferentialItemView[];
      finalUrgency: UrgencyTier;
      finalReportTextFa: string;
      overrideReasonFa?: string | undefined;
      signedAt: Date;
    }
  ): Promise<ClinicianSignoffView> {
    const res = await tx.query<{
      id: string;
      study_id: string;
      ophthalmologist_id: string;
      action: SignoffAction;
      final_urgency: UrgencyTier;
      final_persian_report: string;
      override_reason_fa: string | null;
      signed_at: Date;
    }>(
      `INSERT INTO clinician_signoffs
        (tenant_id, study_id, ophthalmologist_id, action, final_differential_json, final_urgency, final_persian_report, override_reason_fa, signed_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::timestamptz)
       RETURNING id, study_id, ophthalmologist_id, action, final_urgency, final_persian_report, override_reason_fa, signed_at`,
      [
        input.tenantId,
        input.studyId,
        input.ophthalmologistId,
        input.action,
        JSON.stringify(input.finalDifferential),
        input.finalUrgency,
        input.finalReportTextFa,
        input.overrideReasonFa ?? null,
        input.signedAt.toISOString(),
      ]
    );

    await tx.query(
      `UPDATE diagnostic_studies SET status = 'signed_off', updated_at = now() WHERE id = $1`,
      [input.studyId]
    );

    const r = res.rows[0]!;
    return {
      signoffId: r.id,
      studyId: r.study_id,
      ophthalmologistId: r.ophthalmologist_id,
      action: r.action,
      finalUrgency: r.final_urgency,
      finalUrgencyLabelFa: URGENCY_LABELS_FA[r.final_urgency],
      finalReportTextFa: r.final_persian_report,
      overrideReasonFa: r.override_reason_fa ?? undefined,
      signedAtIso: r.signed_at.toISOString(),
    };
  }

  async getStudyDetail(tx: DbTx, studyId: string): Promise<DiagnosticStudyDetailView | null> {
    const stRes = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      patient_id: string;
      eye_laterality: StudyLaterality;
      status: StudyStatus;
    }>(
      `SELECT id, tenant_id, clinic_id, patient_id, eye_laterality, status
       FROM diagnostic_studies WHERE id = $1`,
      [studyId]
    );
    const st = stRes.rows[0];
    if (!st) return null;

    const assetRes = await tx.query<{ qc_reasons_json: QcDecisionView | unknown[] }>(
      `SELECT qc_reasons_json FROM study_assets WHERE study_id = $1 ORDER BY created_at ASC`,
      [studyId]
    );
    const qcDecisions: QcDecisionView[] = [];
    for (const row of assetRes.rows) {
      if (row.qc_reasons_json && !Array.isArray(row.qc_reasons_json)) {
        qcDecisions.push(row.qc_reasons_json);
      }
    }

    const specRes = await tx.query<{
      specialist_id: SpecialistOutputView["specialistId"];
      backbone_id: string;
      eye_laterality: EyeLaterality;
      predictions_json: Record<string, number>;
      biomarkers_json: Record<string, number>;
      summary_fa: string;
      mask_s3_key: string | null;
      gradcam_s3_key: string | null;
    }>(
      `SELECT specialist_id, backbone_id, eye_laterality, predictions_json, biomarkers_json, summary_fa, mask_s3_key, gradcam_s3_key
       FROM specialist_outputs WHERE study_id = $1 ORDER BY created_at ASC`,
      [studyId]
    );
    const specialistOutputs: SpecialistOutputView[] = specRes.rows.map((r) => ({
      specialistId: r.specialist_id,
      backboneId: r.backbone_id,
      eyeLaterality: r.eye_laterality,
      probabilities: r.predictions_json,
      biomarkers: r.biomarkers_json,
      summaryFa: r.summary_fa,
      maskS3Key: r.mask_s3_key ?? undefined,
      gradcamS3Key: r.gradcam_s3_key ?? undefined,
    }));

    const fusionRes = await tx.query<{
      eye_laterality: EyeLaterality;
      available_modalities_json: string[];
      missing_modalities_json: string[];
      missing_notice_fa: string;
      differential_json: DifferentialItemView[];
      discordance_flags_json: string[];
      explainability_json: ExplainabilityView;
      raw_urgency: UrgencyTier;
      final_urgency: UrgencyTier;
    }>(
      `SELECT eye_laterality, available_modalities_json, missing_modalities_json, missing_notice_fa, differential_json, discordance_flags_json, explainability_json, raw_urgency, final_urgency
       FROM fusion_assessments WHERE study_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [studyId]
    );
    const f = fusionRes.rows[0];
    const fusionResult: FusionResultView | undefined = f
      ? {
          eyeLaterality: f.eye_laterality,
          availableModalities: f.available_modalities_json,
          missingModalities: f.missing_modalities_json,
          missingModalityNoticeFa: f.missing_notice_fa,
          differential: f.differential_json,
          discordanceFlagsFa: f.discordance_flags_json,
          rawUrgency: f.raw_urgency,
          recommendedUrgency: f.final_urgency,
          recommendedUrgencyLabelFa: URGENCY_LABELS_FA[f.final_urgency],
        }
      : undefined;

    const draftRes = await tx.query<{ persian_report_json: PersianReportDraftView }>(
      `SELECT persian_report_json FROM ai_report_drafts WHERE study_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [studyId]
    );

    const signoffRes = await tx.query<{
      id: string;
      study_id: string;
      ophthalmologist_id: string;
      action: SignoffAction;
      final_urgency: UrgencyTier;
      final_persian_report: string;
      override_reason_fa: string | null;
      signed_at: Date;
    }>(
      `SELECT id, study_id, ophthalmologist_id, action, final_urgency, final_persian_report, override_reason_fa, signed_at
       FROM clinician_signoffs WHERE study_id = $1 ORDER BY signed_at DESC LIMIT 1`,
      [studyId]
    );
    const s = signoffRes.rows[0];
    const signoff: ClinicianSignoffView | undefined = s
      ? {
          signoffId: s.id,
          studyId: s.study_id,
          ophthalmologistId: s.ophthalmologist_id,
          action: s.action,
          finalUrgency: s.final_urgency,
          finalUrgencyLabelFa: URGENCY_LABELS_FA[s.final_urgency],
          finalReportTextFa: s.final_persian_report,
          overrideReasonFa: s.override_reason_fa ?? undefined,
          signedAtIso: s.signed_at.toISOString(),
        }
      : undefined;

    return {
      studyId: st.id,
      tenantId: st.tenant_id,
      clinicId: st.clinic_id,
      patientId: st.patient_id,
      eyeLaterality: st.eye_laterality,
      status: st.status,
      qcDecisions,
      specialistOutputs,
      fusionResult,
      explainability: f?.explainability_json,
      persianReportDraft: draftRes.rows[0]?.persian_report_json,
      signoff,
    };
  }

  async listSignedPatientSummaries(tx: DbTx, patientId: string): Promise<
    Array<{
      studyId: string;
      eyeLaterality: StudyLaterality;
      finalUrgency: UrgencyTier;
      finalReportTextFa: string;
      signedAt: Date;
    }>
  > {
    const res = await tx.query<{
      study_id: string;
      eye_laterality: StudyLaterality;
      final_urgency: UrgencyTier;
      final_persian_report: string;
      signed_at: Date;
    }>(
      `SELECT ds.id AS study_id, ds.eye_laterality, cs.final_urgency, cs.final_persian_report, cs.signed_at
       FROM diagnostic_studies ds
       INNER JOIN clinician_signoffs cs ON cs.study_id = ds.id
       WHERE ds.patient_id = $1 AND ds.status = 'signed_off'
       ORDER BY cs.signed_at DESC`,
      [patientId]
    );
    return res.rows.map((r) => ({
      studyId: r.study_id,
      eyeLaterality: r.eye_laterality,
      finalUrgency: r.final_urgency,
      finalReportTextFa: r.final_persian_report,
      signedAt: r.signed_at,
    }));
  }
}
