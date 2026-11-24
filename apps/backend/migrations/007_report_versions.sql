-- Migration 007: Deterministic Vazirmatn Persian PDF Report Versions & Source Manifests

CREATE TABLE IF NOT EXISTS report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  report_type text NOT NULL CHECK (report_type IN ('patient_schedule', 'postop_closure', 'signed_diagnostic')),
  source_ref_id uuid NOT NULL,
  source_sha256 text NOT NULL,
  pdf_sha256 text NOT NULL,
  payload_json jsonb NOT NULL,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_versions_tenant_isolation ON report_versions;
CREATE POLICY report_versions_tenant_isolation ON report_versions
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
