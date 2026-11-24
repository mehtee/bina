-- Migration 002: Patient Enrollment (+98 OTP), Persian Consent & Revocable Caregiver Delegation

CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  preferred_locale text NOT NULL DEFAULT 'fa-IR',
  access_mode text NOT NULL DEFAULT 'app' CHECK (access_mode IN ('app', 'caregiver', 'print_phone')),
  ml_training_consent_flag boolean NOT NULL DEFAULT false,
  phone_hash text NOT NULL,
  phone_masked text NOT NULL,
  full_name_fa text NOT NULL DEFAULT 'بیمار محترم',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, phone_hash)
);
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS patients_tenant_isolation ON patients;
CREATE POLICY patients_tenant_isolation ON patients
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  phone_hash text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_challenges FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS otp_challenges_tenant_isolation ON otp_challenges;
CREATE POLICY otp_challenges_tenant_isolation ON otp_challenges
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS consent_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  consent_version text NOT NULL,
  locale text NOT NULL DEFAULT 'fa-IR',
  accepted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE consent_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_acceptances FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS consent_acceptances_tenant_isolation ON consent_acceptances;
CREATE POLICY consent_acceptances_tenant_isolation ON consent_acceptances
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS caregiver_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  caregiver_phone_hash text NOT NULL,
  relationship_fa text NOT NULL,
  scopes_json jsonb NOT NULL DEFAULT '["care_plan:read"]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE caregiver_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_grants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS caregiver_grants_tenant_isolation ON caregiver_grants;
CREATE POLICY caregiver_grants_tenant_isolation ON caregiver_grants
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
