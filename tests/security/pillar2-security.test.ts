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

const TENANT_A = randomUUID();
const TENANT_B = randomUUID();
const CLINIC_A = randomUUID();
const CLINIC_B = randomUUID();
const OPHTH_A = randomUUID();
const TECH_A = randomUUID();
const OPHTH_B = randomUUID();

describe("T-A25 Pillar 2 & R2 Security, RLS & Authorization Suite", () => {
  let adminPool: Pool;
  let appPool: Pool;
  let app: FastifyInstance;
  let aiProc: ChildProcess | undefined;

  async function ensureAiEngineUp(): Promise<void> {
    try {
      const probe = await fetch("http://127.0.0.1:18000/health");
      if (probe.ok) return;
    } catch {
      // start local python ai-engine
    }
    const aiRoot = path.resolve(__dirname, "../../apps/ai-engine");
    const artifactsDir = path.resolve(__dirname, "../../ml/registry/artifacts");
    aiProc = spawn(
      path.join(aiRoot, ".venv/bin/uvicorn"),
      ["bina_ai_engine.api.main:app", "--host", "127.0.0.1", "--port", "18000", "--workers", "1"],
      {
        cwd: aiRoot,
        env: { ...process.env, AI_ENGINE_MODE: "onnx_cpu", AI_ARTIFACTS_DIR: artifactsDir },
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
    throw new Error("Timed out starting ai-engine for Pillar 2 security tests");
  }

  beforeAll(async () => {
    await ensureAiEngineUp();
    adminPool = createDbPool(ADMIN_URL, 3);
    appPool = createDbPool(APP_URL, 6);
    await runMigrations(adminPool, MIGRATIONS_DIR);

    await adminPool.query(
      `INSERT INTO tenants (id, jurisdiction, data_residency_region, status)
       VALUES ($1, 'IR', 'IR', 'active'), ($2, 'IR', 'IR', 'active')`,
      [TENANT_A, TENANT_B]
    );

    await withTenantTransaction(adminPool, TENANT_A, async (tx) => {
      await tx.query(
        `INSERT INTO clinics (id, tenant_id, name_fa, emergency_phone) VALUES ($1, $2, 'کلینیک الف', '+982182400201')`,
        [CLINIC_A, TENANT_A]
      );
      await tx.query(
        `INSERT INTO staff_memberships (tenant_id, clinic_id, user_id, role, mfa_verified_at)
         VALUES ($1, $2, $3, 'ophthalmologist', now()),
                ($1, $2, $4, 'technician', now())`,
        [TENANT_A, CLINIC_A, OPHTH_A, TECH_A]
      );
    });

    await withTenantTransaction(adminPool, TENANT_B, async (tx) => {
      await tx.query(
        `INSERT INTO clinics (id, tenant_id, name_fa, emergency_phone) VALUES ($1, $2, 'کلینیک ب', '+982182400202')`,
        [CLINIC_B, TENANT_B]
      );
      await tx.query(
        `INSERT INTO staff_memberships (tenant_id, clinic_id, user_id, role, mfa_verified_at)
         VALUES ($1, $2, $3, 'ophthalmologist', now())`,
        [TENANT_B, CLINIC_B, OPHTH_B]
      );
    });

    app = buildApp(
      loadConfig({
        NODE_ENV: "test",
        AUTH_SIGNING_SECRET: "p2-security-signing-secret-123456",
        PHONE_HASH_SALT: "p2-security-salt-123456",
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

  async function loginStaff(userId: string, clinicId: string, stepUp = false): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/staff/session",
      payload: { oidcToken: `dev-oidc:${userId}`, clinicId, stepUpRequested: stepUp },
    });
    expect(res.statusCode).toBe(200);
    return (res.json() as { accessToken: string }).accessToken;
  }

  it("blocks cross-tenant RLS reads across diagnostic_studies, R2 monitoring & iCare HOME2 tables, and enforces step-up & ophthalmologist HITL", async () => {
    const techAToken = await loginStaff(TECH_A, CLINIC_A, false);
    const ophthATokenNoStepUp = await loginStaff(OPHTH_A, CLINIC_A, false);
    const ophthBToken = await loginStaff(OPHTH_B, CLINIC_B, true);

    const otpReq = await app.inject({
      method: "POST",
      url: "/v1/auth/patient/otp/request",
      payload: { phoneNumber: "+989128889900", clinicId: CLINIC_A, fixedOtpForTest: "112233" },
    });
    expect(otpReq.statusCode).toBe(202);
    const { challengeId } = otpReq.json() as { challengeId: string };
    const ver = await app.inject({
      method: "POST",
      url: "/v1/auth/patient/otp/verify",
      payload: {
        challengeId,
        otpCode: "112233",
        consentAccepted: true,
        consentVersion: "v1-ir-fa",
        phoneNumber: "+989128889900",
        tenantId: TENANT_A,
      },
    });
    expect(ver.statusCode).toBe(200);
    const { accessToken: patientToken, patientId } = ver.json() as { accessToken: string; patientId: string };

    // Submit Pillar 2 study + R2 test + iCare HOME2 under Tenant A
    const studyRes = await app.inject({
      method: "POST",
      url: "/v1/diagnostic-studies",
      headers: { authorization: `Bearer ${techAToken}` },
      payload: {
        patientId,
        eyeLaterality: "OS",
        assets: [
          {
            assetId: randomUUID(),
            s3ObjectKey: "studies/sec/fundus_clean_os.png",
            declaredModality: "fundus",
            declaredEye: "OS",
          },
        ],
      },
    });
    expect(studyRes.statusCode).toBe(202);
    const { studyId } = studyRes.json() as { studyId: string };

    await app.inject({
      method: "POST",
      url: "/v1/r2/home-tests",
      headers: { authorization: `Bearer ${patientToken}` },
      payload: {
        eyeLaterality: "OS",
        testType: "landolt_c",
        vaLogmar: 0.1,
        viewingDistanceCm: 40,
        ambientLux: 300,
        deviceTiltDeg: 0,
        glareDetected: false,
      },
    });

    await app.inject({
      method: "POST",
      url: "/v1/integrations/icare-home2/readings",
      headers: { authorization: `Bearer ${patientToken}` },
      payload: {
        deviceSerial: "ICARE-SEC-1",
        eyeLaterality: "OS",
        iopMmHg: 17,
        qualityScore: 0.9,
        measuredAtIso: new Date().toISOString(),
      },
    });

    // 1. Technician forbidden from HITL signoff (403)
    const techSign = await app.inject({
      method: "POST",
      url: `/v1/diagnostic-studies/${studyId}/signoff`,
      headers: { authorization: `Bearer ${techAToken}` },
      payload: {
        action: "approved",
        finalUrgency: "routine",
        finalReportTextFa: "تلاش غیرمجاز تکنسین برای تایید گزارش.",
      },
    });
    expect(techSign.statusCode).toBe(403);

    // 2. Ophthalmologist WITHOUT step-up MFA forbidden from Research CRO export (403)
    const noStepResearch = await app.inject({
      method: "POST",
      url: "/v1/research/exports",
      headers: { authorization: `Bearer ${ophthATokenNoStepUp}` },
      payload: {
        irbProtocolCode: "IR.SBMU.1405.002",
        reasonFa: "درخواست خروجی بدون تایید step-up",
      },
    });
    expect(noStepResearch.statusCode).toBe(403);

    // 3. Cross-tenant Tenant B staff sees 0 studies / 0 R2 tests / 0 tonometry readings via Postgres RLS
    const crossStudyHttp = await app.inject({
      method: "GET",
      url: `/v1/diagnostic-studies/${studyId}`,
      headers: { authorization: `Bearer ${ophthBToken}` },
    });
    expect(crossStudyHttp.statusCode).toBe(404);

    await withTenantTransaction(appPool, TENANT_B, async (tx) => {
      const ds = await tx.query("SELECT id FROM diagnostic_studies WHERE id = $1", [studyId]);
      const r2 = await tx.query("SELECT id FROM home_vision_tests WHERE patient_id = $1", [patientId]);
      const bas = await tx.query("SELECT id FROM vision_baselines WHERE patient_id = $1", [patientId]);
      const iop = await tx.query("SELECT id FROM external_tonometry_readings WHERE patient_id = $1", [patientId]);
      expect(ds.rowCount).toBe(0);
      expect(r2.rowCount).toBe(0);
      expect(bas.rowCount).toBe(0);
      expect(iop.rowCount).toBe(0);
    });
  });
});
