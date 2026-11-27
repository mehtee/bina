import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { CONTRACT_VERSION } from "@bina/contracts-openapi";
import type { Pool } from "pg";
import { ZodError, z } from "zod";
import {
  BoundedPersianReportGraph,
  OpenAICompatibleLanguageModel,
  type PersianReportGeneratorPort,
} from "../../contexts/ai-copilot/index.js";
import { AnalyticsService, PgAnalyticsRepo } from "../../contexts/analytics/index.js";
import { AuditComplianceService, PgAuditLogRepo } from "../../contexts/audit-compliance/index.js";
import { BillingEvidenceService } from "../../contexts/billing-evidence/index.js";
import { CareEpisodeService, PgCareEpisodeRepo } from "../../contexts/care-episodes/index.js";
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
  type OidcVerifierPort,
} from "../../contexts/identity-access/index.js";
import {
  IcareHome2Service,
  IntegrationsService,
  PgIntegrationsRepo,
} from "../../contexts/integrations/index.js";
import {
  DomesticIranSmsAdapter,
  InMemoryMockIranSmsSender,
  SmsPhiViolationError,
  type SmsProviderSender,
} from "../../contexts/notifications/index.js";
import { ProtocolRegistry } from "../../contexts/protocols/index.js";
import { PgR2MonitoringRepo, R2MonitoringService } from "../../contexts/r2-monitoring/index.js";
import { PgReportingRepo, ReportingService } from "../../contexts/reporting/index.js";
import { ResearchExportService } from "../../contexts/research/index.js";
import { PgSymptomRepo, SymptomService } from "../../contexts/symptoms/index.js";
import { PgTenancyRepo, TenancyService } from "../../contexts/tenancy/index.js";
import { PgTriageRepo, TriageService } from "../../contexts/triage-operations/index.js";
import type { DiagnosticInferenceGatewayPort } from "../../packages/domain-kernel/index.js";
import { toSafePublicSummary, type AppConfig } from "./config.js";
import type { ApiRouteContext } from "./route-context.js";
import { registerAdminIntegrationsOpsRoutes } from "./routes/admin-integrations-ops-routes.js";
import { registerDiagnosticsRoutes } from "./routes/diagnostics-routes.js";
import { registerOverviewAnalyticsRoutes } from "./routes/overview-analytics-routes.js";
import { registerPatientCareRoutes } from "./routes/patient-care-routes.js";
import { registerR2MonitoringRoutes } from "./routes/r2-monitoring-routes.js";
import { registerReportsRoutes } from "./routes/reports-routes.js";
import { registerSystemAuthRoutes } from "./routes/system-auth-routes.js";
import { registerTriageReferralRoutes } from "./routes/triage-referral-routes.js";

export interface AppDependencies {
  readonly appPool: Pool;
  readonly aiGateway?: DiagnosticInferenceGatewayPort | undefined;
  readonly reportGenerator?: PersianReportGeneratorPort | undefined;
  readonly oidcVerifier?: OidcVerifierPort | undefined;
  readonly smsSender?: SmsProviderSender | undefined;
  readonly resolveTenantByClinicId?: ((clinicId: string) => Promise<string | null>) | undefined;
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
    if (err instanceof SmsPhiViolationError) {
      return reply.status(422).send({
        error: "SMS_PHI_VIOLATION",
        messageFa: err.message,
      });
    }
    if (err instanceof Error && err.message === "EPISODE_NOT_FOUND") {
      return reply.status(404).send({
        error: "EPISODE_NOT_FOUND",
        messageFa: "اپیزود مراقبتی یافت نشد.",
      });
    }
    if (err instanceof Error && err.message === "EYE_LATERALITY_MISMATCH") {
      return reply.status(400).send({
        error: "EYE_LATERALITY_MISMATCH",
        messageFa: "عدم تطابق چشم راست/چپ با اپیزود.",
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
  const auditComplianceService = new AuditComplianceService(auditRepo);
  const tenancyRepo = new PgTenancyRepo();
  const tenancyService = new TenancyService(tenancyRepo, auditRepo);
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
  const protocolRegistry = new ProtocolRegistry();
  const triageRepo = new PgTriageRepo();
  const triageService = new TriageService(triageRepo, auditRepo);
  const careEpisodeService = new CareEpisodeService(
    new PgCareEpisodeRepo(),
    protocolRegistry,
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
  const integrationsService = new IntegrationsService(new PgIntegrationsRepo(), auditRepo);
  const analyticsService = new AnalyticsService(new PgAnalyticsRepo());

  const routeCtx: ApiRouteContext = {
    config,
    appPool: deps.appPool,
    auditRepo,
    auditComplianceService,
    tenancyRepo,
    tenancyService,
    staffAuthService,
    enrollmentService,
    protocolRegistry,
    triageRepo,
    triageService,
    careEpisodeService,
    symptomService,
    r2MonitoringService,
    icareHome2Service,
    researchExportService,
    billingEvidenceService,
    diagnosticStudyService,
    reportingService,
    integrationsService,
    analyticsService,
    async resolveTenantIdForPublicClinicCall(
      req: FastifyRequest,
      bodyTenantId: string | undefined,
      clinicId: string
    ): Promise<string> {
      const headerTid = typeof req.headers["x-tenant-id"] === "string" ? req.headers["x-tenant-id"].trim() : "";
      const direct = bodyTenantId ?? (headerTid || undefined);
      if (direct) return z.string().uuid().parse(direct);
      if (deps.resolveTenantByClinicId) {
        const resolved = await deps.resolveTenantByClinicId(clinicId);
        if (resolved) return resolved;
      }
      throw new EnrollmentHttpError(400, "TENANT_REQUIRED", "شناسه کلینیک یا سازمان معتبر یافت نشد.");
    },
  };

  registerSystemAuthRoutes(app, routeCtx);
  registerOverviewAnalyticsRoutes(app, routeCtx);
  registerPatientCareRoutes(app, routeCtx);
  registerTriageReferralRoutes(app, routeCtx);
  registerDiagnosticsRoutes(app, routeCtx);
  registerR2MonitoringRoutes(app, routeCtx);
  registerReportsRoutes(app, routeCtx);
  registerAdminIntegrationsOpsRoutes(app, routeCtx);

  return app;
}
