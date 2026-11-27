import { authorizeStaffAction, type StaffPrincipal } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import { renderPersianReportPdf } from "../infrastructure/pdfkit-persian-renderer.js";
import type {
  GeneratedReportRecord,
  PersianPdfDocumentPayload,
  ReportDetailRecord,
  ReportingRepoPort,
  ReportListItem,
  ReportType,
} from "../ports/index.js";

export class ReportingError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    messageFa: string
  ) {
    super(messageFa);
    this.name = "ReportingError";
  }
}

export class ReportingService {
  constructor(private readonly repo: ReportingRepoPort) {}

  async generateAndStoreReport(
    tx: DbTx,
    payload: PersianPdfDocumentPayload,
    createdByUserId?: string | undefined
  ): Promise<GeneratedReportRecord> {
    const { pdfBuffer, sourceSha256, pdfSha256 } = await renderPersianReportPdf(payload);
    const reportId = await this.repo.saveReportVersion(tx, {
      tenantId: payload.tenantId,
      clinicId: payload.clinicId,
      patientId: payload.patientId,
      reportType: payload.reportType,
      sourceRefId: payload.sourceRefId,
      sourceSha256,
      pdfSha256,
      payload,
      createdByUserId,
    });

    return {
      reportId,
      reportType: payload.reportType,
      sourceRefId: payload.sourceRefId,
      sourceSha256,
      pdfSha256,
      payload,
      pdfBuffer,
    };
  }

  async renderExistingPdfById(
    tx: DbTx,
    reportId: string
  ): Promise<{ pdfBuffer: Buffer; sourceSha256: string } | null> {
    const record = await this.repo.findReportPayloadById(tx, reportId);
    if (!record) return null;
    const rendered = await renderPersianReportPdf(record.payload);
    return { pdfBuffer: rendered.pdfBuffer, sourceSha256: record.sourceSha256 };
  }

  async listReports(
    tx: DbTx,
    principal: StaffPrincipal,
    filter: {
      patientId?: string | undefined;
      reportType?: ReportType | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: ReportListItem[]; total: number }> {
    const decision = authorizeStaffAction(principal, "report:read", principal.tenantId);
    if (!decision.allowed) {
      throw new ReportingError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listReports(tx, {
      clinicId: principal.clinicId,
      patientId: filter.patientId,
      reportType: filter.reportType,
      limit: Math.min(100, Math.max(1, filter.limit)),
      offset: Math.max(0, filter.offset),
    });
  }

  async getReportDetail(
    tx: DbTx,
    principal: StaffPrincipal,
    reportId: string
  ): Promise<ReportDetailRecord> {
    const decision = authorizeStaffAction(principal, "report:read", principal.tenantId);
    if (!decision.allowed) {
      throw new ReportingError(403, decision.code, decision.reasonFa);
    }
    const detail = await this.repo.getReportDetail(tx, reportId);
    if (!detail) {
      throw new ReportingError(404, "REPORT_NOT_FOUND", "گزارش یافت نشد.");
    }
    return detail;
  }
}
