import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { withTenantTransaction } from "../../../packages/db/index.js";
import {
  asStaffPrincipal,
  parsePagination,
  requireClaims,
  type ApiRouteContext,
} from "../route-context.js";

export function registerR2MonitoringRoutes(app: FastifyInstance, ctx: ApiRouteContext): void {
  const { config, appPool, r2MonitoringService, icareHome2Service, triageRepo } = ctx;

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
    const saved = await withTenantTransaction(appPool, claims.tenantId, (tx) =>
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
        deviceModelCode: z.string().min(2).optional(),
        eyeLaterality: z.enum(["OD", "OS"]),
        testType: z.enum(["landolt_c", "amsler", "contrast"]),
        vaLogmar: z.number().min(-0.3).max(2.0).optional(),
        amslerDistortionScore: z.number().min(0).max(1).optional(),
        amslerCentralScotoma: z.boolean().optional(),
        viewingDistanceCm: z.number().min(5).max(200),
        ambientLux: z.number().min(0).max(50000),
        deviceTiltDeg: z.number().min(-90).max(90),
        glareDetected: z.boolean().default(false),
        rawTrials: z
          .array(
            z.object({
              trialIndex: z.number().int().min(0),
              stimulus: z.record(z.unknown()),
              response: z.record(z.unknown()),
              reactionMs: z.number().int().min(0).optional(),
              correct: z.boolean().optional(),
            })
          )
          .optional(),
      })
      .parse(req.body);

    const targetPatientId = claims.actorType === "patient" ? claims.sub : (body.patientId ?? claims.sub);
    const result = await withTenantTransaction(appPool, claims.tenantId, (tx) =>
      r2MonitoringService.submitHomeTest(tx, {
        tenantId: claims.tenantId,
        clinicId: claims.clinicId,
        patientId: targetPatientId,
        calibrationProfileId: body.calibrationProfileId,
        deviceModelCode: body.deviceModelCode,
        eyeLaterality: body.eyeLaterality,
        testType: body.testType,
        vaLogmar: body.vaLogmar,
        amslerDistortionScore: body.amslerDistortionScore,
        amslerCentralScotoma: body.amslerCentralScotoma,
        viewingDistanceCm: body.viewingDistanceCm,
        ambientLux: body.ambientLux,
        deviceTiltDeg: body.deviceTiltDeg,
        glareDetected: body.glareDetected,
        rawTrials: body.rawTrials,
      })
    );
    return reply.status(201).send(result);
  });

  app.get("/v1/r2/monitoring/overview", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      r2MonitoringService.getMonitoringOverview(tx, principal)
    );
  });

  app.get("/v1/r2/patients/:patientId/trends", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ patientId: z.string().uuid() }).parse(req.params);
    const targetPatientId = claims.actorType === "patient" ? claims.sub : params.patientId;
    return withTenantTransaction(appPool, claims.tenantId, (tx) =>
      r2MonitoringService.getPatientTrends(tx, targetPatientId)
    );
  });

  app.get("/v1/r2/patients/:patientId/sessions", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ patientId: z.string().uuid() }).parse(req.params);
    const targetPatientId = claims.actorType === "patient" ? claims.sub : params.patientId;
    const pg = parsePagination(req.query);
    const query = z
      .object({
        eyeLaterality: z.enum(["OD", "OS"]).optional(),
        testType: z.enum(["landolt_c", "amsler", "contrast"]).optional(),
        qualityStatus: z.enum(["accepted", "rejected"]).optional(),
      })
      .parse(req.query ?? {});
    return withTenantTransaction(appPool, claims.tenantId, (tx) =>
      r2MonitoringService.listPatientSessions(tx, targetPatientId, {
        eyeLaterality: query.eyeLaterality,
        testType: query.testType,
        qualityStatus: query.qualityStatus,
        limit: pg.limit,
        offset: pg.offset,
      })
    );
  });

  app.get("/v1/r2/sessions/:sessionId", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    asStaffPrincipal(claims);
    const params = z.object({ sessionId: z.string().uuid() }).parse(req.params);
    return withTenantTransaction(appPool, claims.tenantId, (tx) =>
      r2MonitoringService.getSessionDetail(tx, params.sessionId)
    );
  });

  app.get("/v1/r2/patients/:patientId/iop", async (req) => {
    const claims = requireClaims(req, config.AUTH_SIGNING_SECRET);
    const params = z.object({ patientId: z.string().uuid() }).parse(req.params);
    const targetPatientId = claims.actorType === "patient" ? claims.sub : params.patientId;
    return withTenantTransaction(appPool, claims.tenantId, (tx) =>
      r2MonitoringService.listPatientIopReadings(tx, targetPatientId)
    );
  });

  app.get("/v1/r2/patients/:patientId/plans", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ patientId: z.string().uuid() }).parse(req.params);
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      r2MonitoringService.listMonitoringPlans(tx, params.patientId)
    );
    return { items };
  });

  app.post("/v1/r2/patients/:patientId/plans", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ patientId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        eyeLaterality: z.enum(["OD", "OS"]),
        testTypes: z.array(z.enum(["landolt_c", "amsler", "contrast"])).min(1),
        cadenceDays: z.number().int().min(1).max(90).default(7),
        alertThresholdLogmar: z.number().min(0.05).max(1.0).default(0.2),
        active: z.boolean().default(true),
      })
      .parse(req.body);
    const created = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      r2MonitoringService.createMonitoringPlan(tx, principal, {
        patientId: params.patientId,
        ...body,
      })
    );
    return reply.status(201).send(created);
  });

  app.get("/v1/r2/devices", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      r2MonitoringService.listDevices(tx, principal)
    );
    return { items };
  });

  app.post("/v1/r2/devices", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        modelCode: z.string().min(2),
        manufacturer: z.string().min(2),
        displayPpi: z.number().min(60).max(1200).optional(),
        verifiedStatus: z.enum(["qualified", "provisional", "killed"]).default("provisional"),
        killSwitchReasonFa: z.string().optional(),
      })
      .parse(req.body);
    const saved = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      r2MonitoringService.upsertDevice(tx, principal, body)
    );
    return reply.status(201).send(saved);
  });

  app.patch("/v1/r2/devices/:deviceId", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ deviceId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        verifiedStatus: z.enum(["qualified", "provisional", "killed"]),
        killSwitchReasonFa: z.string().optional(),
      })
      .parse(req.body);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      r2MonitoringService.updateDeviceStatus(tx, principal, params.deviceId, body)
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
    const reading = await withTenantTransaction(appPool, claims.tenantId, async (tx) => {
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
}
