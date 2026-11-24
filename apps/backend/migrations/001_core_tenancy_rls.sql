-- Migration 001: Core Tenancy, Clinics, Staff Memberships, Immutable Audit Logs & Transactional Outbox
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction text NOT NULL DEFAULT 'IR' CHECK (jurisdiction = 'IR'),
  data_residency_region text NOT NULL DEFAULT 'IR' CHECK (data_residency_region = 'IR'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name_fa text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Tehran',
  calendar_mode text NOT NULL DEFAULT 'jalali' CHECK (calendar_mode IN ('jalali', 'gregorian')),
  staffed_hours_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  emergency_phone text NOT NULL,
  dicom_ae_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clinics_tenant_isolation ON clinics;
CREATE POLICY clinics_tenant_isolation ON clinics
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS staff_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('ophthalmologist', 'optometrist', 'technician', 'coordinator', 'admin')),
  mfa_verified_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, clinic_id, user_id)
);
ALTER TABLE staff_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_memberships FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_memberships_tenant_isolation ON staff_memberships;
CREATE POLICY staff_memberships_tenant_isolation ON staff_memberships
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  actor_user_id uuid NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  reason_fa text,
  break_glass boolean NOT NULL DEFAULT false,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only; UPDATE and DELETE are forbidden';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_immutable_trg ON audit_logs;
CREATE TRIGGER audit_logs_immutable_trg
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  event_type text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  correlation_id uuid NOT NULL,
  idempotency_key text,
  payload_json jsonb NOT NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS outbox_events_idempotency_idx
  ON outbox_events (tenant_id, event_type, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outbox_events_tenant_isolation ON outbox_events;
CREATE POLICY outbox_events_tenant_isolation ON outbox_events
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
