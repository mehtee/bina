import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  closeDbPool,
  createDbPool,
  runMigrations,
  withTenantTransaction,
  withUnscopedTransaction,
} from "../../../packages/db/index.js";
import {
  asJobId,
  type DiagnosticAnalysisRequest,
  type DiagnosticInferenceGatewayPort,
  type MultimodalDiagnosticResult,
} from "../../../packages/domain-kernel/index.js";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../../../migrations");

const ADMIN_URL = process.env.DATABASE_ADMIN_URL ?? "postgresql://bina:bina_dev@127.0.0.1:15432/bina_dev";
const APP_URL = process.env.DATABASE_URL ?? "postgresql://bina_app:bina_app_dev@127.0.0.1:15432/bina_dev";

const TENANT_A = randomUUID();
const CLINIC_A = randomUUID();
const CLINIC_A2 = randomUUID();
const TENANT_B = randomUUID();
const CLINIC_B = randomUUID();

const USER_OPHTH = randomUUID();
const USER_ADMIN = randomUUID();
const USER_COORD = randomUUID();
const USER_TENANT_B_ADMIN = randomUUID();
const USER_EXTRA_STAFF = randomUUID();

const ALL_009_TABLES = [
  "patient_clinical_histories",
  "follow_up_tasks",
  "clinic_outages",
  "clinician_feedback",
  "home_vision_test_trials",
  "device_qualification_registry",
  "monitoring_plans",
  "clinic_message_templates",
  "clinic_consent_templates",
  "clinic_feature_flags",
  "integration_endpoints",
  "integration_deliveries",
  "break_glass_sessions",
] as const;

function buildMockAiGateway(): DiagnosticInferenceGatewayPort {
  const jobs = new Map<string, MultimodalDiagnosticResult>();

  return {
    async submitStudyAnalysis(req: DiagnosticAnalysisRequest) {
      const assets = req.assets as Array<{
        assetId: string;
        s3ObjectKey: string;
        declaredModality: string;
        declaredEye: "OD" | "OS";
        blurScoreHint?: number;
        conditionHints?: string[];
      }>;

      const hasBlur = assets.some(
        (a) => a.s3ObjectKey.includes("blur") || (typeof a.blurScoreHint === "number" && a.blurScoreHint < 0.3)
      );

      if (hasBlur) {
        jobs.set(req.jobId, {
          studyId: req.studyId,
          jobId: req.jobId,
          status: "qc_failed",
          engineMode: "cpu_stub",
          payload: {
            qcDecisions: assets.map((a) => {
              const failed =
                a.s3ObjectKey.includes("blur") ||
                (typeof a.blurScoreHint === "number" && a.blurScoreHint < 0.3);
              return {
                assetId: a.assetId,
                modalityPrediction: {
                  assetId: a.assetId,
                  declaredModality: a.declaredModality,
                  detectedModality: a.declaredModality,
                  confidence: 0.94,
                  matchesDeclared: true,
                },
                passed: !failed,
                rejectionCodes: failed ? ["blur"] : [],
                rejectionReasonsFa: failed ? ["وضوح تصویر برای ارزیابی بالینی کافی نیست."] : [],
                recaptureInstructionFa: failed ? "لطفاً با فوکوس دقیق‌تر تصویر را تکرار کنید." : null,
              };
            }),
          },
        });
      } else {
        const allHints = assets.flatMap((a) => a.conditionHints ?? []);
        const isActiveCnv = allHints.includes("active_cnv");
        const isPriorComparison = allHints.includes("prior_baseline");
        const eye = req.eyeLaterality === "OS" ? "OS" : "OD";
        const availableModalities = Array.from(new Set(assets.map((a) => a.declaredModality)));

        jobs.set(req.jobId, {
          studyId: req.studyId,
          jobId: req.jobId,
          status: "analyzed",
          engineMode: "cpu_stub",
          payload: {
            qcDecisions: assets.map((a) => ({
              assetId: a.assetId,
              modalityPrediction: {
                assetId: a.assetId,
                declaredModality: a.declaredModality,
                detectedModality: a.declaredModality,
                confidence: 0.97,
                matchesDeclared: true,
              },
              passed: true,
              rejectionCodes: [],
              rejectionReasonsFa: [],
              recaptureInstructionFa: null,
            })),
            specialistOutputs: [
              {
                specialistId: "fundus",
                backboneId: "dinov2-vitb14-apache2",
                eyeLaterality: eye,
                probabilities: isActiveCnv ? { active_cnv: 0.91 } : { dr_moderate: 0.68 },
                biomarkers: isActiveCnv ? { dr_score: 0.84 } : { dr_score: isPriorComparison ? 0.62 : 0.71 },
                summaryFa: isActiveCnv
                  ? `در بررسی فوندوس ${eye === "OD" ? "چشم راست" : "چشم چپ"} شواهد نئوواسکولاریزاسیون مشکوک مشاهده شد.`
                  : `در فوندوس ${eye === "OD" ? "چشم راست" : "چشم چپ"} تغییرات رگ‌زایی خفیف ثبت شد.`,
                maskS3Key: `s3://bina-dev/masks/${req.studyId}/fundus.png`,
                gradcamS3Key: `s3://bina-dev/gradcam/${req.studyId}/fundus.png`,
              },
              {
                specialistId: "oct",
                backboneId: "monai-unet-apache2",
                eyeLaterality: eye,
                probabilities: isActiveCnv ? { active_cnv: 0.89 } : { dme_mild: 0.55 },
                biomarkers: { crt_um: isActiveCnv ? 425 : isPriorComparison ? 350 : 310 },
                summaryFa: isActiveCnv
                  ? `در OCT ${eye === "OD" ? "چشم راست" : "چشم چپ"} مایع زیرشبکیه‌ای و افزایش ضخامت ماکولا دیده می‌شود.`
                  : `ضخامت مرکزی ماکولا در ${eye === "OD" ? "چشم راست" : "چشم چپ"} اندازه‌گیری شد.`,
                maskS3Key: `s3://bina-dev/masks/${req.studyId}/oct.png`,
                gradcamS3Key: `s3://bina-dev/gradcam/${req.studyId}/oct.png`,
              },
            ],
            fusionResult: {
              eyeLaterality: eye,
              availableModalities,
              missingModalities: ["visual_field", "anterior", "tabular_xgb"],
              missingModalityNoticeFa: "مدالیته‌های میدان بینایی، قدامی و جدولی در این معاینه ثبت نشده‌اند.",
              differential: [
                {
                  conditionCode: isActiveCnv ? "active_cnv" : "dr_moderate",
                  conditionNameFa: isActiveCnv
                    ? "نئوواسکولاریزاسیون فعال کوروئید (CNV)"
                    : "رتینوپاتی دیابتی متوسط",
                  confidence: isActiveCnv ? 0.91 : 0.68,
                  confidenceIntervalLower: isActiveCnv ? 0.84 : 0.58,
                  confidenceIntervalUpper: isActiveCnv ? 0.96 : 0.77,
                  severity: isActiveCnv ? "urgent" : "moderate",
                  supportingModalities: availableModalities,
                },
              ],
              discordanceFlagsFa: [],
              // Intentionally pass non-urgent rawUrgency for active_cnv so Pillar2UrgentFloorEvaluator upgrade is verified!
              recommendedUrgency: "followup_3_6m",
              recommendedUrgencyLabelFa: "پیگیری ۳ تا ۶ ماه",
            },
            explainability: {
              primarySegmentationMasks: [
                {
                  modality: "oct",
                  maskS3Key: `s3://bina-dev/masks/${req.studyId}/oct.png`,
                  labelFa: "ماسک سگمنتیشن لایه‌های شبکیه و مایع",
                  isPrimary: true,
                },
              ],
              auxiliaryGradCams: [
                {
                  modality: "fundus",
                  gradcamS3Key: `s3://bina-dev/gradcam/${req.studyId}/fundus.png`,
                  auxiliaryLabelFa: "نقشه توجه کمکی (Grad-CAM — صرفاً راهنمای کمکی)",
                  isPrimary: false,
                },
              ],
            },
          },
        });
      }

      return { jobId: asJobId(req.jobId), engineMode: "cpu_stub" };
    },

    async getJobResult(jobId) {
      const found = jobs.get(jobId);
      if (!found) {
        throw new Error(`Unknown mock AI job: ${jobId}`);
      }
      return found;
    },
  };
}

describe("Staff Web Complete Backend API & Multi-Tenant RLS Integration", () => {
  const adminPool = createDbPool(ADMIN_URL, 2);
  const appPool = createDbPool(APP_URL, 4);
  const config = loadConfig({ NODE_ENV: "test" });
  const app = buildApp(config, {
    appPool,
    aiGateway: buildMockAiGateway(),
    resolveTenantByClinicId: async (clinicId) => {
      const res = await adminPool.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM clinics WHERE id = $1 LIMIT 1",
        [clinicId]
      );
      return res.rows[0]?.tenant_id ?? null;
    },
  });

  let ophthToken = "";
  let adminToken = "";
  let adminStepUpToken = "";
  let adminMembershipId = "";
  let coordToken = "";
  let tenantBAdminToken = "";

  let patientAId = "";
  let cnvStudyId = "";
  let blurAssetId = "";
  let cnvUrgentCaseId = "";
  let cnvReferralId = "";
  let odEpisodeId = "";
  let osPrintPhoneEpisodeId = "";

  const uniquePhoneDigits = String(Math.floor(1000000 + Math.random() * 8999999));
  const patientAPhone = `+98912${uniquePhoneDigits}`;

  beforeAll(async () => {
    await runMigrations(adminPool, MIGRATIONS_DIR);

    await withUnscopedTransaction(adminPool, async (tx) => {
      await tx.query(
        `INSERT INTO tenants (id, jurisdiction, data_residency_region, status)
         VALUES ($1, 'IR', 'IR', 'active'), ($2, 'IR', 'IR', 'active')`,
        [TENANT_A, TENANT_B]
      );
    });

    await withTenantTransaction(adminPool, TENANT_A, async (tx) => {
      await tx.query(
        `INSERT INTO clinics (id, tenant_id, name_fa, emergency_phone)
         VALUES ($1, $3, 'کلینیک چشم‌پزشکی بینا الف', '+982182401001'),
                ($2, $3, 'کلینیک چشم‌پزشکی بینا الف ۲', '+982182401002')`,
        [CLINIC_A, CLINIC_A2, TENANT_A]
      );
      const adminRow = await tx.query<{ id: string }>(
        `INSERT INTO staff_memberships (tenant_id, clinic_id, user_id, role, active, full_name_fa, email, mfa_verified_at)
         VALUES ($1, $2, $3, 'admin', true, 'مدیر سامانه الف', 'admin-a@bina.ir', now())
         RETURNING id`,
        [TENANT_A, CLINIC_A, USER_ADMIN]
      );
      adminMembershipId = adminRow.rows[0]!.id;

      await tx.query(
        `INSERT INTO staff_memberships (tenant_id, clinic_id, user_id, role, active, full_name_fa, email, mfa_verified_at)
         VALUES ($1, $2, $4, 'ophthalmologist', true, 'دکتر مریم رضایی', 'ophth@bina.ir', now()),
                ($1, $2, $5, 'coordinator', true, 'سهراب کاظمی', 'coord@bina.ir', now()),
                ($1, $3, $6, 'admin', true, 'مدیر سامانه الف', 'admin-a@bina.ir', now())`,
        [TENANT_A, CLINIC_A, CLINIC_A2, USER_OPHTH, USER_COORD, USER_ADMIN]
      );
    });

    await withTenantTransaction(adminPool, TENANT_B, async (tx) => {
      await tx.query(
        `INSERT INTO clinics (id, tenant_id, name_fa, emergency_phone)
         VALUES ($1, $2, 'کلینیک مستقل ب', '+982182402001')`,
        [CLINIC_B, TENANT_B]
      );
      await tx.query(
        `INSERT INTO staff_memberships (tenant_id, clinic_id, user_id, role, active, full_name_fa, email, mfa_verified_at)
         VALUES ($1, $2, $3, 'admin', true, 'مدیر کلینیک ب', 'admin-b@bina.ir', now())`,
        [TENANT_B, CLINIC_B, USER_TENANT_B_ADMIN]
      );
    });

    const login = async (userId: string, clinicId: string) => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/staff/session",
        payload: { oidcToken: `dev-oidc:${userId}`, clinicId },
      });
      expect(res.statusCode).toBe(200);
      return (res.json() as { accessToken: string }).accessToken;
    };

    ophthToken = await login(USER_OPHTH, CLINIC_A);
    adminToken = await login(USER_ADMIN, CLINIC_A);
    coordToken = await login(USER_COORD, CLINIC_A);
    tenantBAdminToken = await login(USER_TENANT_B_ADMIN, CLINIC_B);

    const stepUpRes = await app.inject({
      method: "POST",
      url: "/v1/auth/staff/step-up",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { stepUpCode: "654321" },
    });
    expect(stepUpRes.statusCode).toBe(200);
    adminStepUpToken = (stepUpRes.json() as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await app.close();
    await closeDbPool(appPool);
    await closeDbPool(adminPool);
  });

  it("Area 1 (Module M): resolves /me capabilities, multi-clinic switcher, and RBAC distinctions", async () => {
    const ophthMeRes = await app.inject({
      method: "GET",
      url: "/v1/auth/staff/me",
      headers: { authorization: `Bearer ${ophthToken}` },
    });
    expect(ophthMeRes.statusCode).toBe(200);
    const ophthMe = ophthMeRes.json() as {
      role: string;
      capabilities: Record<string, boolean>;
      clinic: { locale: string; calendarMode: string; nameFa: string };
      brand: { nameFa: string; nameEn: string };
      authorizedClinics: Array<{ clinicId: string }>;
    };
    expect(ophthMe.role).toBe("ophthalmologist");
    expect(ophthMe.capabilities["diagnostic:signoff"]).toBe(true);
    expect(ophthMe.capabilities["admin:manage"]).toBe(false);
    expect(ophthMe.clinic.locale).toBe("fa-IR");
    expect(ophthMe.clinic.calendarMode).toBe("jalali");
    expect(ophthMe.brand.nameFa.length).toBeGreaterThan(0);

    const coordMeRes = await app.inject({
      method: "GET",
      url: "/v1/auth/staff/me",
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(coordMeRes.statusCode).toBe(200);
    const coordMe = coordMeRes.json() as { capabilities: Record<string, boolean> };
    expect(coordMe.capabilities["diagnostic:signoff"]).toBe(false);
    expect(coordMe.capabilities["triage:manage"]).toBe(true);

    const clinicsRes = await app.inject({
      method: "GET",
      url: "/v1/auth/staff/clinics",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(clinicsRes.statusCode).toBe(200);
    const clinicsBody = clinicsRes.json() as { items: Array<{ clinicId: string }> };
    expect(clinicsBody.items.map((c) => c.clinicId)).toContain(CLINIC_A);
    expect(clinicsBody.items.map((c) => c.clinicId)).toContain(CLINIC_A2);
  });

  it("Area 2 (Modules A & B): enrolls patient, manages immutable history & consent, and queries Overview/Search/360/Timeline", async () => {
    const enrollRes = await app.inject({
      method: "POST",
      url: "/v1/patients",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        fullNameFa: "زهرا حسینی مقدم",
        phoneNumber: patientAPhone,
        accessMode: "app",
        nationalIdMasked: "001***4567",
        birthYearJalali: 1342,
        consentVersion: "fa-ir-v2.0",
        mlTrainingConsentFlag: false,
      },
    });
    expect(enrollRes.statusCode).toBe(201);
    const enrolled = enrollRes.json() as { patientId: string; phoneMasked: string; mlTrainingConsentFlag: boolean };
    patientAId = enrolled.patientId;
    expect(enrolled.phoneMasked).not.toBe(patientAPhone);
    expect(enrolled.mlTrainingConsentFlag).toBe(false);

    const listRes = await app.inject({
      method: "GET",
      url: `/v1/patients?q=${encodeURIComponent("مقدم")}`,
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    expect((listRes.json() as { items: Array<{ patientId: string }> }).items.some((p) => p.patientId === patientAId)).toBe(true);

    const histCreate = await app.inject({
      method: "POST",
      url: `/v1/patients/${patientAId}/history`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        summaryFa: "سابقه دیابت نوع ۲ به مدت ۱۲ سال و پرفشاری خون کنترل‌شده.",
        conditions: ["type2_diabetes", "hypertension"],
        allergies: ["sulfa"],
        medications: ["متفورمین ۵۰۰"],
        labs: { hba1c: 8.1 },
      },
    });
    expect(histCreate.statusCode).toBe(201);

    const withdrawConsent = await app.inject({
      method: "PATCH",
      url: `/v1/patients/${patientAId}/consent`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        consentVersion: "fa-ir-v2.0",
        action: "withdrawn",
        mlTrainingConsentFlag: false,
        noteFa: "انصراف بیمار از استفاده داده‌ها در پژوهش",
      },
    });
    expect(withdrawConsent.statusCode).toBe(200);
    expect((withdrawConsent.json() as { action: string }).action).toBe("withdrawn");

    const reacceptConsent = await app.inject({
      method: "PATCH",
      url: `/v1/patients/${patientAId}/consent`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        consentVersion: "fa-ir-v2.1",
        action: "accepted",
        mlTrainingConsentFlag: true,
      },
    });
    expect(reacceptConsent.statusCode).toBe(200);

    const p360Res = await app.inject({
      method: "GET",
      url: `/v1/patients/${patientAId}`,
      headers: { authorization: `Bearer ${ophthToken}` },
    });
    expect(p360Res.statusCode).toBe(200);
    const p360 = p360Res.json() as {
      patient: { fullNameFa: string; phoneMasked: string; mlTrainingConsentFlag: boolean };
      clinicalHistories: Array<{ summaryFa: string }>;
      consents: Array<{ consentVersion: string; action: string }>;
    };
    expect(p360.patient.mlTrainingConsentFlag).toBe(true);
    expect(p360.clinicalHistories.length).toBeGreaterThanOrEqual(1);
    expect(p360.consents.some((c) => c.action === "withdrawn")).toBe(true);

    const [timelineRes, overviewRes, searchRes, activityRes] = await Promise.all([
      app.inject({ method: "GET", url: `/v1/patients/${patientAId}/timeline`, headers: { authorization: `Bearer ${ophthToken}` } }),
      app.inject({ method: "GET", url: "/v1/overview/dashboard", headers: { authorization: `Bearer ${ophthToken}` } }),
      app.inject({
        method: "GET",
        url: `/v1/overview/search?q=${encodeURIComponent("حسینی")}`,
        headers: { authorization: `Bearer ${ophthToken}` },
      }),
      app.inject({ method: "GET", url: "/v1/overview/activity?limit=10", headers: { authorization: `Bearer ${ophthToken}` } }),
    ]);

    expect(timelineRes.statusCode).toBe(200);
    expect(overviewRes.statusCode).toBe(200);
    expect((overviewRes.json() as { todayJalali: string }).todayJalali).toMatch(/^۱۴/);
    expect(searchRes.statusCode).toBe(200);
    expect((searchRes.json() as { patients: Array<{ patientId: string }> }).patients[0]?.patientId).toBe(patientAId);
    expect(activityRes.statusCode).toBe(200);
    expect((activityRes.json() as { items: unknown[] }).items.length).toBeGreaterThan(0);
  });

  it("Area 3 (Module C): enforces QC recapture, urgent-floor 422 non-downgrade, draft 422/409, feedback & study compare", async () => {
    blurAssetId = randomUUID();
    const blurrySubmit = await app.inject({
      method: "POST",
      url: "/v1/diagnostic-studies",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        patientId: patientAId,
        eyeLaterality: "OD",
        assets: [
          {
            assetId: blurAssetId,
            s3ObjectKey: "s3://bina-dev/studies/blur-od.png",
            declaredModality: "fundus",
            declaredEye: "OD",
            blurScoreHint: 0.15,
          },
        ],
      },
    });
    expect(blurrySubmit.statusCode).toBe(202);
    const qcFailedStudy = blurrySubmit.json() as { studyId: string; status: string };
    cnvStudyId = qcFailedStudy.studyId;
    expect(qcFailedStudy.status).toBe("qc_failed");

    const recaptureRes = await app.inject({
      method: "POST",
      url: `/v1/diagnostic-studies/${cnvStudyId}/assets`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        assets: [
          {
            assetId: randomUUID(),
            s3ObjectKey: "s3://bina-dev/studies/clear-fundus-od.png",
            declaredModality: "fundus",
            declaredEye: "OD",
            conditionHints: ["active_cnv"],
          },
          {
            assetId: randomUUID(),
            s3ObjectKey: "s3://bina-dev/studies/clear-oct-od.dcm",
            declaredModality: "oct",
            declaredEye: "OD",
            conditionHints: ["active_cnv"],
          },
        ],
      },
    });
    expect(recaptureRes.statusCode).toBe(202);
    const recaptured = recaptureRes.json() as {
      status: string;
      urgentFloorActive?: boolean;
      assets: Array<{ assetId: string; qcStatus: string }>;
      fusionResult: { rawUrgency: string; recommendedUrgency: string };
      persianReportDraft: { draftVersion?: number; evidenceIds: string[] };
    };
    expect(recaptured.assets.some((a) => a.assetId === blurAssetId && a.qcStatus === "reject")).toBe(true);
    expect(recaptured.assets.some((a) => a.qcStatus === "pass")).toBe(true);
    expect(recaptured.urgentFloorActive).toBe(true);
    expect(recaptured.fusionResult.rawUrgency).toBe("followup_3_6m");
    expect(recaptured.fusionResult.recommendedUrgency).toBe("urgent");

    const jobsRes = await app.inject({
      method: "GET",
      url: `/v1/diagnostic-studies/${cnvStudyId}/jobs`,
      headers: { authorization: `Bearer ${ophthToken}` },
    });
    expect(jobsRes.statusCode).toBe(200);
    expect((jobsRes.json() as { items: unknown[] }).items.length).toBe(2);

    const invalidDraftRes = await app.inject({
      method: "PUT",
      url: `/v1/diagnostic-studies/${cnvStudyId}/report-draft`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        expectedDraftVersion: 1,
        titleFa: "گزارش چشم راست",
        modalityFindingsFa: "همه‌چیز عادی است و در بررسی مشکلی وجود ندارد.",
        differentialSummaryFa: "یافته خفیف چشم راست.",
        crossModalCorrelationFa: "تطابق تصاویر موجود.",
        followUpPlanFa: "پیگیری عادی.",
        urgencyTier: "urgent",
      },
    });
    expect(invalidDraftRes.statusCode).toBe(422);
    expect((invalidDraftRes.json() as { error: string }).error).toBe("REPORT_DRAFT_VALIDATION_FAILED");

    const validDraftRes = await app.inject({
      method: "PUT",
      url: `/v1/diagnostic-studies/${cnvStudyId}/report-draft`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        expectedDraftVersion: 1,
        titleFa: "گزارش بالینی تایید ویرایش‌شده چشم راست",
        modalityFindingsFa: "در OCT و فوندوس چشم راست مایع زیرشبکیه‌ای و CNV فعال مشاهده شد.",
        differentialSummaryFa: "نئوواسکولاریزاسیون فعال کوروئید در چشم راست با فوریت بالا.",
        crossModalCorrelationFa: "تطابق کامل بین یافته‌های فوندوس و ضخامت ماکولا در OCT چشم راست.",
        followUpPlanFa: "ارجاع فوری به کلینیک شبکیه جهت معاینه حضوری و تصمیم‌گیری تزریق.",
        urgencyTier: "urgent",
        evidenceIds: recaptured.persianReportDraft.evidenceIds,
      },
    });
    expect(validDraftRes.statusCode).toBe(200);
    expect((validDraftRes.json() as { draftVersion: number }).draftVersion).toBe(2);

    const staleDraftRes = await app.inject({
      method: "PUT",
      url: `/v1/diagnostic-studies/${cnvStudyId}/report-draft`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        expectedDraftVersion: 1,
        titleFa: "نسخه قدیمی تستی چشم راست",
        modalityFindingsFa: "تلاش برای بازنویسی نسخه قدیمی چشم راست در مطالعه.",
        differentialSummaryFa: "جمع‌بندی چشم راست.",
        crossModalCorrelationFa: "همبستگی چشم راست.",
        followUpPlanFa: "برنامه پیگیری فوری چشم راست.",
        urgencyTier: "urgent",
      },
    });
    expect(staleDraftRes.statusCode).toBe(409);
    expect((staleDraftRes.json() as { error: string }).error).toBe("DRAFT_VERSION_CONFLICT");

    const illegalDowngradeSignoff = await app.inject({
      method: "POST",
      url: `/v1/diagnostic-studies/${cnvStudyId}/signoff`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        action: "edited_approved",
        finalUrgency: "routine",
        finalReportTextFa: "بیمار به صورت روتین پیگیری شود.",
        overrideReasonFa: "تست رد کاهش سطح فوریت",
        expectedDraftVersion: 2,
      },
    });
    expect(illegalDowngradeSignoff.statusCode).toBe(422);
    expect((illegalDowngradeSignoff.json() as { error: string }).error).toBe("URGENT_FLOOR_DOWNGRADE_FORBIDDEN");

    const staleSignoff = await app.inject({
      method: "POST",
      url: `/v1/diagnostic-studies/${cnvStudyId}/signoff`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        action: "edited_approved",
        finalUrgency: "urgent",
        finalReportTextFa: "ارجاع فوری شبکیه چشم راست ثبت شد.",
        overrideReasonFa: "تست نسخه منقضی",
        expectedDraftVersion: 1,
      },
    });
    expect(staleSignoff.statusCode).toBe(409);
    expect((staleSignoff.json() as { error: string }).error).toBe("DRAFT_VERSION_CONFLICT");

    const validSignoff = await app.inject({
      method: "POST",
      url: `/v1/diagnostic-studies/${cnvStudyId}/signoff`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        action: "edited_approved",
        finalUrgency: "urgent",
        finalReportTextFa: "گزارش چشم راست با شواهد CNV فعال تایید و ارجاع فوری صادر شد.",
        overrideReasonFa: "تایید نیاز به ارزیابی فوری رتین ظرف ۲۴ ساعت",
        expectedDraftVersion: 2,
      },
    });
    expect(validSignoff.statusCode).toBe(200);
    expect((validSignoff.json() as { finalUrgency: string }).finalUrgency).toBe("urgent");

    const feedbackRes = await app.inject({
      method: "POST",
      url: `/v1/diagnostic-studies/${cnvStudyId}/feedback`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        targetLayer: "segmentation",
        agreementState: "partially_agree",
        correctedLabelCode: "active_cnv",
        noteFa: "مرز مایع زیرشبکیه‌ای در یک مقطع نیاز به اصلاح جزئی داشت.",
      },
    });
    expect(feedbackRes.statusCode).toBe(201);

    const secondStudyRes = await app.inject({
      method: "POST",
      url: "/v1/diagnostic-studies",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        patientId: patientAId,
        eyeLaterality: "OD",
        assets: [
          {
            assetId: randomUUID(),
            s3ObjectKey: "s3://bina-dev/studies/followup-oct-od.dcm",
            declaredModality: "oct",
            declaredEye: "OD",
            conditionHints: ["prior_baseline"],
          },
        ],
      },
    });
    expect(secondStudyRes.statusCode).toBe(202);
    const secondStudyId = (secondStudyRes.json() as { studyId: string }).studyId;

    const compareRes = await app.inject({
      method: "GET",
      url: `/v1/diagnostic-studies/${secondStudyId}/compare`,
      headers: { authorization: `Bearer ${ophthToken}` },
    });
    expect(compareRes.statusCode).toBe(200);
    const compared = compareRes.json() as {
      priorStudies: unknown[];
      biomarkerDeltas: Array<{ metricKey: string; delta: number }>;
    };
    expect(compared.priorStudies.length).toBeGreaterThanOrEqual(1);
    expect(compared.biomarkerDeltas.some((d) => d.metricKey === "oct.crt_um")).toBe(true);

    const worklistRes = await app.inject({
      method: "GET",
      url: "/v1/diagnostic-studies?eyeLaterality=OD",
      headers: { authorization: `Bearer ${ophthToken}` },
    });
    expect(worklistRes.statusCode).toBe(200);
    expect((worklistRes.json() as { total: number }).total).toBeGreaterThanOrEqual(2);
  });

  it("Area 4 (Module D): enforces R2 device kill-switch 422, plans, raw trials persistence, session detail & IOP", async () => {
    const killedDeviceRes = await app.inject({
      method: "POST",
      url: "/v1/r2/devices",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        modelCode: "SM-KILL-TEST-01",
        manufacturer: "TestVendor",
        displayPpi: 320,
        verifiedStatus: "killed",
        killSwitchReasonFa: "خطای کالیبراسیون روشنایی صفحه نمایش",
      },
    });
    expect(killedDeviceRes.statusCode).toBe(201);

    const blockedTestRes = await app.inject({
      method: "POST",
      url: "/v1/r2/home-tests",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        patientId: patientAId,
        deviceModelCode: "SM-KILL-TEST-01",
        eyeLaterality: "OD",
        testType: "landolt_c",
        vaLogmar: 0.2,
        viewingDistanceCm: 35,
        ambientLux: 180,
        deviceTiltDeg: 3,
        glareDetected: false,
      },
    });
    expect(blockedTestRes.statusCode).toBe(422);
    expect((blockedTestRes.json() as { error: string }).error).toBe("DEVICE_KILL_SWITCH_ACTIVE");

    const calRes = await app.inject({
      method: "POST",
      url: "/v1/r2/calibration-profiles",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        patientId: patientAId,
        deviceFingerprintSha256: "f1a2b3c4d5e6f7a8b9c0",
        screenWidthMm: 71,
        viewingDistanceCm: 35,
        calibratedBy: "clinic_staff",
        verified: true,
      },
    });
    expect(calRes.statusCode).toBe(201);
    const calibrationProfileId = (calRes.json() as { id: string }).id;

    const planRes = await app.inject({
      method: "POST",
      url: `/v1/r2/patients/${patientAId}/plans`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        eyeLaterality: "OD",
        testTypes: ["landolt_c", "amsler"],
        cadenceDays: 7,
        alertThresholdLogmar: 0.2,
        active: true,
      },
    });
    expect(planRes.statusCode).toBe(201);

    const validTestRes = await app.inject({
      method: "POST",
      url: "/v1/r2/home-tests",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        patientId: patientAId,
        calibrationProfileId,
        eyeLaterality: "OD",
        testType: "landolt_c",
        vaLogmar: 0.15,
        viewingDistanceCm: 35,
        ambientLux: 180,
        deviceTiltDeg: 2,
        glareDetected: false,
        rawTrials: [
          { trialIndex: 0, stimulus: { gapDir: "top", logmar: 0.2 }, response: { gapDir: "top" }, reactionMs: 1120, correct: true },
          { trialIndex: 1, stimulus: { gapDir: "left", logmar: 0.1 }, response: { gapDir: "left" }, reactionMs: 980, correct: true },
        ],
      },
    });
    expect(validTestRes.statusCode).toBe(201);
    const createdTest = validTestRes.json() as { test: { id: string }; trials: unknown[] };
    expect(createdTest.trials.length).toBe(2);

    const sessionDetailRes = await app.inject({
      method: "GET",
      url: `/v1/r2/sessions/${createdTest.test.id}`,
      headers: { authorization: `Bearer ${ophthToken}` },
    });
    expect(sessionDetailRes.statusCode).toBe(200);
    expect((sessionDetailRes.json() as { trials: unknown[] }).trials.length).toBe(2);

    const iopRes = await app.inject({
      method: "POST",
      url: "/v1/integrations/icare-home2/readings",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        patientId: patientAId,
        deviceSerial: "ICARE-DEV-9001",
        eyeLaterality: "OD",
        iopMmHg: 17.5,
        qualityScore: 0.92,
        measuredAtIso: new Date().toISOString(),
      },
    });
    expect(iopRes.statusCode).toBe(201);

    const [r2Overview, r2IopList] = await Promise.all([
      app.inject({ method: "GET", url: "/v1/r2/monitoring/overview", headers: { authorization: `Bearer ${ophthToken}` } }),
      app.inject({ method: "GET", url: `/v1/r2/patients/${patientAId}/iop`, headers: { authorization: `Bearer ${ophthToken}` } }),
    ]);
    expect(r2Overview.statusCode).toBe(200);
    expect((r2Overview.json() as { activePlanCount: number; killedDeviceCount: number }).killedDeviceCount).toBeGreaterThanOrEqual(1);
    expect(r2IopList.statusCode).toBe(200);
    expect((r2IopList.json() as { od: unknown[]; os: unknown[] }).od.length).toBeGreaterThanOrEqual(1);
  });

  it("Area 5 (Modules E, F, G): handles OD/OS episodes, Print+Phone, urgent close 422 guard, referrals, outages & follow-ups", async () => {
    const odRes = await app.inject({
      method: "POST",
      url: "/v1/episodes",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        patientId: patientAId,
        protocolType: "post_cataract",
        eyeLaterality: "OD",
        surgeonId: USER_OPHTH,
        accessMode: "app",
        anchorAt: new Date().toISOString(),
      },
    });
    expect(odRes.statusCode).toBe(201);
    odEpisodeId = (odRes.json() as { episodeId: string }).episodeId;

    const rxRes = await app.inject({
      method: "POST",
      url: `/v1/episodes/${odEpisodeId}/prescriptions`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        eyeLaterality: "OD",
        reasonFa: "شروع برنامه قطره پس از جراحی کاتاراکت چشم راست",
        items: [
          {
            drugNameFa: "بتامتازون چشمی",
            genericName: "betamethasone",
            bottleCapColorFa: "قرمز",
            frequencyPerDay: 4,
            durationDays: 14,
          },
        ],
      },
    });
    expect(rxRes.statusCode).toBe(201);

    const rxHistRes = await app.inject({
      method: "GET",
      url: `/v1/episodes/${odEpisodeId}/prescriptions`,
      headers: { authorization: `Bearer ${ophthToken}` },
    });
    expect(rxHistRes.statusCode).toBe(200);
    expect((rxHistRes.json() as { items: unknown[] }).items.length).toBeGreaterThanOrEqual(1);

    const osRes = await app.inject({
      method: "POST",
      url: "/v1/episodes",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        patientId: patientAId,
        protocolType: "post_cataract",
        eyeLaterality: "OS",
        surgeonId: USER_OPHTH,
        accessMode: "print_phone",
        anchorAt: new Date().toISOString(),
      },
    });
    expect(osRes.statusCode).toBe(201);
    osPrintPhoneEpisodeId = (osRes.json() as { episodeId: string }).episodeId;

    const ppQueue = await app.inject({
      method: "GET",
      url: "/v1/care/print-phone",
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(ppQueue.statusCode).toBe(200);
    expect((ppQueue.json() as { items: Array<{ episodeId: string }> }).items.some((i) => i.episodeId === osPrintPhoneEpisodeId)).toBe(true);

    const outreachRes = await app.inject({
      method: "POST",
      url: `/v1/care/print-phone/${osPrintPhoneEpisodeId}/outreach`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { status: "completed", outcomeFa: "تماس تلفنی با بیمار برقرار شد و زمان قطره‌ها یادآوری گردید." },
    });
    expect(outreachRes.statusCode).toBe(201);

    const casesRes = await app.inject({
      method: "GET",
      url: "/v1/triage/cases?urgencyTier=urgent",
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(casesRes.statusCode).toBe(200);
    const urgentCases = (casesRes.json() as { items: Array<{ id: string; sourceRefId?: string; status: string }> }).items;
    const foundUrgent = urgentCases.find((c) => c.sourceRefId === cnvStudyId) ?? urgentCases[0]!;
    cnvUrgentCaseId = foundUrgent.id;

    // Claim urgent case first (status -> OwnerAssigned), then verify illegal early close returns 422!
    const claimRes = await app.inject({
      method: "POST",
      url: `/v1/triage/cases/${cnvUrgentCaseId}/claim`,
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(claimRes.statusCode).toBe(200);

    const illegalCloseRes = await app.inject({
      method: "POST",
      url: `/v1/triage/cases/${cnvUrgentCaseId}/close`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { resolutionNoteFa: "بستن بدون تماس یا ارجاع", resolutionType: "resolved" },
    });
    expect(illegalCloseRes.statusCode).toBe(422);
    expect((illegalCloseRes.json() as { error: string }).error).toBe("URGENT_CASE_RESOLUTION_REQUIRED");

    const contactRes = await app.inject({
      method: "POST",
      url: `/v1/triage/cases/${cnvUrgentCaseId}/contact`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { outcome: "contacted", channel: "phone", noteFa: "بیمار جهت مراجعه فوری به بیمارستان فارابی راهنمایی شد." },
    });
    expect(contactRes.statusCode).toBe(200);

    const refCreateRes = await app.inject({
      method: "POST",
      url: `/v1/triage/cases/${cnvUrgentCaseId}/referrals`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { destinationHospitalFa: "بیمارستان تخصصی فارابی", reasonFa: "CNV فعال در چشم راست", urgent: true },
    });
    expect(refCreateRes.statusCode).toBe(201);
    cnvReferralId = (refCreateRes.json() as { id: string }).id;

    const refOutcomeRes = await app.inject({
      method: "PATCH",
      url: `/v1/referrals/${cnvReferralId}/outcome`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { status: "attended" },
    });
    expect(refOutcomeRes.statusCode).toBe(200);

    const [refsListRes, refDetailRes, cnvCaseDetailRes] = await Promise.all([
      app.inject({ method: "GET", url: "/v1/referrals", headers: { authorization: `Bearer ${coordToken}` } }),
      app.inject({ method: "GET", url: `/v1/referrals/${cnvReferralId}`, headers: { authorization: `Bearer ${coordToken}` } }),
      app.inject({ method: "GET", url: `/v1/triage/cases/${cnvUrgentCaseId}`, headers: { authorization: `Bearer ${coordToken}` } }),
    ]);
    expect(refsListRes.statusCode).toBe(200);
    expect((refsListRes.json() as { items: Array<{ id: string }> }).items.some((r) => r.id === cnvReferralId)).toBe(true);
    expect(refDetailRes.statusCode).toBe(200);
    expect((refDetailRes.json() as { status: string }).status).toBe("attended");
    expect(cnvCaseDetailRes.statusCode).toBe(200);
    expect((cnvCaseDetailRes.json() as { triageCase: { status: string } }).triageCase.status).toBe("Closed");

    const alreadyClosedRes = await app.inject({
      method: "POST",
      url: `/v1/triage/cases/${cnvUrgentCaseId}/close`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { resolutionNoteFa: "پرونده قبلاً بسته شده است.", resolutionType: "referred" },
    });
    expect(alreadyClosedRes.statusCode).toBe(409);
    expect((alreadyClosedRes.json() as { error: string }).error).toBe("TRIAGE_ALREADY_CLOSED");

    const pillar1CasesRes = await app.inject({
      method: "GET",
      url: "/v1/triage/cases?sourcePillar=pillar1_care",
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(pillar1CasesRes.statusCode).toBe(200);
    const ppCase = (pillar1CasesRes.json() as { items: Array<{ id: string; sourceRefId?: string }> }).items.find(
      (c) => c.sourceRefId === osPrintPhoneEpisodeId
    );
    expect(ppCase).toBeDefined();

    const closePpCaseRes = await app.inject({
      method: "POST",
      url: `/v1/triage/cases/${ppCase!.id}/close`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { resolutionNoteFa: "تماس تلفنی اول با بیمار نسخه چاپی ثبت و تایید شد.", resolutionType: "resolved" },
    });
    expect(closePpCaseRes.statusCode).toBe(200);
    expect((closePpCaseRes.json() as { status: string }).status).toBe("Closed");

    const outageRes = await app.inject({
      method: "POST",
      url: "/v1/triage/outages",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { titleFa: "اختلال موقت درگاه پیامک اپراتور", severity: "warning", affectedChannel: "sms" },
    });
    expect(outageRes.statusCode).toBe(201);
    const outageId = (outageRes.json() as { outageId: string }).outageId;

    const outageListRes = await app.inject({
      method: "GET",
      url: "/v1/triage/outages",
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(outageListRes.statusCode).toBe(200);
    expect((outageListRes.json() as { items: Array<{ outageId: string }> }).items.some((o) => o.outageId === outageId)).toBe(true);

    const outagePatchRes = await app.inject({
      method: "PATCH",
      url: `/v1/triage/outages/${outageId}`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { status: "mitigated", mitigationNoteFa: "ارسال جایگزین از مسیر تماس تلفنی فعال شد." },
    });
    expect(outagePatchRes.statusCode).toBe(200);

    const followUpRes = await app.inject({
      method: "POST",
      url: "/v1/follow-ups",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: {
        patientId: patientAId,
        episodeId: odEpisodeId,
        triageCaseId: cnvUrgentCaseId,
        eyeLaterality: "OD",
        taskType: "referral_followup",
        dueAt: new Date(Date.now() + 86400_000).toISOString(),
        outcomeFa: "پیگیری نتیجه ویزیت شبکیه",
      },
    });
    expect(followUpRes.statusCode).toBe(201);
    const taskId = (followUpRes.json() as { taskId: string }).taskId;

    const followUpListRes = await app.inject({
      method: "GET",
      url: `/v1/follow-ups?patientId=${patientAId}`,
      headers: { authorization: `Bearer ${coordToken}` },
    });
    expect(followUpListRes.statusCode).toBe(200);
    expect((followUpListRes.json() as { items: Array<{ taskId: string }> }).items.some((f) => f.taskId === taskId)).toBe(true);

    const followUpPatchRes = await app.inject({
      method: "PATCH",
      url: `/v1/follow-ups/${taskId}`,
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { status: "completed", outcomeFa: "گزارش ویزیت شبکیه دریافت و ثبت گردید." },
    });
    expect(followUpPatchRes.statusCode).toBe(200);

    const closeEpRes = await app.inject({
      method: "PATCH",
      url: `/v1/episodes/${odEpisodeId}/close`,
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: { status: "completed", reasonFa: "اتمام دوره پیگیری کاتاراکت چشم راست" },
    });
    expect(closeEpRes.statusCode).toBe(200);
    expect((closeEpRes.json() as { status: string }).status).toBe("completed");
  });

  it("Area 6 (Modules H & I): serves Persian PDF reports, Clinic Analytics, Pilot zero-denominator null KPIs & AI Quality", async () => {
    const reportCreateRes = await app.inject({
      method: "POST",
      url: "/v1/reports",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        reportType: "patient_schedule",
        patientId: patientAId,
        sourceRefId: odEpisodeId,
        titleFa: "برنامه مراقبتی چشم راست",
        sections: [
          {
            headingFa: "دستور قطره چشم راست",
            linesFa: ["قطره بتامتازون چشمی — درب قرمز — روزی ۴ بار برای چشم راست"],
          },
        ],
      },
    });
    expect(reportCreateRes.statusCode).toBe(201);
    const reportId = (reportCreateRes.json() as { reportId: string }).reportId;

    const [reportsListRes, reportPdfRes, clinicAnalyticsRes, pilotARes, pilotBRes, aiQualityRes] = await Promise.all([
      app.inject({ method: "GET", url: "/v1/reports", headers: { authorization: `Bearer ${ophthToken}` } }),
      app.inject({ method: "GET", url: `/v1/reports/${reportId}/pdf`, headers: { authorization: `Bearer ${ophthToken}` } }),
      app.inject({ method: "GET", url: "/v1/analytics/clinic", headers: { authorization: `Bearer ${ophthToken}` } }),
      app.inject({ method: "GET", url: "/v1/analytics/pilot", headers: { authorization: `Bearer ${ophthToken}` } }),
      app.inject({ method: "GET", url: "/v1/analytics/pilot", headers: { authorization: `Bearer ${tenantBAdminToken}` } }),
      app.inject({ method: "GET", url: "/v1/analytics/ai-quality", headers: { authorization: `Bearer ${ophthToken}` } }),
    ]);

    expect(reportsListRes.statusCode).toBe(200);
    expect((reportsListRes.json() as { items: unknown[] }).items.length).toBeGreaterThanOrEqual(1);
    expect(reportPdfRes.statusCode).toBe(200);
    expect(reportPdfRes.headers["content-type"]).toContain("application/pdf");
    expect(clinicAnalyticsRes.statusCode).toBe(200);
    expect(pilotARes.statusCode).toBe(200);

    // Tenant B has zero data -> zero denominators MUST return rate: null (honest KPI rule)
    expect(pilotBRes.statusCode).toBe(200);
    const pilotB = pilotBRes.json() as {
      kpis: {
        postopAdherenceConfirmedRate: { numerator: number; denominator: number; rate: number | null };
        medianHitlTurnaroundMinutes: number | null;
      };
    };
    expect(pilotB.kpis.postopAdherenceConfirmedRate).toEqual({ numerator: 0, denominator: 0, rate: null });
    expect(pilotB.kpis.medianHitlTurnaroundMinutes).toBeNull();

    expect(aiQualityRes.statusCode).toBe(200);
    const aiQuality = aiQualityRes.json() as {
      onlineOperationalMetrics: { clinicianFeedbackCounts: { partially_agree: number } };
      offlineBenchmarkNoticeFa: string;
    };
    expect(aiQuality.onlineOperationalMetrics.clinicianFeedbackCounts.partially_agree).toBeGreaterThanOrEqual(1);
    expect(aiQuality.offlineBenchmarkNoticeFa.length).toBeGreaterThan(0);
  });

  it("Area 7 (Modules J, K, L): enforces Admin last-admin 409, SMS PHI 422, masked Integrations, Step-Up Audit & Break-Glass", async () => {
    const forbiddenClinicPatch = await app.inject({
      method: "PATCH",
      url: "/v1/admin/clinic",
      headers: { authorization: `Bearer ${coordToken}` },
      payload: { nameFa: "تغییر غیرمجاز" },
    });
    expect(forbiddenClinicPatch.statusCode).toBe(403);

    const clinicPatch = await app.inject({
      method: "PATCH",
      url: "/v1/admin/clinic",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { dicomAeTitle: "BINA_PACS_A" },
    });
    expect(clinicPatch.statusCode).toBe(200);

    const lastAdminBlocked = await app.inject({
      method: "PATCH",
      url: `/v1/admin/staff/${adminMembershipId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { active: false },
    });
    expect(lastAdminBlocked.statusCode).toBe(409);
    expect((lastAdminBlocked.json() as { error: string }).error).toBe("LAST_ACTIVE_ADMIN_FORBIDDEN");

    const addStaffRes = await app.inject({
      method: "POST",
      url: "/v1/admin/staff",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        userId: USER_EXTRA_STAFF,
        role: "technician",
        fullNameFa: "تکنسین تصویربرداری الف",
        email: "tech@bina.ir",
      },
    });
    expect(addStaffRes.statusCode).toBe(201);

    const smsPhiBlocked = await app.inject({
      method: "POST",
      url: "/v1/admin/message-templates",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        templateKey: "drop_reminder_unsafe",
        bodyTemplateFa: "یادآوری مصرف قطره بتامتازون برای کراتیت چشم راست",
        channel: "sms",
      },
    });
    expect(smsPhiBlocked.statusCode).toBe(422);
    expect((smsPhiBlocked.json() as { error: string }).error).toBe("SMS_PHI_VIOLATION");

    const smsSafe = await app.inject({
      method: "POST",
      url: "/v1/admin/message-templates",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        templateKey: "drop_reminder_safe",
        bodyTemplateFa: "لطفاً برنامه مراقبتی امروز خود را در سامانه بررسی کنید.",
        channel: "sms",
      },
    });
    expect(smsSafe.statusCode).toBe(201);

    const consentTplRes = await app.inject({
      method: "POST",
      url: "/v1/admin/consents",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        consentType: "research_d5",
        version: "v2.5",
        titleFa: "رضایت‌نامه پژوهش بدون نام D5",
        bodyFa: "داده‌های تصویری پس از حذف کامل مشخصات هویتی برای پژوهش استفاده می‌شود.",
      },
    });
    expect(consentTplRes.statusCode).toBe(201);

    const flagRes = await app.inject({
      method: "PATCH",
      url: "/v1/admin/features",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { flagKey: "staff_web_ai_quality_dashboard", enabled: true },
    });
    expect(flagRes.statusCode).toBe(200);

    const rawSecret = "super-secret-his-token-9876";
    const endpointRes = await app.inject({
      method: "POST",
      url: "/v1/integrations/endpoints",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        integrationType: "fhir_his",
        nameFa: "درگاه HIS مرکزی",
        endpointUrl: "https://his.example.ir/fhir",
        authMode: "bearer",
        secret: rawSecret,
        enabled: true,
      },
    });
    expect(endpointRes.statusCode).toBe(201);
    expect(JSON.stringify(endpointRes.json())).not.toContain(rawSecret);
    const endpointId = (endpointRes.json() as { endpointId: string; secretMasked: string }).endpointId;
    expect((endpointRes.json() as { secretMasked: string }).secretMasked).toBe("****9876");

    const testConnRes = await app.inject({
      method: "POST",
      url: `/v1/integrations/endpoints/${endpointId}/test`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(testConnRes.statusCode).toBe(200);

    const auditNoStepUp = await app.inject({
      method: "GET",
      url: "/v1/ops/audit",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(auditNoStepUp.statusCode).toBe(403);
    expect((auditNoStepUp.json() as { error: string }).error).toBe("FORBIDDEN_STEP_UP_REQUIRED");

    const auditWithStepUp = await app.inject({
      method: "GET",
      url: "/v1/ops/audit?limit=10",
      headers: { authorization: `Bearer ${adminStepUpToken}` },
    });
    expect(auditWithStepUp.statusCode).toBe(200);
    expect((auditWithStepUp.json() as { items: unknown[] }).items.length).toBeGreaterThan(0);

    const shortBreakGlass = await app.inject({
      method: "POST",
      url: "/v1/ops/break-glass",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: { patientId: patientAId, reasonFa: "کوتاه" },
    });
    expect(shortBreakGlass.statusCode).toBe(403);
    expect((shortBreakGlass.json() as { error: string }).error).toBe("FORBIDDEN_BREAK_GLASS_REASON_REQUIRED");

    const openBgRes = await app.inject({
      method: "POST",
      url: "/v1/ops/break-glass",
      headers: { authorization: `Bearer ${ophthToken}` },
      payload: {
        patientId: patientAId,
        reasonFa: "مراجعه اورژانسی شبانه بیمار و نیاز به مشاهده پرونده کامل چشم",
        durationMinutes: 60,
      },
    });
    expect(openBgRes.statusCode).toBe(201);
    const sessionId = (openBgRes.json() as { sessionId: string }).sessionId;

    const revokeBgRes = await app.inject({
      method: "POST",
      url: `/v1/ops/break-glass/${sessionId}/revoke`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { reasonFa: "پایان ویزیت اورژانسی" },
    });
    expect(revokeBgRes.statusCode).toBe(200);
    expect((revokeBgRes.json() as { active: boolean }).active).toBe(false);

    const [opsHealth, opsJobs, opsModels] = await Promise.all([
      app.inject({ method: "GET", url: "/v1/ops/health", headers: { authorization: `Bearer ${adminToken}` } }),
      app.inject({ method: "GET", url: "/v1/ops/jobs", headers: { authorization: `Bearer ${adminToken}` } }),
      app.inject({ method: "GET", url: "/v1/ops/models", headers: { authorization: `Bearer ${adminToken}` } }),
    ]);
    expect(opsHealth.statusCode).toBe(200);
    expect(opsJobs.statusCode).toBe(200);
    expect(opsModels.statusCode).toBe(200);
    expect((opsModels.json() as { commercialLicensePolicyFa: string }).commercialLicensePolicyFa).toContain("Apache 2.0");
  });

  it("Area 8 (RLS & Immutability): proves Tenant B HTTP/DB isolation and FORCE RLS across all 13 new 009 tables", async () => {
    const crossPatientRes = await app.inject({
      method: "GET",
      url: `/v1/patients/${patientAId}`,
      headers: { authorization: `Bearer ${tenantBAdminToken}` },
    });
    expect(crossPatientRes.statusCode).toBe(404);

    const crossStudyRes = await app.inject({
      method: "GET",
      url: `/v1/diagnostic-studies/${cnvStudyId}`,
      headers: { authorization: `Bearer ${tenantBAdminToken}` },
    });
    expect(crossStudyRes.statusCode).toBe(404);

    // Every new 009 table MUST contain >=1 row in Tenant A, and 0 rows under Tenant B or unscoped appPool
    await withTenantTransaction(appPool, TENANT_A, async (tx) => {
      for (const table of ALL_009_TABLES) {
        const res = await tx.query<{ cnt: string }>(`SELECT count(*)::text AS cnt FROM ${table}`);
        expect(Number(res.rows[0]?.cnt ?? "0"), `Expected Tenant A rows in ${table}`).toBeGreaterThanOrEqual(1);
      }
    });

    await withTenantTransaction(appPool, TENANT_B, async (tx) => {
      for (const table of ALL_009_TABLES) {
        const res = await tx.query<{ cnt: string }>(`SELECT count(*)::text AS cnt FROM ${table}`);
        expect(Number(res.rows[0]?.cnt ?? "0"), `Cross-tenant leak detected in ${table}`).toBe(0);
      }
    });

    await withUnscopedTransaction(appPool, async (tx) => {
      for (const table of ALL_009_TABLES) {
        const res = await tx.query<{ cnt: string }>(`SELECT count(*)::text AS cnt FROM ${table}`);
        expect(Number(res.rows[0]?.cnt ?? "0"), `Unscoped FORCE RLS leak in ${table}`).toBe(0);
      }
    });

    // Verify immutable append-only trigger blocks UPDATE/DELETE on history, clinician_feedback, and R2 raw trials
    for (const immutableTable of [
      "patient_clinical_histories",
      "clinician_feedback",
      "home_vision_test_trials",
    ] as const) {
      await expect(
        withUnscopedTransaction(adminPool, async (tx) => {
          await tx.query(`DELETE FROM ${immutableTable}`);
        })
      ).rejects.toThrow(/append-only; UPDATE and DELETE are forbidden/i);
    }
  });
});
