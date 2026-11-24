-- Migration 008: Pillar 1 R2 Home Vision Monitoring & External Self-Tonometry (iCare HOME2)

CREATE TABLE IF NOT EXISTS calibration_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  device_fingerprint_sha256 text NOT NULL,
  screen_width_mm double precision NOT NULL CHECK (screen_width_mm > 20),
  viewing_distance_cm double precision NOT NULL CHECK (viewing_distance_cm BETWEEN 25 AND 60),
  calibrated_by text NOT NULL CHECK (calibrated_by IN ('clinic_staff', 'patient_card')),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE calibration_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_profiles FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS calibration_profiles_tenant_isolation ON calibration_profiles;
CREATE POLICY calibration_profiles_tenant_isolation ON calibration_profiles
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS home_vision_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  calibration_profile_id uuid REFERENCES calibration_profiles(id),
  eye_laterality text NOT NULL CHECK (eye_laterality IN ('OD', 'OS')),
  test_type text NOT NULL CHECK (test_type IN ('landolt_c', 'amsler', 'contrast')),
  va_logmar double precision,
  amsler_distortion_score double precision CHECK (amsler_distortion_score >= 0 AND amsler_distortion_score <= 1),
  amsler_central_scotoma boolean NOT NULL DEFAULT false,
  viewing_distance_cm double precision NOT NULL,
  ambient_lux double precision NOT NULL,
  device_tilt_deg double precision NOT NULL,
  glare_detected boolean NOT NULL DEFAULT false,
  quality_status text NOT NULL CHECK (quality_status IN ('accepted', 'rejected')),
  rejection_codes_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  measured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE home_vision_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_vision_tests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS home_vision_tests_tenant_isolation ON home_vision_tests;
CREATE POLICY home_vision_tests_tenant_isolation ON home_vision_tests
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS vision_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  eye_laterality text NOT NULL CHECK (eye_laterality IN ('OD', 'OS')),
  baseline_va_logmar double precision NOT NULL,
  baseline_sigma double precision NOT NULL DEFAULT 0.08,
  established_from_test_id uuid NOT NULL REFERENCES home_vision_tests(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, patient_id, eye_laterality)
);
ALTER TABLE vision_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_baselines FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vision_baselines_tenant_isolation ON vision_baselines;
CREATE POLICY vision_baselines_tenant_isolation ON vision_baselines
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS vision_trend_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  eye_laterality text NOT NULL CHECK (eye_laterality IN ('OD', 'OS')),
  rule_code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('routine', 'followup_3_6m', 'urgent')),
  summary_fa text NOT NULL,
  ewma_value double precision NOT NULL,
  cusum_value double precision NOT NULL,
  triage_case_id uuid REFERENCES triage_cases(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE vision_trend_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_trend_alerts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vision_trend_alerts_tenant_isolation ON vision_trend_alerts;
CREATE POLICY vision_trend_alerts_tenant_isolation ON vision_trend_alerts
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TABLE IF NOT EXISTS external_tonometry_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  device_vendor text NOT NULL DEFAULT 'iCare_HOME2',
  device_serial_hash text NOT NULL,
  eye_laterality text NOT NULL CHECK (eye_laterality IN ('OD', 'OS')),
  iop_mm_hg double precision NOT NULL CHECK (iop_mm_hg BETWEEN 3 AND 80),
  quality_score double precision NOT NULL CHECK (quality_score BETWEEN 0 AND 1),
  accepted boolean NOT NULL,
  measured_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE external_tonometry_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_tonometry_readings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS external_tonometry_readings_tenant_isolation ON external_tonometry_readings;
CREATE POLICY external_tonometry_readings_tenant_isolation ON external_tonometry_readings
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
