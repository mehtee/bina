import type { DbTx } from "../../../packages/db/index.js";
import {
  formatLateralityFa,
  URGENCY_LABELS_FA,
  type ClinicalSignal,
  type EyeLaterality,
  type UrgencyTier,
} from "../../../packages/domain-kernel/index.js";
import { formatJalaliDate } from "../../tenancy/index.js";
import type {
  EpisodeSummaryForSymptom,
  EpisodeSymptomHistoryItem,
  StoredSymptomReport,
  SymptomRepoPort,
} from "../ports/index.js";

export class PgSymptomRepo implements SymptomRepoPort {
  async findEpisodeContext(tx: DbTx, episodeId: string): Promise<EpisodeSummaryForSymptom | null> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      patient_id: string;
      eye_laterality: EyeLaterality;
    }>(
      `SELECT id, tenant_id, clinic_id, patient_id, eye_laterality
       FROM care_episodes WHERE id = $1`,
      [episodeId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      episodeId: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      patientId: r.patient_id,
      eyeLaterality: r.eye_laterality,
    };
  }

  async insertReportIdempotent(
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
  ): Promise<StoredSymptomReport> {
    const ins = await tx.query<{
      id: string;
      urgency_tier: UrgencyTier;
      signals_json: ClinicalSignal[];
    }>(
      `INSERT INTO symptom_reports
        (tenant_id, episode_id, eye_laterality, severe_pain, sudden_vision_loss, purulent_discharge, flashes_or_curtain, free_text_fa, urgency_tier, signals_json, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
       ON CONFLICT (tenant_id, episode_id, idempotency_key) DO NOTHING
       RETURNING id, urgency_tier, signals_json`,
      [
        input.tenantId,
        input.episodeId,
        input.eyeLaterality,
        input.severePain,
        input.suddenVisionLoss,
        input.purulentDischarge,
        input.flashesOrCurtain,
        input.freeTextFa,
        input.urgencyTier,
        JSON.stringify(input.signals),
        input.idempotencyKey,
      ]
    );

    if (ins.rows[0]) {
      const r = ins.rows[0];
      return {
        reportId: r.id,
        urgencyTier: r.urgency_tier,
        urgencyLabelFa: URGENCY_LABELS_FA[r.urgency_tier],
        signals: r.signals_json,
        deduplicated: false,
      };
    }

    const existing = await tx.query<{
      id: string;
      urgency_tier: UrgencyTier;
      signals_json: ClinicalSignal[];
    }>(
      `SELECT id, urgency_tier, signals_json
       FROM symptom_reports
       WHERE episode_id = $1 AND idempotency_key = $2`,
      [input.episodeId, input.idempotencyKey]
    );
    const r = existing.rows[0]!;
    return {
      reportId: r.id,
      urgencyTier: r.urgency_tier,
      urgencyLabelFa: URGENCY_LABELS_FA[r.urgency_tier],
      signals: r.signals_json,
      deduplicated: true,
    };
  }

  async listByEpisode(tx: DbTx, episodeId: string): Promise<EpisodeSymptomHistoryItem[]> {
    const res = await tx.query<{
      id: string;
      episode_id: string;
      eye_laterality: EyeLaterality;
      severe_pain: boolean;
      sudden_vision_loss: boolean;
      purulent_discharge: boolean;
      flashes_or_curtain: boolean;
      free_text_fa: string;
      urgency_tier: UrgencyTier;
      signals_json: ClinicalSignal[];
      created_at: Date;
    }>(
      `SELECT id, episode_id, eye_laterality, severe_pain, sudden_vision_loss, purulent_discharge, flashes_or_curtain,
              free_text_fa, urgency_tier, signals_json, created_at
       FROM symptom_reports
       WHERE episode_id = $1
       ORDER BY created_at DESC`,
      [episodeId]
    );
    return res.rows.map((r) => ({
      reportId: r.id,
      episodeId: r.episode_id,
      eyeLaterality: r.eye_laterality,
      eyeLabelFa: formatLateralityFa(r.eye_laterality),
      severePain: r.severe_pain,
      suddenVisionLoss: r.sudden_vision_loss,
      purulentDischarge: r.purulent_discharge,
      flashesOrCurtain: r.flashes_or_curtain,
      freeTextFa: r.free_text_fa,
      urgencyTier: r.urgency_tier,
      urgencyLabelFa: URGENCY_LABELS_FA[r.urgency_tier],
      signals: r.signals_json ?? [],
      createdAtIso: r.created_at.toISOString(),
      createdAtJalali: formatJalaliDate(r.created_at),
    }));
  }
}
