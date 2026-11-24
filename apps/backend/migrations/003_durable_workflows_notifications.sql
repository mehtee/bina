-- Migration 003: Notification Deliveries & Durable Workflow Executions

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  channel text NOT NULL CHECK (channel IN ('sms_ir', 'push', 'voice')),
  template_key text NOT NULL,
  recipient_phone_hash text NOT NULL,
  provider_message_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('accepted', 'delivered', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_deliveries_tenant_isolation ON notification_deliveries;
CREATE POLICY notification_deliveries_tenant_isolation ON notification_deliveries
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  workflow_type text NOT NULL,
  business_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'waiting', 'completed', 'escalated', 'failed')),
  state_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_run_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, workflow_type, business_key)
);
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS workflow_executions_tenant_isolation ON workflow_executions;
CREATE POLICY workflow_executions_tenant_isolation ON workflow_executions
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
