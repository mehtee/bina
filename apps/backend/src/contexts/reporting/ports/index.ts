import type { DbTx } from "../../../packages/db/index.js";

export type ReportType = "patient_schedule" | "postop_closure" | "signed_diagnostic";

export interface ReportSection {
  readonly headingFa: string;
  readonly linesFa: string[];
}

export interface PersianPdfDocumentPayload {
  readonly reportType: ReportType;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly sourceRefId: string;
  readonly clinicNameFa: string;
  readonly issuedAtJalali: string;
  readonly titleFa: string;
  readonly emergencyHotlinePhone: string;
  readonly sections: ReportSection[];
}

export interface GeneratedReportRecord {
  readonly reportId: string;
  readonly reportType: ReportType;
  readonly sourceRefId: string;
  readonly sourceSha256: string;
  readonly pdfSha256: string;
  readonly payload: PersianPdfDocumentPayload;
  readonly pdfBuffer: Buffer;
}

export interface ReportingRepoPort {
  saveReportVersion(
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
  ): Promise<string>;
  findReportPayloadById(tx: DbTx, reportId: string): Promise<{
    reportId: string;
    reportType: ReportType;
    sourceRefId: string;
    sourceSha256: string;
    pdfSha256: string;
    payload: PersianPdfDocumentPayload;
  } | null>;
}
