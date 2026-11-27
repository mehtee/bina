import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { withTenantTransaction } from "../../../packages/db/index.js";
import { asStaffPrincipal, requireClaims, type ApiRouteContext } from "../route-context.js";

export function registerOverviewAnalyticsRoutes(app: FastifyInstance, ctx: ApiRouteContext): void {
  const { config, appPool, analyticsService, billingEvidenceService, researchExportService } = ctx;

  app.get("/v1/overview/dashboard", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      analyticsService.getOverviewDashboard(tx, principal)
    );
  });

  app.get("/v1/overview/search", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const query = z.object({ q: z.string().default("") }).parse(req.query ?? {});
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      analyticsService.searchWorkspace(tx, principal, query.q)
    );
  });

  app.get("/v1/overview/activity", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const query = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) }).parse(req.query ?? {});
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      analyticsService.listRecentActivity(tx, principal, query.limit)
    );
    return { items };
  });

  app.get("/v1/analytics/clinic", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      analyticsService.getClinicAnalytics(tx, principal)
    );
  });

  app.get("/v1/analytics/pilot", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      analyticsService.getPilotScorecard(tx, principal)
    );
  });

  app.get("/v1/analytics/ai-quality", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      analyticsService.getAiQualityAnalytics(tx, principal)
    );
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
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
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
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      billingEvidenceService.generatePatientEvidence(tx, {
        tenantId: principal.tenantId,
        ...body,
      })
    );
  });
}
