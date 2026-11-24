-- Migration 004: Protocol Templates, Eye-Isolated Care Episodes, Immutable Prescription Versions, Adherence & Symptoms

CREATE TABLE IF NOT EXISTS protocol_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  protocol_type text NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  schema_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE protocol_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS protocol_templates_tenant_isolation ON protocol_templates;
CREATE POLICY protocol_templates_tenant_isolation ON protocol_templates
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS care_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  protocol_type text NOT NULL,
  eye_laterality text NOT NULL CHECK (eye_laterality IN ('OD', 'OS')),
  surgeon_id uuid NOT NULL,
  access_mode text NOT NULL CHECK (access_mode IN ('app', 'caregiver', 'print_phone')),
  active_prescription_version integer NOT NULL DEFAULT 0,
  anchor_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE care_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_episodes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS care_episodes_tenant_isolation ON care_episodes;
CREATE POLICY care_episodes_tenant_isolation ON care_episodes
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS prescription_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  episode_id uuid NOT NULL REFERENCES care_episodes(id),
  eye_laterality text NOT NULL CHECK (eye_laterality IN ('OD', 'OS')),
  version integer NOT NULL CHECK (version >= 1),
  items_json jsonb NOT NULL,
  reason_fa text NOT NULL,
  published_by_user_id uuid NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, episode_id, version)
);
ALTER TABLE prescription_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prescription_versions_tenant_isolation ON prescription_versions;
CREATE POLICY prescription_versions_tenant_isolation ON prescription_versions
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE OR REPLACE FUNCTION prevent_prescription_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'prescription_versions is immutable; publish a new version instead';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prescription_versions_immutable_trg ON prescription_versions;
CREATE TRIGGER prescription_versions_immutable_trg
  BEFORE UPDATE OR DELETE ON prescription_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_prescription_mutation();

CREATE TABLE IF NOT EXISTS medication_adherence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  episode_id uuid NOT NULL REFERENCES care_episodes(id),
  eye_laterality text NOT NULL CHECK (eye_laterality IN ('OD', 'OS')),
  prescription_version integer NOT NULL,
  state text NOT NULL CHECK (state IN ('taken', 'missed_with_reason', 'unavailable', 'no_response')),
  reason_fa text,
  idempotency_key text NOT NULL,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, episode_id, idempotency_key)
);
ALTER TABLE medication_adherence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_adherence_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS medication_adherence_events_tenant_isolation ON medication_adherence_events;
CREATE POLICY medication_adherence_events_tenant_isolation ON medication_adherence_events
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS symptom_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  episode_id uuid NOT NULL REFERENCES care_episodes(id),
  eye_laterality text NOT NULL CHECK (eye_laterality IN ('OD', 'OS')),
  severe_pain boolean NOT NULL,
  sudden_vision_loss boolean NOT NULL,
  purulent_discharge boolean NOT NULL,
  flashes_or_curtain boolean NOT NULL DEFAULT false,
  free_text_fa text NOT NULL DEFAULT '',
  urgency_tier text NOT NULL CHECK (urgency_tier IN ('routine', 'followup_3_6m', 'urgent')),
  signals_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, episode_id, idempotency_key)
);
ALTER TABLE symptom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_reports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS symptom_reports_tenant_isolation ON symptom_reports;
CREATE POLICY symptom_reports_tenant_isolation ON symptom_reports
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
