import type { DbTx } from "../../../packages/db/index.js";
import type { PersianPdfDocumentPayload, ReportingRepoPort, ReportType } from "../ports/index.js";

export class PgReportingRepo implements ReportingRepoPort {
  async saveReportVersion(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      patientId: string;
      reportType: ReportType;
      sourceRefId: string;
      sourceSha256: string;
      pdfSha256: string;
      payload: PersianPdfDocumentPayload;
      createdByUserId?: string | undefined;
    }
  ): Promise<string> {
    const res = await tx.query<{ id: string }>(
      `INSERT INTO report_versions
        (tenant_id, clinic_id, patient_id, report_type, source_ref_id, source_sha256, pdf_sha256, payload_json, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
       RETURNING id`,
      [
        input.tenantId,
        input.clinicId,
        input.patientId,
        input.reportType,
        input.sourceRefId,
        input.sourceSha256,
        input.pdfSha256,
        JSON.stringify(input.payload),
        input.createdByUserId ?? null,
      ]
    );
    return res.rows[0]!.id;
  }

  async findReportPayloadById(tx: DbTx, reportId: string): Promise<{
    reportId: string;
    reportType: ReportType;
    sourceRefId: string;
    sourceSha256: string;
    pdfSha256: string;
    payload: PersianPdfDocumentPayload;
  } | null> {
    const res = await tx.query<{
      id: string;
      report_type: ReportType;
      source_ref_id: string;
      source_sha256: string;
      pdf_sha256: string;
      payload_json: PersianPdfDocumentPayload;
    }>(
      `SELECT id, report_type, source_ref_id, source_sha256, pdf_sha256, payload_json
       FROM report_versions WHERE id = $1`,
      [reportId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      reportId: r.id,
      reportType: r.report_type,
      sourceRefId: r.source_ref_id,
      sourceSha256: r.source_sha256,
      pdfSha256: r.pdf_sha256,
      payload: r.payload_json,
    };
  }
}
