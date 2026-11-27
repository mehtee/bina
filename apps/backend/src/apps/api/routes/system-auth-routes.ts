import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { EnrollmentHttpError } from "../../../contexts/enrollment-consent/index.js";
import { getCapabilitiesForPrincipal } from "../../../packages/authz/index.js";
import { withTenantTransaction } from "../../../packages/db/index.js";
import { asStaffPrincipal, requireClaims, type ApiRouteContext } from "../route-context.js";

export function registerSystemAuthRoutes(app: FastifyInstance, ctx: ApiRouteContext): void {
  const { config, appPool, tenancyService, staffAuthService, enrollmentService } = ctx;

  app.get("/v1/clinics/current", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const profile = await withTenantTransaction(appPool, claims.tenantId, (tx) =>
      tenancyService.getClinicProfile(tx, claims.clinicId)
    );
    if (!profile) {
      throw new EnrollmentHttpError(404, "CLINIC_NOT_FOUND", "کلینیک یافت نشد.");
    }
    return {
      clinicId: profile.id,
      tenantId: profile.tenantId,
      nameFa: profile.nameFa,
      locale: "fa-IR",
      calendarMode: profile.calendarMode,
      emergencyPhone: profile.emergencyPhone,
      staffedHoursFa: "شنبه تا چهارشنبه ۸ تا ۲۰ — پنج‌شنبه ۸ تا ۱۴",
      todayJalali: profile.todayJalali,
      currentlyStaffed: profile.currentlyStaffed,
    };
  });

  app.post("/v1/auth/staff/session", async (req) => {
    const body = z
      .object({
        oidcToken: z.string().min(1),
        clinicId: z.string().uuid(),
        mfaCode: z.string().optional(),
        tenantId: z.string().uuid().optional(),
      })
      .parse(req.body);

    const tenantId = await ctx.resolveTenantIdForPublicClinicCall(req, body.tenantId, body.clinicId);
    const result = await withTenantTransaction(appPool, tenantId, (tx) =>
      staffAuthService.exchangeOidcSession(tx, {
        oidcToken: body.oidcToken,
        clinicId: body.clinicId,
        mfaCode: body.mfaCode,
      })
    );
    return {
      accessToken: result.accessToken,
      role: result.principal.role,
      mfaVerified: result.principal.mfaVerified,
      userId: result.principal.userId,
      clinicId: result.principal.clinicId,
      tenantId: result.principal.tenantId,
    };
  });

  app.post("/v1/auth/staff/step-up", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z.object({ stepUpCode: z.string().min(4) }).parse(req.body);
    const verified = body.stepUpCode.trim().length >= 6;
    const upgraded = staffAuthService.performStepUp(principal, verified);
    return {
      accessToken: upgraded.accessToken,
      stepUpVerified: upgraded.principal.stepUpVerified,
    };
  });

  app.get("/v1/auth/staff/me", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const [clinic, featureFlags, clinics] = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      Promise.all([
        tenancyService.getClinicProfile(tx, principal.clinicId),
        tenancyService.listFeatureFlags(tx, principal),
        staffAuthService.listAuthorizedClinics(tx, principal),
      ])
    );

    return {
      userId: principal.userId,
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      role: principal.role,
      mfaVerified: principal.mfaVerified,
      stepUpVerified: Boolean(principal.stepUpVerified),
      capabilities: getCapabilitiesForPrincipal(principal),
      clinic: clinic
        ? {
            clinicId: clinic.id,
            tenantId: clinic.tenantId,
            nameFa: clinic.nameFa,
            locale: "fa-IR",
            calendarMode: clinic.calendarMode,
            emergencyPhone: clinic.emergencyPhone,
            staffedHoursFa: "شنبه تا چهارشنبه ۸ تا ۲۰ — پنج‌شنبه ۸ تا ۱۴",
            todayJalali: clinic.todayJalali,
            currentlyStaffed: clinic.currentlyStaffed,
          }
        : null,
      authorizedClinics: clinics,
      featureFlags,
      brand: {
        nameFa: config.APP_BRAND_NAME_FA,
        nameEn: config.APP_BRAND_NAME_EN,
      },
    };
  });

  app.get("/v1/auth/staff/clinics", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      staffAuthService.listAuthorizedClinics(tx, principal)
    );
    return { items };
  });

  app.post("/v1/auth/patient/otp/request", async (req, reply) => {
    const body = z
      .object({
        phoneNumber: z.string().min(10),
        clinicId: z.string().uuid(),
        tenantId: z.string().uuid().optional(),
        fixedOtpForTest: z.string().optional(),
      })
      .parse(req.body);
    const tenantId = await ctx.resolveTenantIdForPublicClinicCall(req, body.tenantId, body.clinicId);
    const res = await withTenantTransaction(appPool, tenantId, (tx) =>
      enrollmentService.requestPatientOtp(tx, {
        tenantId,
        clinicId: body.clinicId,
        phoneNumber: body.phoneNumber,
        fixedOtpForTest: config.NODE_ENV === "production" ? undefined : body.fixedOtpForTest,
      })
    );
    return reply.status(202).send(res);
  });

  app.post("/v1/auth/patient/otp/verify", async (req) => {
    const body = z
      .object({
        challengeId: z.string().uuid(),
        otpCode: z.string().min(4),
        consentAccepted: z.boolean(),
        consentVersion: z.string().min(1),
        phoneNumber: z.string().min(10),
        tenantId: z.string().uuid().optional(),
      })
      .parse(req.body);
    const headerTid = typeof req.headers["x-tenant-id"] === "string" ? req.headers["x-tenant-id"].trim() : "";
    const tenantId = z.string().uuid().parse(body.tenantId ?? headerTid);

    return withTenantTransaction(appPool, tenantId, (tx) =>
      enrollmentService.verifyPatientOtp(tx, {
        tenantId,
        challengeId: body.challengeId,
        otpCode: body.otpCode,
        consentAccepted: body.consentAccepted,
        consentVersion: body.consentVersion,
        phoneNumberForMask: body.phoneNumber,
      })
    );
  });

  app.post("/v1/auth/caregiver/otp/verify", async (req) => {
    const body = z
      .object({
        challengeId: z.string().uuid(),
        otpCode: z.string().min(4),
        tenantId: z.string().uuid().optional(),
        patientId: z.string().uuid().optional(),
      })
      .parse(req.body);
    const headerTid = typeof req.headers["x-tenant-id"] === "string" ? req.headers["x-tenant-id"].trim() : "";
    const tenantId = z.string().uuid().parse(body.tenantId ?? headerTid);

    const res = await withTenantTransaction(appPool, tenantId, (tx) =>
      enrollmentService.verifyCaregiverOtp(tx, {
        tenantId,
        challengeId: body.challengeId,
        otpCode: body.otpCode,
        patientId: body.patientId,
      })
    );
    return {
      ...res,
      patients: res.patients.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  });
}
