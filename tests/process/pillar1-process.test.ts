import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { closeDbPool, createDbPool, runMigrations, withTenantTransaction } from "../../apps/backend/src/packages/db/index.js";
import {
  createPostopSlaWorkflowHandler,
  DurableWorkflowRuntime,
  POSTOP_SLA_WORKFLOW_TYPE,
} from "../../apps/backend/src/apps/worker/index.js";
import { buildApp } from "../../apps/backend/src/apps/api/app.js";
import { loadConfig } from "../../apps/backend/src/apps/api/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../apps/backend/migrations");
const ADMIN_URL = process.env.DATABASE_ADMIN_URL ?? "postgresql://bina:bina_dev@127.0.0.1:15432/bina_dev";
const APP_URL = process.env.DATABASE_URL ?? "postgresql://bina_app:bina_app_dev@127.0.0.1:15432/bina_dev";

const TENANT_ID = randomUUID();
const CLINIC_ID = randomUUID();
const OPHTH_ID = randomUUID();
const COORD_ID = randomUUID();
const OPTOM_ID = randomUUID();

describe("Pillar 1 Full Business-Process Suite", () => {
  let adminPool: Pool;
  let appPool: Pool;
  let app: FastifyInstance;

  beforeAll(async () => {
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
         VALUES ($1, $2, 'مرکز جراحی چشم ایران', '+982182402222')`,
        [CLINIC_ID, TENANT_ID]
      );
      await tx.query(
        `INSERT INTO staff_memberships (tenant_id, clinic_id, user_id, role, mfa_verified_at)
         VALUES ($1, $2, $3, 'ophthalmologist', now()),
                ($1, $2, $4, 'coordinator', now()),
                ($1, $2, $5, 'optometrist', now())`,
        [TENANT_ID, CLINIC_ID, OPHTH_ID, COORD_ID, OPTOM_ID]
      );
    });

    app = buildApp(
      loadConfig({
        NODE_ENV: "test",
        AUTH_SIGNING_SECRET: "process-suite-signing-secret-12345",
        PHONE_HASH_SALT: "process-suite-salt-12345",
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
    await app.close();
    await closeDbPool(appPool);
    await closeDbPool(adminPool);
  });

  async function staffLogin(userId: string): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/staff/session",
      payload: { oidcToken: `dev-oidc:${userId}`, clinicId: CLINIC_ID },
    });
    expect(res.statusCode).toBe(200);
    return (res.json() as { accessToken: string }).accessToken;
  }

  async function patientEnroll(phoneNumber: string): Promise<{ token: string; patientId: string }> {
    const req = await app.inject({
      method: "POST",
      url: "/v1/auth/patient/otp/request",
      payload: { phoneNumber, clinicId: CLINIC_ID, fixedOtpForTest: "135790" },
    });
    const { challengeId } = req.json() as { challengeId: string };
    const ver = await app.inject({
      method: "POST",
      url: "/v1/auth/patient/otp/verify",
      payload: {
        challengeId,
        otpCode: "135790",
        consentAccepted: true,
        consentVersion: "fa-IR-v1",
        phoneNumber,
        tenantId: TENANT_ID,
      },
    });
    const body = ver.json() as { accessToken: string; patientId: string };
    return { token: body.accessToken, patientId: body.patientId };
  }

  it("executes dual-eye isolation, offline sync deduplication, red-flag SLA triage/handoff/referral & Print+Phone PDF parity", async () => {
    const ophthToken = await staffLogin(OPHTH_ID);
    const coordToken = await staffLogin(COORD_ID);
    const optomToken = await staffLogin(OPTOM_ID);
    const patApp = await patientEnroll("+989125550001");
    const patPrint = await patientEnroll("+989125550002");

    // Process 1: Dual-eye isolation (OD v1 vs OS v1->v2)
    const epOd = (
      await app.inject({
        method: "POST",
        url: "/v1/episodes",
        headers: { authorization: `Bearer ${ophthToken}` },
        payload: {
          patientId: patApp.patientId,
          protocolType: "post_cataract",
          eyeLaterality: "OD",
          surgeonId: OPHTH_ID,
          accessMode: "app",
          anchorAt: "2026-11-23T08:00:00Z",
        },
      })
    ).json() as { episodeId: string };

    const epOs = (
      await app.inject({
        method: "POST",
        url: "/v1/episodes",
        headers: { authorization: `Bearer ${ophthToken}` },
        payload: {
          patientId: patApp.patientId,
          protocolType: "post_cataract",
          eyeLaterality: "OS",
          surgeonId: OPHTH_ID,
          accessMode: "app",
          anchorAt: "2026-11-23T08:00:00Z",
        },
      })
    ).json() as { episodeId: string };

    await app.inject({
      method: "POST",
      url: `/v1/episodes/${epOd.episodeId}/prescriptions`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        eyeLaterality: "OD",
        reasonFa: "نسخه پایه چشم راست",
        items: [{ drugNameFa: "بتامتازون", genericName: "Betamethasone", bottleCapColorFa: "صورتی", frequencyPerDay: 4, durationDays: 14 }],
      },
    });
    await app.inject({
      method: "POST",
      url: `/v1/episodes/${epOs.episodeId}/prescriptions`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        eyeLaterality: "OS",
        reasonFa: "نسخه ۱ چشم چپ",
        items: [{ drugNameFa: "سیپروفلوکساسین", genericName: "Ciprofloxacin", bottleCapColorFa: "سفید", frequencyPerDay: 4, durationDays: 7 }],
      },
    });
    await app.inject({
      method: "POST",
      url: `/v1/episodes/${epOs.episodeId}/prescriptions`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        eyeLaterality: "OS",
        reasonFa: "نسخه ۲ چشم چپ",
        items: [{ drugNameFa: "اشک مصنوعی", genericName: "Artificial Tears", bottleCapColorFa: "آبی", frequencyPerDay: 6, durationDays: 30 }],
      },
    });

    const today = (
      await app.inject({
        method: "GET",
        url: "/v1/patient/today",
        headers: { authorization: `Bearer ${patApp.token}` },
      })
    ).json() as { scheduleItems: Array<{ eyeLaterality: string; prescriptionVersion: number }> };
    expect(today.scheduleItems.find((x) => x.eyeLaterality === "OD")?.prescriptionVersion).toBe(1);
    expect(today.scheduleItems.find((x) => x.eyeLaterality === "OS")?.prescriptionVersion).toBe(2);

    // Process 2: Offline retry deduplication + red-flag trigger
    const offlineKey = randomUUID();
    const a1 = (
      await app.inject({
        method: "POST",
        url: `/v1/episodes/${epOd.episodeId}/adherence`,
        headers: { authorization: `Bearer ${patApp.token}`, "idempotency-key": offlineKey },
        payload: { eyeLaterality: "OD", prescriptionVersion: 1, state: "taken", occurredAt: "2026-11-23T12:00:00Z" },
      })
    ).json() as { deduplicated: boolean };
    const a2 = (
      await app.inject({
        method: "POST",
        url: `/v1/episodes/${epOd.episodeId}/adherence`,
        headers: { authorization: `Bearer ${patApp.token}`, "idempotency-key": offlineKey },
        payload: { eyeLaterality: "OD", prescriptionVersion: 1, state: "taken", occurredAt: "2026-11-23T12:00:00Z" },
      })
    ).json() as { deduplicated: boolean };
    expect(a1.deduplicated).toBe(false);
    expect(a2.deduplicated).toBe(true);

    const sym = (
      await app.inject({
        method: "POST",
        url: `/v1/episodes/${epOd.episodeId}/symptoms`,
        headers: { authorization: `Bearer ${patApp.token}`, "idempotency-key": randomUUID() },
        payload: {
          eyeLaterality: "OD",
          severePain: true,
          suddenVisionLoss: false,
          purulentDischarge: true,
          freeTextFa: "درد شدید چشم راست و ترشح چرکی",
        },
      })
    ).json() as { urgencyTier: string; triggeredTriageCaseId: string };
    expect(sym.urgencyTier).toBe("urgent");

    // Process 3: Triage claim -> handoff -> referral + Durable 48h SLA workflow
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/triage/cases/${sym.triggeredTriageCaseId}/claim`,
          headers: { authorization: `Bearer ${coordToken}` },
          payload: {},
        })
      ).statusCode
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/triage/cases/${sym.triggeredTriageCaseId}/claim`,
          headers: { authorization: `Bearer ${optomToken}` },
          payload: {},
        })
      ).statusCode
    ).toBe(409);
    await app.inject({
      method: "POST",
      url: `/v1/triage/cases/${sym.triggeredTriageCaseId}/handoff`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { targetStaffUserId: OPTOM_ID, handoffNoteFa: "تحویل برای اعزام فوری بیمار به بیمارستان" },
    });
    const refRes = await app.inject({
      method: "POST",
      url: `/v1/triage/cases/${sym.triggeredTriageCaseId}/referrals`,
      headers: { authorization: `Bearer ${optomToken}` },
      payload: {
        destinationHospitalFa: "اورژانس فارابی",
        reasonFa: "رد اندوفتالمیت حاد",
        urgent: true,
      },
    });
    expect(refRes.statusCode).toBe(201);

    const runtime = new DurableWorkflowRuntime(appPool);
    const tStart = new Date("2026-11-23T08:00:00Z");
    const t48h = new Date(tStart.getTime() + 48 * 3600 * 1000);
    await runtime.startWorkflow({
      tenantId: TENANT_ID,
      workflowType: POSTOP_SLA_WORKFLOW_TYPE,
      businessKey: epOs.episodeId,
      initialStage: "awaiting_48h_activation",
      initialData: { episodeId: epOs.episodeId },
      nextRunAt: t48h,
    });
    let sent = 0;
    const step1 = await runtime.resumeDueWorkflows(
      TENANT_ID,
      POSTOP_SLA_WORKFLOW_TYPE,
      createPostopSlaWorkflowHandler({
        dispatchActivationReminder: async () => {
          sent += 1;
          return { remindedAtIso: t48h.toISOString() };
        },
        escalateUnactivatedTriage: async () => ({ escalatedAtIso: t48h.toISOString(), urgencyTier: "followup_3_6m" }),
      }),
      t48h
    );
    expect(sent).toBe(1);
    expect(step1[0]?.state.stage).toBe("reminder_dispatched");

    // Process 4: Non-smartphone Print+Phone parity creates triage case & deterministic Vazirmatn PDF
    const printEp = (
      await app.inject({
        method: "POST",
        url: "/v1/episodes",
        headers: { authorization: `Bearer ${coordToken}` },
        payload: {
          patientId: patPrint.patientId,
          protocolType: "post_cataract",
          eyeLaterality: "OD",
          surgeonId: OPHTH_ID,
          accessMode: "print_phone",
          anchorAt: "2026-11-23T08:00:00Z",
        },
      })
    ).json() as { episodeId: string };

    const queue = (
      await app.inject({
        method: "GET",
        url: "/v1/triage/cases",
        headers: { authorization: `Bearer ${coordToken}` },
      })
    ).json() as { items: Array<{ patientId: string; status: string }> };
    expect(queue.items.some((c) => c.patientId === patPrint.patientId)).toBe(true);

    const pdfRep = (
      await app.inject({
        method: "POST",
        url: "/v1/reports",
        headers: { authorization: `Bearer ${ophthToken}` },
        payload: {
          reportType: "patient_schedule",
          patientId: patPrint.patientId,
          sourceRefId: printEp.episodeId,
          titleFa: "برنامه چاپی قطره‌های چشمی چشم راست",
          sections: [
            {
              headingFa: "چشم راست (OD)",
              linesFa: ["قطره بتامتازون ۰.۱٪ — درِ صورتی — هر ۴ ساعت یک قطره"],
            },
          ],
        },
      })
    ).json() as { reportId: string; sourceSha256: string };

    const pdfFile = await app.inject({
      method: "GET",
      url: `/v1/reports/${pdfRep.reportId}/pdf`,
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(pdfFile.statusCode).toBe(200);
    expect(pdfFile.headers["x-source-sha256"]).toBe(pdfRep.sourceSha256);
    expect(pdfFile.rawPayload.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
