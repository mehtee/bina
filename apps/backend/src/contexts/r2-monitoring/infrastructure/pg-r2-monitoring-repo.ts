import type { DbTx } from "../../../packages/db/index.js";
import { formatLateralityFa, type EyeLaterality, type UrgencyTier } from "../../../packages/domain-kernel/index.js";
import type {
  CalibrationProfileRecord,
  DeviceQualificationRecord,
  DeviceVerificationStatus,
  HomeVisionTestRecord,
  HomeVisionTestTrialInput,
  HomeVisionTestTrialRecord,
  IopReadingRecord,
  MonitoringPlanRecord,
  R2MonitoringOverview,
  R2MonitoringRepoPort,
  VisionBaselineRecord,
  VisionTrendAlertRecord,
} from "../ports/index.js";

interface DeviceRow {
  id: string;
  tenant_id: string;
  clinic_id: string;
  model_code: string;
  manufacturer: string;
  display_ppi: number | null;
  verified_status: DeviceVerificationStatus;
  kill_switch_reason_fa: string | null;
  updated_by_user_id: string;
  created_at: Date;
  updated_at: Date;
}

function mapDeviceRow(r: DeviceRow): DeviceQualificationRecord {
  return {
    deviceId: r.id,
    tenantId: r.tenant_id,
    clinicId: r.clinic_id,
    modelCode: r.model_code,
    manufacturer: r.manufacturer,
    displayPpi: r.display_ppi,
    verifiedStatus: r.verified_status,
    killSwitchReasonFa: r.kill_switch_reason_fa,
    updatedByUserId: r.updated_by_user_id,
    createdAtIso: r.created_at.toISOString(),
    updatedAtIso: r.updated_at.toISOString(),
  };
}

export class PgR2MonitoringRepo implements R2MonitoringRepoPort {
  async saveCalibrationProfile(
    tx: DbTx,
    input: Omit<CalibrationProfileRecord, "id" | "createdAtIso">
  ): Promise<CalibrationProfileRecord> {
    const res = await tx.query<{ id: string; created_at: Date }>(
      `INSERT INTO calibration_profiles (
         tenant_id, clinic_id, patient_id, device_fingerprint_sha256,
         screen_width_mm, viewing_distance_cm, calibrated_by, verified
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
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
    return {
      ...input,
      id: res.rows[0]!.id,
      createdAtIso: res.rows[0]!.created_at.toISOString(),
    };
  }

  async findCalibrationProfileById(tx: DbTx, profileId: string): Promise<CalibrationProfileRecord | null> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      patient_id: string;
      device_fingerprint_sha256: string;
      screen_width_mm: number;
      viewing_distance_cm: number;
      calibrated_by: "clinic_staff" | "patient_card";
      verified: boolean;
      created_at: Date;
    }>(
      `SELECT id, tenant_id, clinic_id, patient_id, device_fingerprint_sha256,
              screen_width_mm, viewing_distance_cm, calibrated_by, verified, created_at
       FROM calibration_profiles WHERE id = $1`,
      [profileId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      patientId: r.patient_id,
      deviceFingerprintSha256: r.device_fingerprint_sha256,
      screenWidthMm: r.screen_width_mm,
      viewingDistanceCm: r.viewing_distance_cm,
      calibratedBy: r.calibrated_by,
      verified: r.verified,
      createdAtIso: r.created_at.toISOString(),
    };
  }

  async findDeviceByModelCode(tx: DbTx, modelCode: string): Promise<DeviceQualificationRecord | null> {
    const res = await tx.query<DeviceRow>(
      `SELECT * FROM device_qualification_registry WHERE model_code = $1 LIMIT 1`,
      [modelCode]
    );
    return res.rows[0] ? mapDeviceRow(res.rows[0]) : null;
  }

  async findDeviceById(tx: DbTx, deviceId: string): Promise<DeviceQualificationRecord | null> {
    const res = await tx.query<DeviceRow>(
      `SELECT * FROM device_qualification_registry WHERE id = $1 LIMIT 1`,
      [deviceId]
    );
    return res.rows[0] ? mapDeviceRow(res.rows[0]) : null;
  }

  async listDevices(tx: DbTx, clinicId: string): Promise<DeviceQualificationRecord[]> {
    const res = await tx.query<DeviceRow>(
      `SELECT * FROM device_qualification_registry WHERE clinic_id = $1 ORDER BY updated_at DESC`,
      [clinicId]
    );
    return res.rows.map(mapDeviceRow);
  }

  async upsertDevice(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      modelCode: string;
      manufacturer: string;
      displayPpi?: number | undefined;
      verifiedStatus: DeviceVerificationStatus;
      killSwitchReasonFa?: string | undefined;
      updatedByUserId: string;
    }
  ): Promise<DeviceQualificationRecord> {
    const res = await tx.query<DeviceRow>(
      `INSERT INTO device_qualification_registry
         (tenant_id, clinic_id, model_code, manufacturer, display_ppi, verified_status, kill_switch_reason_fa, updated_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (tenant_id, model_code) DO UPDATE
         SET manufacturer = EXCLUDED.manufacturer,
             display_ppi = COALESCE(EXCLUDED.display_ppi, device_qualification_registry.display_ppi),
             verified_status = EXCLUDED.verified_status,
             kill_switch_reason_fa = EXCLUDED.kill_switch_reason_fa,
             updated_by_user_id = EXCLUDED.updated_by_user_id,
             updated_at = now()
       RETURNING *`,
      [
        input.tenantId,
        input.clinicId,
        input.modelCode,
        input.manufacturer,
        input.displayPpi ?? null,
        input.verifiedStatus,
        input.killSwitchReasonFa ?? null,
        input.updatedByUserId,
      ]
    );
    return mapDeviceRow(res.rows[0]!);
  }

  async updateDeviceStatus(
    tx: DbTx,
    deviceId: string,
    input: {
      verifiedStatus: DeviceVerificationStatus;
      killSwitchReasonFa?: string | null | undefined;
      updatedByUserId: string;
    }
  ): Promise<DeviceQualificationRecord | null> {
    const res = await tx.query<DeviceRow>(
      `UPDATE device_qualification_registry
       SET verified_status = $2,
           kill_switch_reason_fa = $3,
           updated_by_user_id = $4,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        deviceId,
        input.verifiedStatus,
        input.killSwitchReasonFa ?? null,
        input.updatedByUserId,
      ]
    );
    return res.rows[0] ? mapDeviceRow(res.rows[0]) : null;
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
      calibrationProfileId: input.calibrationProfileId ?? null,
      eyeLaterality: input.eyeLaterality,
      testType: input.testType,
      vaLogmar: input.vaLogmar,
      amslerDistortionScore: input.amslerDistortionScore,
      amslerCentralScotoma: input.amslerCentralScotoma,
      viewingDistanceCm: input.viewingDistanceCm,
      ambientLux: input.ambientLux,
      deviceTiltDeg: input.deviceTiltDeg,
      glareDetected: input.glareDetected,
      qualityStatus: input.qualityStatus,
      rejectionCodes: input.rejectionCodes,
      measuredAtIso: row.measured_at.toISOString(),
    };
  }

  async insertTestTrials(
    tx: DbTx,
    tenantId: string,
    testId: string,
    trials: readonly HomeVisionTestTrialInput[]
  ): Promise<HomeVisionTestTrialRecord[]> {
    const saved: HomeVisionTestTrialRecord[] = [];
    for (const t of trials) {
      const res = await tx.query<{
        id: string;
        test_id: string;
        trial_index: number;
        stimulus_json: Record<string, unknown>;
        response_json: Record<string, unknown>;
        reaction_ms: number | null;
        correct: boolean | null;
        created_at: Date;
      }>(
        `INSERT INTO home_vision_test_trials
           (tenant_id, test_id, trial_index, stimulus_json, response_json, reaction_ms, correct)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)
         RETURNING id, test_id, trial_index, stimulus_json, response_json, reaction_ms, correct, created_at`,
        [
          tenantId,
          testId,
          t.trialIndex,
          JSON.stringify(t.stimulus),
          JSON.stringify(t.response),
          t.reactionMs ?? null,
          t.correct ?? null,
        ]
      );
      const r = res.rows[0]!;
      saved.push({
        trialId: r.id,
        testId: r.test_id,
        trialIndex: r.trial_index,
        stimulus: r.stimulus_json,
        response: r.response_json,
        reactionMs: r.reaction_ms ?? undefined,
        correct: r.correct ?? undefined,
        createdAtIso: r.created_at.toISOString(),
      });
    }
    return saved;
  }

  async findHomeVisionTestById(tx: DbTx, sessionId: string): Promise<HomeVisionTestRecord | null> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      patient_id: string;
      calibration_profile_id: string | null;
      eye_laterality: EyeLaterality;
      test_type: "landolt_c" | "amsler" | "contrast";
      va_logmar: number | null;
      amsler_distortion_score: number | null;
      amsler_central_scotoma: boolean;
      viewing_distance_cm: number;
      ambient_lux: number;
      device_tilt_deg: number;
      glare_detected: boolean;
      quality_status: "accepted" | "rejected";
      rejection_codes_json: string[];
      measured_at: Date;
    }>(
      `SELECT id, tenant_id, clinic_id, patient_id, calibration_profile_id, eye_laterality, test_type,
              va_logmar, amsler_distortion_score, amsler_central_scotoma, viewing_distance_cm, ambient_lux,
              device_tilt_deg, glare_detected, quality_status, rejection_codes_json, measured_at
       FROM home_vision_tests WHERE id = $1`,
      [sessionId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      patientId: r.patient_id,
      calibrationProfileId: r.calibration_profile_id,
      eyeLaterality: r.eye_laterality,
      testType: r.test_type,
      vaLogmar: r.va_logmar,
      amslerDistortionScore: r.amsler_distortion_score ?? 0,
      amslerCentralScotoma: r.amsler_central_scotoma,
      viewingDistanceCm: r.viewing_distance_cm,
      ambientLux: r.ambient_lux,
      deviceTiltDeg: r.device_tilt_deg,
      glareDetected: r.glare_detected,
      qualityStatus: r.quality_status,
      rejectionCodes: r.rejection_codes_json ?? [],
      measuredAtIso: r.measured_at.toISOString(),
    };
  }

  async listTestTrials(tx: DbTx, testId: string): Promise<HomeVisionTestTrialRecord[]> {
    const res = await tx.query<{
      id: string;
      test_id: string;
      trial_index: number;
      stimulus_json: Record<string, unknown>;
      response_json: Record<string, unknown>;
      reaction_ms: number | null;
      correct: boolean | null;
      created_at: Date;
    }>(
      `SELECT id, test_id, trial_index, stimulus_json, response_json, reaction_ms, correct, created_at
       FROM home_vision_test_trials
       WHERE test_id = $1
       ORDER BY trial_index ASC`,
      [testId]
    );
    return res.rows.map((r) => ({
      trialId: r.id,
      testId: r.test_id,
      trialIndex: r.trial_index,
      stimulus: r.stimulus_json,
      response: r.response_json,
      reactionMs: r.reaction_ms ?? undefined,
      correct: r.correct ?? undefined,
      createdAtIso: r.created_at.toISOString(),
    }));
  }

  async listPatientSessions(
    tx: DbTx,
    patientId: string,
    filter: {
      eyeLaterality?: EyeLaterality | undefined;
      testType?: "landolt_c" | "amsler" | "contrast" | undefined;
      qualityStatus?: "accepted" | "rejected" | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: HomeVisionTestRecord[]; total: number }> {
    const conditions: string[] = [`patient_id = $1`];
    const params: unknown[] = [patientId];
    const push = (v: unknown): string => {
      params.push(v);
      return `$${params.length}`;
    };
    if (filter.eyeLaterality) conditions.push(`eye_laterality = ${push(filter.eyeLaterality)}`);
    if (filter.testType) conditions.push(`test_type = ${push(filter.testType)}`);
    if (filter.qualityStatus) conditions.push(`quality_status = ${push(filter.qualityStatus)}`);

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const countRes = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt FROM home_vision_tests ${whereClause}`,
      params
    );
    const total = Number(countRes.rows[0]?.cnt ?? "0");

    const limitP = push(filter.limit);
    const offsetP = push(filter.offset);

    const rowsRes = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      patient_id: string;
      calibration_profile_id: string | null;
      eye_laterality: EyeLaterality;
      test_type: "landolt_c" | "amsler" | "contrast";
      va_logmar: number | null;
      amsler_distortion_score: number | null;
      amsler_central_scotoma: boolean;
      viewing_distance_cm: number;
      ambient_lux: number;
      device_tilt_deg: number;
      glare_detected: boolean;
      quality_status: "accepted" | "rejected";
      rejection_codes_json: string[];
      measured_at: Date;
    }>(
      `SELECT id, tenant_id, clinic_id, patient_id, calibration_profile_id, eye_laterality, test_type,
              va_logmar, amsler_distortion_score, amsler_central_scotoma, viewing_distance_cm, ambient_lux,
              device_tilt_deg, glare_detected, quality_status, rejection_codes_json, measured_at
       FROM home_vision_tests
       ${whereClause}
       ORDER BY measured_at DESC
       LIMIT ${limitP} OFFSET ${offsetP}`,
      params
    );

    const items: HomeVisionTestRecord[] = rowsRes.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      patientId: r.patient_id,
      calibrationProfileId: r.calibration_profile_id,
      eyeLaterality: r.eye_laterality,
      testType: r.test_type,
      vaLogmar: r.va_logmar,
      amslerDistortionScore: r.amsler_distortion_score ?? 0,
      amslerCentralScotoma: r.amsler_central_scotoma,
      viewingDistanceCm: r.viewing_distance_cm,
      ambientLux: r.ambient_lux,
      deviceTiltDeg: r.device_tilt_deg,
      glareDetected: r.glare_detected,
      qualityStatus: r.quality_status,
      rejectionCodes: r.rejection_codes_json ?? [],
      measuredAtIso: r.measured_at.toISOString(),
    }));

    return { items, total };
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

  async listPatientIopReadings(tx: DbTx, patientId: string): Promise<IopReadingRecord[]> {
    const res = await tx.query<{
      id: string;
      patient_id: string;
      device_vendor: string;
      device_serial_hash: string;
      eye_laterality: EyeLaterality;
      iop_mm_hg: number;
      quality_score: number;
      accepted: boolean;
      measured_at: Date;
    }>(
      `SELECT id, patient_id, device_vendor, device_serial_hash, eye_laterality, iop_mm_hg, quality_score, accepted, measured_at
       FROM external_tonometry_readings
       WHERE patient_id = $1
       ORDER BY measured_at DESC`,
      [patientId]
    );
    return res.rows.map((r) => ({
      readingId: r.id,
      patientId: r.patient_id,
      deviceVendor: r.device_vendor,
      deviceSerialHash: r.device_serial_hash,
      eyeLaterality: r.eye_laterality,
      eyeLabelFa: formatLateralityFa(r.eye_laterality),
      iopMmHg: r.iop_mm_hg,
      qualityScore: r.quality_score,
      accepted: r.accepted,
      measuredAtIso: r.measured_at.toISOString(),
    }));
  }

  async listMonitoringPlans(tx: DbTx, patientId: string): Promise<MonitoringPlanRecord[]> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      patient_id: string;
      eye_laterality: EyeLaterality;
      test_types_json: string[];
      cadence_days: number;
      alert_threshold_logmar: number;
      active: boolean;
      created_by_user_id: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM monitoring_plans WHERE patient_id = $1 ORDER BY created_at DESC`,
      [patientId]
    );
    return res.rows.map((r) => ({
      planId: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      patientId: r.patient_id,
      eyeLaterality: r.eye_laterality,
      eyeLabelFa: formatLateralityFa(r.eye_laterality),
      testTypes: r.test_types_json ?? [],
      cadenceDays: r.cadence_days,
      alertThresholdLogmar: r.alert_threshold_logmar,
      active: r.active,
      createdByUserId: r.created_by_user_id,
      createdAtIso: r.created_at.toISOString(),
      updatedAtIso: r.updated_at.toISOString(),
    }));
  }

  async insertMonitoringPlan(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      patientId: string;
      eyeLaterality: EyeLaterality;
      testTypes: string[];
      cadenceDays: number;
      alertThresholdLogmar: number;
      active: boolean;
      createdByUserId: string;
    }
  ): Promise<MonitoringPlanRecord> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      patient_id: string;
      eye_laterality: EyeLaterality;
      test_types_json: string[];
      cadence_days: number;
      alert_threshold_logmar: number;
      active: boolean;
      created_by_user_id: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO monitoring_plans
         (tenant_id, clinic_id, patient_id, eye_laterality, test_types_json, cadence_days, alert_threshold_logmar, active, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.tenantId,
        input.clinicId,
        input.patientId,
        input.eyeLaterality,
        JSON.stringify(input.testTypes),
        input.cadenceDays,
        input.alertThresholdLogmar,
        input.active,
        input.createdByUserId,
      ]
    );
    const r = res.rows[0]!;
    return {
      planId: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      patientId: r.patient_id,
      eyeLaterality: r.eye_laterality,
      eyeLabelFa: formatLateralityFa(r.eye_laterality),
      testTypes: r.test_types_json ?? [],
      cadenceDays: r.cadence_days,
      alertThresholdLogmar: r.alert_threshold_logmar,
      active: r.active,
      createdByUserId: r.created_by_user_id,
      createdAtIso: r.created_at.toISOString(),
      updatedAtIso: r.updated_at.toISOString(),
    };
  }

  async getMonitoringOverview(tx: DbTx, clinicId: string): Promise<R2MonitoringOverview> {
    const countsRes = await tx.query<{
      active_plans: string;
      enrolled_patients: string;
      accepted_tests: string;
      rejected_tests: string;
      active_alerts: string;
      killed_devices: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM monitoring_plans WHERE clinic_id = $1 AND active = true) AS active_plans,
         (SELECT count(DISTINCT patient_id)::text FROM home_vision_tests WHERE clinic_id = $1) AS enrolled_patients,
         (SELECT count(*)::text FROM home_vision_tests WHERE clinic_id = $1 AND quality_status = 'accepted') AS accepted_tests,
         (SELECT count(*)::text FROM home_vision_tests WHERE clinic_id = $1 AND quality_status = 'rejected') AS rejected_tests,
         (SELECT count(*)::text FROM vision_trend_alerts WHERE clinic_id = $1) AS active_alerts,
         (SELECT count(*)::text FROM device_qualification_registry WHERE clinic_id = $1 AND verified_status = 'killed') AS killed_devices`,
      [clinicId]
    );
    const c = countsRes.rows[0]!;
    const alertsRes = await tx.query<{
      id: string;
      patient_id: string;
      eye_laterality: EyeLaterality;
      rule_code: string;
      severity: UrgencyTier;
      summary_fa: string;
      ewma_value: number;
      cusum_value: number;
      triage_case_id: string | null;
      created_at: Date;
    }>(
      `SELECT id, patient_id, eye_laterality, rule_code, severity, summary_fa, ewma_value, cusum_value, triage_case_id, created_at
       FROM vision_trend_alerts
       WHERE clinic_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [clinicId]
    );

    return {
      activePlanCount: Number(c.active_plans),
      enrolledPatientCount: Number(c.enrolled_patients),
      acceptedTestCount: Number(c.accepted_tests),
      rejectedTestCount: Number(c.rejected_tests),
      activeAlertCount: Number(c.active_alerts),
      killedDeviceCount: Number(c.killed_devices),
      latestAlerts: alertsRes.rows.map((r) => ({
        id: r.id,
        patientId: r.patient_id,
        eyeLaterality: r.eye_laterality,
        ruleCode: r.rule_code,
        severity: r.severity,
        summaryFa: r.summary_fa,
        ewmaValue: r.ewma_value,
        cusumValue: r.cusum_value,
        triageCaseId: r.triage_case_id,
        createdAtIso: r.created_at.toISOString(),
      })),
    };
  }
}
