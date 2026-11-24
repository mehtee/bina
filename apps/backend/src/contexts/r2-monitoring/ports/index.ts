import type { DbTx } from "../../../packages/db/index.js";
import type { EyeLaterality, UrgencyTier } from "../../../packages/domain-kernel/index.js";

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
}

export interface HomeVisionTestRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly eyeLaterality: EyeLaterality;
  readonly testType: "landolt_c" | "amsler" | "contrast";
  readonly vaLogmar: number | null;
  readonly amslerDistortionScore: number;
  readonly amslerCentralScotoma: boolean;
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

export interface R2MonitoringRepoPort {
  saveCalibrationProfile(
    tx: DbTx,
    input: Omit<CalibrationProfileRecord, "id">
  ): Promise<CalibrationProfileRecord>;
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
}
