import type { DbTx } from "../../../packages/db/index.js";
import {
  formatLateralityFa,
  maxUrgency,
  URGENCY_LABELS_FA,
  type StudyLaterality,
  type UrgencyTier,
} from "../../../packages/domain-kernel/index.js";
import { computeSlaDueAt, type TriageStatus } from "../domain/sla.js";
import type {
  CreateOrEscalateTriageInput,
  ReferralRecord,
  TriageCaseRecord,
  TriageRepoPort,
  TriageSourcePillar,
} from "../ports/index.js";

interface TriageRow {
  id: string;
  tenant_id: string;
  clinic_id: string;
  patient_id: string;
  source_pillar: TriageSourcePillar;
  source_ref_id: string | null;
  eye_laterality: StudyLaterality;
  status: TriageStatus;
  urgency_tier: UrgencyTier;
  owner_id: string | null;
  sla_due_at: Date;
  created_at: Date;
  updated_at: Date;
}

function mapTriageRow(r: TriageRow): TriageCaseRecord {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    clinicId: r.clinic_id,
    patientId: r.patient_id,
    sourcePillar: r.source_pillar,
    sourceRefId: r.source_ref_id ?? undefined,
    eyeLaterality: r.eye_laterality,
    eyeLabelFa: formatLateralityFa(r.eye_laterality),
    status: r.status,
    urgencyTier: r.urgency_tier,
    urgencyLabelFa: URGENCY_LABELS_FA[r.urgency_tier],
    ownerId: r.owner_id,
    slaDueAt: r.sla_due_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class PgTriageRepo implements TriageRepoPort {
  async createOrEscalateCase(tx: DbTx, input: CreateOrEscalateTriageInput): Promise<TriageCaseRecord> {
    const now = input.now ?? new Date();
    const existing = await tx.query<TriageRow>(
      `SELECT id, tenant_id, clinic_id, patient_id, source_pillar, source_ref_id, eye_laterality, status, urgency_tier, owner_id, sla_due_at, created_at, updated_at
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
         RETURNING id, tenant_id, clinic_id, patient_id, source_pillar, source_ref_id, eye_laterality, status, urgency_tier, owner_id, sla_due_at, created_at, updated_at`,
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
         RETURNING id, tenant_id, clinic_id, patient_id, source_pillar, source_ref_id, eye_laterality, status, urgency_tier, owner_id, sla_due_at, created_at, updated_at`,
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
      `SELECT id, tenant_id, clinic_id, patient_id, source_pillar, source_ref_id, eye_laterality, status, urgency_tier, owner_id, sla_due_at, created_at, updated_at
       FROM triage_cases WHERE id = $1`,
      [caseId]
    );
    return res.rows[0] ? mapTriageRow(res.rows[0]) : null;
  }

  async listCases(tx: DbTx): Promise<TriageCaseRecord[]> {
    const res = await tx.query<TriageRow>(
      `SELECT id, tenant_id, clinic_id, patient_id, source_pillar, source_ref_id, eye_laterality, status, urgency_tier, owner_id, sla_due_at, created_at, updated_at
       FROM triage_cases
       ORDER BY CASE urgency_tier WHEN 'urgent' THEN 0 WHEN 'followup_3_6m' THEN 1 ELSE 2 END ASC,
                sla_due_at ASC`
    );
    return res.rows.map(mapTriageRow);
  }

  async claimCase(tx: DbTx, caseId: string, staffUserId: string, now: Date): Promise<TriageCaseRecord | null> {
    const res = await tx.query<TriageRow>(
      `UPDATE triage_cases
       SET owner_id = $2,
           status = CASE WHEN status = 'New' THEN 'OwnerAssigned' ELSE status END,
           updated_at = $3::timestamptz
       WHERE id = $1 AND (owner_id IS NULL OR owner_id = $2)
       RETURNING id, tenant_id, clinic_id, patient_id, source_pillar, source_ref_id, eye_laterality, status, urgency_tier, owner_id, sla_due_at, created_at, updated_at`,
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
       RETURNING id, tenant_id, clinic_id, patient_id, source_pillar, source_ref_id, eye_laterality, status, urgency_tier, owner_id, sla_due_at, created_at, updated_at`,
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
      await tx.query(`UPDATE triage_cases SET status = 'Closed', updated_at = now() WHERE id = $1`, [r.case_id]);
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
}
