import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { PgAuditLogRepo } from "../../../contexts/audit-compliance/index.js";
import {
  EnrollmentHttpError,
  EnrollmentService,
  PgEnrollmentRepo,
} from "../../../contexts/enrollment-consent/index.js";
import {
  PgStaffMembershipRepo,
  StaffAuthService,
  verifySessionToken,
} from "../../../contexts/identity-access/index.js";
import {
  DomesticIranSmsAdapter,
  InMemoryMockIranSmsSender,
  SmsPhiViolationError,
} from "../../../contexts/notifications/index.js";
import {
  formatJalaliDate,
  isIranWorkweekStaffed,
  PgTenancyRepo,
  TenancyService,
} from "../../../contexts/tenancy/index.js";
import { authorizeStaffAction, type StaffPrincipal } from "../../../packages/authz/index.js";
import {
  closeDbPool,
  createDbPool,
  insertOutboxEvent,
  runMigrations,
  withTenantTransaction,
  withUnscopedTransaction,
} from "../../../packages/db/index.js";
import { asClinicId, asTenantId } from "../../../packages/domain-kernel/index.js";
import { createPhiRedactedLogger, redactPhi } from "../../../packages/observability/index.js";
import {
  createPostopSlaWorkflowHandler,
  DurableWorkflowRuntime,
  POSTOP_SLA_WORKFLOW_TYPE,
} from "../../worker/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../../../../migrations");
const ADMIN_URL = process.env.DATABASE_ADMIN_URL ?? "postgresql://bina:bina_dev@127.0.0.1:15432/bina_dev";
const APP_URL = process.env.DATABASE_URL ?? "postgresql://bina_app:bina_app_dev@127.0.0.1:15432/bina_dev";

const TENANT_A = randomUUID();
const TENANT_B = randomUUID();
const CLINIC_A = randomUUID();
const CLINIC_B = randomUUID();
const OPHTH_USER_A = randomUUID();
const OPTOM_USER_A = randomUUID();

describe("Wave 1 Part 1 Real Postgres Integration & Safety Suite (T-A06..T-A09)", () => {
  let adminPool: Pool;
  let appPool: Pool;

  beforeAll(async () => {
    adminPool = createDbPool(ADMIN_URL, 3);
    appPool = createDbPool(APP_URL, 5);
    await runMigrations(adminPool, MIGRATIONS_DIR);

    // Seed two isolated tenants, clinics, and staff memberships
    await adminPool.query(
      `INSERT INTO tenants (id, jurisdiction, data_residency_region, status)
       VALUES ($1, 'IR', 'IR', 'active'), ($2, 'IR', 'IR', 'active')`,
      [TENANT_A, TENANT_B]
    );

    await withTenantTransaction(adminPool, TENANT_A, async (tx) => {
      await tx.query(
        `INSERT INTO clinics (id, tenant_id, name_fa, emergency_phone)
         VALUES ($1, $2, 'کلینیک چشم بینا الف', '+982182400001')`,
        [CLINIC_A, TENANT_A]
      );
      await tx.query(
        `INSERT INTO staff_memberships (tenant_id, clinic_id, user_id, role, mfa_verified_at)
         VALUES ($1, $2, $3, 'ophthalmologist', now()), ($1, $2, $4, 'optometrist', now())`,
        [TENANT_A, CLINIC_A, OPHTH_USER_A, OPTOM_USER_A]
      );
    });

    await withTenantTransaction(adminPool, TENANT_B, async (tx) => {
      await tx.query(
        `INSERT INTO clinics (id, tenant_id, name_fa, emergency_phone)
         VALUES ($1, $2, 'کلینیک چشم بینا ب', '+982182400002')`,
        [CLINIC_B, TENANT_B]
      );
    });
  });

  afterAll(async () => {
    await closeDbPool(appPool);
    await closeDbPool(adminPool);
  });

  it("T-A06: enforces FORCE ROW LEVEL SECURITY, unscoped 0 rows, atomic rollback & immutable audit logs", async () => {
    // 1. Confirm appPool runs as NOBYPASSRLS non-superuser bina_app
    const roleCheck = await appPool.query<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>(
      `SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`
    );
    expect(roleCheck.rows[0]?.current_user).toBe("bina_app");
    expect(roleCheck.rows[0]?.rolsuper).toBe(false);
    expect(roleCheck.rows[0]?.rolbypassrls).toBe(false);

    // 2. Tenant A sees only Clinic A; Tenant B sees 0 rows from Clinic A; unscoped sees 0 rows
    const aClinics = await withTenantTransaction(appPool, TENANT_A, async (tx) => {
      return (await tx.query("SELECT id FROM clinics")).rows;
    });
    expect(aClinics.map((r) => r.id)).toEqual([CLINIC_A]);

    const crossTenant = await withTenantTransaction(appPool, TENANT_B, async (tx) => {
      return (await tx.query("SELECT id FROM clinics WHERE id = $1", [CLINIC_A])).rows;
    });
    expect(crossTenant).toHaveLength(0);

    const unscoped = await withUnscopedTransaction(appPool, async (tx) => {
      return (await tx.query("SELECT id FROM clinics")).rows;
    });
    expect(unscoped).toHaveLength(0);

    // 3. Atomic transaction rollback reverts BOTH domain write and outbox_events
    const rollbackCaseId = randomUUID();
    await expect(
      withTenantTransaction(appPool, TENANT_A, async (tx) => {
        await insertOutboxEvent(tx, {
          tenantId: TENANT_A,
          eventType: "triage.urgent-triggered.v1",
          correlationId: rollbackCaseId,
          payload: {
            caseId: rollbackCaseId,
            patientId: randomUUID(),
            sourcePillar: "pillar1_care",
            eyeLaterality: "OD",
            urgencyTier: "urgent",
            ruleCode: "ROLLBACK_TEST",
          },
        });
        throw new Error("FORCED_ROLLBACK");
      })
    ).rejects.toThrow("FORCED_ROLLBACK");

    const outboxAfterRollback = await withTenantTransaction(appPool, TENANT_A, async (tx) => {
      return (await tx.query("SELECT id FROM outbox_events WHERE correlation_id = $1", [rollbackCaseId])).rows;
    });
    expect(outboxAfterRollback).toHaveLength(0);

    // 4. Audit logs are strictly append-only (UPDATE & DELETE fail)
    const auditRepo = new PgAuditLogRepo();
    const auditRec = await withTenantTransaction(appPool, TENANT_A, async (tx) =>
      auditRepo.append(tx, {
        tenantId: TENANT_A,
        actorUserId: OPHTH_USER_A,
        actorRole: "ophthalmologist",
        action: "test_immutable",
        resourceType: "clinic",
        resourceId: CLINIC_A,
      })
    );

    await expect(
      withTenantTransaction(appPool, TENANT_A, async (tx) =>
        tx.query("UPDATE audit_logs SET action = 'tampered' WHERE id = $1", [auditRec.id])
      )
    ).rejects.toThrow(/append-only/);

    await expect(
      withTenantTransaction(appPool, TENANT_A, async (tx) =>
        tx.query("DELETE FROM audit_logs WHERE id = $1", [auditRec.id])
      )
    ).rejects.toThrow(/append-only/);

    // 5. PHI Redaction scrubs Iranian phones, national IDs, free text & API tokens
    const logged: Array<{ data: Record<string, unknown> }> = [];
    const logger = createPhiRedactedLogger("test", (e) => logged.push(e));
    logger.info("patient_check", {
      phoneNumber: "+989123456789",
      freeTextFa: "درد چشم",
      note: "تماس با 09121112233 و کلید sk-or-v1-secret1234567890",
    });
    const serialized = JSON.stringify(logged[0]);
    expect(serialized).not.toContain("9123456789");
    expect(serialized).not.toContain("09121112233");
    expect(serialized).not.toContain("sk-or-v1-secret");
    expect(redactPhi({ nationalId: "0012345678" }).nationalId).toBe("[REDACTED]");
  });

  it("T-A07: enforces Iran Jalali/workweek, ophthalmologist-only Rx/signoff ABAC & break-glass audit", async () => {
    const tenancyService = new TenancyService(new PgTenancyRepo());
    const fridayTehran = new Date("2026-11-27T07:00:00Z"); // Friday in Tehran -> closed
    const saturdayMorningTehran = new Date("2026-11-28T06:30:00Z"); // Saturday 10:00 IRST -> staffed
    expect(isIranWorkweekStaffed(fridayTehran)).toBe(false);
    expect(isIranWorkweekStaffed(saturdayMorningTehran)).toBe(true);
    expect(formatJalaliDate(saturdayMorningTehran).length).toBeGreaterThan(5);

    const clinicView = await withTenantTransaction(appPool, TENANT_A, (tx) =>
      tenancyService.getClinicProfile(tx, CLINIC_A, saturdayMorningTehran)
    );
    expect(clinicView?.calendarMode).toBe("jalali");
    expect(clinicView?.currentlyStaffed).toBe(true);

    const signingSecret = "dev-test-signing-secret-0123456789";
    const auditRepo = new PgAuditLogRepo();
    const authService = new StaffAuthService(
      {
        async verifyIdToken(token: string) {
          if (token === "oidc-ophth") return { userId: OPHTH_USER_A, mfaVerified: true };
          if (token === "oidc-optom") return { userId: OPTOM_USER_A, mfaVerified: true };
          return null;
        },
      },
      new PgStaffMembershipRepo(),
      auditRepo,
      signingSecret
    );

    const ophthSession = await withTenantTransaction(appPool, TENANT_A, (tx) =>
      authService.exchangeOidcSession(tx, { oidcToken: "oidc-ophth", clinicId: CLINIC_A })
    );
    const optomSession = await withTenantTransaction(appPool, TENANT_A, (tx) =>
      authService.exchangeOidcSession(tx, { oidcToken: "oidc-optom", clinicId: CLINIC_A })
    );

    expect(verifySessionToken(ophthSession.accessToken, signingSecret)?.role).toBe("ophthalmologist");
    expect(authorizeStaffAction(optomSession.principal, "prescription:publish", TENANT_A).allowed).toBe(false);
    expect(authorizeStaffAction(optomSession.principal, "diagnostic:signoff", TENANT_A).allowed).toBe(false);
    expect(authorizeStaffAction(ophthSession.principal, "diagnostic:signoff", TENANT_A).allowed).toBe(true);
    expect(authorizeStaffAction(ophthSession.principal, "clinic:read", TENANT_B).code).toBe("FORBIDDEN_CROSS_TENANT");

    // Step-up required for PHI export
    expect(authorizeStaffAction(ophthSession.principal, "export:phi", TENANT_A).code).toBe("FORBIDDEN_STEP_UP_REQUIRED");
    const steppedUp: StaffPrincipal = authService.performStepUp(ophthSession.principal, true).principal;
    expect(authorizeStaffAction(steppedUp, "export:phi", TENANT_A).allowed).toBe(true);

    // Break-glass enforces reason length and writes audit row
    await expect(
      withTenantTransaction(appPool, TENANT_A, (tx) =>
        authService.invokeBreakGlass(tx, ophthSession.principal, {
          resourceType: "patient",
          resourceId: "pat-99",
          reasonFa: "کم",
        })
      )
    ).rejects.toThrow("FORBIDDEN_BREAK_GLASS_REASON_REQUIRED");

    await withTenantTransaction(appPool, TENANT_A, (tx) =>
      authService.invokeBreakGlass(tx, ophthSession.principal, {
        resourceType: "patient",
        resourceId: "pat-99",
        reasonFa: "مراجعه اورژانسی بیمار با درد حاد چشم بدون همراه",
      })
    );

    const logs = await withTenantTransaction(appPool, TENANT_A, (tx) =>
      auditRepo.listByResource(tx, "patient", "pat-99")
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]?.breakGlass).toBe(true);
  });

  it("T-A08: verifies +98 OTP expiry/replay/consent and instant 403 caregiver revocation", async () => {
    const smsSender = new InMemoryMockIranSmsSender();
    const smsAdapter = new DomesticIranSmsAdapter(smsSender, appPool, "phone_salt_test");
    const enrollment = new EnrollmentService(
      new PgEnrollmentRepo(),
      smsAdapter,
      new PgAuditLogRepo(),
      "enroll_salt_test",
      "jwt_secret_test"
    );

    const t0 = new Date("2026-11-23T10:00:00Z");
    const otp1 = await withTenantTransaction(appPool, TENANT_A, (tx) =>
      enrollment.requestPatientOtp(tx, {
        tenantId: TENANT_A,
        clinicId: CLINIC_A,
        phoneNumber: "09123456789",
        fixedOtpForTest: "654321",
        now: t0,
      })
    );
    expect(otp1.maskedPhone).toBe("+98912***6789");

    // 1. Expired OTP rejected
    await expect(
      withTenantTransaction(appPool, TENANT_A, (tx) =>
        enrollment.verifyPatientOtp(tx, {
          tenantId: TENANT_A,
          challengeId: otp1.challengeId,
          otpCode: "654321",
          consentAccepted: true,
          consentVersion: "fa-IR-v1",
          phoneNumberForMask: "+989123456789",
          now: new Date(t0.getTime() + 181_000),
        })
      )
    ).rejects.toThrow("منقضی");

    // 2. Missing consent rejected
    const otp2 = await withTenantTransaction(appPool, TENANT_A, (tx) =>
      enrollment.requestPatientOtp(tx, {
        tenantId: TENANT_A,
        clinicId: CLINIC_A,
        phoneNumber: "+989123456789",
        fixedOtpForTest: "112233",
        now: t0,
      })
    );

    await expect(
      withTenantTransaction(appPool, TENANT_A, (tx) =>
        enrollment.verifyPatientOtp(tx, {
          tenantId: TENANT_A,
          challengeId: otp2.challengeId,
          otpCode: "112233",
          consentAccepted: false,
          consentVersion: "fa-IR-v1",
          phoneNumberForMask: "+989123456789",
          now: new Date(t0.getTime() + 10_000),
        })
      )
    ).rejects.toMatchObject({ statusCode: 400, code: "CONSENT_REQUIRED" });

    // 3. Valid OTP succeeds, replay rejected immediately
    const session = await withTenantTransaction(appPool, TENANT_A, (tx) =>
      enrollment.verifyPatientOtp(tx, {
        tenantId: TENANT_A,
        challengeId: otp2.challengeId,
        otpCode: "112233",
        consentAccepted: true,
        consentVersion: "fa-IR-v1",
        phoneNumberForMask: "+989123456789",
        now: new Date(t0.getTime() + 10_000),
      })
    );
    expect(session.locale).toBe("fa-IR");
    expect(session.calendarMode).toBe("jalali");

    await expect(
      withTenantTransaction(appPool, TENANT_A, (tx) =>
        enrollment.verifyPatientOtp(tx, {
          tenantId: TENANT_A,
          challengeId: otp2.challengeId,
          otpCode: "112233",
          consentAccepted: true,
          consentVersion: "fa-IR-v1",
          phoneNumberForMask: "+989123456789",
          now: new Date(t0.getTime() + 15_000),
        })
      )
    ).rejects.toMatchObject({ statusCode: 409, code: "OTP_REPLAYED" });

    // 4. Caregiver grant works, then instant revocation immediately causes 403
    const grant = await withTenantTransaction(appPool, TENANT_A, (tx) =>
      enrollment.grantCaregiver(tx, {
        tenantId: TENANT_A,
        patientId: session.patientId,
        actorUserId: session.patientId,
        caregiverPhone: "09129998877",
        relationshipFa: "همسر بیمار",
        scopes: ["care_plan:read"],
      })
    );

    const activeCheck = await withTenantTransaction(appPool, TENANT_A, (tx) =>
      enrollment.assertCaregiverActive(tx, grant.id, session.patientId)
    );
    expect(activeCheck.active).toBe(true);

    await withTenantTransaction(appPool, TENANT_A, (tx) =>
      enrollment.revokeCaregiver(tx, {
        tenantId: TENANT_A,
        patientId: session.patientId,
        grantId: grant.id,
        actorUserId: session.patientId,
      })
    );

    await expect(
      withTenantTransaction(appPool, TENANT_A, (tx) =>
        enrollment.assertCaregiverActive(tx, grant.id, session.patientId)
      )
    ).rejects.toThrow(EnrollmentHttpError);

    await expect(
      withTenantTransaction(appPool, TENANT_A, (tx) =>
        enrollment.assertCaregiverActive(tx, grant.id, session.patientId)
      )
    ).rejects.toMatchObject({ statusCode: 403, code: "CAREGIVER_REVOKED" });
  });

  it("T-A09: rejects PHI in SMS and executes durable time-skipping & crash/resume workflow without duplicates", async () => {
    const sender = new InMemoryMockIranSmsSender();
    const sms = new DomesticIranSmsAdapter(sender, appPool, "phone_salt_test");

    await expect(
      sms.send({
        tenantId: asTenantId(TENANT_A),
        clinicId: asClinicId(CLINIC_A),
        recipientPhoneE164: "+989123456789",
        templateKey: "caregiver_invite",
        paramsFa: { relationshipFa: "بیمار آب‌مروارید بتامتازون" },
      })
    ).rejects.toThrow(SmsPhiViolationError);

    await expect(
      sms.send({
        tenantId: asTenantId(TENANT_A),
        clinicId: asClinicId(CLINIC_A),
        recipientPhoneE164: "+989123456789",
        templateKey: "unknown_phi_template",
        paramsFa: {},
      })
    ).rejects.toThrow(SmsPhiViolationError);

    // Durable Workflow: 48h time-skip + crash/restart idempotency
    const runtime = new DurableWorkflowRuntime(appPool);
    const episodeId = randomUUID();
    const startAt = new Date("2026-11-23T08:00:00Z");
    const check48hAt = new Date(startAt.getTime() + 48 * 3600 * 1000);

    await runtime.startWorkflow({
      tenantId: TENANT_A,
      workflowType: POSTOP_SLA_WORKFLOW_TYPE,
      businessKey: episodeId,
      initialStage: "awaiting_48h_activation",
      initialData: { episodeId },
      nextRunAt: check48hAt,
    });

    let reminderExecutions = 0;
    let escalationExecutions = 0;

    // Before 48h: nothing runs
    const earlyRun = await runtime.resumeDueWorkflows(
      TENANT_A,
      POSTOP_SLA_WORKFLOW_TYPE,
      createPostopSlaWorkflowHandler({
        dispatchActivationReminder: async () => {
          reminderExecutions += 1;
          return { remindedAtIso: startAt.toISOString() };
        },
        escalateUnactivatedTriage: async () => {
          escalationExecutions += 1;
          return { escalatedAtIso: startAt.toISOString(), urgencyTier: "followup_3_6m" };
        },
      }),
      new Date(startAt.getTime() + 12 * 3600 * 1000)
    );
    expect(earlyRun).toHaveLength(0);

    // At 48h: dispatch reminder
    const at48h = await runtime.resumeDueWorkflows(
      TENANT_A,
      POSTOP_SLA_WORKFLOW_TYPE,
      createPostopSlaWorkflowHandler({
        dispatchActivationReminder: async () => {
          reminderExecutions += 1;
          return { remindedAtIso: check48hAt.toISOString() };
        },
        escalateUnactivatedTriage: async () => {
          escalationExecutions += 1;
          return { escalatedAtIso: check48hAt.toISOString(), urgencyTier: "followup_3_6m" };
        },
      }),
      check48hAt
    );
    expect(at48h[0]?.state.stage).toBe("reminder_dispatched");
    expect(reminderExecutions).toBe(1);

    // At 72h: simulate crash right AFTER escalation step commits, then resume without duplicate side effect
    const at72h = new Date(check48hAt.getTime() + 24 * 3600 * 1000);
    await expect(
      runtime.resumeDueWorkflows(
        TENANT_A,
        POSTOP_SLA_WORKFLOW_TYPE,
        async (ctx) => {
          await ctx.runStep("escalate_triage_sla", async () => {
            escalationExecutions += 1;
            return { escalatedAtIso: at72h.toISOString(), urgencyTier: "followup_3_6m" as const };
          });
          throw new Error("SIMULATED_WORKER_CRASH_AFTER_STEP_COMMIT");
        },
        at72h
      )
    ).rejects.toThrow("SIMULATED_WORKER_CRASH_AFTER_STEP_COMMIT");

    const resumedAfterCrash = await runtime.resumeDueWorkflows(
      TENANT_A,
      POSTOP_SLA_WORKFLOW_TYPE,
      createPostopSlaWorkflowHandler({
        dispatchActivationReminder: async () => {
          reminderExecutions += 1;
          return { remindedAtIso: check48hAt.toISOString() };
        },
        escalateUnactivatedTriage: async () => {
          escalationExecutions += 1;
          return { escalatedAtIso: at72h.toISOString(), urgencyTier: "followup_3_6m" };
        },
      }),
      new Date(at72h.getTime() + 5000)
    );

    expect(resumedAfterCrash[0]?.status).toBe("escalated");
    expect(resumedAfterCrash[0]?.state.stage).toBe("escalated_to_triage");
    expect(escalationExecutions).toBe(1);
    expect(reminderExecutions).toBe(1);
  });
});
