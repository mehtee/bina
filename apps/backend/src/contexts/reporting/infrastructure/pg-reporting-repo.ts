import type { DbTx } from "../../../packages/db/index.js";
import type {
  PersianPdfDocumentPayload,
  ReportDetailRecord,
  ReportingRepoPort,
  ReportListItem,
  ReportType,
} from "../ports/index.js";

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

  async listReports(
    tx: DbTx,
    filter: {
      clinicId?: string | undefined;
      patientId?: string | undefined;
      reportType?: ReportType | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: ReportListItem[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const push = (v: unknown): string => {
      params.push(v);
      return `$${params.length}`;
    };
    if (filter.clinicId) conditions.push(`rv.clinic_id = ${push(filter.clinicId)}`);
    if (filter.patientId) conditions.push(`rv.patient_id = ${push(filter.patientId)}`);
    if (filter.reportType) conditions.push(`rv.report_type = ${push(filter.reportType)}`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRes = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt FROM report_versions rv ${whereClause}`,
      params
    );
    const total = Number(countRes.rows[0]?.cnt ?? "0");

    const limitP = push(filter.limit);
    const offsetP = push(filter.offset);

    const rowsRes = await tx.query<{
      id: string;
      report_type: ReportType;
      patient_id: string;
      full_name_fa: string;
      source_ref_id: string;
      payload_json: PersianPdfDocumentPayload;
      source_sha256: string;
      pdf_sha256: string;
      created_at: Date;
    }>(
      `SELECT rv.id, rv.report_type, rv.patient_id, p.full_name_fa, rv.source_ref_id,
              rv.payload_json, rv.source_sha256, rv.pdf_sha256, rv.created_at
       FROM report_versions rv
       JOIN patients p ON p.id = rv.patient_id
       ${whereClause}
       ORDER BY rv.created_at DESC
       LIMIT ${limitP} OFFSET ${offsetP}`,
      params
    );

    const items: ReportListItem[] = rowsRes.rows.map((r) => ({
      reportId: r.id,
      reportType: r.report_type,
      patientId: r.patient_id,
      patientNameFa: r.full_name_fa,
      sourceRefId: r.source_ref_id,
      titleFa: r.payload_json.titleFa,
      issuedAtJalali: r.payload_json.issuedAtJalali,
      sourceSha256: r.source_sha256,
      pdfSha256: r.pdf_sha256,
      createdAtIso: r.created_at.toISOString(),
    }));

    return { items, total };
  }

  async getReportDetail(tx: DbTx, reportId: string): Promise<ReportDetailRecord | null> {
    const res = await tx.query<{
      id: string;
      clinic_id: string;
      report_type: ReportType;
      patient_id: string;
      full_name_fa: string;
      source_ref_id: string;
      payload_json: PersianPdfDocumentPayload;
      source_sha256: string;
      pdf_sha256: string;
      created_at: Date;
    }>(
      `SELECT rv.id, rv.clinic_id, rv.report_type, rv.patient_id, p.full_name_fa, rv.source_ref_id,
              rv.payload_json, rv.source_sha256, rv.pdf_sha256, rv.created_at
       FROM report_versions rv
       JOIN patients p ON p.id = rv.patient_id
       WHERE rv.id = $1`,
      [reportId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      reportId: r.id,
      clinicId: r.clinic_id,
      reportType: r.report_type,
      patientId: r.patient_id,
      patientNameFa: r.full_name_fa,
      sourceRefId: r.source_ref_id,
      titleFa: r.payload_json.titleFa,
      issuedAtJalali: r.payload_json.issuedAtJalali,
      sourceSha256: r.source_sha256,
      pdfSha256: r.pdf_sha256,
      payload: r.payload_json,
      createdAtIso: r.created_at.toISOString(),
    };
  }
}
