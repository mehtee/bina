import type { DbTx } from "../../../packages/db/index.js";
import type { ClinicalSignal, EyeLaterality, UrgencyTier } from "../../../packages/domain-kernel/index.js";

export interface EpisodeSummaryForSymptom {
  readonly episodeId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly eyeLaterality: EyeLaterality;
}

export interface StoredSymptomReport {
  readonly reportId: string;
  readonly urgencyTier: UrgencyTier;
  readonly urgencyLabelFa: string;
  readonly signals: ClinicalSignal[];
  readonly deduplicated: boolean;
}

export interface EpisodeSymptomHistoryItem {
  readonly reportId: string;
  readonly episodeId: string;
  readonly eyeLaterality: EyeLaterality;
  readonly eyeLabelFa: string;
  readonly severePain: boolean;
  readonly suddenVisionLoss: boolean;
  readonly purulentDischarge: boolean;
  readonly flashesOrCurtain: boolean;
  readonly freeTextFa: string;
  readonly urgencyTier: UrgencyTier;
  readonly urgencyLabelFa: string;
  readonly signals: ClinicalSignal[];
  readonly createdAtIso: string;
  readonly createdAtJalali: string;
}

export interface SymptomRepoPort {
  findEpisodeContext(tx: DbTx, episodeId: string): Promise<EpisodeSummaryForSymptom | null>;
  insertReportIdempotent(
    tx: DbTx,
    input: {
      tenantId: string;
      episodeId: string;
      eyeLaterality: EyeLaterality;
      severePain: boolean;
      suddenVisionLoss: boolean;
      purulentDischarge: boolean;
      flashesOrCurtain: boolean;
      freeTextFa: string;
      urgencyTier: UrgencyTier;
      signals: ClinicalSignal[];
      idempotencyKey: string;
    }
  ): Promise<StoredSymptomReport>;
  listByEpisode(tx: DbTx, episodeId: string): Promise<EpisodeSymptomHistoryItem[]>;
}
