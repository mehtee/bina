-- Migration 006: Pillar 2 Multimodal Diagnostic Studies, Assets, AI Inference Jobs, Specialists, Fusion, Drafts & HITL Signoffs

CREATE TABLE IF NOT EXISTS diagnostic_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  eye_laterality text NOT NULL CHECK (eye_laterality IN ('OD', 'OS', 'OU')),
  clinical_context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  labs_json jsonb,
  status text NOT NULL DEFAULT 'ingested' CHECK (status IN ('ingested', 'qc_failed', 'queued', 'analyzed', 'pending_hitl', 'signed_off')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE diagnostic_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_studies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS diagnostic_studies_tenant_isolation ON diagnostic_studies;
CREATE POLICY diagnostic_studies_tenant_isolation ON diagnostic_studies
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS study_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  study_id uuid NOT NULL REFERENCES diagnostic_studies(id),
  declared_modality text NOT NULL,
  detected_modality text,
  declared_eye text NOT NULL CHECK (declared_eye IN ('OD', 'OS')),
  qc_status text NOT NULL DEFAULT 'pending' CHECK (qc_status IN ('pending', 'pass', 'reject')),
  qc_reasons_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  s3_object_key text NOT NULL,
  dicom_meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sha256 text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE study_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_assets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS study_assets_tenant_isolation ON study_assets;
CREATE POLICY study_assets_tenant_isolation ON study_assets
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS ai_inference_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  study_id uuid NOT NULL REFERENCES diagnostic_studies(id),
  engine_mode text NOT NULL,
  model_versions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'qc_failed', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ai_inference_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_inference_jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_inference_jobs_tenant_isolation ON ai_inference_jobs;
CREATE POLICY ai_inference_jobs_tenant_isolation ON ai_inference_jobs
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS specialist_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  job_id uuid NOT NULL REFERENCES ai_inference_jobs(id),
  study_id uuid NOT NULL REFERENCES diagnostic_studies(id),
  specialist_id text NOT NULL CHECK (specialist_id IN ('fundus', 'oct', 'anterior', 'visual_field', 'tabular_xgb')),
  backbone_id text NOT NULL,
  eye_laterality text NOT NULL CHECK (eye_laterality IN ('OD', 'OS')),
  predictions_json jsonb NOT NULL,
  biomarkers_json jsonb NOT NULL,
  summary_fa text NOT NULL,
  mask_s3_key text,
  gradcam_s3_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE specialist_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialist_outputs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS specialist_outputs_tenant_isolation ON specialist_outputs;
CREATE POLICY specialist_outputs_tenant_isolation ON specialist_outputs
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS fusion_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  job_id uuid NOT NULL REFERENCES ai_inference_jobs(id),
  study_id uuid NOT NULL REFERENCES diagnostic_studies(id),
  eye_laterality text NOT NULL CHECK (eye_laterality IN ('OD', 'OS')),
  available_modalities_json jsonb NOT NULL,
  missing_modalities_json jsonb NOT NULL,
  missing_notice_fa text NOT NULL,
  differential_json jsonb NOT NULL,
  discordance_flags_json jsonb NOT NULL,
  explainability_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_urgency text NOT NULL,
  final_urgency text NOT NULL CHECK (final_urgency IN ('routine', 'followup_3_6m', 'urgent')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fusion_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fusion_assessments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fusion_assessments_tenant_isolation ON fusion_assessments;
CREATE POLICY fusion_assessments_tenant_isolation ON fusion_assessments
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS ai_report_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  study_id uuid NOT NULL REFERENCES diagnostic_studies(id),
  model_provider text NOT NULL,
  model_id text NOT NULL,
  prompt_version text NOT NULL,
  evidence_ids_json jsonb NOT NULL,
  persian_report_json jsonb NOT NULL,
  validation_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ai_report_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_report_drafts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_report_drafts_tenant_isolation ON ai_report_drafts;
CREATE POLICY ai_report_drafts_tenant_isolation ON ai_report_drafts
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS clinician_signoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  study_id uuid NOT NULL REFERENCES diagnostic_studies(id),
  ophthalmologist_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('approved', 'edited_approved', 'rejected')),
  final_differential_json jsonb NOT NULL,
  final_urgency text NOT NULL CHECK (final_urgency IN ('routine', 'followup_3_6m', 'urgent')),
  final_persian_report text NOT NULL,
  override_reason_fa text,
  signed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE clinician_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinician_signoffs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinician_signoffs_tenant_isolation ON clinician_signoffs;
CREATE POLICY clinician_signoffs_tenant_isolation ON clinician_signoffs
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
