import type { DbTx } from "../../../packages/db/index.js";
import {
  formatLateralityFa,
  maxUrgency,
  URGENCY_LABELS_FA,
  type EyeLaterality,
  type StudyLaterality,
  type UrgencyTier,
} from "../../../packages/domain-kernel/index.js";
import { formatJalaliDate } from "../../tenancy/index.js";
import { computeSlaDueAt, type TriageStatus } from "../domain/sla.js";
import type {
  ClinicOutageRecord,
  CreateOrEscalateTriageInput,
  FollowUpTaskRecord,
  FollowUpTaskStatus,
  FollowUpTaskType,
  OutageChannel,
  OutageSeverity,
  OutageStatus,
  ReferralRecord,
  TriageCaseDetailView,
  TriageCaseFilter,
  TriageCaseRecord,
  TriageContactHistoryItem,
  TriageContactLogEntry,
  TriageRepoPort,
  TriageSourcePillar,
  TriageTriggerRecord,
} from "../ports/index.js";

interface TriageRow {
  id: string;
  tenant_id: string;
  clinic_id: string;
  patient_id: string;
  patient_name_fa?: string | null;
  source_pillar: TriageSourcePillar;
  source_ref_id: string | null;
  eye_laterality: StudyLaterality;
  status: TriageStatus;
  urgency_tier: UrgencyTier;
  owner_id: string | null;
  sla_due_at: Date;
  resolution_note_fa: string | null;
  closed_at: Date | null;
  contact_log_json: TriageContactLogEntry[] | null;
  created_at: Date;
  updated_at: Date;
}

const TRIAGE_SELECT_COLS = `
  id, tenant_id, clinic_id, patient_id, source_pillar, source_ref_id,
  eye_laterality, status, urgency_tier, owner_id, sla_due_at,
  resolution_note_fa, closed_at, contact_log_json, created_at, updated_at
`;

function mapTriageRow(r: TriageRow): TriageCaseRecord {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    clinicId: r.clinic_id,
    patientId: r.patient_id,
    patientNameFa: r.patient_name_fa ?? undefined,
    sourcePillar: r.source_pillar,
    sourceRefId: r.source_ref_id ?? undefined,
    eyeLaterality: r.eye_laterality,
    eyeLabelFa: formatLateralityFa(r.eye_laterality),
    status: r.status,
    urgencyTier: r.urgency_tier,
    urgencyLabelFa: URGENCY_LABELS_FA[r.urgency_tier],
    ownerId: r.owner_id,
    slaDueAt: r.sla_due_at,
    resolutionNoteFa: r.resolution_note_fa,
    closedAt: r.closed_at,
    contactLog: r.contact_log_json ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface OutageRow {
  id: string;
  tenant_id: string;
  clinic_id: string;
  title_fa: string;
  status: OutageStatus;
  severity: OutageSeverity;
  affected_channel: OutageChannel;
  mitigation_note_fa: string;
  started_at: Date;
  resolved_at: Date | null;
  created_by_user_id: string;
  created_at: Date;
}

function mapOutageRow(r: OutageRow): ClinicOutageRecord {
  return {
    outageId: r.id,
    tenantId: r.tenant_id,
    clinicId: r.clinic_id,
    titleFa: r.title_fa,
    status: r.status,
    severity: r.severity,
    affectedChannel: r.affected_channel,
    mitigationNoteFa: r.mitigation_note_fa,
    startedAtIso: r.started_at.toISOString(),
    resolvedAtIso: r.resolved_at ? r.resolved_at.toISOString() : null,
    createdByUserId: r.created_by_user_id,
    createdAtIso: r.created_at.toISOString(),
  };
}

interface FollowUpRow {
  id: string;
  tenant_id: string;
  clinic_id: string;
  patient_id: string;
  patient_name_fa?: string | null;
  episode_id: string | null;
  triage_case_id: string | null;
  eye_laterality: StudyLaterality | null;
  task_type: FollowUpTaskType;
  due_at: Date;
  status: FollowUpTaskStatus;
  assigned_user_id: string | null;
  outcome_fa: string | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapFollowUpRow(r: FollowUpRow): FollowUpTaskRecord {
  return {
    taskId: r.id,
    tenantId: r.tenant_id,
    clinicId: r.clinic_id,
    patientId: r.patient_id,
    patientNameFa: r.patient_name_fa ?? undefined,
    episodeId: r.episode_id,
    triageCaseId: r.triage_case_id,
    eyeLaterality: r.eye_laterality,
    eyeLabelFa: r.eye_laterality ? formatLateralityFa(r.eye_laterality) : null,
    taskType: r.task_type,
    dueAtIso: r.due_at.toISOString(),
    dueAtJalali: formatJalaliDate(r.due_at),
    status: r.status,
    assignedUserId: r.assigned_user_id,
    outcomeFa: r.outcome_fa,
    completedAtIso: r.completed_at ? r.completed_at.toISOString() : null,
    createdAtIso: r.created_at.toISOString(),
    updatedAtIso: r.updated_at.toISOString(),
  };
}

export class PgTriageRepo implements TriageRepoPort {
  async createOrEscalateCase(tx: DbTx, input: CreateOrEscalateTriageInput): Promise<TriageCaseRecord> {
    const now = input.now ?? new Date();
    const existing = await tx.query<TriageRow>(
      `SELECT ${TRIAGE_SELECT_COLS}
       FROM triage_cases
       WHERE patient_id = $1 AND source_pillar = $2 AND eye_laterality = $3 AND status <> 'Closed'
       ORDER BY created_at DESC LIMIT 1`,
      [input.patientId, input.sourcePillar, input.eyeLaterality]
    );

    let caseRow: TriageRow;
    if (existing.rows[0]) {
      const current = existing.rows[0];
      const escalatedUrgency = maxUrgency(current.urgency_tier, input.urgencyTier);
      const proposedDueAt = computeSlaDueAt(escalatedUrgency, now);
      const tightenedDueAt =
        proposedDueAt.getTime() < current.sla_due_at.getTime() ? proposedDueAt : current.sla_due_at;
      const nextStatus: TriageStatus =
        escalatedUrgency === "urgent" && current.status !== "Referred" ? "Escalated" : current.status;

      const updated = await tx.query<TriageRow>(
        `UPDATE triage_cases
         SET urgency_tier = $2,
             status = $3,
             sla_due_at = $4::timestamptz,
             source_ref_id = COALESCE($5, source_ref_id),
             updated_at = $6::timestamptz
         WHERE id = $1
         RETURNING ${TRIAGE_SELECT_COLS}`,
        [
          current.id,
          escalatedUrgency,
          nextStatus,
          tightenedDueAt.toISOString(),
          input.sourceRefId ?? null,
          now.toISOString(),
        ]
      );
      caseRow = updated.rows[0]!;
    } else {
      const slaDueAt = computeSlaDueAt(input.urgencyTier, now);
      const inserted = await tx.query<TriageRow>(
        `INSERT INTO triage_cases
          (tenant_id, clinic_id, patient_id, source_pillar, source_ref_id, eye_laterality, status, urgency_tier, sla_due_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'New', $7, $8::timestamptz, $9::timestamptz, $9::timestamptz)
         RETURNING ${TRIAGE_SELECT_COLS}`,
        [
          input.tenantId,
          input.clinicId,
          input.patientId,
          input.sourcePillar,
          input.sourceRefId ?? null,
          input.eyeLaterality,
          input.urgencyTier,
          slaDueAt.toISOString(),
          now.toISOString(),
        ]
      );
      caseRow = inserted.rows[0]!;
    }

    await tx.query(
      `INSERT INTO triage_triggers (tenant_id, case_id, rule_code, summary_fa, created_at)
       VALUES ($1, $2, $3, $4, $5::timestamptz)`,
      [input.tenantId, caseRow.id, input.ruleCode, input.summaryFa, now.toISOString()]
    );

    return mapTriageRow(caseRow);
  }

  async findById(tx: DbTx, caseId: string): Promise<TriageCaseRecord | null> {
    const res = await tx.query<TriageRow>(
      `SELECT ${TRIAGE_SELECT_COLS} FROM triage_cases WHERE id = $1`,
      [caseId]
    );
    return res.rows[0] ? mapTriageRow(res.rows[0]) : null;
  }

  async listCases(tx: DbTx): Promise<TriageCaseRecord[]> {
    const res = await tx.query<TriageRow>(
      `SELECT ${TRIAGE_SELECT_COLS}
       FROM triage_cases
       ORDER BY CASE urgency_tier WHEN 'urgent' THEN 0 WHEN 'followup_3_6m' THEN 1 ELSE 2 END ASC,
                sla_due_at ASC`
    );
    return res.rows.map(mapTriageRow);
  }

  async listCasesFiltered(
    tx: DbTx,
    filter: TriageCaseFilter
  ): Promise<{ items: TriageCaseRecord[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const push = (v: unknown): string => {
      params.push(v);
      return `$${params.length}`;
    };

    if (filter.clinicId) conditions.push(`tc.clinic_id = ${push(filter.clinicId)}`);
    if (filter.status) conditions.push(`tc.status = ${push(filter.status)}`);
    if (filter.urgencyTier) conditions.push(`tc.urgency_tier = ${push(filter.urgencyTier)}`);
    if (filter.sourcePillar) conditions.push(`tc.source_pillar = ${push(filter.sourcePillar)}`);
    if (filter.eyeLaterality) conditions.push(`tc.eye_laterality = ${push(filter.eyeLaterality)}`);
    if (filter.ownerId) conditions.push(`tc.owner_id = ${push(filter.ownerId)}`);
    if (filter.unassignedOnly) conditions.push(`tc.owner_id IS NULL`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRes = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt FROM triage_cases tc ${whereClause}`,
      params
    );
    const total = Number(countRes.rows[0]?.cnt ?? "0");

    const limitP = push(filter.limit);
    const offsetP = push(filter.offset);

    const rowsRes = await tx.query<TriageRow>(
      `SELECT tc.id, tc.tenant_id, tc.clinic_id, tc.patient_id, p.full_name_fa AS patient_name_fa,
              tc.source_pillar, tc.source_ref_id, tc.eye_laterality, tc.status, tc.urgency_tier,
              tc.owner_id, tc.sla_due_at, tc.resolution_note_fa, tc.closed_at, tc.contact_log_json,
              tc.created_at, tc.updated_at
       FROM triage_cases tc
       JOIN patients p ON p.id = tc.patient_id
       ${whereClause}
       ORDER BY CASE tc.status WHEN 'Closed' THEN 1 ELSE 0 END ASC,
                CASE tc.urgency_tier WHEN 'urgent' THEN 0 WHEN 'followup_3_6m' THEN 1 ELSE 2 END ASC,
                tc.sla_due_at ASC
       LIMIT ${limitP} OFFSET ${offsetP}`,
      params
    );

    return { items: rowsRes.rows.map(mapTriageRow), total };
  }

  async getCaseDetail(tx: DbTx, caseId: string): Promise<TriageCaseDetailView | null> {
    const cRes = await tx.query<TriageRow>(
      `SELECT tc.id, tc.tenant_id, tc.clinic_id, tc.patient_id, p.full_name_fa AS patient_name_fa,
              tc.source_pillar, tc.source_ref_id, tc.eye_laterality, tc.status, tc.urgency_tier,
              tc.owner_id, tc.sla_due_at, tc.resolution_note_fa, tc.closed_at, tc.contact_log_json,
              tc.created_at, tc.updated_at
       FROM triage_cases tc
       JOIN patients p ON p.id = tc.patient_id
       WHERE tc.id = $1`,
      [caseId]
    );
    const row = cRes.rows[0];
    if (!row) return null;

    const trigRes = await tx.query<{
      id: string;
      case_id: string;
      rule_code: string;
      summary_fa: string;
      created_at: Date;
    }>(
      `SELECT id, case_id, rule_code, summary_fa, created_at
       FROM triage_triggers WHERE case_id = $1 ORDER BY created_at DESC`,
      [caseId]
    );
    const triggers: TriageTriggerRecord[] = trigRes.rows.map((r) => ({
      triggerId: r.id,
      caseId: r.case_id,
      ruleCode: r.rule_code,
      summaryFa: r.summary_fa,
      createdAtIso: r.created_at.toISOString(),
    }));

    const logRes = await tx.query<{
      id: string;
      case_id: string;
      actor_user_id: string;
      log_type: TriageContactHistoryItem["logType"];
      note_fa: string;
      created_at: Date;
    }>(
      `SELECT id, case_id, actor_user_id, log_type, note_fa, created_at
       FROM contact_logs WHERE case_id = $1 ORDER BY created_at DESC`,
      [caseId]
    );
    const contactLogs: TriageContactHistoryItem[] = logRes.rows.map((r) => ({
      logId: r.id,
      caseId: r.case_id,
      actorUserId: r.actor_user_id,
      logType: r.log_type,
      noteFa: r.note_fa,
      createdAtIso: r.created_at.toISOString(),
    }));

    const refRes = await tx.query<{
      id: string;
      tenant_id: string;
      case_id: string;
      destination_hospital_fa: string;
      reason_fa: string;
      urgent: boolean;
      status: "dispatched" | "attended" | "missed";
      miss_reason_fa: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, tenant_id, case_id, destination_hospital_fa, reason_fa, urgent, status, miss_reason_fa, created_at, updated_at
       FROM referrals WHERE case_id = $1 ORDER BY created_at DESC`,
      [caseId]
    );
    const referrals: ReferralRecord[] = refRes.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      caseId: r.case_id,
      destinationHospitalFa: r.destination_hospital_fa,
      reasonFa: r.reason_fa,
      urgent: r.urgent,
      status: r.status,
      missReasonFa: r.miss_reason_fa ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const ftRes = await tx.query<FollowUpRow>(
      `SELECT id, tenant_id, clinic_id, patient_id, episode_id, triage_case_id, eye_laterality,
              task_type, due_at, status, assigned_user_id, outcome_fa, completed_at, created_at, updated_at
       FROM follow_up_tasks WHERE triage_case_id = $1 ORDER BY due_at ASC`,
      [caseId]
    );

    return {
      triageCase: mapTriageRow(row),
      triggers,
      contactLogs,
      referrals,
      followUpTasks: ftRes.rows.map(mapFollowUpRow),
    };
  }

  async claimCase(tx: DbTx, caseId: string, staffUserId: string, now: Date): Promise<TriageCaseRecord | null> {
    const res = await tx.query<TriageRow>(
      `UPDATE triage_cases
       SET owner_id = $2,
           status = CASE WHEN status = 'New' THEN 'OwnerAssigned' ELSE status END,
           updated_at = $3::timestamptz
       WHERE id = $1 AND (owner_id IS NULL OR owner_id = $2)
       RETURNING ${TRIAGE_SELECT_COLS}`,
      [caseId, staffUserId, now.toISOString()]
    );
    return res.rows[0] ? mapTriageRow(res.rows[0]) : null;
  }

  async handoffCase(
    tx: DbTx,
    caseId: string,
    fromStaffId: string,
    targetStaffUserId: string,
    noteFa: string,
    now: Date
  ): Promise<TriageCaseRecord | null> {
    const res = await tx.query<TriageRow>(
      `UPDATE triage_cases
       SET owner_id = $2,
           status = CASE WHEN status = 'New' THEN 'OwnerAssigned' ELSE status END,
           updated_at = $3::timestamptz
       WHERE id = $1
       RETURNING ${TRIAGE_SELECT_COLS}`,
      [caseId, targetStaffUserId, now.toISOString()]
    );
    const updated = res.rows[0];
    if (!updated) return null;

    await tx.query(
      `INSERT INTO contact_logs (tenant_id, case_id, actor_user_id, log_type, note_fa, created_at)
       VALUES ($1, $2, $3, 'shift_handoff', $4, $5::timestamptz)`,
      [updated.tenant_id, caseId, fromStaffId, noteFa, now.toISOString()]
    );

    return mapTriageRow(updated);
  }

  async recordContactAttempt(
    tx: DbTx,
    input: {
      caseId: string;
      tenantId: string;
      actorUserId: string;
      outcome: "no_answer" | "contacted" | "escalated";
      channel: "phone" | "sms" | "in_person";
      noteFa: string;
      now: Date;
    }
  ): Promise<TriageCaseRecord | null> {
    const nextStatus: TriageStatus =
      input.outcome === "contacted"
        ? "ContactEstablished"
        : input.outcome === "escalated"
          ? "Escalated"
          : "ContactAttempted";

    const logEntry: TriageContactLogEntry = {
      actorUserId: input.actorUserId,
      outcome: input.outcome,
      channel: input.channel,
      noteFa: input.noteFa,
      occurredAtIso: input.now.toISOString(),
    };

    const res = await tx.query<TriageRow>(
      `UPDATE triage_cases
       SET status = CASE WHEN status IN ('Referred', 'Closed') THEN status ELSE $2 END,
           owner_id = COALESCE(owner_id, $3),
           contact_log_json = contact_log_json || $4::jsonb,
           updated_at = $5::timestamptz
       WHERE id = $1
       RETURNING ${TRIAGE_SELECT_COLS}`,
      [
        input.caseId,
        nextStatus,
        input.actorUserId,
        JSON.stringify([logEntry]),
        input.now.toISOString(),
      ]
    );
    const updated = res.rows[0];
    if (!updated) return null;

    await tx.query(
      `INSERT INTO contact_logs (tenant_id, case_id, actor_user_id, log_type, note_fa, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz)`,
      [
        input.tenantId,
        input.caseId,
        input.actorUserId,
        input.outcome === "contacted" ? "contact_established" : "call_attempt",
        input.noteFa,
        input.now.toISOString(),
      ]
    );

    return mapTriageRow(updated);
  }

  async closeCase(
    tx: DbTx,
    caseId: string,
    resolutionNoteFa: string,
    now: Date
  ): Promise<TriageCaseRecord | null> {
    const res = await tx.query<TriageRow>(
      `UPDATE triage_cases
       SET status = 'Closed',
           resolution_note_fa = $2,
           closed_at = $3::timestamptz,
           updated_at = $3::timestamptz
       WHERE id = $1
       RETURNING ${TRIAGE_SELECT_COLS}`,
      [caseId, resolutionNoteFa, now.toISOString()]
    );
    return res.rows[0] ? mapTriageRow(res.rows[0]) : null;
  }

  async countReferralsForCase(tx: DbTx, caseId: string): Promise<number> {
    const res = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt FROM referrals WHERE case_id = $1`,
      [caseId]
    );
    return Number(res.rows[0]?.cnt ?? "0");
  }

  async createReferral(
    tx: DbTx,
    input: {
      tenantId: string;
      caseId: string;
      destinationHospitalFa: string;
      reasonFa: string;
      urgent: boolean;
    }
  ): Promise<ReferralRecord> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      case_id: string;
      destination_hospital_fa: string;
      reason_fa: string;
      urgent: boolean;
      status: "dispatched" | "attended" | "missed";
      miss_reason_fa: string | null;
      created_at: Date;
    }>(
      `INSERT INTO referrals (tenant_id, case_id, destination_hospital_fa, reason_fa, urgent, status)
       VALUES ($1, $2, $3, $4, $5, 'dispatched')
       RETURNING id, tenant_id, case_id, destination_hospital_fa, reason_fa, urgent, status, miss_reason_fa, created_at`,
      [input.tenantId, input.caseId, input.destinationHospitalFa, input.reasonFa, input.urgent]
    );
    await tx.query(`UPDATE triage_cases SET status = 'Referred', updated_at = now() WHERE id = $1`, [input.caseId]);

    const r = res.rows[0]!;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      caseId: r.case_id,
      destinationHospitalFa: r.destination_hospital_fa,
      reasonFa: r.reason_fa,
      urgent: r.urgent,
      status: r.status,
      missReasonFa: r.miss_reason_fa ?? undefined,
      createdAt: r.created_at,
    };
  }

  async listReferrals(
    tx: DbTx,
    filter: {
      clinicId?: string | undefined;
      status?: "dispatched" | "attended" | "missed" | undefined;
      urgentOnly?: boolean | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: ReferralRecord[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const push = (v: unknown): string => {
      params.push(v);
      return `$${params.length}`;
    };

    if (filter.clinicId) conditions.push(`tc.clinic_id = ${push(filter.clinicId)}`);
    if (filter.status) conditions.push(`r.status = ${push(filter.status)}`);
    if (filter.urgentOnly) conditions.push(`r.urgent = true`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRes = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt
       FROM referrals r
       JOIN triage_cases tc ON tc.id = r.case_id
       ${whereClause}`,
      params
    );
    const total = Number(countRes.rows[0]?.cnt ?? "0");

    const limitP = push(filter.limit);
    const offsetP = push(filter.offset);

    const rowsRes = await tx.query<{
      id: string;
      tenant_id: string;
      case_id: string;
      patient_id: string;
      full_name_fa: string;
      eye_laterality: StudyLaterality;
      destination_hospital_fa: string;
      reason_fa: string;
      urgent: boolean;
      status: "dispatched" | "attended" | "missed";
      miss_reason_fa: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT r.id, r.tenant_id, r.case_id, tc.patient_id, p.full_name_fa, tc.eye_laterality,
              r.destination_hospital_fa, r.reason_fa, r.urgent, r.status, r.miss_reason_fa, r.created_at, r.updated_at
       FROM referrals r
       JOIN triage_cases tc ON tc.id = r.case_id
       JOIN patients p ON p.id = tc.patient_id
       ${whereClause}
       ORDER BY CASE r.status WHEN 'dispatched' THEN 0 WHEN 'missed' THEN 1 ELSE 2 END ASC,
                r.urgent DESC, r.created_at DESC
       LIMIT ${limitP} OFFSET ${offsetP}`,
      params
    );

    const items: ReferralRecord[] = rowsRes.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      caseId: r.case_id,
      patientId: r.patient_id,
      patientNameFa: r.full_name_fa,
      eyeLaterality: r.eye_laterality,
      eyeLabelFa: formatLateralityFa(r.eye_laterality),
      destinationHospitalFa: r.destination_hospital_fa,
      reasonFa: r.reason_fa,
      urgent: r.urgent,
      status: r.status,
      missReasonFa: r.miss_reason_fa ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return { items, total };
  }

  async findReferralById(tx: DbTx, referralId: string): Promise<ReferralRecord | null> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      case_id: string;
      patient_id: string;
      full_name_fa: string;
      eye_laterality: StudyLaterality;
      destination_hospital_fa: string;
      reason_fa: string;
      urgent: boolean;
      status: "dispatched" | "attended" | "missed";
      miss_reason_fa: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT r.id, r.tenant_id, r.case_id, tc.patient_id, p.full_name_fa, tc.eye_laterality,
              r.destination_hospital_fa, r.reason_fa, r.urgent, r.status, r.miss_reason_fa, r.created_at, r.updated_at
       FROM referrals r
       JOIN triage_cases tc ON tc.id = r.case_id
       JOIN patients p ON p.id = tc.patient_id
       WHERE r.id = $1`,
      [referralId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      caseId: r.case_id,
      patientId: r.patient_id,
      patientNameFa: r.full_name_fa,
      eyeLaterality: r.eye_laterality,
      eyeLabelFa: formatLateralityFa(r.eye_laterality),
      destinationHospitalFa: r.destination_hospital_fa,
      reasonFa: r.reason_fa,
      urgent: r.urgent,
      status: r.status,
      missReasonFa: r.miss_reason_fa ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  async updateReferralStatus(
    tx: DbTx,
    referralId: string,
    status: "dispatched" | "attended" | "missed",
    missReasonFa?: string | undefined
  ): Promise<ReferralRecord | null> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      case_id: string;
      destination_hospital_fa: string;
      reason_fa: string;
      urgent: boolean;
      status: "dispatched" | "attended" | "missed";
      miss_reason_fa: string | null;
      created_at: Date;
    }>(
      `UPDATE referrals
       SET status = $2,
           miss_reason_fa = $3,
           updated_at = now()
       WHERE id = $1
       RETURNING id, tenant_id, case_id, destination_hospital_fa, reason_fa, urgent, status, miss_reason_fa, created_at`,
      [referralId, status, missReasonFa ?? null]
    );
    const r = res.rows[0];
    if (!r) return null;
    if (status === "attended") {
      await tx.query(`UPDATE triage_cases SET status = 'Closed', closed_at = now(), updated_at = now() WHERE id = $1`, [
        r.case_id,
      ]);
    }
    return {
      id: r.id,
      tenantId: r.tenant_id,
      caseId: r.case_id,
      destinationHospitalFa: r.destination_hospital_fa,
      reasonFa: r.reason_fa,
      urgent: r.urgent,
      status: r.status,
      missReasonFa: r.miss_reason_fa ?? undefined,
      createdAt: r.created_at,
    };
  }

  async listOutages(tx: DbTx, clinicId: string, status?: OutageStatus | undefined): Promise<ClinicOutageRecord[]> {
    const res = await tx.query<OutageRow>(
      status
        ? `SELECT * FROM clinic_outages WHERE clinic_id = $1 AND status = $2 ORDER BY started_at DESC`
        : `SELECT * FROM clinic_outages WHERE clinic_id = $1 ORDER BY started_at DESC`,
      status ? [clinicId, status] : [clinicId]
    );
    return res.rows.map(mapOutageRow);
  }

  async insertOutage(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      titleFa: string;
      severity: OutageSeverity;
      affectedChannel: OutageChannel;
      mitigationNoteFa: string;
      createdByUserId: string;
    }
  ): Promise<ClinicOutageRecord> {
    const res = await tx.query<OutageRow>(
      `INSERT INTO clinic_outages
         (tenant_id, clinic_id, title_fa, severity, affected_channel, mitigation_note_fa, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.tenantId,
        input.clinicId,
        input.titleFa,
        input.severity,
        input.affectedChannel,
        input.mitigationNoteFa,
        input.createdByUserId,
      ]
    );
    return mapOutageRow(res.rows[0]!);
  }

  async updateOutage(
    tx: DbTx,
    outageId: string,
    patch: {
      status?: OutageStatus | undefined;
      severity?: OutageSeverity | undefined;
      mitigationNoteFa?: string | undefined;
    }
  ): Promise<ClinicOutageRecord | null> {
    const cur = await tx.query<OutageRow>(`SELECT * FROM clinic_outages WHERE id = $1`, [outageId]);
    const existing = cur.rows[0];
    if (!existing) return null;

    const nextStatus = patch.status ?? existing.status;
    const res = await tx.query<OutageRow>(
      `UPDATE clinic_outages
       SET status = $2,
           severity = $3,
           mitigation_note_fa = $4,
           resolved_at = CASE WHEN $2 = 'resolved' THEN COALESCE(resolved_at, now()) ELSE NULL END
       WHERE id = $1
       RETURNING *`,
      [
        outageId,
        nextStatus,
        patch.severity ?? existing.severity,
        patch.mitigationNoteFa ?? existing.mitigation_note_fa,
      ]
    );
    return res.rows[0] ? mapOutageRow(res.rows[0]) : null;
  }

  async listFollowUps(
    tx: DbTx,
    filter: {
      clinicId: string;
      status?: FollowUpTaskStatus | undefined;
      taskType?: FollowUpTaskType | undefined;
      patientId?: string | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: FollowUpTaskRecord[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const push = (v: unknown): string => {
      params.push(v);
      return `$${params.length}`;
    };

    conditions.push(`ft.clinic_id = ${push(filter.clinicId)}`);
    if (filter.status) conditions.push(`ft.status = ${push(filter.status)}`);
    if (filter.taskType) conditions.push(`ft.task_type = ${push(filter.taskType)}`);
    if (filter.patientId) conditions.push(`ft.patient_id = ${push(filter.patientId)}`);

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const countRes = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt FROM follow_up_tasks ft ${whereClause}`,
      params
    );
    const total = Number(countRes.rows[0]?.cnt ?? "0");

    const limitP = push(filter.limit);
    const offsetP = push(filter.offset);

    const rowsRes = await tx.query<FollowUpRow>(
      `SELECT ft.*, p.full_name_fa AS patient_name_fa
       FROM follow_up_tasks ft
       JOIN patients p ON p.id = ft.patient_id
       ${whereClause}
       ORDER BY CASE ft.status WHEN 'pending' THEN 0 ELSE 1 END ASC, ft.due_at ASC
       LIMIT ${limitP} OFFSET ${offsetP}`,
      params
    );

    return { items: rowsRes.rows.map(mapFollowUpRow), total };
  }

  async insertFollowUp(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      patientId: string;
      episodeId?: string | undefined;
      triageCaseId?: string | undefined;
      eyeLaterality?: EyeLaterality | "OU" | undefined;
      taskType: FollowUpTaskType;
      dueAt: Date;
      assignedUserId?: string | undefined;
      outcomeFa?: string | undefined;
    }
  ): Promise<FollowUpTaskRecord> {
    const res = await tx.query<FollowUpRow>(
      `INSERT INTO follow_up_tasks
         (tenant_id, clinic_id, patient_id, episode_id, triage_case_id, eye_laterality, task_type, due_at, assigned_user_id, outcome_fa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9, $10)
       RETURNING *`,
      [
        input.tenantId,
        input.clinicId,
        input.patientId,
        input.episodeId ?? null,
        input.triageCaseId ?? null,
        input.eyeLaterality ?? null,
        input.taskType,
        input.dueAt.toISOString(),
        input.assignedUserId ?? null,
        input.outcomeFa ?? null,
      ]
    );
    return mapFollowUpRow(res.rows[0]!);
  }

  async updateFollowUp(
    tx: DbTx,
    taskId: string,
    patch: {
      status?: FollowUpTaskStatus | undefined;
      assignedUserId?: string | null | undefined;
      outcomeFa?: string | null | undefined;
    }
  ): Promise<FollowUpTaskRecord | null> {
    const cur = await tx.query<FollowUpRow>(`SELECT * FROM follow_up_tasks WHERE id = $1`, [taskId]);
    const existing = cur.rows[0];
    if (!existing) return null;

    const nextStatus = patch.status ?? existing.status;
    const res = await tx.query<FollowUpRow>(
      `UPDATE follow_up_tasks
       SET status = $2,
           assigned_user_id = $3,
           outcome_fa = $4,
           completed_at = CASE WHEN $2 = 'completed' THEN COALESCE(completed_at, now()) ELSE NULL END,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [
        taskId,
        nextStatus,
        patch.assignedUserId === undefined ? existing.assigned_user_id : patch.assignedUserId,
        patch.outcomeFa === undefined ? existing.outcome_fa : patch.outcomeFa,
      ]
    );
    return res.rows[0] ? mapFollowUpRow(res.rows[0]) : null;
  }
}
