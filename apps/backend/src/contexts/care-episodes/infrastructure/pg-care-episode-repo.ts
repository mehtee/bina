import type { DbTx } from "../../../packages/db/index.js";
import { formatLateralityFa, type EyeLaterality } from "../../../packages/domain-kernel/index.js";
import type {
  AdherenceEventRecord,
  AdherenceState,
  CareEpisodeRecord,
  CareEpisodeRepoPort,
  DropItem,
  PrescriptionVersionRecord,
} from "../ports/index.js";

interface EpisodeRow {
  id: string;
  tenant_id: string;
  clinic_id: string;
  patient_id: string;
  protocol_type: string;
  eye_laterality: EyeLaterality;
  surgeon_id: string;
  access_mode: "app" | "caregiver" | "print_phone";
  active_prescription_version: number;
  status: "active" | "completed" | "cancelled";
  anchor_at: Date;
}

function mapEpisodeRow(r: EpisodeRow): CareEpisodeRecord {
  return {
    episodeId: r.id,
    tenantId: r.tenant_id,
    clinicId: r.clinic_id,
    patientId: r.patient_id,
    protocolType: r.protocol_type,
    eyeLaterality: r.eye_laterality,
    eyeLabelFa: formatLateralityFa(r.eye_laterality),
    surgeonId: r.surgeon_id,
    accessMode: r.access_mode,
    activePrescriptionVersion: r.active_prescription_version,
    status: r.status,
    anchorAt: r.anchor_at,
  };
}

export class PgCareEpisodeRepo implements CareEpisodeRepoPort {
  async createEpisode(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      patientId: string;
      protocolType: string;
      eyeLaterality: EyeLaterality;
      surgeonId: string;
      accessMode: "app" | "caregiver" | "print_phone";
      anchorAt: Date;
    }
  ): Promise<CareEpisodeRecord> {
    const res = await tx.query<EpisodeRow>(
      `INSERT INTO care_episodes
        (tenant_id, clinic_id, patient_id, protocol_type, eye_laterality, surgeon_id, access_mode, anchor_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
       RETURNING id, tenant_id, clinic_id, patient_id, protocol_type, eye_laterality, surgeon_id, access_mode, active_prescription_version, status, anchor_at`,
      [
        input.tenantId,
        input.clinicId,
        input.patientId,
        input.protocolType,
        input.eyeLaterality,
        input.surgeonId,
        input.accessMode,
        input.anchorAt.toISOString(),
      ]
    );
    return mapEpisodeRow(res.rows[0]!);
  }

  async findEpisodeById(tx: DbTx, episodeId: string): Promise<CareEpisodeRecord | null> {
    const res = await tx.query<EpisodeRow>(
      `SELECT id, tenant_id, clinic_id, patient_id, protocol_type, eye_laterality, surgeon_id, access_mode, active_prescription_version, status, anchor_at
       FROM care_episodes WHERE id = $1`,
      [episodeId]
    );
    return res.rows[0] ? mapEpisodeRow(res.rows[0]) : null;
  }

  async insertPrescriptionVersion(
    tx: DbTx,
    input: {
      tenantId: string;
      episodeId: string;
      eyeLaterality: EyeLaterality;
      version: number;
      items: DropItem[];
      reasonFa: string;
      publishedByUserId: string;
    }
  ): Promise<PrescriptionVersionRecord> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      episode_id: string;
      version: number;
      eye_laterality: EyeLaterality;
      items_json: DropItem[];
      reason_fa: string;
      published_by_user_id: string;
      published_at: Date;
    }>(
      `INSERT INTO prescription_versions
        (tenant_id, episode_id, eye_laterality, version, items_json, reason_fa, published_by_user_id)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       RETURNING id, tenant_id, episode_id, version, eye_laterality, items_json, reason_fa, published_by_user_id, published_at`,
      [
        input.tenantId,
        input.episodeId,
        input.eyeLaterality,
        input.version,
        JSON.stringify(input.items),
        input.reasonFa,
        input.publishedByUserId,
      ]
    );
    await tx.query(
      `UPDATE care_episodes SET active_prescription_version = $2 WHERE id = $1`,
      [input.episodeId, input.version]
    );

    const r = res.rows[0]!;
    return {
      prescriptionId: r.id,
      tenantId: r.tenant_id,
      episodeId: r.episode_id,
      version: r.version,
      eyeLaterality: r.eye_laterality,
      eyeLabelFa: formatLateralityFa(r.eye_laterality),
      items: r.items_json,
      reasonFa: r.reason_fa,
      publishedByUserId: r.published_by_user_id,
      publishedAt: r.published_at,
    };
  }

  async listActiveEpisodesWithLatestRx(
    tx: DbTx,
    patientId: string
  ): Promise<Array<{ episode: CareEpisodeRecord; prescription: PrescriptionVersionRecord | null }>> {
    const epRes = await tx.query<EpisodeRow>(
      `SELECT id, tenant_id, clinic_id, patient_id, protocol_type, eye_laterality, surgeon_id, access_mode, active_prescription_version, status, anchor_at
       FROM care_episodes
       WHERE patient_id = $1 AND status = 'active'
       ORDER BY created_at ASC`,
      [patientId]
    );

    const output: Array<{ episode: CareEpisodeRecord; prescription: PrescriptionVersionRecord | null }> = [];
    for (const row of epRes.rows) {
      const episode = mapEpisodeRow(row);
      let prescription: PrescriptionVersionRecord | null = null;
      if (episode.activePrescriptionVersion > 0) {
        const rxRes = await tx.query<{
          id: string;
          tenant_id: string;
          episode_id: string;
          version: number;
          eye_laterality: EyeLaterality;
          items_json: DropItem[];
          reason_fa: string;
          published_by_user_id: string;
          published_at: Date;
        }>(
          `SELECT id, tenant_id, episode_id, version, eye_laterality, items_json, reason_fa, published_by_user_id, published_at
           FROM prescription_versions
           WHERE episode_id = $1 AND version = $2`,
          [episode.episodeId, episode.activePrescriptionVersion]
        );
        const rx = rxRes.rows[0];
        if (rx) {
          prescription = {
            prescriptionId: rx.id,
            tenantId: rx.tenant_id,
            episodeId: rx.episode_id,
            version: rx.version,
            eyeLaterality: rx.eye_laterality,
            eyeLabelFa: formatLateralityFa(rx.eye_laterality),
            items: rx.items_json,
            reasonFa: rx.reason_fa,
            publishedByUserId: rx.published_by_user_id,
            publishedAt: rx.published_at,
          };
        }
      }
      output.push({ episode, prescription });
    }
    return output;
  }

  async insertAdherenceIdempotent(
    tx: DbTx,
    input: {
      tenantId: string;
      episodeId: string;
      eyeLaterality: EyeLaterality;
      prescriptionVersion: number;
      state: AdherenceState;
      reasonFa?: string | undefined;
      idempotencyKey: string;
      occurredAt: Date;
    }
  ): Promise<AdherenceEventRecord> {
    const ins = await tx.query<{
      id: string;
      episode_id: string;
      eye_laterality: EyeLaterality;
      prescription_version: number;
      state: AdherenceState;
      reason_fa: string | null;
      recorded_at: Date;
    }>(
      `INSERT INTO medication_adherence_events
        (tenant_id, episode_id, eye_laterality, prescription_version, state, reason_fa, idempotency_key, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
       ON CONFLICT (tenant_id, episode_id, idempotency_key) DO NOTHING
       RETURNING id, episode_id, eye_laterality, prescription_version, state, reason_fa, recorded_at`,
      [
        input.tenantId,
        input.episodeId,
        input.eyeLaterality,
        input.prescriptionVersion,
        input.state,
        input.reasonFa ?? null,
        input.idempotencyKey,
        input.occurredAt.toISOString(),
      ]
    );

    if (ins.rows[0]) {
      const r = ins.rows[0];
      return {
        eventId: r.id,
        episodeId: r.episode_id,
        eyeLaterality: r.eye_laterality,
        prescriptionVersion: r.prescription_version,
        state: r.state,
        reasonFa: r.reason_fa ?? undefined,
        deduplicated: false,
        recordedAt: r.recorded_at,
      };
    }

    const existing = await tx.query<{
      id: string;
      episode_id: string;
      eye_laterality: EyeLaterality;
      prescription_version: number;
      state: AdherenceState;
      reason_fa: string | null;
      recorded_at: Date;
    }>(
      `SELECT id, episode_id, eye_laterality, prescription_version, state, reason_fa, recorded_at
       FROM medication_adherence_events
       WHERE episode_id = $1 AND idempotency_key = $2`,
      [input.episodeId, input.idempotencyKey]
    );
    const r = existing.rows[0]!;
    return {
      eventId: r.id,
      episodeId: r.episode_id,
      eyeLaterality: r.eye_laterality,
      prescriptionVersion: r.prescription_version,
      state: r.state,
      reasonFa: r.reason_fa ?? undefined,
      deduplicated: true,
      recordedAt: r.recorded_at,
    };
  }
}
