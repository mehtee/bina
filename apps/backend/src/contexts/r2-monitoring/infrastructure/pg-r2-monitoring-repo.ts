import type { DbTx } from "../../../packages/db/index.js";
import type { EyeLaterality, UrgencyTier } from "../../../packages/domain-kernel/index.js";
import type {
  CalibrationProfileRecord,
  HomeVisionTestRecord,
  R2MonitoringRepoPort,
  VisionBaselineRecord,
  VisionTrendAlertRecord,
} from "../ports/index.js";

export class PgR2MonitoringRepo implements R2MonitoringRepoPort {
  async saveCalibrationProfile(
    tx: DbTx,
    input: Omit<CalibrationProfileRecord, "id">
  ): Promise<CalibrationProfileRecord> {
    const res = await tx.query<{ id: string }>(
      `INSERT INTO calibration_profiles (
         tenant_id, clinic_id, patient_id, device_fingerprint_sha256,
         screen_width_mm, viewing_distance_cm, calibrated_by, verified
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        input.tenantId,
        input.clinicId,
        input.patientId,
        input.deviceFingerprintSha256,
        input.screenWidthMm,
        input.viewingDistanceCm,
        input.calibratedBy,
        input.verified,
      ]
    );
    return { ...input, id: res.rows[0]!.id };
  }

  async insertHomeVisionTest(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      patientId: string;
      calibrationProfileId?: string | undefined;
      eyeLaterality: EyeLaterality;
      testType: "landolt_c" | "amsler" | "contrast";
      vaLogmar: number | null;
      amslerDistortionScore: number;
      amslerCentralScotoma: boolean;
      viewingDistanceCm: number;
      ambientLux: number;
      deviceTiltDeg: number;
      glareDetected: boolean;
      qualityStatus: "accepted" | "rejected";
      rejectionCodes: readonly string[];
    }
  ): Promise<HomeVisionTestRecord> {
    const res = await tx.query<{ id: string; measured_at: Date }>(
      `INSERT INTO home_vision_tests (
         tenant_id, clinic_id, patient_id, calibration_profile_id, eye_laterality, test_type,
         va_logmar, amsler_distortion_score, amsler_central_scotoma,
         viewing_distance_cm, ambient_lux, device_tilt_deg, glare_detected,
         quality_status, rejection_codes_json
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb)
       RETURNING id, measured_at`,
      [
        input.tenantId,
        input.clinicId,
        input.patientId,
        input.calibrationProfileId ?? null,
        input.eyeLaterality,
        input.testType,
        input.vaLogmar,
        input.amslerDistortionScore,
        input.amslerCentralScotoma,
        input.viewingDistanceCm,
        input.ambientLux,
        input.deviceTiltDeg,
        input.glareDetected,
        input.qualityStatus,
        JSON.stringify(input.rejectionCodes),
      ]
    );
    const row = res.rows[0]!;
    return {
      id: row.id,
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      patientId: input.patientId,
      eyeLaterality: input.eyeLaterality,
      testType: input.testType,
      vaLogmar: input.vaLogmar,
      amslerDistortionScore: input.amslerDistortionScore,
      amslerCentralScotoma: input.amslerCentralScotoma,
      qualityStatus: input.qualityStatus,
      rejectionCodes: input.rejectionCodes,
      measuredAtIso: row.measured_at.toISOString(),
    };
  }

  async findBaseline(
    tx: DbTx,
    patientId: string,
    eye: EyeLaterality
  ): Promise<VisionBaselineRecord | null> {
    const res = await tx.query<{
      id: string;
      baseline_va_logmar: number;
      baseline_sigma: number;
      established_from_test_id: string;
    }>(
      `SELECT id, baseline_va_logmar, baseline_sigma, established_from_test_id
       FROM vision_baselines
       WHERE patient_id = $1 AND eye_laterality = $2
       LIMIT 1`,
      [patientId, eye]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      patientId,
      eyeLaterality: eye,
      baselineVaLogmar: row.baseline_va_logmar,
      baselineSigma: row.baseline_sigma,
      establishedFromTestId: row.established_from_test_id,
    };
  }

  async createBaseline(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      patientId: string;
      eyeLaterality: EyeLaterality;
      baselineVaLogmar: number;
      baselineSigma: number;
      establishedFromTestId: string;
    }
  ): Promise<VisionBaselineRecord> {
    const res = await tx.query<{ id: string }>(
      `INSERT INTO vision_baselines (
         tenant_id, clinic_id, patient_id, eye_laterality,
         baseline_va_logmar, baseline_sigma, established_from_test_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        input.tenantId,
        input.clinicId,
        input.patientId,
        input.eyeLaterality,
        input.baselineVaLogmar,
        input.baselineSigma,
        input.establishedFromTestId,
      ]
    );
    return {
      id: res.rows[0]!.id,
      patientId: input.patientId,
      eyeLaterality: input.eyeLaterality,
      baselineVaLogmar: input.baselineVaLogmar,
      baselineSigma: input.baselineSigma,
      establishedFromTestId: input.establishedFromTestId,
    };
  }

  async listRecentAcceptedTests(
    tx: DbTx,
    patientId: string,
    eye: EyeLaterality,
    limit: number
  ): Promise<HomeVisionTestRecord[]> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      eye_laterality: EyeLaterality;
      test_type: "landolt_c" | "amsler" | "contrast";
      va_logmar: number | null;
      amsler_distortion_score: number | null;
      amsler_central_scotoma: boolean;
      measured_at: Date;
    }>(
      `SELECT id, tenant_id, clinic_id, eye_laterality, test_type,
              va_logmar, amsler_distortion_score, amsler_central_scotoma, measured_at
       FROM home_vision_tests
       WHERE patient_id = $1 AND eye_laterality = $2 AND quality_status = 'accepted'
       ORDER BY measured_at ASC
       LIMIT $3`,
      [patientId, eye, limit]
    );
    return res.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      patientId,
      eyeLaterality: r.eye_laterality,
      testType: r.test_type,
      vaLogmar: r.va_logmar,
      amslerDistortionScore: r.amsler_distortion_score ?? 0,
      amslerCentralScotoma: r.amsler_central_scotoma,
      qualityStatus: "accepted",
      rejectionCodes: [],
      measuredAtIso: r.measured_at.toISOString(),
    }));
  }

  async insertTrendAlert(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      patientId: string;
      eyeLaterality: EyeLaterality;
      ruleCode: string;
      severity: UrgencyTier;
      summaryFa: string;
      ewmaValue: number;
      cusumValue: number;
      triageCaseId: string | null;
    }
  ): Promise<VisionTrendAlertRecord> {
    const res = await tx.query<{ id: string; created_at: Date }>(
      `INSERT INTO vision_trend_alerts (
         tenant_id, clinic_id, patient_id, eye_laterality, rule_code,
         severity, summary_fa, ewma_value, cusum_value, triage_case_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, created_at`,
      [
        input.tenantId,
        input.clinicId,
        input.patientId,
        input.eyeLaterality,
        input.ruleCode,
        input.severity,
        input.summaryFa,
        input.ewmaValue,
        input.cusumValue,
        input.triageCaseId,
      ]
    );
    const row = res.rows[0]!;
    return {
      id: row.id,
      patientId: input.patientId,
      eyeLaterality: input.eyeLaterality,
      ruleCode: input.ruleCode,
      severity: input.severity,
      summaryFa: input.summaryFa,
      ewmaValue: input.ewmaValue,
      cusumValue: input.cusumValue,
      triageCaseId: input.triageCaseId,
      createdAtIso: row.created_at.toISOString(),
    };
  }

  async listPatientAlerts(tx: DbTx, patientId: string): Promise<VisionTrendAlertRecord[]> {
    const res = await tx.query<{
      id: string;
      eye_laterality: EyeLaterality;
      rule_code: string;
      severity: UrgencyTier;
      summary_fa: string;
      ewma_value: number;
      cusum_value: number;
      triage_case_id: string | null;
      created_at: Date;
    }>(
      `SELECT id, eye_laterality, rule_code, severity, summary_fa,
              ewma_value, cusum_value, triage_case_id, created_at
       FROM vision_trend_alerts
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [patientId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      patientId,
      eyeLaterality: r.eye_laterality,
      ruleCode: r.rule_code,
      severity: r.severity,
      summaryFa: r.summary_fa,
      ewmaValue: r.ewma_value,
      cusumValue: r.cusum_value,
      triageCaseId: r.triage_case_id,
      createdAtIso: r.created_at.toISOString(),
    }));
  }
}
