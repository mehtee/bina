-- Migration 005: Unified Pillar 1 + Pillar 2 Triage Queue, Triggers, Shift Handoff Contact Logs & Closed-Loop Referrals

CREATE TABLE IF NOT EXISTS triage_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  source_pillar text NOT NULL CHECK (source_pillar IN ('pillar1_care', 'pillar2_diagnostic')),
  source_ref_id uuid,
  eye_laterality text NOT NULL CHECK (eye_laterality IN ('OD', 'OS', 'OU')),
  status text NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'OwnerAssigned', 'ContactAttempted', 'ContactEstablished', 'Escalated', 'Referred', 'Closed')),
  urgency_tier text NOT NULL CHECK (urgency_tier IN ('routine', 'followup_3_6m', 'urgent')),
  owner_id uuid,
  sla_due_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE triage_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_cases FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS triage_cases_tenant_isolation ON triage_cases;
CREATE POLICY triage_cases_tenant_isolation ON triage_cases
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS triage_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  case_id uuid NOT NULL REFERENCES triage_cases(id),
  rule_code text NOT NULL,
  summary_fa text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE triage_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_triggers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS triage_triggers_tenant_isolation ON triage_triggers;
CREATE POLICY triage_triggers_tenant_isolation ON triage_triggers
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS contact_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  case_id uuid NOT NULL REFERENCES triage_cases(id),
  actor_user_id uuid NOT NULL,
  log_type text NOT NULL CHECK (log_type IN ('call_attempt', 'contact_established', 'shift_handoff', 'outage_note')),
  note_fa text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE contact_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contact_logs_tenant_isolation ON contact_logs;
CREATE POLICY contact_logs_tenant_isolation ON contact_logs
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  case_id uuid NOT NULL REFERENCES triage_cases(id),
  destination_hospital_fa text NOT NULL,
  reason_fa text NOT NULL,
  urgent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'dispatched' CHECK (status IN ('dispatched', 'attended', 'missed')),
  miss_reason_fa text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS referrals_tenant_isolation ON referrals;
CREATE POLICY referrals_tenant_isolation ON referrals
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
