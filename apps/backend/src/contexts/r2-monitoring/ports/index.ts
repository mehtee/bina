import type { DbTx } from "../../../packages/db/index.js";
import type { EyeLaterality, UrgencyTier } from "../../../packages/domain-kernel/index.js";

export type DeviceVerificationStatus = "qualified" | "provisional" | "killed";

export interface CalibrationProfileRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly deviceFingerprintSha256: string;
  readonly screenWidthMm: number;
  readonly viewingDistanceCm: number;
  readonly calibratedBy: "clinic_staff" | "patient_card";
  readonly verified: boolean;
  readonly createdAtIso?: string | undefined;
}

export interface HomeVisionTestTrialInput {
  readonly trialIndex: number;
  readonly stimulus: Record<string, unknown>;
  readonly response: Record<string, unknown>;
  readonly reactionMs?: number | undefined;
  readonly correct?: boolean | undefined;
}

export interface HomeVisionTestTrialRecord extends HomeVisionTestTrialInput {
  readonly trialId: string;
  readonly testId: string;
  readonly createdAtIso: string;
}

export interface HomeVisionTestRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly calibrationProfileId?: string | null | undefined;
  readonly eyeLaterality: EyeLaterality;
  readonly testType: "landolt_c" | "amsler" | "contrast";
  readonly vaLogmar: number | null;
  readonly amslerDistortionScore: number;
  readonly amslerCentralScotoma: boolean;
  readonly viewingDistanceCm?: number | undefined;
  readonly ambientLux?: number | undefined;
  readonly deviceTiltDeg?: number | undefined;
  readonly glareDetected?: boolean | undefined;
  readonly qualityStatus: "accepted" | "rejected";
  readonly rejectionCodes: readonly string[];
  readonly measuredAtIso: string;
}

export interface VisionBaselineRecord {
  readonly id: string;
  readonly patientId: string;
  readonly eyeLaterality: EyeLaterality;
  readonly baselineVaLogmar: number;
  readonly baselineSigma: number;
  readonly establishedFromTestId: string;
}

export interface VisionTrendAlertRecord {
  readonly id: string;
  readonly patientId: string;
  readonly eyeLaterality: EyeLaterality;
  readonly ruleCode: string;
  readonly severity: UrgencyTier;
  readonly summaryFa: string;
  readonly ewmaValue: number;
  readonly cusumValue: number;
  readonly triageCaseId: string | null;
  readonly createdAtIso: string;
}

export interface DeviceQualificationRecord {
  readonly deviceId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly modelCode: string;
  readonly manufacturer: string;
  readonly displayPpi: number | null;
  readonly verifiedStatus: DeviceVerificationStatus;
  readonly killSwitchReasonFa: string | null;
  readonly updatedByUserId: string;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

export interface MonitoringPlanRecord {
  readonly planId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly eyeLaterality: EyeLaterality;
  readonly eyeLabelFa: string;
  readonly testTypes: string[];
  readonly cadenceDays: number;
  readonly alertThresholdLogmar: number;
  readonly active: boolean;
  readonly createdByUserId: string;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

export interface IopReadingRecord {
  readonly readingId: string;
  readonly patientId: string;
  readonly deviceVendor: string;
  readonly deviceSerialHash: string;
  readonly eyeLaterality: EyeLaterality;
  readonly eyeLabelFa: string;
  readonly iopMmHg: number;
  readonly qualityScore: number;
  readonly accepted: boolean;
  readonly measuredAtIso: string;
}

export interface R2MonitoringOverview {
  readonly activePlanCount: number;
  readonly enrolledPatientCount: number;
  readonly acceptedTestCount: number;
  readonly rejectedTestCount: number;
  readonly activeAlertCount: number;
  readonly killedDeviceCount: number;
  readonly latestAlerts: VisionTrendAlertRecord[];
}

export interface R2SessionDetailView {
  readonly session: HomeVisionTestRecord;
  readonly trials: HomeVisionTestTrialRecord[];
  readonly calibrationProfile: CalibrationProfileRecord | null;
  readonly alerts: VisionTrendAlertRecord[];
}

export interface R2MonitoringRepoPort {
  saveCalibrationProfile(
    tx: DbTx,
    input: Omit<CalibrationProfileRecord, "id" | "createdAtIso">
  ): Promise<CalibrationProfileRecord>;
  findCalibrationProfileById(tx: DbTx, profileId: string): Promise<CalibrationProfileRecord | null>;
  findDeviceByModelCode(tx: DbTx, modelCode: string): Promise<DeviceQualificationRecord | null>;
  findDeviceById(tx: DbTx, deviceId: string): Promise<DeviceQualificationRecord | null>;
  listDevices(tx: DbTx, clinicId: string): Promise<DeviceQualificationRecord[]>;
  upsertDevice(
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
  ): Promise<DeviceQualificationRecord>;
  updateDeviceStatus(
    tx: DbTx,
    deviceId: string,
    input: {
      verifiedStatus: DeviceVerificationStatus;
      killSwitchReasonFa?: string | null | undefined;
      updatedByUserId: string;
    }
  ): Promise<DeviceQualificationRecord | null>;
  insertHomeVisionTest(
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
  ): Promise<HomeVisionTestRecord>;
  insertTestTrials(
    tx: DbTx,
    tenantId: string,
    testId: string,
    trials: readonly HomeVisionTestTrialInput[]
  ): Promise<HomeVisionTestTrialRecord[]>;
  findHomeVisionTestById(tx: DbTx, sessionId: string): Promise<HomeVisionTestRecord | null>;
  listTestTrials(tx: DbTx, testId: string): Promise<HomeVisionTestTrialRecord[]>;
  listPatientSessions(
    tx: DbTx,
    patientId: string,
    filter: {
      eyeLaterality?: EyeLaterality | undefined;
      testType?: "landolt_c" | "amsler" | "contrast" | undefined;
      qualityStatus?: "accepted" | "rejected" | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: HomeVisionTestRecord[]; total: number }>;
  findBaseline(tx: DbTx, patientId: string, eye: EyeLaterality): Promise<VisionBaselineRecord | null>;
  createBaseline(
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
  ): Promise<VisionBaselineRecord>;
  listRecentAcceptedTests(
    tx: DbTx,
    patientId: string,
    eye: EyeLaterality,
    limit: number
  ): Promise<HomeVisionTestRecord[]>;
  insertTrendAlert(
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
  ): Promise<VisionTrendAlertRecord>;
  listPatientAlerts(tx: DbTx, patientId: string): Promise<VisionTrendAlertRecord[]>;
  listPatientIopReadings(tx: DbTx, patientId: string): Promise<IopReadingRecord[]>;
  listMonitoringPlans(tx: DbTx, patientId: string): Promise<MonitoringPlanRecord[]>;
  insertMonitoringPlan(
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
  ): Promise<MonitoringPlanRecord>;
  getMonitoringOverview(tx: DbTx, clinicId: string): Promise<R2MonitoringOverview>;
}
