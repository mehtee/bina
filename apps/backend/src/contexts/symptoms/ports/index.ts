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
}
