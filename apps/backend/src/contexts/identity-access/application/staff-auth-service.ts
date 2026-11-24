import { authorizeStaffAction, type StaffPrincipal } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import type { AuditLogPort } from "../../audit-compliance/ports/index.js";
import { signSessionToken } from "../domain/token.js";
import type { OidcVerifierPort, StaffMembershipRepoPort } from "../ports/index.js";

export interface StaffSessionResult {
  readonly accessToken: string;
  readonly principal: StaffPrincipal;
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
      throw new Error("INVALID_OIDC_TOKEN");
    }
    const membership = await this.memberships.findActiveMembership(tx, input.clinicId, identity.userId);
    if (!membership) {
      throw new Error("STAFF_MEMBERSHIP_NOT_FOUND");
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
      throw new Error("STEP_UP_VERIFICATION_FAILED");
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
}
