import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { withTenantTransaction } from "../../../packages/db/index.js";
import { toSafePublicSummary } from "../config.js";
import {
  asStaffPrincipal,
  parsePagination,
  requireClaims,
  type ApiRouteContext,
} from "../route-context.js";

export function registerAdminIntegrationsOpsRoutes(app: FastifyInstance, ctx: ApiRouteContext): void {
  const {
    config,
    appPool,
    tenancyService,
    staffAuthService,
    protocolRegistry,
    integrationsService,
    auditComplianceService,
    analyticsService,
  } = ctx;

  // --- Module J: Admin Settings & Configuration ---

  app.patch("/v1/admin/clinic", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        nameFa: z.string().min(2).optional(),
        emergencyPhone: z.string().min(8).optional(),
        calendarMode: z.enum(["jalali", "gregorian"]).optional(),
        dicomAeTitle: z.string().min(2).max(16).nullable().optional(),
        staffedHours: z
          .object({
            satToWed: z.object({
              open: z.string().regex(/^\d{2}:\d{2}$/),
              close: z.string().regex(/^\d{2}:\d{2}$/),
            }),
            thursday: z.object({
              open: z.string().regex(/^\d{2}:\d{2}$/),
              close: z.string().regex(/^\d{2}:\d{2}$/),
            }),
            fridayClosed: z.boolean(),
          })
          .partial()
          .optional(),
      })
      .parse(req.body);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      tenancyService.updateClinicProfile(tx, principal, body)
    );
  });

  app.get("/v1/admin/staff", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      staffAuthService.listClinicStaff(tx, principal)
    );
    return { items };
  });

  app.post("/v1/admin/staff", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["ophthalmologist", "optometrist", "technician", "coordinator", "admin"]),
        fullNameFa: z.string().min(2).optional(),
        email: z.string().email().optional(),
        active: z.boolean().default(true),
        mfaVerified: z.boolean().default(true),
      })
      .parse(req.body);
    const saved = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      staffAuthService.upsertStaffMembership(tx, principal, body)
    );
    return reply.status(201).send(saved);
  });

  app.patch("/v1/admin/staff/:membershipId", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ membershipId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        role: z.enum(["ophthalmologist", "optometrist", "technician", "coordinator", "admin"]).optional(),
        active: z.boolean().optional(),
        fullNameFa: z.string().min(2).nullable().optional(),
        email: z.string().email().nullable().optional(),
      })
      .parse(req.body);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      staffAuthService.updateStaffMembership(tx, principal, params.membershipId, body)
    );
  });

  app.get("/v1/admin/protocols", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      tenancyService.listProtocols(tx, principal, protocolRegistry.listTypes())
    );
  });

  app.post("/v1/admin/protocols", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        protocolType: z.string().min(2),
        schema: z.record(z.unknown()),
      })
      .parse(req.body);
    const created = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      tenancyService.createProtocolTemplateVersion(tx, principal, body)
    );
    return reply.status(201).send(created);
  });

  app.get("/v1/admin/message-templates", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      tenancyService.listMessageTemplates(tx, principal)
    );
    return { items };
  });

  app.post("/v1/admin/message-templates", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        templateKey: z.string().min(2),
        bodyTemplateFa: z.string().min(1),
        channel: z.enum(["sms", "print", "in_app"]).default("sms"),
        active: z.boolean().default(true),
      })
      .parse(req.body);
    const created = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      tenancyService.createMessageTemplate(tx, principal, body)
    );
    return reply.status(201).send(created);
  });

  app.get("/v1/admin/consents", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      tenancyService.listConsentTemplates(tx, principal)
    );
    return { items };
  });

  app.post("/v1/admin/consents", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        consentType: z.enum(["care_enrollment", "diagnostic_ai", "research_d5", "caregiver_delegation"]),
        version: z.string().min(2),
        titleFa: z.string().min(3),
        bodyFa: z.string().min(10),
        active: z.boolean().default(true),
      })
      .parse(req.body);
    const created = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      tenancyService.createConsentTemplate(tx, principal, body)
    );
    return reply.status(201).send(created);
  });

  app.get("/v1/admin/features", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      tenancyService.listFeatureFlags(tx, principal)
    );
    return { items };
  });

  app.patch("/v1/admin/features", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        flagKey: z.string().min(2),
        enabled: z.boolean(),
        config: z.record(z.unknown()).optional(),
      })
      .parse(req.body);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      tenancyService.upsertFeatureFlag(tx, principal, body)
    );
  });

  // --- Module K: Clinical Integrations (DICOM / FHIR / HIS / SMS Gateway) ---

  app.get("/v1/integrations/endpoints", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      integrationsService.listEndpoints(tx, principal)
    );
    return { items };
  });

  app.post("/v1/integrations/endpoints", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        integrationType: z.enum(["dicom_dimse", "dicomweb", "fhir_his", "icare_home2", "sms_gateway"]),
        nameFa: z.string().min(2),
        endpointUrl: z.string().min(3),
        aeTitle: z.string().min(2).max(16).optional(),
        authMode: z.enum(["none", "mtls", "bearer", "basic"]).default("none"),
        secret: z.string().optional(),
        enabled: z.boolean().default(true),
      })
      .parse(req.body);
    const created = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      integrationsService.createEndpoint(tx, principal, body)
    );
    return reply.status(201).send(created);
  });

  app.patch("/v1/integrations/endpoints/:endpointId", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ endpointId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        nameFa: z.string().min(2).optional(),
        endpointUrl: z.string().min(3).optional(),
        aeTitle: z.string().min(2).max(16).nullable().optional(),
        authMode: z.enum(["none", "mtls", "bearer", "basic"]).optional(),
        secret: z.string().nullable().optional(),
        enabled: z.boolean().optional(),
      })
      .parse(req.body);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      integrationsService.updateEndpoint(tx, principal, params.endpointId, body)
    );
  });

  app.post("/v1/integrations/endpoints/:endpointId/test", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ endpointId: z.string().uuid() }).parse(req.params);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      integrationsService.testEndpoint(tx, principal, params.endpointId)
    );
  });

  app.get("/v1/integrations/history", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const pg = parsePagination(req.query);
    const query = z
      .object({
        endpointId: z.string().uuid().optional(),
        status: z.enum(["queued", "delivered", "failed", "retrying"]).optional(),
        direction: z.enum(["inbound", "outbound"]).optional(),
      })
      .parse(req.query ?? {});
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      integrationsService.listDeliveries(tx, principal, {
        endpointId: query.endpointId,
        status: query.status,
        direction: query.direction,
        limit: pg.limit,
        offset: pg.offset,
      })
    );
  });

  // --- Module L: Internal Operations, Audit, Break-Glass & Model Registry ---

  app.get("/v1/ops/health", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const runtimeSummary = toSafePublicSummary(config) as unknown as Record<string, unknown>;
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      analyticsService.getOpsHealth(tx, principal, runtimeSummary)
    );
  });

  app.get("/v1/ops/jobs", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(25) }).parse(req.query ?? {});
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      analyticsService.listOpsJobs(tx, principal, query.limit)
    );
  });

  app.get("/v1/ops/audit", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const pg = parsePagination(req.query);
    const query = z
      .object({
        action: z.string().optional(),
        resourceType: z.string().optional(),
        actorUserId: z.string().uuid().optional(),
        breakGlassOnly: z
          .union([z.boolean(), z.enum(["true", "false"])])
          .transform((v) => v === true || v === "true")
          .optional(),
      })
      .parse(req.query ?? {});
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      auditComplianceService.listAuditLogs(tx, principal, {
        action: query.action,
        resourceType: query.resourceType,
        actorUserId: query.actorUserId,
        breakGlassOnly: query.breakGlassOnly,
        limit: pg.limit,
        offset: pg.offset,
      })
    );
  });

  app.get("/v1/ops/break-glass", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const pg = parsePagination(req.query);
    const query = z
      .object({
        activeOnly: z
          .union([z.boolean(), z.enum(["true", "false"])])
          .transform((v) => v === true || v === "true")
          .optional(),
      })
      .parse(req.query ?? {});
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      auditComplianceService.listBreakGlassSessions(tx, principal, {
        activeOnly: query.activeOnly,
        limit: pg.limit,
        offset: pg.offset,
      })
    );
  });

  app.post("/v1/ops/break-glass", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        patientId: z.string().uuid(),
        reasonFa: z.string().min(1),
        durationMinutes: z.number().int().min(15).max(240).optional(),
      })
      .parse(req.body);
    const session = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      auditComplianceService.openBreakGlassSession(tx, principal, body)
    );
    return reply.status(201).send(session);
  });

  app.post("/v1/ops/break-glass/:sessionId/revoke", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ sessionId: z.string().uuid() }).parse(req.params);
    const body = z.object({ reasonFa: z.string().optional() }).parse(req.body ?? {});
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      auditComplianceService.revokeBreakGlassSession(tx, principal, params.sessionId, body.reasonFa)
    );
  });

  app.get("/v1/ops/models", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    return analyticsService.listModelRegistry(principal, {
      aiEngineMode: config.AI_ENGINE_MODE,
      foundationBackbone: config.FOUNDATION_BACKBONE,
      llmProvider: config.LLM_PROVIDER,
      llmModel: config.LLM_MODEL,
    });
  });
}
