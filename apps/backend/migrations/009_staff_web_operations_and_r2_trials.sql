-- Migration 009: Staff Web Operations (v2.0 Modules A-M), R2 Raw Trials, Device Kill-Switch, Outages, Follow-ups, Integrations & Break-Glass Sessions

CREATE OR REPLACE FUNCTION prevent_immutable_table_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; UPDATE and DELETE are forbidden', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS patient_clinical_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  recorded_by_user_id uuid NOT NULL,
  summary_fa text NOT NULL,
  conditions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  allergies_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  medications_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_factors_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  labs_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE patient_clinical_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_clinical_histories FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS patient_clinical_histories_tenant_isolation ON patient_clinical_histories;
CREATE POLICY patient_clinical_histories_tenant_isolation ON patient_clinical_histories
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
DROP TRIGGER IF EXISTS patient_clinical_histories_immutable_trg ON patient_clinical_histories;
CREATE TRIGGER patient_clinical_histories_immutable_trg
  BEFORE UPDATE OR DELETE ON patient_clinical_histories
  FOR EACH ROW EXECUTE FUNCTION prevent_immutable_table_mutation();

CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  episode_id uuid REFERENCES care_episodes(id),
  triage_case_id uuid REFERENCES triage_cases(id),
  eye_laterality text CHECK (eye_laterality IS NULL OR eye_laterality IN ('OD', 'OS', 'OU')),
  task_type text NOT NULL CHECK (task_type IN ('postop_call', 'print_phone_checkin', 'clinic_visit', 'referral_followup', 'r2_recalibration')),
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'cancelled')),
  assigned_user_id uuid,
  outcome_fa text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS follow_up_tasks_tenant_isolation ON follow_up_tasks;
CREATE POLICY follow_up_tasks_tenant_isolation ON follow_up_tasks
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS clinic_outages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  title_fa text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'mitigated', 'resolved')),
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('warning', 'critical')),
  affected_channel text NOT NULL CHECK (affected_channel IN ('sms', 'ai_engine', 'ehr_his', 'phone', 'portal')),
  mitigation_note_fa text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE clinic_outages ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_outages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinic_outages_tenant_isolation ON clinic_outages;
CREATE POLICY clinic_outages_tenant_isolation ON clinic_outages
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS clinician_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  study_id uuid NOT NULL REFERENCES diagnostic_studies(id),
  clinician_user_id uuid NOT NULL,
  target_layer text NOT NULL CHECK (target_layer IN ('qc', 'specialist', 'fusion', 'segmentation', 'gradcam', 'report_draft', 'urgency')),
  agreement_state text NOT NULL CHECK (agreement_state IN ('agree', 'partially_agree', 'disagree')),
  corrected_label_code text,
  note_fa text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE clinician_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinician_feedback FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinician_feedback_tenant_isolation ON clinician_feedback;
CREATE POLICY clinician_feedback_tenant_isolation ON clinician_feedback
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
DROP TRIGGER IF EXISTS clinician_feedback_immutable_trg ON clinician_feedback;
CREATE TRIGGER clinician_feedback_immutable_trg
  BEFORE UPDATE OR DELETE ON clinician_feedback
  FOR EACH ROW EXECUTE FUNCTION prevent_immutable_table_mutation();

CREATE TABLE IF NOT EXISTS home_vision_test_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  test_id uuid NOT NULL REFERENCES home_vision_tests(id),
  trial_index integer NOT NULL CHECK (trial_index >= 0),
  stimulus_json jsonb NOT NULL,
  response_json jsonb NOT NULL,
  reaction_ms integer CHECK (reaction_ms IS NULL OR reaction_ms >= 0),
  correct boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, test_id, trial_index)
);
ALTER TABLE home_vision_test_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_vision_test_trials FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS home_vision_test_trials_tenant_isolation ON home_vision_test_trials;
CREATE POLICY home_vision_test_trials_tenant_isolation ON home_vision_test_trials
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
DROP TRIGGER IF EXISTS home_vision_test_trials_immutable_trg ON home_vision_test_trials;
CREATE TRIGGER home_vision_test_trials_immutable_trg
  BEFORE UPDATE OR DELETE ON home_vision_test_trials
  FOR EACH ROW EXECUTE FUNCTION prevent_immutable_table_mutation();

CREATE TABLE IF NOT EXISTS device_qualification_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  model_code text NOT NULL,
  manufacturer text NOT NULL,
  display_ppi double precision CHECK (display_ppi IS NULL OR display_ppi > 50),
  verified_status text NOT NULL DEFAULT 'provisional' CHECK (verified_status IN ('qualified', 'provisional', 'killed')),
  kill_switch_reason_fa text,
  updated_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, model_code)
);
ALTER TABLE device_qualification_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_qualification_registry FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS device_qualification_registry_tenant_isolation ON device_qualification_registry;
CREATE POLICY device_qualification_registry_tenant_isolation ON device_qualification_registry
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS monitoring_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  eye_laterality text NOT NULL CHECK (eye_laterality IN ('OD', 'OS')),
  test_types_json jsonb NOT NULL DEFAULT '["landolt_c","amsler"]'::jsonb,
  cadence_days integer NOT NULL DEFAULT 7 CHECK (cadence_days BETWEEN 1 AND 90),
  alert_threshold_logmar double precision NOT NULL DEFAULT 0.2,
  active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE monitoring_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_plans FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS monitoring_plans_tenant_isolation ON monitoring_plans;
CREATE POLICY monitoring_plans_tenant_isolation ON monitoring_plans
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS clinic_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  template_key text NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  body_template_fa text NOT NULL,
  channel text NOT NULL DEFAULT 'sms' CHECK (channel IN ('sms', 'print', 'in_app')),
  active boolean NOT NULL DEFAULT true,
  updated_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, clinic_id, template_key, version)
);
ALTER TABLE clinic_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_message_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinic_message_templates_tenant_isolation ON clinic_message_templates;
CREATE POLICY clinic_message_templates_tenant_isolation ON clinic_message_templates
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS clinic_consent_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  consent_type text NOT NULL CHECK (consent_type IN ('care_enrollment', 'diagnostic_ai', 'research_d5', 'caregiver_delegation')),
  version text NOT NULL,
  title_fa text NOT NULL,
  body_fa text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  updated_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, clinic_id, consent_type, version)
);
ALTER TABLE clinic_consent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_consent_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinic_consent_templates_tenant_isolation ON clinic_consent_templates;
CREATE POLICY clinic_consent_templates_tenant_isolation ON clinic_consent_templates
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS clinic_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  flag_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by_user_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, clinic_id, flag_key)
);
ALTER TABLE clinic_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_feature_flags FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinic_feature_flags_tenant_isolation ON clinic_feature_flags;
CREATE POLICY clinic_feature_flags_tenant_isolation ON clinic_feature_flags
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS integration_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  integration_type text NOT NULL CHECK (integration_type IN ('dicom_dimse', 'dicomweb', 'fhir_his', 'icare_home2', 'sms_gateway')),
  name_fa text NOT NULL,
  endpoint_url text NOT NULL,
  ae_title text,
  auth_mode text NOT NULL DEFAULT 'none' CHECK (auth_mode IN ('none', 'mtls', 'bearer', 'basic')),
  secret_masked text,
  enabled boolean NOT NULL DEFAULT true,
  last_tested_at timestamptz,
  last_test_status text CHECK (last_test_status IS NULL OR last_test_status IN ('ok', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE integration_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_endpoints FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integration_endpoints_tenant_isolation ON integration_endpoints;
CREATE POLICY integration_endpoints_tenant_isolation ON integration_endpoints
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS integration_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  endpoint_id uuid REFERENCES integration_endpoints(id),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  payload_type text NOT NULL,
  reference_id text,
  status text NOT NULL CHECK (status IN ('queued', 'delivered', 'failed', 'retrying')),
  http_status integer,
  error_code text,
  error_message_fa text,
  attempt_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE integration_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_deliveries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integration_deliveries_tenant_isolation ON integration_deliveries;
CREATE POLICY integration_deliveries_tenant_isolation ON integration_deliveries
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS break_glass_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  actor_user_id uuid NOT NULL,
  actor_role text NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id),
  reason_fa text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE break_glass_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_glass_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS break_glass_sessions_tenant_isolation ON break_glass_sessions;
CREATE POLICY break_glass_sessions_tenant_isolation ON break_glass_sessions
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE ai_report_drafts
  ADD COLUMN IF NOT EXISTS draft_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS edited_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE triage_cases
  ADD COLUMN IF NOT EXISTS resolution_note_fa text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_log_json jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS national_id_masked text,
  ADD COLUMN IF NOT EXISTS birth_year_jalali integer,
  ADD COLUMN IF NOT EXISTS notes_fa text;

ALTER TABLE consent_acceptances
  ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'accepted' CHECK (action IN ('accepted', 'withdrawn')),
  ADD COLUMN IF NOT EXISTS recorded_by_user_id uuid;

ALTER TABLE staff_memberships
  ADD COLUMN IF NOT EXISTS full_name_fa text,
  ADD COLUMN IF NOT EXISTS email text;

CREATE INDEX IF NOT EXISTS idx_diagnostic_studies_worklist
  ON diagnostic_studies (tenant_id, clinic_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_care_episodes_clinic_status
  ON care_episodes (tenant_id, clinic_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_queue
  ON follow_up_tasks (tenant_id, clinic_id, status, due_at ASC);

CREATE INDEX IF NOT EXISTS idx_break_glass_active
  ON break_glass_sessions (tenant_id, actor_user_id, expires_at DESC);
