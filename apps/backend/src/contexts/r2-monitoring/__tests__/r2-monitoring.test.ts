import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  evaluateEwmaCusumShift,
  evaluateHomeTestQuality,
  evaluateReliableChangeAnd2OfN,
} from "../../../packages/clinical-rules/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import { R2MonitoringService } from "../index.js";
import type {
  CalibrationProfileRecord,
  HomeVisionTestRecord,
  R2MonitoringRepoPort,
  VisionBaselineRecord,
  VisionTrendAlertRecord,
} from "../ports/index.js";

function createInMemoryR2Harness() {
  const tests: HomeVisionTestRecord[] = [];
  const baselines: VisionBaselineRecord[] = [];
  const alerts: VisionTrendAlertRecord[] = [];
  const triageCalls: Array<{ eyeLaterality: string; urgencyTier: string; ruleCode: string }> = [];

  const repo: R2MonitoringRepoPort = {
    async saveCalibrationProfile(_tx, input): Promise<CalibrationProfileRecord> {
      return { ...input, id: `cal-${Math.random()}` };
    },
    async insertHomeVisionTest(_tx, input): Promise<HomeVisionTestRecord> {
      const rec: HomeVisionTestRecord = {
        id: `test-${tests.length + 1}`,
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
        measuredAtIso: new Date().toISOString(),
      };
      tests.push(rec);
      return rec;
    },
    async findBaseline(_tx, patientId, eye) {
      return baselines.find((b) => b.patientId === patientId && b.eyeLaterality === eye) ?? null;
    },
    async createBaseline(_tx, input): Promise<VisionBaselineRecord> {
      const rec: VisionBaselineRecord = { ...input, id: `base-${baselines.length + 1}` };
      baselines.push(rec);
      return rec;
    },
    async listRecentAcceptedTests(_tx, patientId, eye, limit) {
      return tests
        .filter((t) => t.patientId === patientId && t.eyeLaterality === eye && t.qualityStatus === "accepted")
        .slice(-limit);
    },
    async insertTrendAlert(_tx, input): Promise<VisionTrendAlertRecord> {
      const rec: VisionTrendAlertRecord = {
        ...input,
        id: `alert-${alerts.length + 1}`,
        createdAtIso: new Date().toISOString(),
      };
      alerts.push(rec);
      return rec;
    },
    async listPatientAlerts(_tx, patientId) {
      return alerts.filter((a) => a.patientId === patientId);
    },
  };

  const service = new R2MonitoringService(
    repo,
    {
      async createOrEscalateCase(_tx, input) {
        triageCalls.push({
          eyeLaterality: input.eyeLaterality,
          urgencyTier: input.urgencyTier,
          ruleCode: input.ruleCode,
        });
        return {
          id: randomUUID(),
          tenantId: input.tenantId,
          clinicId: input.clinicId,
          patientId: input.patientId,
          sourcePillar: input.sourcePillar,
          eyeLaterality: input.eyeLaterality,
          eyeLabelFa: input.eyeLaterality === "OD" ? "چشم راست" : "چشم چپ",
          status: "open",
          urgencyTier: input.urgencyTier,
          urgencyLabelFa: "فوری",
          ownerId: null,
          slaDueAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    },
    {
      async append(_tx, e) {
        return { ...e, id: "aud-1", occurredAtIso: new Date().toISOString() };
      },
      async listByResource() {
        return [];
      },
    }
  );

  const mockTx = { async query() { return { rows: [], rowCount: 0 }; } } as unknown as DbTx;
  return { service, mockTx, baselines, alerts, triageCalls };
}

describe("T-A26 R2 Home Vision Monitoring: calibration QC, OD/OS baselines, RCI + 2-of-N + EWMA/CUSUM", () => {
  it("rejects out-of-range distance, dark ambient light, excessive tilt, and glare without firing false alerts", async () => {
    const q = evaluateHomeTestQuality({
      viewingDistanceCm: 15,
      ambientLux: 30,
      deviceTiltDeg: 32,
      glareDetected: true,
    });
    expect(q.passed).toBe(false);
    expect(q.rejectionCodes).toEqual([
      "distance_out_of_range",
      "lighting_out_of_range",
      "excessive_tilt",
      "glare_detected",
    ]);

    const { service, mockTx, baselines, alerts } = createInMemoryR2Harness();
    const res = await service.submitHomeTest(mockTx, {
      tenantId: randomUUID(),
      clinicId: randomUUID(),
      patientId: randomUUID(),
      eyeLaterality: "OD",
      testType: "landolt_c",
      vaLogmar: 0.9,
      viewingDistanceCm: 18,
      ambientLux: 300,
      deviceTiltDeg: 5,
      glareDetected: false,
    });
    expect(res.qualityPassed).toBe(false);
    expect(baselines).toHaveLength(0);
    expect(alerts).toHaveLength(0);
  });

  it("enforces 2-of-N RCI drop confirmation per eye and isolates OD from OS baselines", async () => {
    const { service, mockTx, baselines, triageCalls } = createInMemoryR2Harness();
    const tid = randomUUID();
    const cid = randomUUID();
    const pid = randomUUID();

    // Test 1 (OD) -> establishes baseline 0.10 logMAR
    const t1 = await service.submitHomeTest(mockTx, {
      tenantId: tid,
      clinicId: cid,
      patientId: pid,
      eyeLaterality: "OD",
      testType: "landolt_c",
      vaLogmar: 0.1,
      viewingDistanceCm: 40,
      ambientLux: 350,
      deviceTiltDeg: 3,
      glareDetected: false,
    });
    expect(t1.baselineEstablished).toBe(true);
    expect(t1.alertTriggered).toBe(false);

    // Test 2 (OD) -> single drop +0.25 (not yet 2-of-N confirmed; also check EWMA hasn't crossed 2-of-N rule)
    await service.submitHomeTest(mockTx, {
      tenantId: tid,
      clinicId: cid,
      patientId: pid,
      eyeLaterality: "OD",
      testType: "landolt_c",
      vaLogmar: 0.35,
      viewingDistanceCm: 40,
      ambientLux: 350,
      deviceTiltDeg: 2,
      glareDetected: false,
    });

    // Test 3 (OD) -> second confirmed drop +0.30 -> 2-of-N VA drop triggers alert + triage
    const t3 = await service.submitHomeTest(mockTx, {
      tenantId: tid,
      clinicId: cid,
      patientId: pid,
      eyeLaterality: "OD",
      testType: "landolt_c",
      vaLogmar: 0.4,
      viewingDistanceCm: 40,
      ambientLux: 350,
      deviceTiltDeg: 2,
      glareDetected: false,
    });
    expect(t3.alertTriggered).toBe(true);
    expect(t3.alert?.ruleCode).toBe("R2_VA_2OFN_CONFIRMED_DROP");
    expect(triageCalls.some((c) => c.eyeLaterality === "OD")).toBe(true);

    // OS remains unaffected & clean baseline 0.00
    const osTest = await service.submitHomeTest(mockTx, {
      tenantId: tid,
      clinicId: cid,
      patientId: pid,
      eyeLaterality: "OS",
      testType: "landolt_c",
      vaLogmar: 0.0,
      viewingDistanceCm: 40,
      ambientLux: 350,
      deviceTiltDeg: 2,
      glareDetected: false,
    });
    expect(osTest.baselineEstablished).toBe(true);
    expect(osTest.alertTriggered).toBe(false);
    expect(baselines).toHaveLength(2);
  });

  it("detects acute Amsler scotoma urgently and EWMA/CUSUM gradual drift", () => {
    const amsler = evaluateReliableChangeAnd2OfN({
      eyeLaterality: "OS",
      baselineVaLogmar: 0.1,
      baselineSigma: 0.08,
      recentValidTests: [{ vaLogmar: 0.12, amslerDistortionScore: 0.85, amslerCentralScotoma: true }],
    });
    expect(amsler.severity).toBe("urgent");
    expect(amsler.ruleCode).toBe("R2_AMSLER_ACUTE_METAMORPHOPSIA");

    const drift = evaluateEwmaCusumShift([0.1, 0.18, 0.22, 0.25, 0.27], 0.1, 0.08);
    expect(drift.shifted).toBe(true);
  });
});
