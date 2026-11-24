import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { closeDbPool, createDbPool, runMigrations, withTenantTransaction } from "../../apps/backend/src/packages/db/index.js";
import { buildApp } from "../../apps/backend/src/apps/api/app.js";
import { loadConfig } from "../../apps/backend/src/apps/api/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../apps/backend/migrations");
const ADMIN_URL = process.env.DATABASE_ADMIN_URL ?? "postgresql://bina:bina_dev@127.0.0.1:15432/bina_dev";
const APP_URL = process.env.DATABASE_URL ?? "postgresql://bina_app:bina_app_dev@127.0.0.1:15432/bina_dev";

const TENANT_ID = randomUUID();
const CLINIC_ID = randomUUID();
const OPHTH_ID = randomUUID();
const TECH_ID = randomUUID();

describe("T-A25 Pillar 2 & R2 Full Business-Process Suite", () => {
  let adminPool: Pool;
  let appPool: Pool;
  let app: FastifyInstance;
  let aiProc: ChildProcess | undefined;

  async function ensureAiEngineUp(): Promise<void> {
    try {
      const probe = await fetch("http://127.0.0.1:18000/health");
      if (probe.ok) return;
    } catch {
      // start local python ai-engine for real multi-modal pipeline execution
    }
    const aiRoot = path.resolve(__dirname, "../../apps/ai-engine");
    const artifactsDir = path.resolve(__dirname, "../../ml/registry/artifacts");
    aiProc = spawn(
      path.join(aiRoot, ".venv/bin/uvicorn"),
      ["bina_ai_engine.api.main:app", "--host", "127.0.0.1", "--port", "18000", "--workers", "1"],
      {
        cwd: aiRoot,
        env: {
          ...process.env,
          AI_ENGINE_MODE: "onnx_cpu",
          AI_ARTIFACTS_DIR: artifactsDir,
        },
        stdio: "ignore",
      }
    );
    for (let i = 0; i < 40; i += 1) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const res = await fetch("http://127.0.0.1:18000/health");
        if (res.ok) return;
      } catch {
        // retry
      }
    }
    throw new Error("Timed out starting ai-engine for Pillar 2 process tests");
  }

  beforeAll(async () => {
    await ensureAiEngineUp();
    adminPool = createDbPool(ADMIN_URL, 3);
    appPool = createDbPool(APP_URL, 6);
    await runMigrations(adminPool, MIGRATIONS_DIR);

    await adminPool.query(
      `INSERT INTO tenants (id, jurisdiction, data_residency_region, status) VALUES ($1, 'IR', 'IR', 'active')`,
      [TENANT_ID]
    );
    await withTenantTransaction(adminPool, TENANT_ID, async (tx) => {
      await tx.query(
        `INSERT INTO clinics (id, tenant_id, name_fa, emergency_phone)
         VALUES ($1, $2, 'مرکز تشخیص بینا تهران', '+982182403333')`,
        [CLINIC_ID, TENANT_ID]
      );
      await tx.query(
        `INSERT INTO staff_memberships (tenant_id, clinic_id, user_id, role, mfa_verified_at)
         VALUES ($1, $2, $3, 'ophthalmologist', now()),
                ($1, $2, $4, 'technician', now())`,
        [TENANT_ID, CLINIC_ID, OPHTH_ID, TECH_ID]
      );
    });

    app = buildApp(
      loadConfig({
        NODE_ENV: "test",
        AUTH_SIGNING_SECRET: "p2-process-signing-secret-123456",
        PHONE_HASH_SALT: "p2-process-salt-123456",
      }),
      {
        appPool,
        resolveTenantByClinicId: async (clinicId) => {
          const res = await adminPool.query<{ tenant_id: string }>(
            "SELECT tenant_id FROM clinics WHERE id = $1 LIMIT 1",
            [clinicId]
          );
          return res.rows[0]?.tenant_id ?? null;
        },
      }
    );
  });

  afterAll(async () => {
    await app?.close();
    await closeDbPool(appPool);
    await closeDbPool(adminPool);
    aiProc?.kill("SIGTERM");
  });

  async function staffLogin(userId: string, stepUp = false): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/staff/session",
      payload: { oidcToken: `dev-oidc:${userId}`, clinicId: CLINIC_ID },
    });
    expect(res.statusCode).toBe(200);
    const baseToken = (res.json() as { accessToken: string }).accessToken;
    if (!stepUp) return baseToken;
    const suRes = await app.inject({
      method: "POST",
      url: "/v1/auth/staff/step-up",
      headers: { authorization: `Bearer ${baseToken}` },
      payload: { stepUpCode: "654321" },
    });
    expect(suRes.statusCode).toBe(200);
    return (suRes.json() as { accessToken: string }).accessToken;
  }

  async function patientEnroll(phoneNumber: string): Promise<{ token: string; patientId: string }> {
    const req = await app.inject({
      method: "POST",
      url: "/v1/auth/patient/otp/request",
      payload: { phoneNumber, clinicId: CLINIC_ID, fixedOtpForTest: "246810" },
    });
    expect(req.statusCode).toBe(202);
    const { challengeId } = req.json() as { challengeId: string };
    const ver = await app.inject({
      method: "POST",
      url: "/v1/auth/patient/otp/verify",
      payload: {
        challengeId,
        otpCode: "246810",
        consentAccepted: true,
        consentVersion: "v1-ir-fa",
        phoneNumber,
        tenantId: TENANT_ID,
      },
    });
    expect(ver.statusCode).toBe(200);
    const body = ver.json() as { accessToken: string; patientId: string };
    return { token: body.accessToken, patientId: body.patientId };
  }

  it("executes full Pillar 2 flow: DICOM PHI scrub -> QC gate -> 5-specialist fusion -> urgent floor -> HITL signoff -> PDF + FHIR + CRO export", async () => {
    const techToken = await staffLogin(TECH_ID, false);
    const ophthToken = await staffLogin(OPHTH_ID, true);
    const patient = await patientEnroll("+989124445566");

    // 1. DICOM ingest with raw patient PHI -> generates scrubbed D5 snapshot & routes blurry check cleanly
    const dicomRes = await app.inject({
      method: "POST",
      url: "/v1/integrations/dicom/ingest",
      headers: { authorization: `Bearer ${techToken}` },
      payload: {
        patientId: patient.patientId,
        eyeLaterality: "OD",
        dicomItems: [
          {
            assetId: randomUUID(),
            s3ObjectKey: "studies/p2/fundus_blur_check_od.png",
            rawTags: {
              patientName: "Negar Mohammadi",
              patientId: "0019988776",
              patientTelephone: "+989124445566",
              institutionName: "Iran Eye Clinic",
              studyInstanceUid: "1.2.840.10008.999",
              modality: "OP",
              imageLaterality: "R",
              studyDate: "20261123",
            },
          },
        ],
      },
    });
    expect(dicomRes.statusCode).toBe(202);
    const dicomBody = dicomRes.json() as {
      study: { studyId: string; status: string };
      anonymizedSnapshots: Array<{ pseudonymId: string; scrubbedTags: Record<string, unknown> }>;
    };
    expect(JSON.stringify(dicomBody.anonymizedSnapshots)).not.toContain("Negar Mohammadi");
    expect(JSON.stringify(dicomBody.anonymizedSnapshots)).not.toContain("0019988776");
    expect(dicomBody.study.status).toBe("qc_failed");

    // 2. Unsigned/QC-failed study must NOT appear in patient signed summaries or FHIR export
    const emptySummaries = await app.inject({
      method: "GET",
      url: "/v1/patient/diagnostic-summaries",
      headers: { authorization: `Bearer ${patient.token}` },
    });
    expect((emptySummaries.json() as { items: unknown[] }).items).toHaveLength(0);

    // 3. Valid multi-modality urgent diagnostic study -> 5 specialists -> Masked Fusion -> Urgent floor
    const validRes = await app.inject({
      method: "POST",
      url: "/v1/diagnostic-studies",
      headers: { authorization: `Bearer ${techToken}` },
      payload: {
        patientId: patient.patientId,
        eyeLaterality: "OD",
        assets: [
          {
            assetId: randomUUID(),
            s3ObjectKey: "studies/p2/fundus_papilledema_od.png",
            declaredModality: "fundus",
            declaredEye: "OD",
            conditionHints: ["papilledema", "glaucoma"],
          },
          {
            assetId: randomUUID(),
            s3ObjectKey: "studies/p2/oct_cnv_od.png",
            declaredModality: "oct",
            declaredEye: "OD",
            conditionHints: ["active_cnv", "dme"],
          },
          {
            assetId: randomUUID(),
            s3ObjectKey: "studies/p2/topo_clean_od.png",
            declaredModality: "topography",
            declaredEye: "OD",
          },
          {
            assetId: randomUUID(),
            s3ObjectKey: "studies/p2/vf_fast_progressor_od.png",
            declaredModality: "visual_field",
            declaredEye: "OD",
            conditionHints: ["fast_progressor"],
          },
        ],
        labs: {
          age_years: 64,
          hba1c_percent: 8.6,
          iop_mm_hg: 26,
          central_corneal_thickness_um: 505,
          vf_md_slope_db_per_year: -1.45,
        },
      },
    });
    expect(validRes.statusCode).toBe(202);
    const validStudy = validRes.json() as {
      studyId: string;
      status: string;
      fusionResult: { recommendedUrgency: string };
      specialistOutputs: unknown[];
      explainability: { primarySegmentationMasks: unknown[]; auxiliaryGradCams: Array<{ isAuxiliaryOnly: boolean }> };
      persianReportDraft: { validationPassed: boolean; titleFa: string };
    };
    expect(validStudy.status).toBe("pending_hitl");
    expect(validStudy.fusionResult.recommendedUrgency).toBe("urgent");
    expect(validStudy.specialistOutputs).toHaveLength(5);
    expect(validStudy.explainability.primarySegmentationMasks.length).toBeGreaterThanOrEqual(2);
    expect(validStudy.explainability.auxiliaryGradCams.every((g) => g.isAuxiliaryOnly)).toBe(true);
    expect(validStudy.persianReportDraft.urgencyTier).toBe("urgent");
    expect(validStudy.persianReportDraft.titleFa.length).toBeGreaterThan(5);
    expect(validStudy.persianReportDraft.evidenceIds.length).toBeGreaterThanOrEqual(2);

    // 4. Before HITL sign-off -> FHIR export forbidden
    const unsignedFhir = await app.inject({
      method: "GET",
      url: `/v1/diagnostic-studies/${validStudy.studyId}/fhir`,
      headers: { authorization: `Bearer ${ophthToken}` },
    });
    expect(unsignedFhir.statusCode).toBe(400);

    // 5. Ophthalmologist HITL sign-off
    const signRes = await app.inject({
      method: "POST",
      url: `/v1/diagnostic-studies/${validStudy.studyId}/signoff`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        action: "approved",
        finalUrgency: "urgent",
        finalReportTextFa:
          "یافته‌های چشم راست شامل ادم پاپی و شواهد CNV فعال در OCT است؛ ارجاع فوری به فوق‌تخصص شبکیه انجام شد.",
      },
    });
    expect(signRes.statusCode).toBe(200);

    // 6. Patient receives signed summary + Signed Persian PDF + FHIR R4/R5 Bundle
    const patientSummaries = await app.inject({
      method: "GET",
      url: "/v1/patient/diagnostic-summaries",
      headers: { authorization: `Bearer ${patient.token}` },
    });
    const pItems = (patientSummaries.json() as { items: Array<{ studyId: string; eyeLabelFa: string }> }).items;
    expect(pItems).toHaveLength(1);
    expect(pItems[0]!.eyeLabelFa).toBe("چشم راست");

    const signedFhir = await app.inject({
      method: "GET",
      url: `/v1/diagnostic-studies/${validStudy.studyId}/fhir`,
      headers: { authorization: `Bearer ${ophthToken}` },
    });
    expect(signedFhir.statusCode).toBe(200);
    const bundle = signedFhir.json() as { resourceType: string; entry: Array<{ resource: { resourceType: string } }> };
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.entry.some((e) => e.resource.resourceType === "DiagnosticReport")).toBe(true);
    expect(bundle.entry.some((e) => e.resource.resourceType === "ServiceRequest")).toBe(true);

    // 7. Research CRO pseudonymized export (requires step-up)
    const researchRes = await app.inject({
      method: "POST",
      url: "/v1/research/exports",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        irbProtocolCode: "IR.TUMS.BINA.1405.09",
        reasonFa: "تحلیل کوهورت مطالعات تشخیصی چندمدلی",
      },
    });
    expect(researchRes.statusCode).toBe(200);
    const researchBody = researchRes.json() as { recordCount: number; manifestSha256: string };
    expect(researchBody.recordCount).toBeGreaterThanOrEqual(1);
    expect(researchBody.manifestSha256).toHaveLength(64);
    expect(JSON.stringify(researchBody)).not.toContain(patient.patientId);
  });

  it("executes R2 Home Monitoring lifecycle: quality gate -> OD/OS baselines -> 2-of-N alert -> iCare HOME2 -> billing evidence", async () => {
    const ophthToken = await staffLogin(OPHTH_ID, true);
    const patient = await patientEnroll("+989125556677");

    // 1. Register device calibration profile
    const calRes = await app.inject({
      method: "POST",
      url: "/v1/r2/calibration-profiles",
      headers: { authorization: `Bearer ${patient.token}` },
      payload: {
        patientId: patient.patientId,
        deviceFingerprintSha256: "a".repeat(32),
        screenWidthMm: 71.5,
        viewingDistanceCm: 40,
        calibratedBy: "patient_card",
        verified: true,
      },
    });
    expect(calRes.statusCode).toBe(201);
    const calId = (calRes.json() as { id: string }).id;

    // 2. Reject dark/close test without touching baseline
    const badTest = await app.inject({
      method: "POST",
      url: "/v1/r2/home-tests",
      headers: { authorization: `Bearer ${patient.token}` },
      payload: {
        calibrationProfileId: calId,
        eyeLaterality: "OD",
        testType: "landolt_c",
        vaLogmar: 0.9,
        viewingDistanceCm: 14,
        ambientLux: 30,
        deviceTiltDeg: 3,
        glareDetected: false,
      },
    });
    expect(badTest.statusCode).toBe(201);
    expect((badTest.json() as { qualityPassed: boolean }).qualityPassed).toBe(false);

    // 3. Valid OD baseline (0.10) + two RCI drops (0.35, 0.40) -> triggers 2-of-N worsening alert
    const t1 = await app.inject({
      method: "POST",
      url: "/v1/r2/home-tests",
      headers: { authorization: `Bearer ${patient.token}` },
      payload: {
        calibrationProfileId: calId,
        eyeLaterality: "OD",
        testType: "landolt_c",
        vaLogmar: 0.1,
        viewingDistanceCm: 40,
        ambientLux: 320,
        deviceTiltDeg: 2,
        glareDetected: false,
      },
    });
    expect((t1.json() as { baselineEstablished: boolean }).baselineEstablished).toBe(true);

    await app.inject({
      method: "POST",
      url: "/v1/r2/home-tests",
      headers: { authorization: `Bearer ${patient.token}` },
      payload: {
        calibrationProfileId: calId,
        eyeLaterality: "OD",
        testType: "landolt_c",
        vaLogmar: 0.35,
        viewingDistanceCm: 40,
        ambientLux: 320,
        deviceTiltDeg: 2,
        glareDetected: false,
      },
    });

    const t3 = await app.inject({
      method: "POST",
      url: "/v1/r2/home-tests",
      headers: { authorization: `Bearer ${patient.token}` },
      payload: {
        calibrationProfileId: calId,
        eyeLaterality: "OD",
        testType: "landolt_c",
        vaLogmar: 0.4,
        viewingDistanceCm: 40,
        ambientLux: 320,
        deviceTiltDeg: 2,
        glareDetected: false,
      },
    });
    expect((t3.json() as { alertTriggered: boolean; alert?: { ruleCode: string } }).alertTriggered).toBe(true);

    // 4. iCare HOME2 elevated IOP -> triggers triage escalation cleanly
    const iopRes = await app.inject({
      method: "POST",
      url: "/v1/integrations/icare-home2/readings",
      headers: { authorization: `Bearer ${patient.token}` },
      payload: {
        deviceSerial: "ICARE-IR-884422",
        eyeLaterality: "OD",
        iopMmHg: 32,
        qualityScore: 0.94,
        measuredAtIso: new Date().toISOString(),
      },
    });
    expect(iopRes.statusCode).toBe(201);
    expect((iopRes.json() as { alertTier: string }).alertTier).toBe("urgent");

    // 5. Optional non-diagnostic supplementary billing evidence
    const billRes = await app.inject({
      method: "POST",
      url: "/v1/billing-evidence/summary",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        patientId: patient.patientId,
        periodStartJalali: "1405-09-01",
        periodEndJalali: "1405-09-30",
      },
    });
    expect(billRes.statusCode).toBe(200);
    expect((billRes.json() as { acceptedHomeVisionTestCount: number }).acceptedHomeVisionTestCount).toBe(3);
  });
});
