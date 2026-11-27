import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { EnrollmentHttpError } from "../../../contexts/enrollment-consent/index.js";
import { formatJalaliDate } from "../../../contexts/tenancy/index.js";
import { withTenantTransaction } from "../../../packages/db/index.js";
import { formatLateralityFa } from "../../../packages/domain-kernel/index.js";
import {
  asStaffPrincipal,
  parsePagination,
  requireClaims,
  type ApiRouteContext,
} from "../route-context.js";

export function registerReportsRoutes(app: FastifyInstance, ctx: ApiRouteContext): void {
  const { config, appPool, tenancyRepo, diagnosticStudyService, reportingService } = ctx;

  app.get("/v1/reports", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const pg = parsePagination(req.query);
    const query = z
      .object({
        patientId: z.string().uuid().optional(),
        reportType: z.enum(["patient_schedule", "postop_closure", "signed_diagnostic"]).optional(),
      })
      .parse(req.query ?? {});
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      reportingService.listReports(tx, principal, {
        patientId: query.patientId,
        reportType: query.reportType,
        limit: pg.limit,
        offset: pg.offset,
      })
    );
  });

  app.get("/v1/reports/:reportId", async (req) => {
    const principal = asStaffPrincipal(requireClaims(req, config.AUTH_SIGNING_SECRET));
    const params = z.object({ reportId: z.string().uuid() }).parse(req.params);
    return withTenantTransaction(appPool, principal.tenantId, (tx) =>
      reportingService.getReportDetail(tx, principal, params.reportId)
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

    const generated = await withTenantTransaction(appPool, principal.tenantId, async (tx) => {
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
    const rendered = await withTenantTransaction(appPool, claims.tenantId, (tx) =>
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
}
