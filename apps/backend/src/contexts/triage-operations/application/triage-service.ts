import { authorizeStaffAction, type StaffPrincipal } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import type { AuditLogPort } from "../../audit-compliance/ports/index.js";
import type { ReferralRecord, TriageCaseRecord, TriageRepoPort } from "../ports/index.js";

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
    return updated;
  }
}
