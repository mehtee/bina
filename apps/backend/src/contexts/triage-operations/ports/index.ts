import type { DbTx } from "../../../packages/db/index.js";
import type { EyeLaterality, StudyLaterality, UrgencyTier } from "../../../packages/domain-kernel/index.js";
import type { TriageStatus } from "../domain/sla.js";

export type TriageSourcePillar = "pillar1_care" | "pillar2_diagnostic";
export type OutageStatus = "active" | "mitigated" | "resolved";
export type OutageSeverity = "warning" | "critical";
export type OutageChannel = "sms" | "ai_engine" | "ehr_his" | "phone" | "portal";
export type FollowUpTaskType =
  | "postop_call"
  | "print_phone_checkin"
  | "clinic_visit"
  | "referral_followup"
  | "r2_recalibration";
export type FollowUpTaskStatus = "pending" | "completed" | "missed" | "cancelled";

export interface TriageContactLogEntry {
  readonly actorUserId: string;
  readonly outcome: "no_answer" | "contacted" | "escalated";
  readonly channel: "phone" | "sms" | "in_person";
  readonly noteFa: string;
  readonly occurredAtIso: string;
}

export interface TriageCaseRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly patientNameFa?: string | undefined;
  readonly sourcePillar: TriageSourcePillar;
  readonly sourceRefId?: string | undefined;
  readonly eyeLaterality: StudyLaterality;
  readonly eyeLabelFa: string;
  readonly status: TriageStatus;
  readonly urgencyTier: UrgencyTier;
  readonly urgencyLabelFa: string;
  readonly ownerId: string | null;
  readonly slaDueAt: Date;
  readonly resolutionNoteFa?: string | null | undefined;
  readonly closedAt?: Date | null | undefined;
  readonly contactLog?: TriageContactLogEntry[] | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface TriageTriggerRecord {
  readonly triggerId: string;
  readonly caseId: string;
  readonly ruleCode: string;
  readonly summaryFa: string;
  readonly createdAtIso: string;
}

export interface TriageContactHistoryItem {
  readonly logId: string;
  readonly caseId: string;
  readonly actorUserId: string;
  readonly logType: "call_attempt" | "contact_established" | "shift_handoff" | "outage_note";
  readonly noteFa: string;
  readonly createdAtIso: string;
}

export interface ReferralRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly caseId: string;
  readonly patientId?: string | undefined;
  readonly patientNameFa?: string | undefined;
  readonly eyeLaterality?: StudyLaterality | undefined;
  readonly eyeLabelFa?: string | undefined;
  readonly destinationHospitalFa: string;
  readonly reasonFa: string;
  readonly urgent: boolean;
  readonly status: "dispatched" | "attended" | "missed";
  readonly missReasonFa?: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt?: Date | undefined;
}

export interface ClinicOutageRecord {
  readonly outageId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly titleFa: string;
  readonly status: OutageStatus;
  readonly severity: OutageSeverity;
  readonly affectedChannel: OutageChannel;
  readonly mitigationNoteFa: string;
  readonly startedAtIso: string;
  readonly resolvedAtIso: string | null;
  readonly createdByUserId: string;
  readonly createdAtIso: string;
}

export interface FollowUpTaskRecord {
  readonly taskId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly patientNameFa?: string | undefined;
  readonly episodeId: string | null;
  readonly triageCaseId: string | null;
  readonly eyeLaterality: StudyLaterality | null;
  readonly eyeLabelFa: string | null;
  readonly taskType: FollowUpTaskType;
  readonly dueAtIso: string;
  readonly dueAtJalali: string;
  readonly status: FollowUpTaskStatus;
  readonly assignedUserId: string | null;
  readonly outcomeFa: string | null;
  readonly completedAtIso: string | null;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

export interface TriageCaseDetailView {
  readonly triageCase: TriageCaseRecord;
  readonly triggers: TriageTriggerRecord[];
  readonly contactLogs: TriageContactHistoryItem[];
  readonly referrals: ReferralRecord[];
  readonly followUpTasks: FollowUpTaskRecord[];
}

export interface TriageCaseFilter {
  readonly clinicId?: string | undefined;
  readonly status?: TriageStatus | undefined;
  readonly urgencyTier?: UrgencyTier | undefined;
  readonly sourcePillar?: TriageSourcePillar | undefined;
  readonly eyeLaterality?: StudyLaterality | undefined;
  readonly ownerId?: string | undefined;
  readonly unassignedOnly?: boolean | undefined;
  readonly limit: number;
  readonly offset: number;
}

export interface CreateOrEscalateTriageInput {
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly sourcePillar: TriageSourcePillar;
  readonly sourceRefId?: string | undefined;
  readonly eyeLaterality: StudyLaterality;
  readonly urgencyTier: UrgencyTier;
  readonly ruleCode: string;
  readonly summaryFa: string;
  readonly now?: Date | undefined;
}

export interface TriageCaseCreatorPort {
  createOrEscalateCase(tx: DbTx, input: CreateOrEscalateTriageInput): Promise<TriageCaseRecord>;
}

export interface TriageRepoPort extends TriageCaseCreatorPort {
  findById(tx: DbTx, caseId: string): Promise<TriageCaseRecord | null>;
  listCases(tx: DbTx): Promise<TriageCaseRecord[]>;
  listCasesFiltered(
    tx: DbTx,
    filter: TriageCaseFilter
  ): Promise<{ items: TriageCaseRecord[]; total: number }>;
  getCaseDetail(tx: DbTx, caseId: string): Promise<TriageCaseDetailView | null>;
  claimCase(tx: DbTx, caseId: string, staffUserId: string, now: Date): Promise<TriageCaseRecord | null>;
  handoffCase(
    tx: DbTx,
    caseId: string,
    fromStaffId: string,
    targetStaffUserId: string,
    noteFa: string,
    now: Date
  ): Promise<TriageCaseRecord | null>;
  recordContactAttempt(
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
  ): Promise<TriageCaseRecord | null>;
  closeCase(
    tx: DbTx,
    caseId: string,
    resolutionNoteFa: string,
    now: Date
  ): Promise<TriageCaseRecord | null>;
  countReferralsForCase(tx: DbTx, caseId: string): Promise<number>;
  createReferral(
    tx: DbTx,
    input: {
      tenantId: string;
      caseId: string;
      destinationHospitalFa: string;
      reasonFa: string;
      urgent: boolean;
    }
  ): Promise<ReferralRecord>;
  listReferrals(
    tx: DbTx,
    filter: {
      clinicId?: string | undefined;
      status?: "dispatched" | "attended" | "missed" | undefined;
      urgentOnly?: boolean | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: ReferralRecord[]; total: number }>;
  findReferralById(tx: DbTx, referralId: string): Promise<ReferralRecord | null>;
  updateReferralStatus(
    tx: DbTx,
    referralId: string,
    status: "dispatched" | "attended" | "missed",
    missReasonFa?: string | undefined
  ): Promise<ReferralRecord | null>;
  listOutages(tx: DbTx, clinicId: string, status?: OutageStatus | undefined): Promise<ClinicOutageRecord[]>;
  insertOutage(
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
  ): Promise<ClinicOutageRecord>;
  updateOutage(
    tx: DbTx,
    outageId: string,
    patch: {
      status?: OutageStatus | undefined;
      severity?: OutageSeverity | undefined;
      mitigationNoteFa?: string | undefined;
    }
  ): Promise<ClinicOutageRecord | null>;
  listFollowUps(
    tx: DbTx,
    filter: {
      clinicId: string;
      status?: FollowUpTaskStatus | undefined;
      taskType?: FollowUpTaskType | undefined;
      patientId?: string | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: FollowUpTaskRecord[]; total: number }>;
  insertFollowUp(
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
  ): Promise<FollowUpTaskRecord>;
  updateFollowUp(
    tx: DbTx,
    taskId: string,
    patch: {
      status?: FollowUpTaskStatus | undefined;
      assignedUserId?: string | null | undefined;
      outcomeFa?: string | null | undefined;
    }
  ): Promise<FollowUpTaskRecord | null>;
}
