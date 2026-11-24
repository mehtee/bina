import { randomUUID } from "node:crypto";
import {
  evaluateHomeTestQuality,
  evaluateReliableChangeAnd2OfN,
} from "../../../packages/clinical-rules/index.js";
import { insertOutboxEvent, type DbTx } from "../../../packages/db/index.js";
import type { EyeLaterality } from "../../../packages/domain-kernel/index.js";
import type { AuditLogPort } from "../../audit-compliance/ports/index.js";
import type { TriageCaseCreatorPort } from "../../triage-operations/ports/index.js";
import type {
  CalibrationProfileRecord,
  HomeVisionTestRecord,
  R2MonitoringRepoPort,
  VisionBaselineRecord,
  VisionTrendAlertRecord,
} from "../ports/index.js";

export interface SubmitHomeTestInput {
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly calibrationProfileId?: string | undefined;
  readonly eyeLaterality: EyeLaterality;
  readonly testType: "landolt_c" | "amsler" | "contrast";
  readonly vaLogmar?: number | undefined;
  readonly amslerDistortionScore?: number | undefined;
  readonly amslerCentralScotoma?: boolean | undefined;
  readonly viewingDistanceCm: number;
  readonly ambientLux: number;
  readonly deviceTiltDeg: number;
  readonly glareDetected: boolean;
}

export class R2MonitoringService {
  constructor(
    private readonly repo: R2MonitoringRepoPort,
    private readonly triageCreator: TriageCaseCreatorPort,
    private readonly auditLog: AuditLogPort
  ) {}

  async registerCalibrationProfile(
    tx: DbTx,
    input: Omit<CalibrationProfileRecord, "id">
  ): Promise<CalibrationProfileRecord> {
    const profile = await this.repo.saveCalibrationProfile(tx, input);
    await this.auditLog.append(tx, {
      tenantId: input.tenantId,
      actorUserId: input.patientId,
      actorRole: input.calibratedBy,
      action: "r2.calibration-registered",
      resourceType: "calibration_profile",
      resourceId: profile.id,
    });
    return profile;
  }

  async submitHomeTest(
    tx: DbTx,
    input: SubmitHomeTestInput
  ): Promise<{
    test: HomeVisionTestRecord;
    qualityPassed: boolean;
    qualityInstructionFa: string | null;
    baselineEstablished: boolean;
    baseline?: VisionBaselineRecord | undefined;
    alertTriggered: boolean;
    alert?: VisionTrendAlertRecord | undefined;
  }> {
    const quality = evaluateHomeTestQuality({
      viewingDistanceCm: input.viewingDistanceCm,
      ambientLux: input.ambientLux,
      deviceTiltDeg: input.deviceTiltDeg,
      glareDetected: input.glareDetected,
    });

    const test = await this.repo.insertHomeVisionTest(tx, {
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      patientId: input.patientId,
      calibrationProfileId: input.calibrationProfileId,
      eyeLaterality: input.eyeLaterality,
      testType: input.testType,
      vaLogmar: input.vaLogmar ?? null,
      amslerDistortionScore: input.amslerDistortionScore ?? 0,
      amslerCentralScotoma: Boolean(input.amslerCentralScotoma),
      viewingDistanceCm: input.viewingDistanceCm,
      ambientLux: input.ambientLux,
      deviceTiltDeg: input.deviceTiltDeg,
      glareDetected: input.glareDetected,
      qualityStatus: quality.passed ? "accepted" : "rejected",
      rejectionCodes: quality.rejectionCodes,
    });

    if (!quality.passed) {
      return {
        test,
        qualityPassed: false,
        qualityInstructionFa: quality.instructionFa,
        baselineEstablished: false,
        alertTriggered: false,
      };
    }

    let baseline = await this.repo.findBaseline(tx, input.patientId, input.eyeLaterality);
    let baselineEstablished = false;
    if (!baseline) {
      baseline = await this.repo.createBaseline(tx, {
        tenantId: input.tenantId,
        clinicId: input.clinicId,
        patientId: input.patientId,
        eyeLaterality: input.eyeLaterality,
        baselineVaLogmar: input.vaLogmar ?? 0.1,
        baselineSigma: 0.08,
        establishedFromTestId: test.id,
      });
      baselineEstablished = true;
    }

    const recent = await this.repo.listRecentAcceptedTests(tx, input.patientId, input.eyeLaterality, 12);
    const assessment = evaluateReliableChangeAnd2OfN({
      eyeLaterality: input.eyeLaterality,
      baselineVaLogmar: baseline.baselineVaLogmar,
      baselineSigma: baseline.baselineSigma,
      recentValidTests: recent.map((r) => ({
        vaLogmar: r.vaLogmar,
        amslerDistortionScore: r.amslerDistortionScore,
        amslerCentralScotoma: r.amslerCentralScotoma,
      })),
    });

    if (!assessment.alertTriggered) {
      return {
        test,
        qualityPassed: true,
        qualityInstructionFa: null,
        baselineEstablished,
        baseline,
        alertTriggered: false,
      };
    }

    const triageCase = await this.triageCreator.createOrEscalateCase(tx, {
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      patientId: input.patientId,
      sourcePillar: "pillar1_care",
      sourceRefId: test.id,
      eyeLaterality: input.eyeLaterality,
      urgencyTier: assessment.severity,
      ruleCode: assessment.ruleCode,
      summaryFa: assessment.summaryFa,
    });

    const alert = await this.repo.insertTrendAlert(tx, {
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      patientId: input.patientId,
      eyeLaterality: input.eyeLaterality,
      ruleCode: assessment.ruleCode,
      severity: assessment.severity,
      summaryFa: assessment.summaryFa,
      ewmaValue: assessment.ewmaValue,
      cusumValue: assessment.cusumValue,
      triageCaseId: triageCase.id,
    });

    if (assessment.severity === "urgent") {
      await insertOutboxEvent(tx, {
        tenantId: input.tenantId,
        eventType: "triage.urgent-triggered.v1",
        correlationId: randomUUID(),
        idempotencyKey: `r2:${alert.id}`,
        payload: {
          caseId: triageCase.id,
          patientId: input.patientId,
          sourcePillar: "pillar1_care",
          eyeLaterality: input.eyeLaterality,
          urgencyTier: "urgent",
          ruleCode: assessment.ruleCode,
        },
      });
    }

    return {
      test,
      qualityPassed: true,
      qualityInstructionFa: null,
      baselineEstablished,
      baseline,
      alertTriggered: true,
      alert,
    };
  }

  async getPatientTrends(
    tx: DbTx,
    patientId: string
  ): Promise<{
    baselines: { OD: VisionBaselineRecord | null; OS: VisionBaselineRecord | null };
    alerts: VisionTrendAlertRecord[];
  }> {
    const [od, os, alerts] = await Promise.all([
      this.repo.findBaseline(tx, patientId, "OD"),
      this.repo.findBaseline(tx, patientId, "OS"),
      this.repo.listPatientAlerts(tx, patientId),
    ]);
    return {
      baselines: { OD: od, OS: os },
      alerts,
    };
  }
}
