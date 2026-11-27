import { randomUUID } from "node:crypto";
import { authorizeStaffAction, type StaffPrincipal } from "../../../packages/authz/index.js";
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
  DeviceQualificationRecord,
  DeviceVerificationStatus,
  HomeVisionTestRecord,
  HomeVisionTestTrialInput,
  HomeVisionTestTrialRecord,
  IopReadingRecord,
  MonitoringPlanRecord,
  R2MonitoringOverview,
  R2MonitoringRepoPort,
  R2SessionDetailView,
  VisionBaselineRecord,
  VisionTrendAlertRecord,
} from "../ports/index.js";

export class R2MonitoringError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    messageFa: string
  ) {
    super(messageFa);
    this.name = "R2MonitoringError";
  }
}

export interface SubmitHomeTestInput {
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly calibrationProfileId?: string | undefined;
  readonly deviceModelCode?: string | undefined;
  readonly eyeLaterality: EyeLaterality;
  readonly testType: "landolt_c" | "amsler" | "contrast";
  readonly vaLogmar?: number | undefined;
  readonly amslerDistortionScore?: number | undefined;
  readonly amslerCentralScotoma?: boolean | undefined;
  readonly viewingDistanceCm: number;
  readonly ambientLux: number;
  readonly deviceTiltDeg: number;
  readonly glareDetected: boolean;
  readonly rawTrials?: readonly HomeVisionTestTrialInput[] | undefined;
}

export class R2MonitoringService {
  constructor(
    private readonly repo: R2MonitoringRepoPort,
    private readonly triageCreator: TriageCaseCreatorPort,
    private readonly auditLog: AuditLogPort
  ) {}

  async registerCalibrationProfile(
    tx: DbTx,
    input: Omit<CalibrationProfileRecord, "id" | "createdAtIso">
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
    trials: HomeVisionTestTrialRecord[];
    qualityPassed: boolean;
    qualityInstructionFa: string | null;
    baselineEstablished: boolean;
    baseline?: VisionBaselineRecord | undefined;
    alertTriggered: boolean;
    alert?: VisionTrendAlertRecord | undefined;
  }> {
    if (input.deviceModelCode) {
      const device = await this.repo.findDeviceByModelCode(tx, input.deviceModelCode);
      if (device && device.verifiedStatus === "killed") {
        throw new R2MonitoringError(
          422,
          "DEVICE_KILL_SWITCH_ACTIVE",
          device.killSwitchReasonFa ??
            `ثبت آزمون از دستگاه «${device.modelCode}» به دلیل غیرفعالسازی ایمنی (Kill-Switch) مسدود شده است.`
        );
      }
    }

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

    const trials =
      input.rawTrials && input.rawTrials.length > 0
        ? await this.repo.insertTestTrials(tx, input.tenantId, test.id, input.rawTrials)
        : [];

    if (!quality.passed) {
      return {
        test,
        trials,
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
        trials,
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
      trials,
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

  async getMonitoringOverview(
    tx: DbTx,
    principal: StaffPrincipal
  ): Promise<R2MonitoringOverview> {
    const decision = authorizeStaffAction(principal, "r2:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new R2MonitoringError(403, decision.code, decision.reasonFa);
    }
    return this.repo.getMonitoringOverview(tx, principal.clinicId);
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
    return this.repo.listPatientSessions(tx, patientId, {
      ...filter,
      limit: Math.min(100, Math.max(1, filter.limit)),
      offset: Math.max(0, filter.offset),
    });
  }

  async getSessionDetail(tx: DbTx, sessionId: string): Promise<R2SessionDetailView> {
    const session = await this.repo.findHomeVisionTestById(tx, sessionId);
    if (!session) {
      throw new R2MonitoringError(404, "R2_SESSION_NOT_FOUND", "جلسه آزمون خانگی یافت نشد.");
    }
    const [trials, calibrationProfile, allAlerts] = await Promise.all([
      this.repo.listTestTrials(tx, sessionId),
      session.calibrationProfileId
        ? this.repo.findCalibrationProfileById(tx, session.calibrationProfileId)
        : Promise.resolve(null),
      this.repo.listPatientAlerts(tx, session.patientId),
    ]);
    return {
      session,
      trials,
      calibrationProfile,
      alerts: allAlerts.filter((a) => a.eyeLaterality === session.eyeLaterality),
    };
  }

  async listPatientIopReadings(
    tx: DbTx,
    patientId: string
  ): Promise<{ items: IopReadingRecord[]; od: IopReadingRecord[]; os: IopReadingRecord[] }> {
    const items = await this.repo.listPatientIopReadings(tx, patientId);
    return {
      items,
      od: items.filter((r) => r.eyeLaterality === "OD"),
      os: items.filter((r) => r.eyeLaterality === "OS"),
    };
  }

  async listMonitoringPlans(tx: DbTx, patientId: string): Promise<MonitoringPlanRecord[]> {
    return this.repo.listMonitoringPlans(tx, patientId);
  }

  async createMonitoringPlan(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      patientId: string;
      eyeLaterality: EyeLaterality;
      testTypes: string[];
      cadenceDays: number;
      alertThresholdLogmar: number;
      active?: boolean | undefined;
    }
  ): Promise<MonitoringPlanRecord> {
    const decision = authorizeStaffAction(principal, "r2:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new R2MonitoringError(403, decision.code, decision.reasonFa);
    }
    const plan = await this.repo.insertMonitoringPlan(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      patientId: input.patientId,
      eyeLaterality: input.eyeLaterality,
      testTypes: input.testTypes,
      cadenceDays: input.cadenceDays,
      alertThresholdLogmar: input.alertThresholdLogmar,
      active: input.active ?? true,
      createdByUserId: principal.userId,
    });
    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "r2.monitoring-plan-created",
      resourceType: "monitoring_plan",
      resourceId: plan.planId,
      metadata: {
        patientId: input.patientId,
        eyeLaterality: input.eyeLaterality,
        cadenceDays: input.cadenceDays,
      },
    });
    return plan;
  }

  async listDevices(tx: DbTx, principal: StaffPrincipal): Promise<DeviceQualificationRecord[]> {
    const canR2 = authorizeStaffAction(principal, "r2:manage", principal.tenantId).allowed;
    const canOps = authorizeStaffAction(principal, "ops:read", principal.tenantId).allowed;
    if (!canR2 && !canOps) {
      throw new R2MonitoringError(403, "FORBIDDEN_ROLE", "دسترسی به رجیستری دستگاه‌ها مجاز نیست.");
    }
    return this.repo.listDevices(tx, principal.clinicId);
  }

  async upsertDevice(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      modelCode: string;
      manufacturer: string;
      displayPpi?: number | undefined;
      verifiedStatus: DeviceVerificationStatus;
      killSwitchReasonFa?: string | undefined;
    }
  ): Promise<DeviceQualificationRecord> {
    const decision = authorizeStaffAction(principal, "r2:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new R2MonitoringError(403, decision.code, decision.reasonFa);
    }
    if (
      input.verifiedStatus === "killed" &&
      (!input.killSwitchReasonFa || input.killSwitchReasonFa.trim().length < 5)
    ) {
      throw new R2MonitoringError(
        400,
        "KILL_SWITCH_REASON_REQUIRED",
        "برای فعال‌سازی کلید قطع ایمنی دستگاه، ثبت دلیل الزامی است."
      );
    }
    const saved = await this.repo.upsertDevice(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      modelCode: input.modelCode.trim(),
      manufacturer: input.manufacturer.trim(),
      displayPpi: input.displayPpi,
      verifiedStatus: input.verifiedStatus,
      killSwitchReasonFa: input.killSwitchReasonFa?.trim(),
      updatedByUserId: principal.userId,
    });
    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "r2.device-upserted",
      resourceType: "device_qualification",
      resourceId: saved.deviceId,
      metadata: { modelCode: saved.modelCode, verifiedStatus: saved.verifiedStatus },
    });
    return saved;
  }

  async updateDeviceStatus(
    tx: DbTx,
    principal: StaffPrincipal,
    deviceId: string,
    input: {
      verifiedStatus: DeviceVerificationStatus;
      killSwitchReasonFa?: string | undefined;
    }
  ): Promise<DeviceQualificationRecord> {
    const decision = authorizeStaffAction(principal, "r2:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new R2MonitoringError(403, decision.code, decision.reasonFa);
    }
    if (
      input.verifiedStatus === "killed" &&
      (!input.killSwitchReasonFa || input.killSwitchReasonFa.trim().length < 5)
    ) {
      throw new R2MonitoringError(
        400,
        "KILL_SWITCH_REASON_REQUIRED",
        "برای فعال‌سازی کلید قطع ایمنی دستگاه، ثبت دلیل الزامی است."
      );
    }
    const updated = await this.repo.updateDeviceStatus(tx, deviceId, {
      verifiedStatus: input.verifiedStatus,
      killSwitchReasonFa: input.verifiedStatus === "killed" ? input.killSwitchReasonFa?.trim() ?? null : null,
      updatedByUserId: principal.userId,
    });
    if (!updated) {
      throw new R2MonitoringError(404, "DEVICE_NOT_FOUND", "مدل دستگاه در رجیستری یافت نشد.");
    }
    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "r2.device-status-updated",
      resourceType: "device_qualification",
      resourceId: updated.deviceId,
      reasonFa: input.killSwitchReasonFa,
      metadata: { modelCode: updated.modelCode, verifiedStatus: updated.verifiedStatus },
    });
    return updated;
  }
}
