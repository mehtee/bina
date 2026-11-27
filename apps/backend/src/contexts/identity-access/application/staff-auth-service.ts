import { authorizeStaffAction, type StaffPrincipal, type StaffRole } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import type { AuditLogPort } from "../../audit-compliance/ports/index.js";
import { signSessionToken } from "../domain/token.js";
import type {
  AuthorizedClinicMembershipView,
  OidcVerifierPort,
  StaffMembershipRecord,
  StaffMembershipRepoPort,
} from "../ports/index.js";

export interface StaffSessionResult {
  readonly accessToken: string;
  readonly principal: StaffPrincipal;
}

export class IdentityAccessError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    messageFa: string
  ) {
    super(messageFa);
    this.name = "IdentityAccessError";
  }
}

export class StaffAuthService {
  constructor(
    private readonly oidc: OidcVerifierPort,
    private readonly memberships: StaffMembershipRepoPort,
    private readonly auditLog: AuditLogPort,
    private readonly signingSecret: string
  ) {}

  async exchangeOidcSession(
    tx: DbTx,
    input: { oidcToken: string; clinicId: string; mfaCode?: string | undefined; now?: Date | undefined }
  ): Promise<StaffSessionResult> {
    const identity = await this.oidc.verifyIdToken(input.oidcToken);
    if (!identity) {
      throw new IdentityAccessError(401, "INVALID_OIDC_TOKEN", "توکن احراز هویت نامعتبر است.");
    }
    const membership = await this.memberships.findActiveMembership(tx, input.clinicId, identity.userId);
    if (!membership) {
      throw new IdentityAccessError(403, "STAFF_MEMBERSHIP_NOT_FOUND", "عضویت فعال کادر درمان در این کلینیک یافت نشد.");
    }

    const mfaVerified = identity.mfaVerified || Boolean(input.mfaCode && input.mfaCode.trim().length >= 6);
    const principal: StaffPrincipal = {
      userId: membership.userId,
      tenantId: membership.tenantId,
      clinicId: membership.clinicId,
      role: membership.role,
      mfaVerified,
      stepUpVerified: false,
    };

    const nowSec = Math.floor((input.now ?? new Date()).getTime() / 1000);
    const accessToken = signSessionToken(
      {
        sub: principal.userId,
        tenantId: principal.tenantId,
        clinicId: principal.clinicId,
        actorType: "staff",
        role: principal.role,
        mfaVerified: principal.mfaVerified,
        stepUpVerified: false,
        exp: nowSec + 3600,
      },
      this.signingSecret
    );

    return { accessToken, principal };
  }

  performStepUp(principal: StaffPrincipal, otpOrBiometricVerified: boolean, now: Date = new Date()): StaffSessionResult {
    if (!principal.mfaVerified || !otpOrBiometricVerified) {
      throw new IdentityAccessError(401, "STEP_UP_VERIFICATION_FAILED", "تایید مجدد امنیتی ناموفق بود.");
    }
    const upgraded: StaffPrincipal = { ...principal, stepUpVerified: true };
    const nowSec = Math.floor(now.getTime() / 1000);
    return {
      principal: upgraded,
      accessToken: signSessionToken(
        {
          sub: upgraded.userId,
          tenantId: upgraded.tenantId,
          clinicId: upgraded.clinicId,
          actorType: "staff",
          role: upgraded.role,
          mfaVerified: upgraded.mfaVerified,
          stepUpVerified: true,
          exp: nowSec + 900,
        },
        this.signingSecret
      ),
    };
  }

  async invokeBreakGlass(
    tx: DbTx,
    principal: StaffPrincipal,
    input: { resourceType: string; resourceId: string; reasonFa: string }
  ): Promise<void> {
    const decision = authorizeStaffAction(principal, "break_glass:access", principal.tenantId, {
      reasonFa: input.reasonFa,
    });
    if (!decision.allowed) {
      throw new Error(decision.code);
    }

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "break_glass_access",
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      reasonFa: input.reasonFa,
      breakGlass: true,
    });
  }

  async listAuthorizedClinics(
    tx: DbTx,
    principal: StaffPrincipal
  ): Promise<AuthorizedClinicMembershipView[]> {
    return this.memberships.listAuthorizedClinicsForUser(tx, principal.userId);
  }

  async listClinicStaff(tx: DbTx, principal: StaffPrincipal): Promise<StaffMembershipRecord[]> {
    const decision =
      authorizeStaffAction(principal, "admin:manage", principal.tenantId).allowed ||
      authorizeStaffAction(principal, "ops:read", principal.tenantId).allowed;
    if (!decision) {
      throw new IdentityAccessError(403, "FORBIDDEN_ROLE", "دسترسی به فهرست کادر درمان مجاز نیست.");
    }
    return this.memberships.listClinicStaff(tx, principal.clinicId);
  }

  async upsertStaffMembership(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      userId: string;
      role: StaffRole;
      fullNameFa?: string | undefined;
      email?: string | undefined;
      active?: boolean | undefined;
      mfaVerified?: boolean | undefined;
    }
  ): Promise<StaffMembershipRecord> {
    const decision = authorizeStaffAction(principal, "admin:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new IdentityAccessError(403, decision.code, decision.reasonFa);
    }
    const saved = await this.memberships.upsertStaffMembership(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      userId: input.userId,
      role: input.role,
      fullNameFa: input.fullNameFa,
      email: input.email,
      active: input.active ?? true,
      mfaVerified: input.mfaVerified ?? true,
    });
    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "admin.staff-membership-upserted",
      resourceType: "staff_membership",
      resourceId: saved.id,
      metadata: { targetUserId: saved.userId, role: saved.role, active: saved.active },
    });
    return saved;
  }

  async updateStaffMembership(
    tx: DbTx,
    principal: StaffPrincipal,
    membershipId: string,
    patch: {
      role?: StaffRole | undefined;
      active?: boolean | undefined;
      fullNameFa?: string | null | undefined;
      email?: string | null | undefined;
    }
  ): Promise<StaffMembershipRecord> {
    const decision = authorizeStaffAction(principal, "admin:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new IdentityAccessError(403, decision.code, decision.reasonFa);
    }
    const existing = await this.memberships.findMembershipById(tx, membershipId);
    if (!existing) {
      throw new IdentityAccessError(404, "STAFF_MEMBERSHIP_NOT_FOUND", "عضویت همکار یافت نشد.");
    }

    const removesAdminAuthority =
      existing.role === "admin" &&
      existing.active &&
      (patch.active === false || (patch.role !== undefined && patch.role !== "admin"));
    if (removesAdminAuthority) {
      const activeAdmins = await this.memberships.countActiveAdminsInClinic(tx, existing.clinicId);
      if (activeAdmins <= 1) {
        throw new IdentityAccessError(
          409,
          "LAST_ACTIVE_ADMIN_FORBIDDEN",
          "غیرفعال‌سازی یا تغییر نقش آخرین مدیر فعال کلینیک مجاز نیست."
        );
      }
    }

    const updated = await this.memberships.updateStaffMembership(tx, membershipId, patch);
    if (!updated) {
      throw new IdentityAccessError(404, "STAFF_MEMBERSHIP_NOT_FOUND", "عضویت همکار یافت نشد.");
    }

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "admin.staff-membership-updated",
      resourceType: "staff_membership",
      resourceId: updated.id,
      metadata: { targetUserId: updated.userId, role: updated.role, active: updated.active },
    });

    return updated;
  }
}
