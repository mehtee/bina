import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { withTenantTransaction } from "../../../packages/db/index.js";
import {
  asStaffPrincipal,
  parsePagination,
  requireClaims,
  type ApiRouteContext,
} from "../route-context.js";

export function registerTriageReferralRoutes(app: FastifyInstance, ctx: ApiRouteContext): void {
  const { config, appPool, triageService } = ctx;

  app.get("/v1/triage/cases", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const query = z
      .object({
        status: z
          .enum(["New", "OwnerAssigned", "ContactAttempted", "ContactEstablished", "Escalated", "Referred", "Closed"])
          .optional(),
        urgencyTier: z.enum(["routine", "followup_3_6m", "urgent"]).optional(),
        sourcePillar: z.enum(["pillar1_care", "pillar2_diagnostic"]).optional(),
        eyeLaterality: z.enum(["OD", "OS", "OU"]).optional(),
        ownerId: z.string().uuid().optional(),
        unassignedOnly: z
          .union([z.boolean(), z.enum(["true", "false"])])
          .transform((v) => v === true || v === "true")
          .optional(),
        limit: z.coerce.number().int().min(1).max(100).optional(),
        offset: z.coerce.number().int().min(0).optional(),
      })
      .parse(req.query ?? {});

    const hasFilters =
      query.status !== undefined ||
      query.urgencyTier !== undefined ||
      query.sourcePillar !== undefined ||
      query.eyeLaterality !== undefined ||
      query.ownerId !== undefined ||
      query.unassignedOnly !== undefined ||
      query.limit !== undefined ||
      query.offset !== undefined;

    if (!hasFilters) {
      const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
        triageService.listCases(tx, principal)
      );
      return { items, total: items.length };
    }

    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.listCasesFiltered(tx, principal, {
        status: query.status,
        urgencyTier: query.urgencyTier,
        sourcePillar: query.sourcePillar,
        eyeLaterality: query.eyeLaterality,
        ownerId: query.ownerId,
        unassignedOnly: query.unassignedOnly,
        limit: query.limit ?? 25,
        offset: query.offset ?? 0,
      })
    );
  });

  app.get("/v1/triage/cases/:caseId", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ caseId: z.string().uuid() }).parse(req.params);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.getCaseDetail(tx, principal, params.caseId)
    );
  });

  app.post("/v1/triage/cases/:caseId/claim", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ caseId: z.string().uuid() }).parse(req.params);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
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
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.handoffCase(tx, principal, params.caseId, body)
    );
  });

  app.post("/v1/triage/cases/:caseId/contact", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ caseId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        outcome: z.enum(["no_answer", "contacted", "escalated"]),
        channel: z.enum(["phone", "sms", "in_person"]).default("phone"),
        noteFa: z.string().min(3),
      })
      .parse(req.body);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.recordContactAttempt(tx, principal, params.caseId, body)
    );
  });

  app.post("/v1/triage/cases/:caseId/close", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ caseId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        resolutionNoteFa: z.string().min(5),
        resolutionType: z
          .enum(["resolved", "referred", "false_positive_clinician_verified"])
          .optional(),
      })
      .parse(req.body);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.closeCase(tx, principal, params.caseId, body)
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
    const referral = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.createReferral(tx, principal, params.caseId, body)
    );
    return reply.status(201).send(referral);
  });

  app.get("/v1/triage/outages", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const query = z
      .object({ status: z.enum(["active", "mitigated", "resolved"]).optional() })
      .parse(req.query ?? {});
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.listOutages(tx, principal, query.status)
    );
    return { items };
  });

  app.post("/v1/triage/outages", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        titleFa: z.string().min(3),
        severity: z.enum(["warning", "critical"]).default("warning"),
        affectedChannel: z.enum(["sms", "ai_engine", "ehr_his", "phone", "portal"]),
        mitigationNoteFa: z.string().optional(),
      })
      .parse(req.body);
    const created = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.createOutage(tx, principal, body)
    );
    return reply.status(201).send(created);
  });

  app.patch("/v1/triage/outages/:outageId", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ outageId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        status: z.enum(["active", "mitigated", "resolved"]).optional(),
        severity: z.enum(["warning", "critical"]).optional(),
        mitigationNoteFa: z.string().optional(),
      })
      .parse(req.body);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.updateOutage(tx, principal, params.outageId, body)
    );
  });

  app.get("/v1/referrals", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const pg = parsePagination(req.query);
    const query = z
      .object({
        status: z.enum(["dispatched", "attended", "missed"]).optional(),
        urgentOnly: z
          .union([z.boolean(), z.enum(["true", "false"])])
          .transform((v) => v === true || v === "true")
          .optional(),
      })
      .parse(req.query ?? {});
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.listReferrals(tx, principal, {
        status: query.status,
        urgentOnly: query.urgentOnly,
        limit: pg.limit,
        offset: pg.offset,
      })
    );
  });

  app.get("/v1/referrals/:referralId", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ referralId: z.string().uuid() }).parse(req.params);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.getReferralDetail(tx, principal, params.referralId)
    );
  });

  app.patch("/v1/referrals/:referralId/outcome", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ referralId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        status: z.enum(["attended", "missed"]),
        missReasonFa: z.string().optional(),
      })
      .parse(req.body);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.recordReferralOutcome(tx, principal, params.referralId, body.status, body.missReasonFa)
    );
  });

  app.get("/v1/follow-ups", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const pg = parsePagination(req.query);
    const query = z
      .object({
        status: z.enum(["pending", "completed", "missed", "cancelled"]).optional(),
        taskType: z
          .enum(["postop_call", "print_phone_checkin", "clinic_visit", "referral_followup", "r2_recalibration"])
          .optional(),
        patientId: z.string().uuid().optional(),
      })
      .parse(req.query ?? {});
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.listFollowUps(tx, principal, {
        status: query.status,
        taskType: query.taskType,
        patientId: query.patientId,
        limit: pg.limit,
        offset: pg.offset,
      })
    );
  });

  app.post("/v1/follow-ups", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        patientId: z.string().uuid(),
        episodeId: z.string().uuid().optional(),
        triageCaseId: z.string().uuid().optional(),
        eyeLaterality: z.enum(["OD", "OS", "OU"]).optional(),
        taskType: z.enum([
          "postop_call",
          "print_phone_checkin",
          "clinic_visit",
          "referral_followup",
          "r2_recalibration",
        ]),
        dueAt: z.string().datetime(),
        assignedUserId: z.string().uuid().optional(),
        outcomeFa: z.string().optional(),
      })
      .parse(req.body);
    const created = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.createFollowUp(tx, principal, {
        patientId: body.patientId,
        episodeId: body.episodeId,
        triageCaseId: body.triageCaseId,
        eyeLaterality: body.eyeLaterality,
        taskType: body.taskType,
        dueAtIso: body.dueAt,
        assignedUserId: body.assignedUserId,
        outcomeFa: body.outcomeFa,
      })
    );
    return reply.status(201).send(created);
  });

  app.patch("/v1/follow-ups/:taskId", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ taskId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        status: z.enum(["pending", "completed", "missed", "cancelled"]).optional(),
        assignedUserId: z.string().uuid().nullable().optional(),
        outcomeFa: z.string().nullable().optional(),
      })
      .parse(req.body);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      triageService.updateFollowUp(tx, principal, params.taskId, body)
    );
  });
}
