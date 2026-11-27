import { authorizeStaffAction, type StaffPrincipal } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import type { EyeLaterality } from "../../../packages/domain-kernel/index.js";
import type { AuditLogPort } from "../../audit-compliance/ports/index.js";
import type {
  ClinicOutageRecord,
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
  TriageRepoPort,
} from "../ports/index.js";

export class TriageOperationError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    messageFa: string
  ) {
    super(messageFa);
    this.name = "TriageOperationError";
  }
}

export class TriageService {
  constructor(
    private readonly repo: TriageRepoPort,
    private readonly auditLog: AuditLogPort
  ) {}

  async listCases(tx: DbTx, principal: StaffPrincipal): Promise<TriageCaseRecord[]> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listCases(tx);
  }

  async listCasesFiltered(
    tx: DbTx,
    principal: StaffPrincipal,
    filter: TriageCaseFilter
  ): Promise<{ items: TriageCaseRecord[]; total: number }> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listCasesFiltered(tx, {
      ...filter,
      clinicId: filter.clinicId ?? principal.clinicId,
      limit: Math.min(100, Math.max(1, filter.limit)),
      offset: Math.max(0, filter.offset),
    });
  }

  async getCaseDetail(
    tx: DbTx,
    principal: StaffPrincipal,
    caseId: string
  ): Promise<TriageCaseDetailView> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    const detail = await this.repo.getCaseDetail(tx, caseId);
    if (!detail) {
      throw new TriageOperationError(404, "TRIAGE_CASE_NOT_FOUND", "پرونده تریاژ یافت نشد.");
    }
    return detail;
  }

  async claimCase(
    tx: DbTx,
    principal: StaffPrincipal,
    caseId: string,
    now: Date = new Date()
  ): Promise<TriageCaseRecord> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }

    const existing = await this.repo.findById(tx, caseId);
    if (!existing) {
      throw new TriageOperationError(404, "TRIAGE_CASE_NOT_FOUND", "پرونده تریاژ یافت نشد.");
    }

    const claimed = await this.repo.claimCase(tx, caseId, principal.userId, now);
    if (!claimed) {
      throw new TriageOperationError(409, "TRIAGE_ALREADY_CLAIMED", "این پرونده قبلاً توسط همکار دیگری برداشته شده است.");
    }

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "triage_case_claimed",
      resourceType: "triage_case",
      resourceId: caseId,
    });
    return claimed;
  }

  async handoffCase(
    tx: DbTx,
    principal: StaffPrincipal,
    caseId: string,
    input: { targetStaffUserId: string; handoffNoteFa: string },
    now: Date = new Date()
  ): Promise<TriageCaseRecord> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    if (!input.handoffNoteFa || input.handoffNoteFa.trim().length < 5) {
      throw new TriageOperationError(400, "HANDOFF_NOTE_REQUIRED", "ثبت شرح تحویل شیفت به زبان فارسی الزامی است.");
    }

    const updated = await this.repo.handoffCase(
      tx,
      caseId,
      principal.userId,
      input.targetStaffUserId,
      input.handoffNoteFa.trim(),
      now
    );
    if (!updated) {
      throw new TriageOperationError(404, "TRIAGE_CASE_NOT_FOUND", "پرونده تریاژ یافت نشد.");
    }

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "triage_case_handoff",
      resourceType: "triage_case",
      resourceId: caseId,
      metadata: { targetStaffUserId: input.targetStaffUserId },
    });
    return updated;
  }

  async recordContactAttempt(
    tx: DbTx,
    principal: StaffPrincipal,
    caseId: string,
    input: {
      outcome: "no_answer" | "contacted" | "escalated";
      channel: "phone" | "sms" | "in_person";
      noteFa: string;
    },
    now: Date = new Date()
  ): Promise<TriageCaseRecord> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }

    const updated = await this.repo.recordContactAttempt(tx, {
      caseId,
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      outcome: input.outcome,
      channel: input.channel,
      noteFa: input.noteFa.trim(),
      now,
    });
    if (!updated) {
      throw new TriageOperationError(404, "TRIAGE_CASE_NOT_FOUND", "پرونده تریاژ یافت نشد.");
    }

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "triage_case_contact_logged",
      resourceType: "triage_case",
      resourceId: caseId,
      metadata: { outcome: input.outcome, channel: input.channel, status: updated.status },
    });

    return updated;
  }

  async closeCase(
    tx: DbTx,
    principal: StaffPrincipal,
    caseId: string,
    input: {
      resolutionNoteFa: string;
      resolutionType?: "resolved" | "referred" | "false_positive_clinician_verified" | undefined;
    },
    now: Date = new Date()
  ): Promise<TriageCaseRecord> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }

    const existing = await this.repo.findById(tx, caseId);
    if (!existing) {
      throw new TriageOperationError(404, "TRIAGE_CASE_NOT_FOUND", "پرونده تریاژ یافت نشد.");
    }
    if (existing.status === "Closed") {
      throw new TriageOperationError(409, "TRIAGE_ALREADY_CLOSED", "این پرونده تریاژ قبلاً بسته شده است.");
    }

    if (existing.urgencyTier === "urgent") {
      const referralCount = await this.repo.countReferralsForCase(tx, caseId);
      const isClinicallyResolved =
        existing.status === "ContactEstablished" ||
        existing.status === "Referred" ||
        referralCount > 0 ||
        (input.resolutionType === "false_positive_clinician_verified" && principal.role === "ophthalmologist");

      if (!isClinicallyResolved) {
        throw new TriageOperationError(
          422,
          "URGENT_CASE_RESOLUTION_REQUIRED",
          "بستن پرونده فوری پیش از برقراری تماس با بیمار، ثبت ارجاع، یا تایید رد خطا توسط چشم‌پزشک مجاز نیست."
        );
      }
    }

    const closed = await this.repo.closeCase(tx, caseId, input.resolutionNoteFa.trim(), now);
    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "triage_case_closed",
      resourceType: "triage_case",
      resourceId: caseId,
      reasonFa: input.resolutionNoteFa.trim(),
      metadata: { resolutionType: input.resolutionType ?? "resolved", urgencyTier: existing.urgencyTier },
    });

    return closed!;
  }

  async createReferral(
    tx: DbTx,
    principal: StaffPrincipal,
    caseId: string,
    input: { destinationHospitalFa: string; reasonFa: string; urgent: boolean }
  ): Promise<ReferralRecord> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    const existing = await this.repo.findById(tx, caseId);
    if (!existing) {
      throw new TriageOperationError(404, "TRIAGE_CASE_NOT_FOUND", "پرونده تریاژ یافت نشد.");
    }

    const referral = await this.repo.createReferral(tx, {
      tenantId: principal.tenantId,
      caseId,
      destinationHospitalFa: input.destinationHospitalFa,
      reasonFa: input.reasonFa,
      urgent: input.urgent,
    });

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "triage_referral_dispatched",
      resourceType: "referral",
      resourceId: referral.id,
      metadata: { caseId, urgent: input.urgent },
    });
    return referral;
  }

  async listReferrals(
    tx: DbTx,
    principal: StaffPrincipal,
    filter: {
      status?: "dispatched" | "attended" | "missed" | undefined;
      urgentOnly?: boolean | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: ReferralRecord[]; total: number }> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listReferrals(tx, {
      clinicId: principal.clinicId,
      status: filter.status,
      urgentOnly: filter.urgentOnly,
      limit: Math.min(100, Math.max(1, filter.limit)),
      offset: Math.max(0, filter.offset),
    });
  }

  async getReferralDetail(
    tx: DbTx,
    principal: StaffPrincipal,
    referralId: string
  ): Promise<ReferralRecord> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    const referral = await this.repo.findReferralById(tx, referralId);
    if (!referral) {
      throw new TriageOperationError(404, "REFERRAL_NOT_FOUND", "رکورد ارجاع یافت نشد.");
    }
    return referral;
  }

  async recordReferralOutcome(
    tx: DbTx,
    principal: StaffPrincipal,
    referralId: string,
    status: "attended" | "missed",
    missReasonFa?: string | undefined
  ): Promise<ReferralRecord> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    const updated = await this.repo.updateReferralStatus(tx, referralId, status, missReasonFa);
    if (!updated) {
      throw new TriageOperationError(404, "REFERRAL_NOT_FOUND", "رکورد ارجاع یافت نشد.");
    }
    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "triage_referral_outcome_updated",
      resourceType: "referral",
      resourceId: referralId,
      reasonFa: missReasonFa,
      metadata: { status },
    });
    return updated;
  }

  async listOutages(
    tx: DbTx,
    principal: StaffPrincipal,
    status?: OutageStatus | undefined
  ): Promise<ClinicOutageRecord[]> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listOutages(tx, principal.clinicId, status);
  }

  async createOutage(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      titleFa: string;
      severity: OutageSeverity;
      affectedChannel: OutageChannel;
      mitigationNoteFa?: string | undefined;
    }
  ): Promise<ClinicOutageRecord> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    const created = await this.repo.insertOutage(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      titleFa: input.titleFa.trim(),
      severity: input.severity,
      affectedChannel: input.affectedChannel,
      mitigationNoteFa: input.mitigationNoteFa?.trim() ?? "",
      createdByUserId: principal.userId,
    });
    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "clinic_outage_created",
      resourceType: "clinic_outage",
      resourceId: created.outageId,
      metadata: { severity: created.severity, affectedChannel: created.affectedChannel },
    });
    return created;
  }

  async updateOutage(
    tx: DbTx,
    principal: StaffPrincipal,
    outageId: string,
    patch: {
      status?: OutageStatus | undefined;
      severity?: OutageSeverity | undefined;
      mitigationNoteFa?: string | undefined;
    }
  ): Promise<ClinicOutageRecord> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    const updated = await this.repo.updateOutage(tx, outageId, patch);
    if (!updated) {
      throw new TriageOperationError(404, "OUTAGE_NOT_FOUND", "رکورد اختلال عملیاتی یافت نشد.");
    }
    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "clinic_outage_updated",
      resourceType: "clinic_outage",
      resourceId: outageId,
      metadata: { status: updated.status },
    });
    return updated;
  }

  async listFollowUps(
    tx: DbTx,
    principal: StaffPrincipal,
    filter: {
      status?: FollowUpTaskStatus | undefined;
      taskType?: FollowUpTaskType | undefined;
      patientId?: string | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: FollowUpTaskRecord[]; total: number }> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listFollowUps(tx, {
      clinicId: principal.clinicId,
      status: filter.status,
      taskType: filter.taskType,
      patientId: filter.patientId,
      limit: Math.min(100, Math.max(1, filter.limit)),
      offset: Math.max(0, filter.offset),
    });
  }

  async createFollowUp(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      patientId: string;
      episodeId?: string | undefined;
      triageCaseId?: string | undefined;
      eyeLaterality?: EyeLaterality | "OU" | undefined;
      taskType: FollowUpTaskType;
      dueAtIso: string;
      assignedUserId?: string | undefined;
      outcomeFa?: string | undefined;
    }
  ): Promise<FollowUpTaskRecord> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    const created = await this.repo.insertFollowUp(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      patientId: input.patientId,
      episodeId: input.episodeId,
      triageCaseId: input.triageCaseId,
      eyeLaterality: input.eyeLaterality,
      taskType: input.taskType,
      dueAt: new Date(input.dueAtIso),
      assignedUserId: input.assignedUserId,
      outcomeFa: input.outcomeFa,
    });
    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "follow_up_task_created",
      resourceType: "follow_up_task",
      resourceId: created.taskId,
      metadata: { taskType: created.taskType, patientId: created.patientId },
    });
    return created;
  }

  async updateFollowUp(
    tx: DbTx,
    principal: StaffPrincipal,
    taskId: string,
    patch: {
      status?: FollowUpTaskStatus | undefined;
      assignedUserId?: string | null | undefined;
      outcomeFa?: string | null | undefined;
    }
  ): Promise<FollowUpTaskRecord> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TriageOperationError(403, decision.code, decision.reasonFa);
    }
    const updated = await this.repo.updateFollowUp(tx, taskId, patch);
    if (!updated) {
      throw new TriageOperationError(404, "FOLLOW_UP_NOT_FOUND", "وظیفه پیگیری یافت نشد.");
    }
    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "follow_up_task_updated",
      resourceType: "follow_up_task",
      resourceId: taskId,
      metadata: { status: updated.status },
    });
    return updated;
  }
}
