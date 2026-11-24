import type { DbTx } from "../../../packages/db/index.js";
import { renderPersianReportPdf } from "../infrastructure/pdfkit-persian-renderer.js";
import type {
  GeneratedReportRecord,
  PersianPdfDocumentPayload,
  ReportingRepoPort,
} from "../ports/index.js";

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
}
