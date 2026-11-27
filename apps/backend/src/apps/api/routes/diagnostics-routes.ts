import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { EnrollmentHttpError } from "../../../contexts/enrollment-consent/index.js";
import {
  buildSignedStudyFhirBundle,
  normalizeDicomIngestBatch,
} from "../../../contexts/integrations/index.js";
import { formatJalaliDate } from "../../../contexts/tenancy/index.js";
import { withTenantTransaction } from "../../../packages/db/index.js";
import {
  asStaffPrincipal,
  parsePagination,
  requireClaims,
  type ApiRouteContext,
} from "../route-context.js";

const StudyAssetZodSchema = z.object({
  assetId: z.string().uuid(),
  s3ObjectKey: z.string().min(1),
  declaredModality: z.string().min(1),
  declaredEye: z.enum(["OD", "OS"]),
  dicomStudyUid: z.string().nullable().optional(),
  blurScoreHint: z.number().nullable().optional(),
  lightingScoreHint: z.number().nullable().optional(),
  detectedEyeHint: z.string().nullable().optional(),
  conditionHints: z.array(z.string()).optional(),
});

export function registerDiagnosticsRoutes(app: FastifyInstance, ctx: ApiRouteContext): void {
  const { config, appPool, diagnosticStudyService, enrollmentService, auditRepo } = ctx;

  app.get("/v1/diagnostic-studies", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const pg = parsePagination(req.query);
    const query = z
      .object({
        status: z
          .enum(["ingested", "qc_failed", "queued", "analyzed", "pending_hitl", "signed_off"])
          .optional(),
        urgencyTier: z.enum(["routine", "followup_3_6m", "urgent"]).optional(),
        eyeLaterality: z.enum(["OD", "OS", "OU"]).optional(),
        patientId: z.string().uuid().optional(),
        modality: z.string().optional(),
        signedOnly: z
          .union([z.boolean(), z.enum(["true", "false"])])
          .transform((v) => v === true || v === "true")
          .optional(),
      })
      .parse(req.query ?? {});

    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      diagnosticStudyService.listStudies(tx, principal, {
        status: query.status,
        urgencyTier: query.urgencyTier,
        eyeLaterality: query.eyeLaterality,
        patientId: query.patientId,
        modality: query.modality,
        signedOnly: query.signedOnly,
        limit: pg.limit,
        offset: pg.offset,
      })
    );
  });

  app.post("/v1/diagnostic-studies", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const body = z
      .object({
        patientId: z.string().uuid(),
        clinicId: z.string().uuid().optional(),
        eyeLaterality: z.enum(["OD", "OS", "OU"]),
        assets: z.array(StudyAssetZodSchema),
        labs: z.record(z.unknown()).optional(),
      })
      .parse(req.body);

    const study = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
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
    return withTenantTransaction(appPool, claims.tenantId, (tx) =>
      diagnosticStudyService.getStudy(tx, params.studyId)
    );
  });

  app.post("/v1/diagnostic-studies/:studyId/assets", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ studyId: z.string().uuid() }).parse(req.params);
    const body = z.object({ assets: z.array(StudyAssetZodSchema).min(1) }).parse(req.body);

    const study = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      diagnosticStudyService.addRecaptureAssetsAndReanalyze(tx, principal, params.studyId, {
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
      })
    );
    return reply.status(202).send(study);
  });

  app.get("/v1/diagnostic-studies/:studyId/jobs", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ studyId: z.string().uuid() }).parse(req.params);
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      diagnosticStudyService.listStudyJobs(tx, principal, params.studyId)
    );
    return { items };
  });

  app.put("/v1/diagnostic-studies/:studyId/report-draft", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ studyId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        expectedDraftVersion: z.number().int().min(1),
        titleFa: z.string().min(5),
        modalityFindingsFa: z.string().min(10),
        differentialSummaryFa: z.string().min(5),
        crossModalCorrelationFa: z.string().min(5),
        followUpPlanFa: z.string().min(5),
        urgencyTier: z.enum(["routine", "followup_3_6m", "urgent"]),
        evidenceIds: z.array(z.string().min(1)).optional(),
      })
      .parse(req.body);

    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      diagnosticStudyService.saveEditedReportDraft(tx, principal, params.studyId, body)
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
        expectedDraftVersion: z.number().int().min(1).optional(),
      })
      .parse(req.body);

    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      diagnosticStudyService.signOffStudy(tx, principal, params.studyId, {
        action: body.action,
        finalUrgency: body.finalUrgency,
        finalReportTextFa: body.finalReportTextFa,
        overrideReasonFa: body.overrideReasonFa ?? undefined,
        expectedDraftVersion: body.expectedDraftVersion,
      })
    );
  });

  app.get("/v1/diagnostic-studies/:studyId/feedback", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ studyId: z.string().uuid() }).parse(req.params);
    const items = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      diagnosticStudyService.listFeedback(tx, principal, params.studyId)
    );
    return { items };
  });

  app.post("/v1/diagnostic-studies/:studyId/feedback", async (req, reply) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ studyId: z.string().uuid() }).parse(req.params);
    const body = z
      .object({
        targetLayer: z.enum([
          "qc",
          "specialist",
          "fusion",
          "segmentation",
          "gradcam",
          "report_draft",
          "urgency",
        ]),
        agreementState: z.enum(["agree", "partially_agree", "disagree"]),
        correctedLabelCode: z.string().optional(),
        noteFa: z.string().default(""),
      })
      .parse(req.body);
    const saved = await withTenantTransaction(appPool, principal.tenantId, (tx) =>
      diagnosticStudyService.createFeedback(tx, principal, params.studyId, body)
    );
    return reply.status(201).send(saved);
  });

  app.get("/v1/diagnostic-studies/:studyId/compare", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ studyId: z.string().uuid() }).parse(req.params);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      diagnosticStudyService.compareStudyWithPrior(tx, principal, params.studyId)
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
    const result = await withTenantTransaction(appPool, principal.tenantId, async (tx) => {
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
    return withTenantTransaction(appPool, principal.tenantId, async (tx) => {
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
    const items = await withTenantTransaction(appPool, claims.tenantId, async (tx) => {
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
}
