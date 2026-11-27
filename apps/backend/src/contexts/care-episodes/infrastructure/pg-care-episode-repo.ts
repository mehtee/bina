import type { DbTx } from "../../../packages/db/index.js";
import { formatLateralityFa, type EyeLaterality } from "../../../packages/domain-kernel/index.js";
import { formatJalaliDate } from "../../tenancy/index.js";
import type {
  AdherenceEventRecord,
  AdherenceState,
  CareEpisodeRecord,
  CareEpisodeRepoPort,
  CareEpisodeWorklistFilter,
  CareEpisodeWorklistItem,
  DropItem,
  PrescriptionVersionRecord,
  PrintPhoneOutreachRecord,
  PrintPhoneQueueItem,
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

  async listClinicEpisodes(
    tx: DbTx,
    filter: CareEpisodeWorklistFilter
  ): Promise<{ items: CareEpisodeWorklistItem[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const push = (v: unknown): string => {
      params.push(v);
      return `$${params.length}`;
    };

    if (filter.clinicId) conditions.push(`ce.clinic_id = ${push(filter.clinicId)}`);
    if (filter.patientId) conditions.push(`ce.patient_id = ${push(filter.patientId)}`);
    if (filter.status) conditions.push(`ce.status = ${push(filter.status)}`);
    if (filter.eyeLaterality) conditions.push(`ce.eye_laterality = ${push(filter.eyeLaterality)}`);
    if (filter.accessMode) conditions.push(`ce.access_mode = ${push(filter.accessMode)}`);
    if (filter.protocolType) conditions.push(`ce.protocol_type = ${push(filter.protocolType)}`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRes = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt FROM care_episodes ce ${whereClause}`,
      params
    );
    const total = Number(countRes.rows[0]?.cnt ?? "0");

    const limitP = push(filter.limit);
    const offsetP = push(filter.offset);

    const rowsRes = await tx.query<
      EpisodeRow & {
        full_name_fa: string;
        phone_masked: string;
      }
    >(
      `SELECT ce.id, ce.tenant_id, ce.clinic_id, ce.patient_id, ce.protocol_type, ce.eye_laterality,
              ce.surgeon_id, ce.access_mode, ce.active_prescription_version, ce.status, ce.anchor_at,
              p.full_name_fa, p.phone_masked
       FROM care_episodes ce
       JOIN patients p ON p.id = ce.patient_id
       ${whereClause}
       ORDER BY CASE ce.status WHEN 'active' THEN 0 ELSE 1 END ASC, ce.created_at DESC
       LIMIT ${limitP} OFFSET ${offsetP}`,
      params
    );

    const items: CareEpisodeWorklistItem[] = rowsRes.rows.map((r) => ({
      episodeId: r.id,
      clinicId: r.clinic_id,
      patientId: r.patient_id,
      patientNameFa: r.full_name_fa,
      phoneMasked: r.phone_masked,
      protocolType: r.protocol_type,
      eyeLaterality: r.eye_laterality,
      eyeLabelFa: formatLateralityFa(r.eye_laterality),
      surgeonId: r.surgeon_id,
      accessMode: r.access_mode,
      activePrescriptionVersion: r.active_prescription_version,
      status: r.status,
      anchorAtIso: r.anchor_at.toISOString(),
      anchorAtJalali: formatJalaliDate(r.anchor_at),
    }));

    return { items, total };
  }

  async closeEpisode(
    tx: DbTx,
    episodeId: string,
    status: "completed" | "cancelled"
  ): Promise<CareEpisodeRecord | null> {
    const res = await tx.query<EpisodeRow>(
      `UPDATE care_episodes
       SET status = $2
       WHERE id = $1
       RETURNING id, tenant_id, clinic_id, patient_id, protocol_type, eye_laterality, surgeon_id, access_mode, active_prescription_version, status, anchor_at`,
      [episodeId, status]
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

  async listPrescriptionHistory(tx: DbTx, episodeId: string): Promise<PrescriptionVersionRecord[]> {
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
      `SELECT id, tenant_id, episode_id, version, eye_laterality, items_json, reason_fa, published_by_user_id, published_at
       FROM prescription_versions
       WHERE episode_id = $1
       ORDER BY version ASC`,
      [episodeId]
    );
    return res.rows.map((rx) => ({
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
    }));
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

  async listAdherenceEvents(tx: DbTx, episodeId: string, limit: number): Promise<AdherenceEventRecord[]> {
    const res = await tx.query<{
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
       WHERE episode_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2`,
      [episodeId, limit]
    );
    return res.rows.map((r) => ({
      eventId: r.id,
      episodeId: r.episode_id,
      eyeLaterality: r.eye_laterality,
      prescriptionVersion: r.prescription_version,
      state: r.state,
      reasonFa: r.reason_fa ?? undefined,
      deduplicated: false,
      recordedAt: r.recorded_at,
    }));
  }

  async listPrintPhoneQueue(tx: DbTx, clinicId: string): Promise<PrintPhoneQueueItem[]> {
    const res = await tx.query<{
      episode_id: string;
      patient_id: string;
      full_name_fa: string;
      phone_masked: string;
      eye_laterality: EyeLaterality;
      active_prescription_version: number;
      pending_cnt: string;
      last_outreach_at: Date | null;
      last_outcome_fa: string | null;
    }>(
      `SELECT ce.id AS episode_id,
              ce.patient_id,
              p.full_name_fa,
              p.phone_masked,
              ce.eye_laterality,
              ce.active_prescription_version,
              (SELECT count(*)::text FROM follow_up_tasks ft WHERE ft.episode_id = ce.id AND ft.task_type = 'print_phone_checkin' AND ft.status = 'pending') AS pending_cnt,
              (SELECT ft2.completed_at FROM follow_up_tasks ft2 WHERE ft2.episode_id = ce.id AND ft2.task_type = 'print_phone_checkin' AND ft2.status = 'completed' ORDER BY ft2.completed_at DESC LIMIT 1) AS last_outreach_at,
              (SELECT ft3.outcome_fa FROM follow_up_tasks ft3 WHERE ft3.episode_id = ce.id AND ft3.task_type = 'print_phone_checkin' ORDER BY ft3.updated_at DESC LIMIT 1) AS last_outcome_fa
       FROM care_episodes ce
       JOIN patients p ON p.id = ce.patient_id
       WHERE ce.clinic_id = $1 AND ce.access_mode = 'print_phone' AND ce.status = 'active'
       ORDER BY ce.created_at DESC`,
      [clinicId]
    );
    return res.rows.map((r) => ({
      episodeId: r.episode_id,
      patientId: r.patient_id,
      patientNameFa: r.full_name_fa,
      phoneMasked: r.phone_masked,
      eyeLaterality: r.eye_laterality,
      eyeLabelFa: formatLateralityFa(r.eye_laterality),
      activePrescriptionVersion: r.active_prescription_version,
      pendingTaskCount: Number(r.pending_cnt),
      lastOutreachAtIso: r.last_outreach_at ? r.last_outreach_at.toISOString() : null,
      lastOutreachOutcomeFa: r.last_outcome_fa,
    }));
  }

  async recordPrintPhoneOutreach(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      patientId: string;
      episodeId: string;
      eyeLaterality: EyeLaterality;
      staffUserId: string;
      status: "completed" | "pending" | "missed";
      outcomeFa: string;
    }
  ): Promise<PrintPhoneOutreachRecord> {
    const res = await tx.query<{
      id: string;
      episode_id: string;
      patient_id: string;
      status: "completed" | "pending" | "missed";
      outcome_fa: string;
      updated_at: Date;
    }>(
      `INSERT INTO follow_up_tasks
         (tenant_id, clinic_id, patient_id, episode_id, eye_laterality, task_type, due_at, status, assigned_user_id, outcome_fa, completed_at)
       VALUES ($1, $2, $3, $4, $5, 'print_phone_checkin', now(), $6, $7, $8, CASE WHEN $6 = 'completed' THEN now() ELSE NULL END)
       RETURNING id, episode_id, patient_id, status, outcome_fa, updated_at`,
      [
        input.tenantId,
        input.clinicId,
        input.patientId,
        input.episodeId,
        input.eyeLaterality,
        input.status,
        input.staffUserId,
        input.outcomeFa,
      ]
    );
    const r = res.rows[0]!;
    return {
      taskId: r.id,
      episodeId: r.episode_id,
      patientId: r.patient_id,
      status: r.status,
      outcomeFa: r.outcome_fa,
      recordedAtIso: r.updated_at.toISOString(),
    };
  }
}
