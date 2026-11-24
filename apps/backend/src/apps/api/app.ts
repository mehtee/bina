import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { CONTRACT_VERSION } from "@bina/contracts-openapi";
import type { Pool } from "pg";
import { ZodError, z } from "zod";
import { PgAuditLogRepo } from "../../contexts/audit-compliance/index.js";
import {
  BoundedPersianReportGraph,
  OpenAICompatibleLanguageModel,
  type PersianReportGeneratorPort,
} from "../../contexts/ai-copilot/index.js";
import {
  CareEpisodeService,
  PgCareEpisodeRepo,
} from "../../contexts/care-episodes/index.js";
import {
  DiagnosticStudyService,
  HttpAiEngineGateway,
  PgDiagnosticStudyRepo,
} from "../../contexts/diagnostic-studies/index.js";
import {
  EnrollmentHttpError,
  EnrollmentService,
  PgEnrollmentRepo,
} from "../../contexts/enrollment-consent/index.js";
import {
  PgStaffMembershipRepo,
  StaffAuthService,
  verifySessionToken,
  type OidcVerifierPort,
  type SessionTokenClaims,
} from "../../contexts/identity-access/index.js";
import {
  BillingEvidenceService,
} from "../../contexts/billing-evidence/index.js";
import {
  buildSignedStudyFhirBundle,
  IcareHome2Service,
  normalizeDicomIngestBatch,
} from "../../contexts/integrations/index.js";
import {
  PgR2MonitoringRepo,
  R2MonitoringService,
} from "../../contexts/r2-monitoring/index.js";
import {
  ResearchExportService,
} from "../../contexts/research/index.js";
import {
  DomesticIranSmsAdapter,
  InMemoryMockIranSmsSender,
  type SmsProviderSender,
} from "../../contexts/notifications/index.js";
import { ProtocolRegistry } from "../../contexts/protocols/index.js";
import { PgReportingRepo, ReportingService } from "../../contexts/reporting/index.js";
import { PgSymptomRepo, SymptomService } from "../../contexts/symptoms/index.js";
import { formatJalaliDate, PgTenancyRepo, TenancyService } from "../../contexts/tenancy/index.js";
import { PgTriageRepo, TriageService } from "../../contexts/triage-operations/index.js";
import type { StaffPrincipal, StaffRole } from "../../packages/authz/index.js";
import { withTenantTransaction } from "../../packages/db/index.js";
import {
  formatLateralityFa,
  type DiagnosticInferenceGatewayPort,
} from "../../packages/domain-kernel/index.js";
import { toSafePublicSummary, type AppConfig } from "./config.js";

export interface AppDependencies {
  readonly appPool: Pool;
  readonly aiGateway?: DiagnosticInferenceGatewayPort | undefined;
  readonly reportGenerator?: PersianReportGeneratorPort | undefined;
  readonly oidcVerifier?: OidcVerifierPort | undefined;
  readonly smsSender?: SmsProviderSender | undefined;
  readonly resolveTenantByClinicId?: ((clinicId: string) => Promise<string | null>) | undefined;
}

class HttpUnauthorizedError extends Error {
  readonly statusCode = 401;
  readonly code = "UNAUTHORIZED";
  constructor(messageFa = "احراز هویت نامعتبر یا منقضی است.") {
    super(messageFa);
  }
}

function defaultOidcVerifier(): OidcVerifierPort {
  return {
    async verifyIdToken(token: string) {
      if (token.startsWith("dev-oidc:")) {
        const userId = token.slice("dev-oidc:".length).trim();
        return userId ? { userId, mfaVerified: true } : null;
      }
      return null;
    },
  };
}

function requireClaims(req: FastifyRequest, signingSecret: string): SessionTokenClaims {
  const auth = req.headers.authorization ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (!match?.[1]) {
    throw new HttpUnauthorizedError();
  }
  const claims = verifySessionToken(match[1].trim(), signingSecret);
  if (!claims) {
    throw new HttpUnauthorizedError();
  }
  return claims;
}

function asStaffPrincipal(claims: SessionTokenClaims): StaffPrincipal {
  if (claims.actorType !== "staff" || !claims.role) {
    throw new EnrollmentHttpError(403, "STAFF_TOKEN_REQUIRED", "این مسیر مخصوص کادر درمان است.");
  }
  return {
    userId: claims.sub,
    tenantId: claims.tenantId,
    clinicId: claims.clinicId,
    role: claims.role as StaffRole,
    mfaVerified: Boolean(claims.mfaVerified),
    stepUpVerified: Boolean(claims.stepUpVerified),
  };
}

function requireHeaderUuid(req: FastifyRequest, headerName: string): string {
  const raw = req.headers[headerName.toLowerCase()];
  const value = typeof raw === "string" ? raw.trim() : "";
  return z.string().uuid().parse(value);
}

export function buildApp(config: AppConfig, deps?: AppDependencies): FastifyInstance {
  const app = Fastify({
    logger: config.NODE_ENV === "test" ? false : { level: config.LOG_LEVEL },
  });

  const allowedOrigins = new Set(
    config.CORS_ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const isOriginAllowed = (origin: string | undefined): string | null => {
    if (!origin) return null;
    if (allowedOrigins.has(origin)) return origin;
    if (
      config.NODE_ENV !== "production" &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
    ) {
      return origin;
    }
    return null;
  };

  app.addHook("onRequest", async (req, reply) => {
    const allowed = isOriginAllowed(req.headers.origin);
    if (allowed) {
      reply.header("Access-Control-Allow-Origin", allowed);
      reply.header("Vary", "Origin");
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      reply.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Idempotency-Key,X-Tenant-Id");
      reply.header("Access-Control-Expose-Headers", "X-Source-Sha256");
    }
    if (req.method === "OPTIONS") {
      return reply.status(204).send();
    }
  });

  app.setErrorHandler((err: unknown, _req: FastifyRequest, reply: FastifyReply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: "VALIDATION_ERROR",
        details: err.issues,
      });
    }
    const maybeErr = err as { statusCode?: number; code?: string; message?: string };
    if (typeof maybeErr.statusCode === "number" && maybeErr.statusCode >= 400 && maybeErr.statusCode < 500) {
      return reply.status(maybeErr.statusCode).send({
        error: maybeErr.code ?? "REQUEST_ERROR",
        messageFa: maybeErr.message ?? "درخواست نامعتبر است.",
      });
    }
    app.log.error({ err }, "Unhandled Bina backend error");
    return reply.status(500).send({
      error: "INTERNAL_ERROR",
      messageFa: "خطای داخلی سرور رخ داد.",
    });
  });

  app.get("/health", async () => {
    return {
      ...toSafePublicSummary(config),
      contractVersion: CONTRACT_VERSION,
    };
  });

  if (!deps) {
    return app;
  }

  const auditRepo = new PgAuditLogRepo();
  const tenancyRepo = new PgTenancyRepo();
  const tenancyService = new TenancyService(tenancyRepo);
  const staffAuthService = new StaffAuthService(
    deps.oidcVerifier ?? defaultOidcVerifier(),
    new PgStaffMembershipRepo(),
    auditRepo,
    config.AUTH_SIGNING_SECRET
  );
  const smsAdapter = new DomesticIranSmsAdapter(
    deps.smsSender ?? new InMemoryMockIranSmsSender(),
    deps.appPool,
    config.PHONE_HASH_SALT
  );
  const enrollmentService = new EnrollmentService(
    new PgEnrollmentRepo(),
    smsAdapter,
    auditRepo,
    config.PHONE_HASH_SALT,
    config.AUTH_SIGNING_SECRET
  );
  const triageRepo = new PgTriageRepo();
  const triageService = new TriageService(triageRepo, auditRepo);
  const careEpisodeService = new CareEpisodeService(
    new PgCareEpisodeRepo(),
    new ProtocolRegistry(),
    tenancyRepo,
    triageRepo,
    auditRepo
  );
  const symptomService = new SymptomService(new PgSymptomRepo(), triageRepo);
  const r2MonitoringService = new R2MonitoringService(
    new PgR2MonitoringRepo(),
    triageRepo,
    auditRepo
  );
  const icareHome2Service = new IcareHome2Service();
  const researchExportService = new ResearchExportService(auditRepo, config.PHONE_HASH_SALT);
  const billingEvidenceService = new BillingEvidenceService();
  const aiGateway = deps.aiGateway ?? new HttpAiEngineGateway(config.AI_ENGINE_URL, config.AI_ENGINE_MODE);
  const reportGenerator: PersianReportGeneratorPort =
    deps.reportGenerator ??
    new BoundedPersianReportGraph(
      config.LLM_API_KEY.trim().length > 0
        ? new OpenAICompatibleLanguageModel({
            providerName: config.LLM_PROVIDER,
            baseUrl: config.LLM_BASE_URL,
            model: config.LLM_MODEL,
            apiKey: config.LLM_API_KEY,
            timeoutMs: config.LLM_TIMEOUT_MS,
            maxTokens: config.LLM_MAX_TOKENS,
            temperature: config.LLM_TEMPERATURE,
            openRouterSiteUrl: config.LLM_OPENROUTER_SITE_URL,
            openRouterAppName: config.LLM_OPENROUTER_APP_NAME,
          })
        : null,
      {
        providerName: config.LLM_PROVIDER,
        modelId: config.LLM_MODEL,
        baseUrl: config.LLM_BASE_URL,
        requirePhiScrubbing: config.LLM_REQUIRE_PHI_SCRUBBING !== "false",
      }
    );
  const diagnosticStudyService = new DiagnosticStudyService(
    new PgDiagnosticStudyRepo(),
    aiGateway,
    triageRepo,
    auditRepo,
    reportGenerator
  );
  const reportingService = new ReportingService(new PgReportingRepo());

  async function resolveTenantIdForPublicClinicCall(
    req: FastifyRequest,
    bodyTenantId: string | undefined,
    clinicId: string
  ): Promise<string> {
    const headerTid = typeof req.headers["x-tenant-id"] === "string" ? req.headers["x-tenant-id"].trim() : "";
    const direct = bodyTenantId ?? (headerTid || undefined);
    if (direct) return z.string().uuid().parse(direct);
    if (deps?.resolveTenantByClinicId) {
      const resolved = await deps.resolveTenantByClinicId(clinicId);
      if (resolved) return resolved;
    }
    throw new EnrollmentHttpError(400, "TENANT_REQUIRED", "شناسه کلینیک یا سازمان معتبر یافت نشد.");
  }

  app.get("/v1/clinics/current", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const profile = await withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
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

    const tenantId = await resolveTenantIdForPublicClinicCall(req, body.tenantId, body.clinicId);
    const result = await withTenantTransaction(deps.appPool, tenantId, (tx) =>
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

  app.post("/v1/auth/patient/otp/request", async (req, reply) => {
    const body = z
      .object({
        phoneNumber: z.string().min(10),
        clinicId: z.string().uuid(),
        tenantId: z.string().uuid().optional(),
        fixedOtpForTest: z.string().optional(),
      })
      .parse(req.body);
    const tenantId = await resolveTenantIdForPublicClinicCall(req, body.tenantId, body.clinicId);
    const res = await withTenantTransaction(deps.appPool, tenantId, (tx) =>
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

    return withTenantTransaction(deps.appPool, tenantId, (tx) =>
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

    const res = await withTenantTransaction(deps.appPool, tenantId, (tx) =>
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

  app.get("/v1/caregiver/patients", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    if (claims.actorType !== "caregiver") {
      throw new EnrollmentHttpError(403, "CAREGIVER_TOKEN_REQUIRED", "این مسیر مخصوص همراه بیمار است.");
    }
    const items = await withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
      enrollmentService.listCaregiverPatients(tx, claims.sub)
    );
    return {
      items: items.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  });

  app.get("/v1/patient/profile", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const query = z.object({ patientId: z.string().uuid().optional() }).parse(req.query ?? {});
    const targetPatientId = claims.actorType === "patient" ? claims.sub : (query.patientId ?? claims.sub);

    const profile = await withTenantTransaction(deps.appPool, claims.tenantId, async (tx) => {
      if (claims.actorType === "caregiver") {
        if (!claims.grantId) {
          throw new EnrollmentHttpError(403, "CAREGIVER_REVOKED", "دسترسی همراه معتبر نیست.");
        }
        await enrollmentService.assertCaregiverActive(tx, claims.grantId, targetPatientId);
      }
      return enrollmentService.getPatientProfile(tx, targetPatientId);
    });
    return {
      ...profile,
      consents: profile.consents.map((c) => ({
        consentId: c.id,
        consentVersion: c.consentVersion,
        locale: c.locale,
        acceptedAt: c.acceptedAt.toISOString(),
      })),
    };
  });

  app.get("/v1/patients/:patientId/caregivers", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ patientId: z.string().uuid() }).parse(req.params);
    if (claims.actorType === "patient" && claims.sub !== params.patientId) {
      throw new EnrollmentHttpError(403, "FORBIDDEN", "دسترسی به فهرست همراهان بیمار دیگر مجاز نیست.");
    }
    const grants = await withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
      enrollmentService.listCaregiversForPatient(tx, params.patientId)
    );
    return {
      items: grants.map((grant) => ({
        grantId: grant.id,
        patientId: grant.patientId,
        caregiverPhone: "***",
        relationshipFa: grant.relationshipFa,
        scopes: grant.scopes,
        active: grant.active,
        createdAt: grant.createdAt.toISOString(),
      })),
    };
  });

  app.post("/v1/patients/:patientId/caregivers", async (req, reply) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ patientId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        caregiverPhone: z.string().min(10),
        relationshipFa: z.string().min(2),
        scopes: z.array(z.string()).default(["care_plan:read"]),
      })
      .parse(req.body);

    const grant = await withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
      enrollmentService.grantCaregiver(tx, {
        tenantId: claims.tenantId,
        patientId: params.patientId,
        actorUserId: claims.sub,
        caregiverPhone: body.caregiverPhone,
        relationshipFa: body.relationshipFa,
        scopes: body.scopes,
      })
    );
    return reply.status(201).send({
      grantId: grant.id,
      patientId: grant.patientId,
      caregiverPhone: "***",
      relationshipFa: grant.relationshipFa,
      scopes: grant.scopes,
      active: grant.active,
      createdAt: grant.createdAt.toISOString(),
    });
  });

  app.delete("/v1/patients/:patientId/caregivers/:grantId", async (req, reply) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ patientId: z.string().uuid(), grantId: z.string().uuid() }).parse(req.params);
    await withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
      enrollmentService.revokeCaregiver(tx, {
        tenantId: claims.tenantId,
        patientId: params.patientId,
        grantId: params.grantId,
        actorUserId: claims.sub,
      })
    );
    return reply.status(204).send();
  });

  app.post("/v1/episodes", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        patientId: z.string().uuid(),
        protocolType: z.string().min(1),
        eyeLaterality: z.string(),
        surgeonId: z.string().uuid(),
        accessMode: z.enum(["app", "caregiver", "print_phone"]),
        anchorAt: z.string().datetime(),
      })
      .parse(req.body);

    const ep = await withTenantTransaction(deps.appPool, principal.tenantId, (tx) =>
      careEpisodeService.createEpisode(tx, principal, {
        patientId: body.patientId,
        protocolType: body.protocolType,
        eyeLaterality: body.eyeLaterality,
        surgeonId: body.surgeonId,
        accessMode: body.accessMode,
        anchorAtIso: body.anchorAt,
      })
    );
    return reply.status(201).send(ep);
  });

  app.get("/v1/episodes/:episodeId", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ episodeId: z.string().uuid() }).parse(req.params);
    return withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
      careEpisodeService.getEpisode(tx, params.episodeId)
    );
  });

  app.post("/v1/episodes/:episodeId/prescriptions", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ episodeId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        eyeLaterality: z.string(),
        reasonFa: z.string().min(2),
        items: z.array(
          z.object({
            drugNameFa: z.string().min(2),
            genericName: z.string().min(2),
            bottleCapColorFa: z.string().min(2),
            frequencyPerDay: z.number().int().min(1).max(24),
            durationDays: z.number().int().min(1).max(180),
            instructionsFa: z.string().optional(),
          })
        ),
      })
      .parse(req.body);

    const rx = await withTenantTransaction(deps.appPool, principal.tenantId, (tx) =>
      careEpisodeService.publishPrescription(tx, principal, {
        episodeId: params.episodeId,
        eyeLaterality: body.eyeLaterality,
        items: body.items,
        reasonFa: body.reasonFa,
      })
    );
    return reply.status(201).send(rx);
  });

  app.get("/v1/patient/today", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const query = z.object({ patientId: z.string().uuid().optional() }).parse(req.query ?? {});
    const targetPatientId = claims.actorType === "patient" ? claims.sub : (query.patientId ?? claims.sub);

    return withTenantTransaction(deps.appPool, claims.tenantId, async (tx) => {
      if (claims.actorType === "caregiver") {
        if (!claims.grantId) {
          throw new EnrollmentHttpError(403, "CAREGIVER_REVOKED", "دسترسی همراه معتبر نیست.");
        }
        await enrollmentService.assertCaregiverActive(tx, claims.grantId, targetPatientId);
      }
      return careEpisodeService.getPatientTodayPlan(tx, targetPatientId, claims.clinicId);
    });
  });

  app.get("/v1/patient/episodes", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const query = z.object({ patientId: z.string().uuid().optional() }).parse(req.query ?? {});
    const targetPatientId = claims.actorType === "patient" ? claims.sub : (query.patientId ?? claims.sub);

    const pairs = await withTenantTransaction(deps.appPool, claims.tenantId, async (tx) => {
      if (claims.actorType === "caregiver") {
        if (!claims.grantId) {
          throw new EnrollmentHttpError(403, "CAREGIVER_REVOKED", "دسترسی همراه معتبر نیست.");
        }
        await enrollmentService.assertCaregiverActive(tx, claims.grantId, targetPatientId);
      }
      return careEpisodeService.listPatientEpisodes(tx, targetPatientId);
    });
    return {
      items: pairs.map(({ episode, prescription }) => ({
        episode: {
          ...episode,
          anchorAt: episode.anchorAt.toISOString(),
        },
        activePrescription: prescription
          ? {
              ...prescription,
              publishedAt: prescription.publishedAt.toISOString(),
            }
          : null,
      })),
    };
  });

  app.get("/v1/episodes/:episodeId/adherence", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ episodeId: z.string().uuid() }).parse(req.params);
    const query = z.object({ limit: z.coerce.number().int().min(1).max(200).optional() }).parse(req.query ?? {});
    const items = await withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
      careEpisodeService.listEpisodeAdherence(tx, params.episodeId, query.limit ?? 50)
    );
    return {
      items: items.map((e) => ({
        ...e,
        recordedAt: e.recordedAt.toISOString(),
      })),
    };
  });

  app.post("/v1/episodes/:episodeId/adherence", async (req, reply) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ episodeId: z.string().uuid() }).parse(req.params);
    const idempotencyKey = requireHeaderUuid(req, "Idempotency-Key");
    const body = z
      .object({
        eyeLaterality: z.string(),
        prescriptionVersion: z.number().int().min(1),
        state: z.enum(["taken", "missed_with_reason", "unavailable", "no_response"]),
        reasonFa: z.string().optional(),
        occurredAt: z.string().datetime(),
      })
      .parse(req.body);

    const res = await withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
      careEpisodeService.recordAdherence(tx, {
        tenantId: claims.tenantId,
        episodeId: params.episodeId,
        eyeLaterality: body.eyeLaterality,
        prescriptionVersion: body.prescriptionVersion,
        state: body.state,
        reasonFa: body.reasonFa,
        idempotencyKey,
        occurredAtIso: body.occurredAt,
      })
    );
    return reply.status(201).send(res);
  });

  app.post("/v1/episodes/:episodeId/symptoms", async (req, reply) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ episodeId: z.string().uuid() }).parse(req.params);
    const idempotencyKey = requireHeaderUuid(req, "Idempotency-Key");
    const body = z
      .object({
        eyeLaterality: z.string(),
        severePain: z.boolean(),
        suddenVisionLoss: z.boolean(),
        purulentDischarge: z.boolean(),
        flashesOrCurtain: z.boolean().optional(),
        freeTextFa: z.string().default(""),
      })
      .parse(req.body);

    const res = await withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
      symptomService.submitSymptomReport(tx, {
        episodeId: params.episodeId,
        eyeLaterality: body.eyeLaterality,
        severePain: body.severePain,
        suddenVisionLoss: body.suddenVisionLoss,
        purulentDischarge: body.purulentDischarge,
        flashesOrCurtain: body.flashesOrCurtain,
        freeTextFa: body.freeTextFa,
        idempotencyKey,
      })
    );
    return reply.status(201).send(res);
  });

  app.get("/v1/triage/cases", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const items = await withTenantTransaction(deps.appPool, principal.tenantId, (tx) =>
      triageService.listCases(tx, principal)
    );
    return { items, total: items.length };
  });

  app.post("/v1/triage/cases/:caseId/claim", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ caseId: z.string().uuid() }).parse(req.params);
    return withTenantTransaction(deps.appPool, principal.tenantId, (tx) =>
      triageService.claimCase(tx, principal, params.caseId)
    );
  });

  app.post("/v1/triage/cases/:caseId/handoff", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ caseId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        targetStaffUserId: z.string().uuid(),
        handoffNoteFa: z.string().min(5),
      })
      .parse(req.body);
    return withTenantTransaction(deps.appPool, principal.tenantId, (tx) =>
      triageService.handoffCase(tx, principal, params.caseId, body)
    );
  });

  app.post("/v1/triage/cases/:caseId/referrals", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ caseId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        destinationHospitalFa: z.string().min(2),
        reasonFa: z.string().min(3),
        urgent: z.boolean(),
      })
      .parse(req.body);
    const referral = await withTenantTransaction(deps.appPool, principal.tenantId, (tx) =>
      triageService.createReferral(tx, principal, params.caseId, body)
    );
    return reply.status(201).send(referral);
  });

  app.post("/v1/diagnostic-studies", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        patientId: z.string().uuid(),
        clinicId: z.string().uuid().optional(),
        eyeLaterality: z.enum(["OD", "OS", "OU"]),
        assets: z.array(
          z.object({
            assetId: z.string().uuid(),
            s3ObjectKey: z.string().min(1),
            declaredModality: z.string().min(1),
            declaredEye: z.enum(["OD", "OS"]),
            dicomStudyUid: z.string().nullable().optional(),
            blurScoreHint: z.number().nullable().optional(),
            lightingScoreHint: z.number().nullable().optional(),
            detectedEyeHint: z.string().nullable().optional(),
            conditionHints: z.array(z.string()).optional(),
          })
        ),
        labs: z.record(z.unknown()).optional(),
      })
      .parse(req.body);

    const study = await withTenantTransaction(deps.appPool, principal.tenantId, (tx) =>
      diagnosticStudyService.submitStudy(tx, principal, {
        patientId: body.patientId,
        eyeLaterality: body.eyeLaterality,
        assets: body.assets.map((a) => ({
          assetId: a.assetId,
          s3ObjectKey: a.s3ObjectKey,
          declaredModality: a.declaredModality,
          declaredEye: a.declaredEye,
          dicomStudyUid: a.dicomStudyUid ?? undefined,
          blurScoreHint: a.blurScoreHint ?? undefined,
          lightingScoreHint: a.lightingScoreHint ?? undefined,
          detectedEyeHint: a.detectedEyeHint ?? undefined,
          conditionHints: a.conditionHints,
        })),
        labs: body.labs,
      })
    );
    return reply.status(202).send(study);
  });

  app.get("/v1/diagnostic-studies/:studyId", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    asStaffPrincipal(claims);
    const params = z.object({ studyId: z.string().uuid() }).parse(req.params);
    return withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
      diagnosticStudyService.getStudy(tx, params.studyId)
    );
  });

  app.post("/v1/diagnostic-studies/:studyId/signoff", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ studyId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        action: z.enum(["approved", "edited_approved", "rejected"]),
        finalUrgency: z.enum(["routine", "followup_3_6m", "urgent"]),
        finalReportTextFa: z.string().min(5),
        overrideReasonFa: z.string().nullable().optional(),
      })
      .parse(req.body);

    return withTenantTransaction(deps.appPool, principal.tenantId, (tx) =>
      diagnosticStudyService.signOffStudy(tx, principal, params.studyId, {
        action: body.action,
        finalUrgency: body.finalUrgency,
        finalReportTextFa: body.finalReportTextFa,
        overrideReasonFa: body.overrideReasonFa ?? undefined,
      })
    );
  });

  app.post("/v1/integrations/dicom/ingest", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        patientId: z.string().uuid(),
        eyeLaterality: z.enum(["OD", "OS", "OU"]),
        dicomItems: z.array(
          z.object({
            assetId: z.string().uuid(),
            s3ObjectKey: z.string().min(1),
            declaredModalityHint: z
              .enum(["fundus", "oct", "octa", "slit_lamp", "topography", "visual_field"])
              .optional(),
            rawTags: z.object({
              patientName: z.string().optional(),
              patientId: z.string().optional(),
              patientBirthDate: z.string().optional(),
              patientTelephone: z.string().optional(),
              institutionName: z.string().optional(),
              performingPhysicianName: z.string().optional(),
              referringPhysicianName: z.string().optional(),
              studyInstanceUid: z.string().optional(),
              seriesInstanceUid: z.string().optional(),
              sopInstanceUid: z.string().optional(),
              modality: z.string().optional(),
              imageLaterality: z.string().optional(),
              studyDate: z.string().optional(),
            }),
          })
        ),
        labs: z.record(z.unknown()).optional(),
      })
      .parse(req.body);

    const normalized = normalizeDicomIngestBatch(body.dicomItems, config.PHONE_HASH_SALT);
    const result = await withTenantTransaction(deps.appPool, principal.tenantId, async (tx) => {
      const study = await diagnosticStudyService.submitStudy(tx, principal, {
        patientId: body.patientId,
        eyeLaterality: body.eyeLaterality,
        assets: normalized.assets.map((a) => ({
          assetId: a.assetId,
          s3ObjectKey: a.s3ObjectKey,
          declaredModality: a.declaredModality,
          declaredEye: a.declaredEye,
          dicomStudyUid: a.dicomStudyUid,
        })),
        labs: body.labs,
      });
      await auditRepo.append(tx, {
        tenantId: principal.tenantId,
        actorUserId: principal.userId,
        actorRole: principal.role,
        action: "dicom.anonymized-ingest",
        resourceType: "diagnostic_study",
        resourceId: study.studyId,
        metadata: {
          dicomStudyUid: normalized.dicomStudyUid,
          snapshotSha256List: normalized.assets.map((a) => a.anonymizedSnapshot.sha256),
        },
      });
      return {
        study,
        anonymizedSnapshots: normalized.assets.map((a) => a.anonymizedSnapshot),
      };
    });
    return reply.status(202).send(result);
  });

  app.get("/v1/diagnostic-studies/:studyId/fhir", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ studyId: z.string().uuid() }).parse(req.params);
    return withTenantTransaction(deps.appPool, principal.tenantId, async (tx) => {
      const study = await diagnosticStudyService.getStudy(tx, params.studyId);
      const aggregatedBiomarkers: Record<string, number> = {};
      for (const spec of study.specialistOutputs) {
        Object.assign(aggregatedBiomarkers, spec.biomarkers);
      }
      const signedAtIso = study.signoff?.signedAtIso ?? new Date().toISOString();
      const bundle = buildSignedStudyFhirBundle({
        studyId: study.studyId,
        patientId: study.patientId,
        clinicId: study.clinicId,
        eyeLaterality: study.eyeLaterality,
        status: study.status,
        issuedAtIso: signedAtIso,
        issuedAtJalali: formatJalaliDate(new Date(signedAtIso)),
        modalities: study.fusionResult?.availableModalities ?? [],
        biomarkers: aggregatedBiomarkers,
        signoff: study.signoff
          ? {
              physicianId: study.signoff.ophthalmologistId,
              finalUrgency: study.signoff.finalUrgency,
              finalUrgencyLabelFa: study.signoff.finalUrgencyLabelFa,
              finalReportTextFa: study.signoff.finalReportTextFa,
              signedAtIso: study.signoff.signedAtIso,
            }
          : undefined,
      });
      await auditRepo.append(tx, {
        tenantId: principal.tenantId,
        actorUserId: principal.userId,
        actorRole: principal.role,
        action: "fhir.bundle-exported",
        resourceType: "diagnostic_study",
        resourceId: study.studyId,
      });
      return bundle;
    });
  });

  app.get("/v1/patient/diagnostic-summaries", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const query = z.object({ patientId: z.string().uuid().optional() }).parse(req.query ?? {});
    const targetPatientId = claims.actorType === "patient" ? claims.sub : (query.patientId ?? claims.sub);
    const items = await withTenantTransaction(deps.appPool, claims.tenantId, async (tx) => {
      if (claims.actorType === "caregiver") {
        if (!claims.grantId) {
          throw new EnrollmentHttpError(403, "CAREGIVER_REVOKED", "دسترسی همراه معتبر نیست.");
        }
        await enrollmentService.assertCaregiverActive(tx, claims.grantId, targetPatientId);
      }
      return diagnosticStudyService.listPatientSignedSummaries(tx, targetPatientId);
    });
    return { items };
  });

  app.post("/v1/r2/calibration-profiles", async (req, reply) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const body = z
      .object({
        patientId: z.string().uuid(),
        clinicId: z.string().uuid().optional(),
        deviceFingerprintSha256: z.string().min(8),
        screenWidthMm: z.number().min(25).max(800),
        viewingDistanceCm: z.number().min(25).max(60),
        calibratedBy: z.enum(["clinic_staff", "patient_card"]),
        verified: z.boolean().default(false),
      })
      .parse(req.body);

    const targetPatientId = claims.actorType === "patient" ? claims.sub : body.patientId;
    const saved = await withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
      r2MonitoringService.registerCalibrationProfile(tx, {
        tenantId: claims.tenantId,
        clinicId: body.clinicId ?? claims.clinicId,
        patientId: targetPatientId,
        deviceFingerprintSha256: body.deviceFingerprintSha256,
        screenWidthMm: body.screenWidthMm,
        viewingDistanceCm: body.viewingDistanceCm,
        calibratedBy: body.calibratedBy,
        verified: body.verified,
      })
    );
    return reply.status(201).send(saved);
  });

  app.post("/v1/r2/home-tests", async (req, reply) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const body = z
      .object({
        patientId: z.string().uuid().optional(),
        calibrationProfileId: z.string().uuid().optional(),
        eyeLaterality: z.enum(["OD", "OS"]),
        testType: z.enum(["landolt_c", "amsler", "contrast"]),
        vaLogmar: z.number().min(-0.3).max(2.0).optional(),
        amslerDistortionScore: z.number().min(0).max(1).optional(),
        amslerCentralScotoma: z.boolean().optional(),
        viewingDistanceCm: z.number().min(5).max(200),
        ambientLux: z.number().min(0).max(50000),
        deviceTiltDeg: z.number().min(-90).max(90),
        glareDetected: z.boolean().default(false),
      })
      .parse(req.body);

    const targetPatientId = claims.actorType === "patient" ? claims.sub : (body.patientId ?? claims.sub);
    const result = await withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
      r2MonitoringService.submitHomeTest(tx, {
        tenantId: claims.tenantId,
        clinicId: claims.clinicId,
        patientId: targetPatientId,
        calibrationProfileId: body.calibrationProfileId,
        eyeLaterality: body.eyeLaterality,
        testType: body.testType,
        vaLogmar: body.vaLogmar,
        amslerDistortionScore: body.amslerDistortionScore,
        amslerCentralScotoma: body.amslerCentralScotoma,
        viewingDistanceCm: body.viewingDistanceCm,
        ambientLux: body.ambientLux,
        deviceTiltDeg: body.deviceTiltDeg,
        glareDetected: body.glareDetected,
      })
    );
    return reply.status(201).send(result);
  });

  app.get("/v1/r2/patients/:patientId/trends", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ patientId: z.string().uuid() }).parse(req.params);
    const targetPatientId = claims.actorType === "patient" ? claims.sub : params.patientId;
    return withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
      r2MonitoringService.getPatientTrends(tx, targetPatientId)
    );
  });

  app.post("/v1/integrations/icare-home2/readings", async (req, reply) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const body = z
      .object({
        patientId: z.string().uuid().optional(),
        deviceSerial: z.string().min(4),
        eyeLaterality: z.enum(["OD", "OS"]),
        iopMmHg: z.number().min(3).max(80),
        qualityScore: z.number().min(0).max(1),
        measuredAtIso: z.string().datetime(),
      })
      .parse(req.body);

    const targetPatientId = claims.actorType === "patient" ? claims.sub : (body.patientId ?? claims.sub);
    const reading = await withTenantTransaction(deps.appPool, claims.tenantId, async (tx) => {
      const res = await icareHome2Service.ingestReading(tx, {
        tenantId: claims.tenantId,
        clinicId: claims.clinicId,
        patientId: targetPatientId,
        deviceSerial: body.deviceSerial,
        eyeLaterality: body.eyeLaterality,
        iopMmHg: body.iopMmHg,
        qualityScore: body.qualityScore,
        measuredAtIso: body.measuredAtIso,
      });
      if (res.accepted && res.alertTier !== "routine") {
        await triageRepo.createOrEscalateCase(tx, {
          tenantId: claims.tenantId,
          clinicId: claims.clinicId,
          patientId: targetPatientId,
          sourcePillar: "pillar1_care",
          sourceRefId: res.readingId,
          eyeLaterality: body.eyeLaterality,
          urgencyTier: res.alertTier,
          ruleCode: "ICARE_HOME2_IOP_ELEVATION",
          summaryFa: res.summaryFa,
        });
      }
      return res;
    });
    return reply.status(201).send(reading);
  });

  app.post("/v1/research/exports", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        irbProtocolCode: z.string().min(4),
        reasonFa: z.string().min(5),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(req.body);
    return withTenantTransaction(deps.appPool, principal.tenantId, (tx) =>
      researchExportService.exportPseudonymizedCohort(tx, principal, body)
    );
  });

  app.post("/v1/billing-evidence/summary", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        patientId: z.string().uuid(),
        periodStartJalali: z.string().min(8),
        periodEndJalali: z.string().min(8),
      })
      .parse(req.body);
    return withTenantTransaction(deps.appPool, principal.tenantId, (tx) =>
      billingEvidenceService.generatePatientEvidence(tx, {
        tenantId: principal.tenantId,
        ...body,
      })
    );
  });

  app.post("/v1/reports", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        reportType: z.enum(["patient_schedule", "postop_closure", "signed_diagnostic"]),
        patientId: z.string().uuid(),
        sourceRefId: z.string().uuid(),
        titleFa: z.string().min(3),
        sections: z.array(
          z.object({
            headingFa: z.string().min(1),
            linesFa: z.array(z.string().min(1)),
          })
        ),
      })
      .parse(req.body);

    const generated = await withTenantTransaction(deps.appPool, principal.tenantId, async (tx) => {
      const clinic = await tenancyRepo.findClinicById(tx, principal.clinicId);
      const clinicNameFa = clinic?.nameFa ?? `کلینیک چشم ${config.APP_BRAND_NAME_FA}`;
      const emergencyPhone = clinic?.emergencyPhone ?? "+982182400000";
      let payloadSections = body.sections;

      if (body.reportType === "signed_diagnostic") {
        const study = await diagnosticStudyService.getStudy(tx, body.sourceRefId);
        if (study.status !== "signed_off" || !study.signoff) {
          throw new EnrollmentHttpError(400, "STUDY_NOT_SIGNED", "گزارش تشخیصی پیش از امضای پزشک قابل چاپ نیست.");
        }
        payloadSections = [
          {
            headingFa: `نتیجه نهایی تاییدشده (${formatLateralityFa(study.eyeLaterality)})`,
            linesFa: [
              `اولویت: ${study.signoff.finalUrgencyLabelFa}`,
              study.signoff.finalReportTextFa,
            ],
          },
          ...body.sections,
        ];
      }

      return reportingService.generateAndStoreReport(
        tx,
        {
          reportType: body.reportType,
          tenantId: principal.tenantId,
          clinicId: principal.clinicId,
          patientId: body.patientId,
          sourceRefId: body.sourceRefId,
          clinicNameFa,
          issuedAtJalali: formatJalaliDate(new Date()),
          titleFa: body.titleFa,
          emergencyHotlinePhone: emergencyPhone,
          sections: payloadSections,
        },
        principal.userId
      );
    });

    return reply.status(201).send({
      reportId: generated.reportId,
      reportType: generated.reportType,
      sourceSha256: generated.sourceSha256,
      pdfSha256: generated.pdfSha256,
    });
  });

  app.get("/v1/reports/:reportId/pdf", async (req, reply) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ reportId: z.string().uuid() }).parse(req.params);
    const rendered = await withTenantTransaction(deps.appPool, claims.tenantId, (tx) =>
      reportingService.renderExistingPdfById(tx, params.reportId)
    );
    if (!rendered) {
      throw new EnrollmentHttpError(404, "REPORT_NOT_FOUND", "فایل گزارش یافت نشد.");
    }
    return reply
      .header("Content-Type", "application/pdf")
      .header("X-Source-Sha256", rendered.sourceSha256)
      .send(rendered.pdfBuffer);
  });

  return app;
}
