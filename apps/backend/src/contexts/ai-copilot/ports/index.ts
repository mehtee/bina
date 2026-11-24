import type { EvidencePacketInput, ValidatedPersianReportDraft } from "../domain/report-schema.js";

export interface GeneratedPersianReportOutput {
  readonly modelProvider: string;
  readonly modelId: string;
  readonly draft: ValidatedPersianReportDraft;
  readonly usedFallback: boolean;
  readonly validationErrors: readonly string[];
}

export interface PersianReportGeneratorPort {
  generateReportDraft(packet: EvidencePacketInput): Promise<GeneratedPersianReportOutput>;
}
