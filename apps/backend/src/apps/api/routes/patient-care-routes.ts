import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { EnrollmentHttpError } from "../../../contexts/enrollment-consent/index.js";
import { withTenantTransaction } from "../../../packages/db/index.js";
import {
  asStaffPrincipal,
  parsePagination,
  requireClaims,
  requireHeaderUuid,
  type ApiRouteContext,
} from "../route-context.js";

export function registerPatientCareRoutes(app: FastifyInstance, ctx: ApiRouteContext): void {
  const { config, appPool, enrollmentService, careEpisodeService, symptomService, analyticsService } = ctx;

  // --- Staff Patient Registry & Patient 360 (Modules B) ---

  app.get("/v1/patients", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const pg = parsePagination(req.query);
    const query = z
      .object({
        q: z.string().optional(),
        accessMode: z.enum(["app", "caregiver", "print_phone"]).optional(),
      })
      .parse(req.query ?? {});
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      enrollmentService.listPatients(tx, principal, {
        q: query.q,
        accessMode: query.accessMode,
        limit: pg.limit,
        offset: pg.offset,
      })
    );
  });

  app.post("/v1/patients", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        fullNameFa: z.string().min(2),
        phoneNumber: z.string().min(10),
        accessMode: z.enum(["app", "caregiver", "print_phone"]).default("app"),
        nationalIdMasked: z.string().min(4).max(20).optional(),
        birthYearJalali: z.number().int().min(1280).max(1420).optional(),
        notesFa: z.string().optional(),
        consentVersion: z.string().min(1).optional(),
        mlTrainingConsentFlag: z.boolean().optional(),
      })
      .parse(req.body);

    const enrolled = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      enrollmentService.enrollPatientByStaff(tx, principal, body)
    );
    return reply.status(201).send({
      ...enrolled,
      consents: enrolled.consents.map((c) => ({
        consentId: c.id,
        consentVersion: c.consentVersion,
        locale: c.locale,
        action: c.action,
        acceptedAt: c.acceptedAt.toISOString(),
      })),
    });
  });

  app.get("/v1/patients/:patientId", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ patientId: z.string().uuid() }).parse(req.params);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      analyticsService.getPatient360(tx, principal, params.patientId)
    );
  });

  app.get("/v1/patients/:patientId/history", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ patientId: z.string().uuid() }).parse(req.params);
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      enrollmentService.listClinicalHistory(tx, principal, params.patientId)
    );
    return { items };
  });

  app.post("/v1/patients/:patientId/history", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ patientId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        summaryFa: z.string().min(3),
        conditions: z.array(z.string()).optional(),
        allergies: z.array(z.string()).optional(),
        medications: z.array(z.string()).optional(),
        riskFactors: z.record(z.unknown()).optional(),
        labs: z.record(z.unknown()).optional(),
      })
      .parse(req.body);
    const created = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      enrollmentService.addClinicalHistory(tx, principal, params.patientId, body)
    );
    return reply.status(201).send(created);
  });

  app.get("/v1/patients/:patientId/timeline", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ patientId: z.string().uuid() }).parse(req.params);
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      analyticsService.getPatientTimeline(tx, principal, params.patientId)
    );
    return { items };
  });

  app.patch("/v1/patients/:patientId/consent", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ patientId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        consentVersion: z.string().min(1),
        action: z.enum(["accepted", "withdrawn"]),
        mlTrainingConsentFlag: z.boolean().optional(),
        noteFa: z.string().optional(),
      })
      .parse(req.body);
    const record = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      enrollmentService.updatePatientConsent(tx, principal, params.patientId, body)
    );
    return {
      consentId: record.id,
      consentVersion: record.consentVersion,
      locale: record.locale,
      action: record.action,
      acceptedAt: record.acceptedAt.toISOString(),
    };
  });

  // --- Caregiver & Patient Self-Service Routes (Preserved 100%) ---

  app.get("/v1/caregiver/patients", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    if (claims.actorType !== "caregiver") {
      throw new EnrollmentHttpError(403, "CAREGIVER_TOKEN_REQUIRED", "این مسیر مخصوص همراه بیمار است.");
    }
    const items = await withTenantTransaction(appPool, claims.tenantId, (tx) =>
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

    const profile = await withTenantTransaction(appPool, claims.tenantId, async (tx) => {
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
    const grants = await withTenantTransaction(appPool, claims.tenantId, (tx) =>
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

    const grant = await withTenantTransaction(appPool, claims.tenantId, (tx) =>
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
    await withTenantTransaction(appPool, claims.tenantId, (tx) =>
      enrollmentService.revokeCaregiver(tx, {
        tenantId: claims.tenantId,
        patientId: params.patientId,
        grantId: params.grantId,
        actorUserId: claims.sub,
      })
    );
    return reply.status(204).send();
  });

  // --- Care Episodes, Prescriptions, Symptoms & Print+Phone Queue (Module E) ---

  app.get("/v1/episodes", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const pg = parsePagination(req.query);
    const query = z
      .object({
        patientId: z.string().uuid().optional(),
        status: z.enum(["active", "completed", "cancelled"]).optional(),
        eyeLaterality: z.enum(["OD", "OS"]).optional(),
        accessMode: z.enum(["app", "caregiver", "print_phone"]).optional(),
        protocolType: z.string().optional(),
      })
      .parse(req.query ?? {});
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      careEpisodeService.listClinicEpisodes(tx, principal, {
        patientId: query.patientId,
        status: query.status,
        eyeLaterality: query.eyeLaterality,
        accessMode: query.accessMode,
        protocolType: query.protocolType,
        limit: pg.limit,
        offset: pg.offset,
      })
    );
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

    const ep = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
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
    return withTenantTransaction(appPool, claims.tenantId, (tx) =>
      careEpisodeService.getEpisode(tx, params.episodeId)
    );
  });

  app.patch("/v1/episodes/:episodeId/close", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ episodeId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        status: z.enum(["completed", "cancelled"]).default("completed"),
        reasonFa: z.string().min(3),
      })
      .parse(req.body);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      careEpisodeService.closeEpisode(tx, principal, params.episodeId, body)
    );
  });

  app.get("/v1/episodes/:episodeId/prescriptions", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ episodeId: z.string().uuid() }).parse(req.params);
    const items = await withTenantTransaction(appPool, claims.tenantId, (tx) =>
      careEpisodeService.listPrescriptionHistory(tx, params.episodeId)
    );
    return {
      items: items.map((rx) => ({
        ...rx,
        publishedAt: rx.publishedAt.toISOString(),
      })),
    };
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

    const rx = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
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

    return withTenantTransaction(appPool, claims.tenantId, async (tx) => {
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

    const pairs = await withTenantTransaction(appPool, claims.tenantId, async (tx) => {
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
    const items = await withTenantTransaction(appPool, claims.tenantId, (tx) =>
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

    const res = await withTenantTransaction(appPool, claims.tenantId, (tx) =>
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

  app.get("/v1/episodes/:episodeId/symptoms", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ episodeId: z.string().uuid() }).parse(req.params);
    const items = await withTenantTransaction(appPool, claims.tenantId, (tx) =>
      symptomService.listEpisodeSymptoms(tx, params.episodeId)
    );
    return { items };
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

    const res = await withTenantTransaction(appPool, claims.tenantId, (tx) =>
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

  app.get("/v1/care/print-phone", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      careEpisodeService.listPrintPhoneQueue(tx, principal)
    );
    return { items, total: items.length };
  });

  app.post("/v1/care/print-phone/:episodeId/outreach", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ episodeId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        status: z.enum(["completed", "pending", "missed"]).default("completed"),
        outcomeFa: z.string().min(3),
      })
      .parse(req.body);
    const record = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      careEpisodeService.recordPrintPhoneOutreach(tx, principal, params.episodeId, body)
    );
    return reply.status(201).send(record);
  });
}
