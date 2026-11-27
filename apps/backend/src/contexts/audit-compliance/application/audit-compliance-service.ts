import { authorizeStaffAction, type StaffPrincipal } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import type {
  AuditComplianceRepoPort,
  AuditLogFilter,
  AuditLogRecord,
  BreakGlassSessionRecord,
} from "../ports/index.js";

export class AuditComplianceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    messageFa: string
  ) {
    super(messageFa);
    this.name = "AuditComplianceError";
  }
}

export class AuditComplianceService {
  constructor(private readonly repo: AuditComplianceRepoPort) {}

  async listAuditLogs(
    tx: DbTx,
    principal: StaffPrincipal,
    filter: AuditLogFilter
  ): Promise<{ items: AuditLogRecord[]; total: number }> {
    const decision = authorizeStaffAction(principal, "audit:read", principal.tenantId);
    if (!decision.allowed) {
      throw new AuditComplianceError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listAuditLogs(tx, {
      ...filter,
      limit: Math.min(100, Math.max(1, filter.limit)),
      offset: Math.max(0, filter.offset),
    });
  }

  async listBreakGlassSessions(
    tx: DbTx,
    principal: StaffPrincipal,
    filter: { activeOnly?: boolean | undefined; limit: number; offset: number }
  ): Promise<{ items: BreakGlassSessionRecord[]; total: number }> {
    const canOps = authorizeStaffAction(principal, "ops:read", principal.tenantId).allowed;
    const canAudit = authorizeStaffAction(principal, "audit:read", principal.tenantId).allowed;
    if (!canOps && !canAudit) {
      throw new AuditComplianceError(403, "FORBIDDEN_ROLE", "دسترسی به نشست‌های اضطراری مجاز نیست.");
    }
    return this.repo.listBreakGlassSessions(tx, {
      activeOnly: filter.activeOnly,
      limit: Math.min(100, Math.max(1, filter.limit)),
      offset: Math.max(0, filter.offset),
    });
  }

  async openBreakGlassSession(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      patientId: string;
      reasonFa: string;
      durationMinutes?: number | undefined;
    },
    now: Date = new Date()
  ): Promise<BreakGlassSessionRecord> {
    const decision = authorizeStaffAction(principal, "break_glass:access", principal.tenantId, {
      reasonFa: input.reasonFa,
    });
    if (!decision.allowed) {
      throw new AuditComplianceError(403, decision.code, decision.reasonFa);
    }

    const exists = await this.repo.patientExists(tx, input.patientId);
    if (!exists) {
      throw new AuditComplianceError(404, "PATIENT_NOT_FOUND", "پروفایل بیمار یافت نشد.");
    }

    const minutes = Math.min(240, Math.max(15, input.durationMinutes ?? 60));
    const expiresAt = new Date(now.getTime() + minutes * 60_000);

    const session = await this.repo.insertBreakGlassSession(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      patientId: input.patientId,
      reasonFa: input.reasonFa.trim(),
      expiresAt,
    });

    await this.repo.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "break_glass.session-opened",
      resourceType: "break_glass_session",
      resourceId: session.sessionId,
      reasonFa: input.reasonFa.trim(),
      breakGlass: true,
      metadata: {
        patientId: input.patientId,
        durationMinutes: minutes,
        expiresAtIso: session.expiresAtIso,
      },
    });

    return session;
  }

  async revokeBreakGlassSession(
    tx: DbTx,
    principal: StaffPrincipal,
    sessionId: string,
    reasonFa?: string | undefined
  ): Promise<BreakGlassSessionRecord> {
    const decision = authorizeStaffAction(principal, "ops:read", principal.tenantId);
    if (!decision.allowed) {
      throw new AuditComplianceError(403, decision.code, decision.reasonFa);
    }

    const existing = await this.repo.findBreakGlassSessionById(tx, sessionId);
    if (!existing) {
      throw new AuditComplianceError(404, "BREAK_GLASS_SESSION_NOT_FOUND", "نشست دسترسی اضطراری یافت نشد.");
    }

    const revoked = await this.repo.revokeBreakGlassSession(tx, sessionId, principal.userId);
    await this.repo.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "break_glass.session-revoked",
      resourceType: "break_glass_session",
      resourceId: sessionId,
      reasonFa: reasonFa ?? "لغو دسترسی اضطراری توسط کادر مجاز",
      breakGlass: false,
      metadata: { patientId: existing.patientId },
    });

    return revoked!;
  }
}
