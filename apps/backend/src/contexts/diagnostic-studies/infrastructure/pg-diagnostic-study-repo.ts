import { Pillar2UrgentFloorEvaluator } from "../../../packages/clinical-rules/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import {
  asPatientId,
  formatLateralityFa,
  URGENCY_LABELS_FA,
  type EyeLaterality,
  type StudyLaterality,
  type UrgencyTier,
} from "../../../packages/domain-kernel/index.js";
import { formatJalaliDate } from "../../tenancy/index.js";
import type {
  ClinicianFeedbackAgreement,
  ClinicianFeedbackLayer,
  ClinicianFeedbackRecord,
  ClinicianSignoffView,
  DiagnosticStudyDetailView,
  DiagnosticStudyRepoPort,
  DiagnosticStudyWorklistItem,
  DiagnosticWorklistFilter,
  DifferentialItemView,
  ExplainabilityView,
  FusionResultView,
  PersianReportDraftView,
  QcDecisionView,
  SignoffAction,
  SpecialistOutputView,
  StudyAssetDetailView,
  StudyAssetSubmission,
  StudyInferenceJobRecord,
  StudyStatus,
} from "../ports/index.js";

const urgentFloorEvaluator = new Pillar2UrgentFloorEvaluator();

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

  async appendAssetsAndJob(
    tx: DbTx,
    input: {
      tenantId: string;
      studyId: string;
      jobId: string;
      engineMode: string;
      assets: StudyAssetSubmission[];
    }
  ): Promise<void> {
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
      `UPDATE diagnostic_studies SET status = 'queued', updated_at = now() WHERE id = $1`,
      [input.studyId]
    );

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

    const verRes = await tx.query<{ next_ver: number }>(
      `SELECT COALESCE(MAX(draft_version), 0) + 1 AS next_ver FROM ai_report_drafts WHERE study_id = $1`,
      [input.studyId]
    );
    const nextVersion = Number(verRes.rows[0]?.next_ver ?? 1);

    await tx.query(
      `INSERT INTO ai_report_drafts
        (tenant_id, study_id, model_provider, model_id, prompt_version, evidence_ids_json, persian_report_json, validation_status, draft_version)
       VALUES ($1, $2, $3, $4, 'v1', $5::jsonb, $6::jsonb, $7, $8)`,
      [
        input.tenantId,
        input.studyId,
        input.reportDraft.modelProvider,
        input.reportDraft.modelId,
        JSON.stringify(input.reportDraft.evidenceIds),
        JSON.stringify(input.reportDraft),
        input.reportDraft.validationPassed ? "valid" : "fallback",
        nextVersion,
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

  async updateReportDraftVersioned(
    tx: DbTx,
    input: {
      studyId: string;
      expectedDraftVersion: number;
      editedByUserId: string;
      reportDraft: PersianReportDraftView;
    }
  ): Promise<PersianReportDraftView | null> {
    const res = await tx.query<{
      persian_report_json: PersianReportDraftView;
      draft_version: number;
      edited_by_user_id: string | null;
      updated_at: Date;
    }>(
      `UPDATE ai_report_drafts
       SET persian_report_json = $3::jsonb,
           evidence_ids_json = $4::jsonb,
           validation_status = 'valid',
           draft_version = draft_version + 1,
           edited_by_user_id = $5,
           updated_at = now()
       WHERE id = (
         SELECT id FROM ai_report_drafts WHERE study_id = $1 ORDER BY created_at DESC, draft_version DESC LIMIT 1
       ) AND draft_version = $2
       RETURNING persian_report_json, draft_version, edited_by_user_id, updated_at`,
      [
        input.studyId,
        input.expectedDraftVersion,
        JSON.stringify(input.reportDraft),
        JSON.stringify(input.reportDraft.evidenceIds),
        input.editedByUserId,
      ]
    );

    const row = res.rows[0];
    if (!row) return null;

    await tx.query(`UPDATE diagnostic_studies SET updated_at = now() WHERE id = $1`, [input.studyId]);

    return {
      ...row.persian_report_json,
      draftVersion: row.draft_version,
      editedByUserId: row.edited_by_user_id ?? undefined,
      updatedAtIso: row.updated_at.toISOString(),
    };
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
      labs_json: Record<string, unknown> | null;
      status: StudyStatus;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, tenant_id, clinic_id, patient_id, eye_laterality, labs_json, status, created_at, updated_at
       FROM diagnostic_studies WHERE id = $1`,
      [studyId]
    );
    const st = stRes.rows[0];
    if (!st) return null;

    const assetRes = await tx.query<{
      id: string;
      s3_object_key: string;
      declared_modality: string;
      detected_modality: string | null;
      declared_eye: EyeLaterality;
      qc_status: "pending" | "pass" | "reject";
      qc_reasons_json: QcDecisionView | unknown[];
      created_at: Date;
    }>(
      `SELECT id, s3_object_key, declared_modality, detected_modality, declared_eye, qc_status, qc_reasons_json, created_at
       FROM study_assets WHERE study_id = $1 ORDER BY created_at ASC`,
      [studyId]
    );
    const qcDecisions: QcDecisionView[] = [];
    const assets: StudyAssetDetailView[] = [];
    for (const row of assetRes.rows) {
      assets.push({
        assetId: row.id,
        s3ObjectKey: row.s3_object_key,
        declaredModality: row.declared_modality,
        detectedModality: row.detected_modality,
        declaredEye: row.declared_eye,
        qcStatus: row.qc_status,
        createdAtIso: row.created_at.toISOString(),
      });
      if (row.qc_reasons_json && !Array.isArray(row.qc_reasons_json)) {
        qcDecisions.push(row.qc_reasons_json);
      }
    }

    const latestCompletedJobRes = await tx.query<{ id: string }>(
      `SELECT id FROM ai_inference_jobs WHERE study_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 1`,
      [studyId]
    );
    const latestJobId = latestCompletedJobRes.rows[0]?.id ?? null;

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
      latestJobId
        ? `SELECT specialist_id, backbone_id, eye_laterality, predictions_json, biomarkers_json, summary_fa, mask_s3_key, gradcam_s3_key
           FROM specialist_outputs WHERE study_id = $1 AND job_id = $2 ORDER BY created_at ASC`
        : `SELECT specialist_id, backbone_id, eye_laterality, predictions_json, biomarkers_json, summary_fa, mask_s3_key, gradcam_s3_key
           FROM specialist_outputs WHERE study_id = $1 ORDER BY created_at ASC`,
      latestJobId ? [studyId, latestJobId] : [studyId]
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

    const signals = fusionResult
      ? urgentFloorEvaluator.evaluate({
          patientId: asPatientId(st.patient_id),
          eyeLaterality: fusionResult.eyeLaterality,
          specialistFindings: specialistOutputs.map((s) => ({ probabilities: s.probabilities })),
          clinicalContext: { differential: fusionResult.differential },
        })
      : [];
    const urgentFloorActive =
      signals.length > 0 ||
      Boolean(fusionResult && fusionResult.recommendedUrgency === "urgent" && fusionResult.rawUrgency !== "urgent");

    const draftRes = await tx.query<{
      persian_report_json: PersianReportDraftView;
      draft_version: number;
      edited_by_user_id: string | null;
      updated_at: Date;
    }>(
      `SELECT persian_report_json, draft_version, edited_by_user_id, updated_at
       FROM ai_report_drafts
       WHERE study_id = $1
       ORDER BY created_at DESC, draft_version DESC
       LIMIT 1`,
      [studyId]
    );
    const dRow = draftRes.rows[0];
    const persianReportDraft: PersianReportDraftView | undefined = dRow
      ? {
          ...dRow.persian_report_json,
          draftVersion: dRow.draft_version,
          editedByUserId: dRow.edited_by_user_id ?? undefined,
          updatedAtIso: dRow.updated_at.toISOString(),
        }
      : undefined;

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
      assets,
      labs: st.labs_json,
      urgentFloorActive,
      urgentFloorRuleCodes: signals.map((sig) => sig.ruleCode),
      qcDecisions,
      specialistOutputs,
      fusionResult,
      explainability: f?.explainability_json,
      persianReportDraft,
      signoff,
      createdAtIso: st.created_at.toISOString(),
      updatedAtIso: st.updated_at.toISOString(),
    };
  }

  async listStudies(
    tx: DbTx,
    filter: DiagnosticWorklistFilter
  ): Promise<{ items: DiagnosticStudyWorklistItem[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    const push = (val: unknown): string => {
      params.push(val);
      return `$${params.length}`;
    };

    if (filter.clinicId) {
      conditions.push(`ds.clinic_id = ${push(filter.clinicId)}`);
    }
    if (filter.status) {
      conditions.push(`ds.status = ${push(filter.status)}`);
    }
    if (filter.eyeLaterality) {
      conditions.push(`ds.eye_laterality = ${push(filter.eyeLaterality)}`);
    }
    if (filter.patientId) {
      conditions.push(`ds.patient_id = ${push(filter.patientId)}`);
    }
    if (filter.signedOnly) {
      conditions.push(`ds.status = 'signed_off'`);
    }
    if (filter.urgencyTier) {
      conditions.push(`COALESCE(cs.final_urgency, fa.final_urgency) = ${push(filter.urgencyTier)}`);
    }
    if (filter.modality) {
      conditions.push(
        `EXISTS (SELECT 1 FROM study_assets sa WHERE sa.study_id = ds.id AND sa.declared_modality = ${push(filter.modality)})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const baseJoin = `
      FROM diagnostic_studies ds
      JOIN patients p ON p.id = ds.patient_id
      LEFT JOIN LATERAL (
        SELECT final_urgency, raw_urgency, available_modalities_json, differential_json
        FROM fusion_assessments
        WHERE study_id = ds.id
        ORDER BY created_at DESC LIMIT 1
      ) fa ON true
      LEFT JOIN LATERAL (
        SELECT final_urgency, signed_at
        FROM clinician_signoffs
        WHERE study_id = ds.id
        ORDER BY signed_at DESC LIMIT 1
      ) cs ON true
    `;

    const countRes = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt ${baseJoin} ${whereClause}`,
      params
    );
    const total = Number(countRes.rows[0]?.cnt ?? "0");

    const limitParam = push(filter.limit);
    const offsetParam = push(filter.offset);

    const rowsRes = await tx.query<{
      study_id: string;
      patient_id: string;
      patient_name_fa: string;
      clinic_id: string;
      eye_laterality: StudyLaterality;
      status: StudyStatus;
      eff_urgency: UrgencyTier | null;
      raw_urgency: UrgencyTier | null;
      available_modalities_json: string[] | null;
      top_condition_name_fa: string | null;
      declared_modalities: string[] | null;
      created_at: Date;
      signed_at: Date | null;
    }>(
      `SELECT ds.id AS study_id,
              ds.patient_id,
              p.full_name_fa AS patient_name_fa,
              ds.clinic_id,
              ds.eye_laterality,
              ds.status,
              COALESCE(cs.final_urgency, fa.final_urgency) AS eff_urgency,
              fa.raw_urgency,
              fa.available_modalities_json,
              (fa.differential_json->0->>'conditionNameFa') AS top_condition_name_fa,
              (SELECT array_agg(DISTINCT sa.declared_modality) FROM study_assets sa WHERE sa.study_id = ds.id) AS declared_modalities,
              ds.created_at,
              cs.signed_at
       ${baseJoin}
       ${whereClause}
       ORDER BY
         CASE ds.status WHEN 'pending_hitl' THEN 0 WHEN 'qc_failed' THEN 1 WHEN 'queued' THEN 2 ELSE 3 END ASC,
         CASE COALESCE(cs.final_urgency, fa.final_urgency) WHEN 'urgent' THEN 0 WHEN 'followup_3_6m' THEN 1 WHEN 'routine' THEN 2 ELSE 3 END ASC,
         ds.created_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params
    );

    const items: DiagnosticStudyWorklistItem[] = rowsRes.rows.map((r) => ({
      studyId: r.study_id,
      patientId: r.patient_id,
      patientNameFa: r.patient_name_fa,
      clinicId: r.clinic_id,
      eyeLaterality: r.eye_laterality,
      eyeLabelFa: formatLateralityFa(r.eye_laterality),
      status: r.status,
      urgencyTier: r.eff_urgency,
      urgencyLabelFa: r.eff_urgency ? URGENCY_LABELS_FA[r.eff_urgency] : null,
      urgentFloorActive: Boolean(r.eff_urgency === "urgent" && r.raw_urgency && r.raw_urgency !== "urgent"),
      modalities: r.available_modalities_json ?? r.declared_modalities ?? [],
      topConditionNameFa: r.top_condition_name_fa,
      createdAtIso: r.created_at.toISOString(),
      createdAtJalali: formatJalaliDate(r.created_at),
      signedAtIso: r.signed_at ? r.signed_at.toISOString() : null,
    }));

    return { items, total };
  }

  async listStudyJobs(tx: DbTx, studyId: string): Promise<StudyInferenceJobRecord[]> {
    const res = await tx.query<{
      id: string;
      study_id: string;
      engine_mode: string;
      model_versions_json: Record<string, unknown>;
      status: StudyInferenceJobRecord["status"];
      started_at: Date | null;
      completed_at: Date | null;
      error_code: string | null;
      created_at: Date;
    }>(
      `SELECT id, study_id, engine_mode, model_versions_json, status, started_at, completed_at, error_code, created_at
       FROM ai_inference_jobs
       WHERE study_id = $1
       ORDER BY created_at DESC`,
      [studyId]
    );
    return res.rows.map((r) => ({
      jobId: r.id,
      studyId: r.study_id,
      engineMode: r.engine_mode,
      modelVersions: r.model_versions_json,
      status: r.status,
      startedAtIso: r.started_at ? r.started_at.toISOString() : null,
      completedAtIso: r.completed_at ? r.completed_at.toISOString() : null,
      errorCode: r.error_code,
      createdAtIso: r.created_at.toISOString(),
    }));
  }

  async insertFeedback(
    tx: DbTx,
    input: {
      tenantId: string;
      studyId: string;
      clinicianUserId: string;
      targetLayer: ClinicianFeedbackLayer;
      agreementState: ClinicianFeedbackAgreement;
      correctedLabelCode?: string | undefined;
      noteFa: string;
    }
  ): Promise<ClinicianFeedbackRecord> {
    const res = await tx.query<{
      id: string;
      study_id: string;
      clinician_user_id: string;
      target_layer: ClinicianFeedbackLayer;
      agreement_state: ClinicianFeedbackAgreement;
      corrected_label_code: string | null;
      note_fa: string;
      created_at: Date;
    }>(
      `INSERT INTO clinician_feedback
        (tenant_id, study_id, clinician_user_id, target_layer, agreement_state, corrected_label_code, note_fa)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, study_id, clinician_user_id, target_layer, agreement_state, corrected_label_code, note_fa, created_at`,
      [
        input.tenantId,
        input.studyId,
        input.clinicianUserId,
        input.targetLayer,
        input.agreementState,
        input.correctedLabelCode ?? null,
        input.noteFa,
      ]
    );
    const r = res.rows[0]!;
    return {
      feedbackId: r.id,
      studyId: r.study_id,
      clinicianUserId: r.clinician_user_id,
      targetLayer: r.target_layer,
      agreementState: r.agreement_state,
      correctedLabelCode: r.corrected_label_code ?? undefined,
      noteFa: r.note_fa,
      createdAtIso: r.created_at.toISOString(),
    };
  }

  async listFeedback(tx: DbTx, studyId: string): Promise<ClinicianFeedbackRecord[]> {
    const res = await tx.query<{
      id: string;
      study_id: string;
      clinician_user_id: string;
      target_layer: ClinicianFeedbackLayer;
      agreement_state: ClinicianFeedbackAgreement;
      corrected_label_code: string | null;
      note_fa: string;
      created_at: Date;
    }>(
      `SELECT id, study_id, clinician_user_id, target_layer, agreement_state, corrected_label_code, note_fa, created_at
       FROM clinician_feedback
       WHERE study_id = $1
       ORDER BY created_at DESC`,
      [studyId]
    );
    return res.rows.map((r) => ({
      feedbackId: r.id,
      studyId: r.study_id,
      clinicianUserId: r.clinician_user_id,
      targetLayer: r.target_layer,
      agreementState: r.agreement_state,
      correctedLabelCode: r.corrected_label_code ?? undefined,
      noteFa: r.note_fa,
      createdAtIso: r.created_at.toISOString(),
    }));
  }

  async listPriorStudiesForPatientEye(
    tx: DbTx,
    patientId: string,
    eyeLaterality: StudyLaterality,
    excludeStudyId: string,
    limit = 5
  ): Promise<DiagnosticStudyDetailView[]> {
    const res = await tx.query<{ id: string }>(
      `SELECT id
       FROM diagnostic_studies
       WHERE patient_id = $1
         AND id <> $2
         AND (eye_laterality = $3 OR eye_laterality = 'OU' OR $3 = 'OU')
       ORDER BY created_at DESC
       LIMIT $4`,
      [patientId, excludeStudyId, eyeLaterality, limit]
    );
    const details: DiagnosticStudyDetailView[] = [];
    for (const row of res.rows) {
      const detail = await this.getStudyDetail(tx, row.id);
      if (detail) details.push(detail);
    }
    return details;
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
