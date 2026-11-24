import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { RedisQueueAiEngineGateway } from "../../../contexts/diagnostic-studies/index.js";
import { closeDbPool, createDbPool, runMigrations, withTenantTransaction } from "../../../packages/db/index.js";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../../../migrations");
const AI_ENGINE_DIR = path.resolve(__dirname, "../../../../../ai-engine");
const AI_ENGINE_PYTHON = path.join(AI_ENGINE_DIR, ".venv/bin/python");
const ADMIN_URL = process.env.DATABASE_ADMIN_URL ?? "postgresql://bina:bina_dev@127.0.0.1:15432/bina_dev";
const APP_URL = process.env.DATABASE_URL ?? "postgresql://bina_app:bina_app_dev@127.0.0.1:15432/bina_dev";
const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:16379";

const TENANT_ID = randomUUID();
const CLINIC_ID = randomUUID();
const OPHTH_ID = randomUUID();
const OPTOM_ID = randomUUID();
const COORD_ID = randomUUID();
const TECH_ID = randomUUID();

describe("Wave 1 Part 2 E2E Backend Integration (HTTP + Postgres RLS + Redis + Python AI Worker + Vazirmatn PDF)", () => {
  let adminPool: Pool;
  let appPool: Pool;
  let redisGateway: RedisQueueAiEngineGateway;
  let aiWorkerProc: ChildProcess;
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
         VALUES ($1, $2, 'بیمارستان تخصصی چشم بینا', '+982182401111')`,
        [CLINIC_ID, TENANT_ID]
      );
      await tx.query(
        `INSERT INTO staff_memberships (tenant_id, clinic_id, user_id, role, mfa_verified_at)
         VALUES ($1, $2, $3, 'ophthalmologist', now()),
                ($1, $2, $4, 'optometrist', now()),
                ($1, $2, $5, 'coordinator', now()),
                ($1, $2, $6, 'technician', now())`,
        [TENANT_ID, CLINIC_ID, OPHTH_ID, OPTOM_ID, COORD_ID, TECH_ID]
      );
    });

    const queueKey = `bina:ai:jobs:test:${randomUUID().slice(0, 8)}`;
    const resultPrefix = `bina:ai:result:test:${randomUUID().slice(0, 8)}:`;

    aiWorkerProc = spawn(AI_ENGINE_PYTHON, ["-m", "bina_ai_engine.worker.consumer"], {
      cwd: AI_ENGINE_DIR,
      env: {
        ...process.env,
        REDIS_URL,
        AI_ENGINE_MODE: "cpu_stub",
        FOUNDATION_BACKBONE: "dinov2_apache2",
        AI_QUEUE_KEY: queueKey,
        AI_RESULT_PREFIX: resultPrefix,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    redisGateway = new RedisQueueAiEngineGateway(REDIS_URL, {
      queueKey,
      resultPrefix,
      pollTimeoutMs: 12_000,
      engineMode: "cpu_stub",
    });

    const config = loadConfig({
      NODE_ENV: "test",
      AUTH_SIGNING_SECRET: "wave1-part2-signing-secret-123456",
      PHONE_HASH_SALT: "wave1-part2-salt-123456",
    });

    app = buildApp(config, {
      appPool,
      aiGateway: redisGateway,
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
    if (aiWorkerProc && !aiWorkerProc.killed) {
      aiWorkerProc.kill("SIGTERM");
    }
    await redisGateway?.close();
    await app?.close();
    await closeDbPool(appPool);
    await closeDbPool(adminPool);
  });

  async function staffLogin(userId: string): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/staff/session",
      payload: {
        oidcToken: `dev-oidc:${userId}`,
        clinicId: CLINIC_ID,
      },
    });
    expect(res.statusCode).toBe(200);
    return (res.json() as { accessToken: string }).accessToken;
  }

  async function patientLogin(phoneNumber: string): Promise<{ token: string; patientId: string }> {
    const reqOtp = await app.inject({
      method: "POST",
      url: "/v1/auth/patient/otp/request",
      payload: {
        phoneNumber,
        clinicId: CLINIC_ID,
        fixedOtpForTest: "987654",
      },
    });
    expect(reqOtp.statusCode).toBe(202);
    const { challengeId } = reqOtp.json() as { challengeId: string };

    const verOtp = await app.inject({
      method: "POST",
      url: "/v1/auth/patient/otp/verify",
      payload: {
        challengeId,
        otpCode: "987654",
        consentAccepted: true,
        consentVersion: "fa-IR-v1",
        phoneNumber,
        tenantId: TENANT_ID,
      },
    });
    expect(verOtp.statusCode).toBe(200);
    const body = verOtp.json() as { accessToken: string; patientId: string };
    return { token: body.accessToken, patientId: body.patientId };
  }

  it("enforces OD/OS surgical isolation, Rx versioning, Print+Phone parity, idempotency, red-flag triage & referral", async () => {
    const ophthToken = await staffLogin(OPHTH_ID);
    const optomToken = await staffLogin(OPTOM_ID);
    const coordToken = await staffLogin(COORD_ID);
    const { token: patientToken, patientId } = await patientLogin("+989123334455");

    // 1. Ambiguous 'OU' care episode rejected
    const badEp = await app.inject({
      method: "POST",
      url: "/v1/episodes",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        patientId,
        protocolType: "post_cataract",
        eyeLaterality: "OU",
        surgeonId: OPHTH_ID,
        accessMode: "app",
        anchorAt: "2026-11-23T09:00:00Z",
      },
    });
    expect(badEp.statusCode).toBe(400);

    // 2. Create separate OD (app) & OS (print_phone -> auto-opens coordinator triage)
    const odEpRes = await app.inject({
      method: "POST",
      url: "/v1/episodes",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        patientId,
        protocolType: "post_cataract",
        eyeLaterality: "OD",
        surgeonId: OPHTH_ID,
        accessMode: "app",
        anchorAt: "2026-11-23T09:00:00Z",
      },
    });
    expect(odEpRes.statusCode).toBe(201);
    const odEpisodeId = (odEpRes.json() as { episodeId: string }).episodeId;

    const osEpRes = await app.inject({
      method: "POST",
      url: "/v1/episodes",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        patientId,
        protocolType: "post_cataract",
        eyeLaterality: "OS",
        surgeonId: OPHTH_ID,
        accessMode: "print_phone",
        anchorAt: "2026-11-23T09:00:00Z",
      },
    });
    expect(osEpRes.statusCode).toBe(201);
    const osEpisodeId = (osEpRes.json() as { episodeId: string }).episodeId;

    // 3. Optometrist blocked from publishing Rx (403)
    const optomRx = await app.inject({
      method: "POST",
      url: `/v1/episodes/${odEpisodeId}/prescriptions`,
      headers: { authorization: `Bearer ${optomToken}` },
      payload: {
        eyeLaterality: "OD",
        reasonFa: "نسخه اولیه",
        items: [
          {
            drugNameFa: "قطره بتامتازون ۰.۱٪",
            genericName: "Betamethasone 0.1%",
            bottleCapColorFa: "درِ صورتی",
            frequencyPerDay: 4,
            durationDays: 14,
          },
        ],
      },
    });
    expect(optomRx.statusCode).toBe(403);

    // 4. Ophthalmologist publishes OD v1; wrong-eye OS into OD blocked; OS v1 -> OS v2 leaves OD v1 untouched
    const odV1 = await app.inject({
      method: "POST",
      url: `/v1/episodes/${odEpisodeId}/prescriptions`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        eyeLaterality: "OD",
        reasonFa: "برنامه پس از فیکو چشم راست",
        items: [
          {
            drugNameFa: "قطره بتامتازون ۰.۱٪",
            genericName: "Betamethasone 0.1%",
            bottleCapColorFa: "درِ صورتی",
            frequencyPerDay: 6,
            durationDays: 14,
          },
        ],
      },
    });
    expect(odV1.statusCode).toBe(201);
    expect((odV1.json() as { version: number }).version).toBe(1);

    const wrongEyeRx = await app.inject({
      method: "POST",
      url: `/v1/episodes/${odEpisodeId}/prescriptions`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        eyeLaterality: "OS",
        reasonFa: "تلاش اشتباه برای چشم چپ",
        items: [
          {
            drugNameFa: "قطره سیپروفلوکساسین",
            genericName: "Ciprofloxacin",
            bottleCapColorFa: "درِ سفید",
            frequencyPerDay: 4,
            durationDays: 7,
          },
        ],
      },
    });
    expect(wrongEyeRx.statusCode).toBe(400);

    await app.inject({
      method: "POST",
      url: `/v1/episodes/${osEpisodeId}/prescriptions`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        eyeLaterality: "OS",
        reasonFa: "نسخه پایه چشم چپ",
        items: [
          {
            drugNameFa: "قطره لووفلوکساسین ۰.۵٪",
            genericName: "Levofloxacin 0.5%",
            bottleCapColorFa: "درِ قهوه‌ای",
            frequencyPerDay: 4,
            durationDays: 7,
          },
        ],
      },
    });
    const osV2 = await app.inject({
      method: "POST",
      url: `/v1/episodes/${osEpisodeId}/prescriptions`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        eyeLaterality: "OS",
        reasonFa: "کاهش دوز هفته دوم چشم چپ",
        items: [
          {
            drugNameFa: "قطره سیپروفلوکساسین ۰.۳٪",
            genericName: "Ciprofloxacin 0.3%",
            bottleCapColorFa: "درِ سفید",
            frequencyPerDay: 2,
            durationDays: 7,
          },
        ],
      },
    });
    expect(osV2.statusCode).toBe(201);
    expect((osV2.json() as { version: number }).version).toBe(2);

    const odCheck = await app.inject({
      method: "GET",
      url: `/v1/episodes/${odEpisodeId}`,
      headers: { authorization: `Bearer ${patientToken}` },
    });
    expect((odCheck.json() as { activePrescriptionVersion: number }).activePrescriptionVersion).toBe(1);

    // 5. Patient Today shows isolated OD v1 and OS v2 with Persian labels + hotline
    const todayRes = await app.inject({
      method: "GET",
      url: "/v1/patient/today",
      headers: { authorization: `Bearer ${patientToken}` },
    });
    expect(todayRes.statusCode).toBe(200);
    const todayBody = todayRes.json() as {
      emergencyHotlinePhone: string;
      scheduleItems: Array<{ eyeLaterality: string; eyeLabelFa: string; prescriptionVersion: number }>;
    };
    expect(todayBody.emergencyHotlinePhone).toBe("+982182401111");
    expect(todayBody.scheduleItems.find((i) => i.eyeLaterality === "OD")).toMatchObject({
      eyeLabelFa: "چشم راست",
      prescriptionVersion: 1,
    });
    expect(todayBody.scheduleItems.find((i) => i.eyeLaterality === "OS")).toMatchObject({
      eyeLabelFa: "چشم چپ",
      prescriptionVersion: 2,
    });

    // 6. Idempotent adherence replay deduplicates
    const idemKey = randomUUID();
    const adh1 = await app.inject({
      method: "POST",
      url: `/v1/episodes/${odEpisodeId}/adherence`,
      headers: { authorization: `Bearer ${patientToken}`, "idempotency-key": idemKey },
      payload: {
        eyeLaterality: "OD",
        prescriptionVersion: 1,
        state: "taken",
        occurredAt: "2026-11-23T14:00:00Z",
      },
    });
    expect(adh1.statusCode).toBe(201);
    expect((adh1.json() as { deduplicated: boolean }).deduplicated).toBe(false);

    const adh2 = await app.inject({
      method: "POST",
      url: `/v1/episodes/${odEpisodeId}/adherence`,
      headers: { authorization: `Bearer ${patientToken}`, "idempotency-key": idemKey },
      payload: {
        eyeLaterality: "OD",
        prescriptionVersion: 1,
        state: "taken",
        occurredAt: "2026-11-23T14:00:00Z",
      },
    });
    expect(adh2.statusCode).toBe(201);
    expect((adh2.json() as { deduplicated: boolean }).deduplicated).toBe(true);

    // 7. Post-op red flag -> urgent triage -> claim lock -> handoff -> referral
    const symRes = await app.inject({
      method: "POST",
      url: `/v1/episodes/${odEpisodeId}/symptoms`,
      headers: { authorization: `Bearer ${patientToken}`, "idempotency-key": randomUUID() },
      payload: {
        eyeLaterality: "OD",
        severePain: false,
        suddenVisionLoss: false,
        purulentDischarge: false,
        freeTextFa: "درد شدید و کاهش ناگهانی دید در چشم راست از دو ساعت پیش",
      },
    });
    expect(symRes.statusCode).toBe(201);
    const symBody = symRes.json() as {
      urgencyTier: string;
      urgencyLabelFa: string;
      triggeredTriageCaseId: string;
    };
    expect(symBody.urgencyTier).toBe("urgent");
    expect(symBody.urgencyLabelFa).toBe("ارجاع فوری");

    const claimOk = await app.inject({
      method: "POST",
      url: `/v1/triage/cases/${symBody.triggeredTriageCaseId}/claim`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {},
    });
    expect(claimOk.statusCode).toBe(200);

    const doubleClaim = await app.inject({
      method: "POST",
      url: `/v1/triage/cases/${symBody.triggeredTriageCaseId}/claim`,
      headers: { authorization: `Bearer ${optomToken}` },
      payload: {},
    });
    expect(doubleClaim.statusCode).toBe(409);

    const handoff = await app.inject({
      method: "POST",
      url: `/v1/triage/cases/${symBody.triggeredTriageCaseId}/handoff`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        targetStaffUserId: OPTOM_ID,
        handoffNoteFa: "بیمار به شیفت عصر تحویل داده شد تا ارجاع فوری ثبت گردد.",
      },
    });
    expect(handoff.statusCode).toBe(200);
    expect((handoff.json() as { ownerId: string }).ownerId).toBe(OPTOM_ID);

    const referral = await app.inject({
      method: "POST",
      url: `/v1/triage/cases/${symBody.triggeredTriageCaseId}/referrals`,
      headers: { authorization: `Bearer ${optomToken}` },
      payload: {
        destinationHospitalFa: "اورژانس چشم بیمارستان فارابی",
        reasonFa: "درد حاد و افت دید پس از جراحی فیکو",
        urgent: true,
      },
    });
    expect(referral.statusCode).toBe(201);
  });

  it("runs Pillar 2 QC rejection, Redis->Python AI Worker multimodal urgent study, ophthalmologist-only HITL signoff & Vazirmatn PDF", async () => {
    const ophthToken = await staffLogin(OPHTH_ID);
    const optomToken = await staffLogin(OPTOM_ID);
    const techToken = await staffLogin(TECH_ID);
    const { token: patientToken, patientId } = await patientLogin("+989124445566");

    // 1. Blurry scan blocked by Layer 1 QC -> 0 specialists run
    const qcFailRes = await app.inject({
      method: "POST",
      url: "/v1/diagnostic-studies",
      headers: { authorization: `Bearer ${techToken}` },
      payload: {
        patientId,
        eyeLaterality: "OD",
        assets: [
          {
            assetId: randomUUID(),
            s3ObjectKey: "studies/blur_fundus_od.png",
            declaredModality: "fundus",
            declaredEye: "OD",
          },
        ],
      },
    });
    expect(qcFailRes.statusCode).toBe(202);
    const qcFailBody = qcFailRes.json() as {
      status: string;
      specialistOutputs: unknown[];
      qcDecisions: Array<{ rejectionReasonsFa: string[] }>;
    };
    expect(qcFailBody.status).toBe("qc_failed");
    expect(qcFailBody.specialistOutputs).toEqual([]);
    expect(qcFailBody.qcDecisions[0]?.rejectionReasonsFa).toContain("تار بودن تصویر");

    // 2. Valid multimodal study with infectious_keratitis -> pending_hitl + urgent triage + hidden from patient until signed
    const studyRes = await app.inject({
      method: "POST",
      url: "/v1/diagnostic-studies",
      headers: { authorization: `Bearer ${techToken}` },
      payload: {
        patientId,
        eyeLaterality: "OD",
        assets: [
          {
            assetId: randomUUID(),
            s3ObjectKey: "studies/clean_fundus_od.png",
            declaredModality: "fundus",
            declaredEye: "OD",
          },
          {
            assetId: randomUUID(),
            s3ObjectKey: "studies/slitlamp_keratitis_od.png",
            declaredModality: "slit_lamp",
            declaredEye: "OD",
            conditionHints: ["infectious_keratitis"],
          },
        ],
        labs: { hba1cPercent: 7.5, iopMmHg: 21.0 },
      },
    });
    expect(studyRes.statusCode).toBe(202);
    const studyBody = studyRes.json() as {
      studyId: string;
      status: string;
      fusionResult: { recommendedUrgency: string; recommendedUrgencyLabelFa: string };
      explainability: {
        primarySegmentationMasks: Array<{ isPrimaryExplainability: boolean }>;
        auxiliaryGradCams: Array<{ isAuxiliaryOnly: boolean }>;
      };
    };
    expect(studyBody.status).toBe("pending_hitl");
    expect(studyBody.fusionResult.recommendedUrgency).toBe("urgent");
    expect(studyBody.fusionResult.recommendedUrgencyLabelFa).toBe("ارجاع فوری");
    expect(studyBody.explainability.primarySegmentationMasks.length).toBeGreaterThanOrEqual(2);
    expect(studyBody.explainability.auxiliaryGradCams.every((g) => g.isAuxiliaryOnly)).toBe(true);

    // Unsigned study MUST NOT be visible to patient
    const preSignPatient = await app.inject({
      method: "GET",
      url: "/v1/patient/diagnostic-summaries",
      headers: { authorization: `Bearer ${patientToken}` },
    });
    expect(preSignPatient.statusCode).toBe(200);
    expect((preSignPatient.json() as { items: unknown[] }).items).toHaveLength(0);

    // Optometrist signoff attempt blocked (403)
    const optomSign = await app.inject({
      method: "POST",
      url: `/v1/diagnostic-studies/${studyBody.studyId}/signoff`,
      headers: { authorization: `Bearer ${optomToken}` },
      payload: {
        action: "approved",
        finalUrgency: "urgent",
        finalReportTextFa: "ارجاع فوری به متخصص قرنیه",
      },
    });
    expect(optomSign.statusCode).toBe(403);

    // Ophthalmologist signoff succeeds
    const ophthSign = await app.inject({
      method: "POST",
      url: `/v1/diagnostic-studies/${studyBody.studyId}/signoff`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        action: "edited_approved",
        finalUrgency: "urgent",
        overrideReasonFa: "تایید علائم بالینی کراتیت عفونی در اسلیت‌لمپ و نیاز به شروع درمان فوری",
        finalReportTextFa: "بیمار محترم، معاینه قرنیه چشم راست نیازمند بررسی فوری توسط فوق‌تخصص قرنیه است.",
      },
    });
    expect(ophthSign.statusCode).toBe(200);

    // Now visible to patient!
    const postSignPatient = await app.inject({
      method: "GET",
      url: "/v1/patient/diagnostic-summaries",
      headers: { authorization: `Bearer ${patientToken}` },
    });
    expect(postSignPatient.statusCode).toBe(200);
    const items = (postSignPatient.json() as { items: Array<{ studyId: string; urgencyLabelFa: string }> }).items;
    expect(items).toHaveLength(1);
    expect(items[0]?.studyId).toBe(studyBody.studyId);
    expect(items[0]?.urgencyLabelFa).toBe("ارجاع فوری");

    // Generate & download deterministic Persian Vazirmatn PDF
    const repRes = await app.inject({
      method: "POST",
      url: "/v1/reports",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        reportType: "signed_diagnostic",
        patientId,
        sourceRefId: studyBody.studyId,
        titleFa: "گزارش نهایی چندوجهی چشم‌پزشکی بینا",
        sections: [
          {
            headingFa: "توصیه تکمیلی پزشک",
            linesFa: ["لطفاً امروز بدون تاخیر به کلینیک تخصصی قرنیه مراجعه نمایید."],
          },
        ],
      },
    });
    expect(repRes.statusCode).toBe(201);
    const { reportId, sourceSha256 } = repRes.json() as { reportId: string; sourceSha256: string };

    const pdfRes = await app.inject({
      method: "GET",
      url: `/v1/reports/${reportId}/pdf`,
      headers: { authorization: `Bearer ${patientToken}` },
    });
    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers["content-type"]).toContain("application/pdf");
    expect(pdfRes.headers["x-source-sha256"]).toBe(sourceSha256);
    expect(pdfRes.rawPayload.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
