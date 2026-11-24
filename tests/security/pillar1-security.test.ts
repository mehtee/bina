import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { signSessionToken } from "../../apps/backend/src/contexts/identity-access/index.js";
import {
  DomesticIranSmsAdapter,
  InMemoryMockIranSmsSender,
  SmsPhiViolationError,
} from "../../apps/backend/src/contexts/notifications/index.js";
import { closeDbPool, createDbPool, runMigrations, withTenantTransaction } from "../../apps/backend/src/packages/db/index.js";
import { asClinicId, asTenantId } from "../../apps/backend/src/packages/domain-kernel/index.js";
import { buildApp } from "../../apps/backend/src/apps/api/app.js";
import { loadConfig } from "../../apps/backend/src/apps/api/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../apps/backend/migrations");
const ADMIN_URL = process.env.DATABASE_ADMIN_URL ?? "postgresql://bina:bina_dev@127.0.0.1:15432/bina_dev";
const APP_URL = process.env.DATABASE_URL ?? "postgresql://bina_app:bina_app_dev@127.0.0.1:15432/bina_dev";
const SIGNING_SECRET = "security-suite-signing-secret-123456";

const TENANT_A = randomUUID();
const TENANT_B = randomUUID();
const CLINIC_A = randomUUID();
const CLINIC_B = randomUUID();
const OPHTH_A = randomUUID();
const OPHTH_B = randomUUID();

describe("Pillar 1 Security & Isolation Penetration Suite", () => {
  let adminPool: Pool;
  let appPool: Pool;
  let app: FastifyInstance;

  beforeAll(async () => {
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
        `INSERT INTO clinics (id, tenant_id, name_fa, emergency_phone) VALUES ($1, $2, 'کلینیک الف', '+982182400101')`,
        [CLINIC_A, TENANT_A]
      );
      await tx.query(
        `INSERT INTO staff_memberships (tenant_id, clinic_id, user_id, role, mfa_verified_at)
         VALUES ($1, $2, $3, 'ophthalmologist', now())`,
        [TENANT_A, CLINIC_A, OPHTH_A]
      );
    });

    await withTenantTransaction(adminPool, TENANT_B, async (tx) => {
      await tx.query(
        `INSERT INTO clinics (id, tenant_id, name_fa, emergency_phone) VALUES ($1, $2, 'کلینیک ب', '+982182400102')`,
        [CLINIC_B, TENANT_B]
      );
      await tx.query(
        `INSERT INTO staff_memberships (tenant_id, clinic_id, user_id, role, mfa_verified_at)
         VALUES ($1, $2, $3, 'ophthalmologist', now())`,
        [TENANT_B, CLINIC_B, OPHTH_B]
      );
    });

    const config = loadConfig({
      NODE_ENV: "test",
      AUTH_SIGNING_SECRET: SIGNING_SECRET,
      PHONE_HASH_SALT: "security-suite-salt-123",
    });

    app = buildApp(config, {
      appPool,
      resolveTenantByClinicId: async (clinicId) => {
        const res = await adminPool.query<{ tenant_id: string }>(
          "SELECT tenant_id FROM clinics WHERE id = $1 LIMIT 1",
          [clinicId]
        );
        return res.rows[0]?.tenant_id ?? null;
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await closeDbPool(appPool);
    await closeDbPool(adminPool);
  });

  async function loginStaff(userId: string, clinicId: string): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/staff/session",
      payload: { oidcToken: `dev-oidc:${userId}`, clinicId },
    });
    expect(res.statusCode).toBe(200);
    return (res.json() as { accessToken: string }).accessToken;
  }

  async function loginPatient(phoneNumber: string, clinicId: string, tenantId: string): Promise<{ token: string; patientId: string }> {
    const req = await app.inject({
      method: "POST",
      url: "/v1/auth/patient/otp/request",
      payload: { phoneNumber, clinicId, fixedOtpForTest: "246810" },
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
        consentVersion: "fa-IR-v1",
        phoneNumber,
        tenantId,
      },
    });
    expect(ver.statusCode).toBe(200);
    const body = ver.json() as { accessToken: string; patientId: string };
    return { token: body.accessToken, patientId: body.patientId };
  }

  it("blocks cross-tenant access across episodes, triage queue, reports & Postgres RLS under bina_app", async () => {
    const tokenA = await loginStaff(OPHTH_A, CLINIC_A);
    const tokenB = await loginStaff(OPHTH_B, CLINIC_B);
    const patA = await loginPatient("+989121112201", CLINIC_A, TENANT_A);

    const epRes = await app.inject({
      method: "POST",
      url: "/v1/episodes",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        patientId: patA.patientId,
        protocolType: "post_cataract",
        eyeLaterality: "OD",
        surgeonId: OPHTH_A,
        accessMode: "print_phone",
        anchorAt: "2026-11-23T08:00:00Z",
      },
    });
    expect(epRes.statusCode).toBe(201);
    const episodeAId = (epRes.json() as { episodeId: string }).episodeId;

    const rxRes = await app.inject({
      method: "POST",
      url: `/v1/episodes/${episodeAId}/prescriptions`,
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        eyeLaterality: "OD",
        reasonFa: "نسخه محرمانه کلینیک الف",
        items: [
          {
            drugNameFa: "قطره بتامتازون ۰.۱٪",
            genericName: "Betamethasone",
            bottleCapColorFa: "درِ صورتی",
            frequencyPerDay: 4,
            durationDays: 7,
          },
        ],
      },
    });
    expect(rxRes.statusCode).toBe(201);

    const repRes = await app.inject({
      method: "POST",
      url: "/v1/reports",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        reportType: "patient_schedule",
        patientId: patA.patientId,
        sourceRefId: episodeAId,
        titleFa: "برنامه محرمانه",
        sections: [{ headingFa: "چشم راست", linesFa: ["بتامتازون"] }],
      },
    });
    expect(repRes.statusCode).toBe(201);
    const reportAId = (repRes.json() as { reportId: string }).reportId;

    // Cross-tenant probes by Tenant B staff MUST fail closed (404 / empty queue)
    expect(
      (await app.inject({ method: "GET", url: `/v1/episodes/${episodeAId}`, headers: { authorization: `Bearer ${tokenB}` } })).statusCode
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/episodes/${episodeAId}/prescriptions`,
          headers: { authorization: `Bearer ${tokenB}` },
          payload: {
            eyeLaterality: "OD",
            reasonFa: "تلاش نفوذ",
            items: [{ drugNameFa: "بتامتازون", genericName: "Betamethasone", bottleCapColorFa: "صورتی", frequencyPerDay: 2, durationDays: 5 }],
          },
        })
      ).statusCode
    ).toBe(404);
    expect(
      (await app.inject({ method: "GET", url: `/v1/reports/${reportAId}/pdf`, headers: { authorization: `Bearer ${tokenB}` } })).statusCode
    ).toBe(404);

    const triageB = await app.inject({ method: "GET", url: "/v1/triage/cases", headers: { authorization: `Bearer ${tokenB}` } });
    expect((triageB.json() as { items: Array<{ patientId: string }> }).items.some((c) => c.patientId === patA.patientId)).toBe(false);

    // Direct Postgres trigger checks for audit_logs and prescription_versions immutability
    await expect(
      withTenantTransaction(appPool, TENANT_A, (tx) =>
        tx.query("DELETE FROM prescription_versions WHERE episode_id = $1", [episodeAId])
      )
    ).rejects.toThrow(/immutable/);

    await expect(
      withTenantTransaction(appPool, TENANT_A, (tx) =>
        tx.query("UPDATE audit_logs SET action = 'forged' WHERE resource_id = $1", [episodeAId])
      )
    ).rejects.toThrow(/append-only/);
  });

  it("revokes caregiver token in <1s returning immediate 403 CAREGIVER_REVOKED", async () => {
    const tokenA = await loginStaff(OPHTH_A, CLINIC_A);
    const patA = await loginPatient("+989121112202", CLINIC_A, TENANT_A);

    await app.inject({
      method: "POST",
      url: "/v1/episodes",
      headers: { authorization: `Bearer ${tokenA}` },
      payload: {
        patientId: patA.patientId,
        protocolType: "post_cataract",
        eyeLaterality: "OS",
        surgeonId: OPHTH_A,
        accessMode: "caregiver",
        anchorAt: "2026-11-23T08:00:00Z",
      },
    });

    const grantRes = await app.inject({
      method: "POST",
      url: `/v1/patients/${patA.patientId}/caregivers`,
      headers: { authorization: `Bearer ${patA.token}` },
      payload: {
        caregiverPhone: "+989129991100",
        relationshipFa: "دختر بیمار",
        scopes: ["care_plan:read"],
      },
    });
    expect(grantRes.statusCode).toBe(201);
    const grantId = (grantRes.json() as { grantId: string }).grantId;

    const caregiverToken = signSessionToken(
      {
        sub: randomUUID(),
        tenantId: TENANT_A,
        clinicId: CLINIC_A,
        actorType: "caregiver",
        grantId,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      SIGNING_SECRET
    );

    const beforeRevoke = await app.inject({
      method: "GET",
      url: `/v1/patient/today?patientId=${patA.patientId}`,
      headers: { authorization: `Bearer ${caregiverToken}` },
    });
    expect(beforeRevoke.statusCode).toBe(200);

    const revokeRes = await app.inject({
      method: "DELETE",
      url: `/v1/patients/${patA.patientId}/caregivers/${grantId}`,
      headers: { authorization: `Bearer ${patA.token}` },
    });
    expect(revokeRes.statusCode).toBe(204);

    const afterRevoke = await app.inject({
      method: "GET",
      url: `/v1/patient/today?patientId=${patA.patientId}`,
      headers: { authorization: `Bearer ${caregiverToken}` },
    });
    expect(afterRevoke.statusCode).toBe(403);
    expect((afterRevoke.json() as { error: string }).error).toBe("CAREGIVER_REVOKED");
  });

  it("blocks drug names, clinical diagnoses, and >134 UCS-2 payloads from Iranian SMS dispatch", async () => {
    const sms = new DomesticIranSmsAdapter(new InMemoryMockIranSmsSender());

    for (const forbidden of [
      "قطره بتامتازون",
      "سیپروفلوکساسین",
      "کراتیت",
      "گلوکوم",
      "آب‌مروارید",
      "Papilledema",
    ]) {
      await expect(
        sms.send({
          tenantId: asTenantId(TENANT_A),
          clinicId: asClinicId(CLINIC_A),
          recipientPhoneE164: "+989121112203",
          templateKey: "caregiver_invite",
          paramsFa: { relationshipFa: forbidden },
        })
      ).rejects.toThrow(SmsPhiViolationError);
    }

    await expect(
      sms.send({
        tenantId: asTenantId(TENANT_A),
        clinicId: asClinicId(CLINIC_A),
        recipientPhoneE164: "+989121112203",
        templateKey: "caregiver_invite",
        paramsFa: { relationshipFa: "الف".repeat(120) },
      })
    ).rejects.toThrow(SmsPhiViolationError);

    const ok = await sms.send({
      tenantId: asTenantId(TENANT_A),
      clinicId: asClinicId(CLINIC_A),
      recipientPhoneE164: "+989121112203",
      templateKey: "appointment_reminder",
      paramsFa: { jalaliDate: "۱۴۰۵/۰۹/۰۳" },
    });
    expect(ok.accepted).toBe(true);
  });
});
