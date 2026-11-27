import type { ClinicId, TenantId, UserId } from "../domain-kernel/index.js";

export type StaffRole = "ophthalmologist" | "optometrist" | "technician" | "coordinator" | "admin";

export type AuthzAction =
  | "clinic:read"
  | "patient:read"
  | "patient:enroll"
  | "episode:create"
  | "prescription:publish"
  | "triage:manage"
  | "r2:manage"
  | "study:upload"
  | "diagnostic:signoff"
  | "report:read"
  | "report:create"
  | "analytics:read"
  | "admin:manage"
  | "integrations:manage"
  | "audit:read"
  | "ops:read"
  | "export:phi"
  | "break_glass:access";

export const ALL_AUTHZ_ACTIONS: readonly AuthzAction[] = [
  "clinic:read",
  "patient:read",
  "patient:enroll",
  "episode:create",
  "prescription:publish",
  "triage:manage",
  "r2:manage",
  "study:upload",
  "diagnostic:signoff",
  "report:read",
  "report:create",
  "analytics:read",
  "admin:manage",
  "integrations:manage",
  "audit:read",
  "ops:read",
  "export:phi",
  "break_glass:access",
];

export interface StaffPrincipal {
  readonly userId: UserId | string;
  readonly tenantId: TenantId | string;
  readonly clinicId: ClinicId | string;
  readonly role: StaffRole;
  readonly mfaVerified: boolean;
  readonly stepUpVerified?: boolean | undefined;
}

export interface AuthzDecision {
  readonly allowed: boolean;
  readonly code:
    | "ALLOWED"
    | "FORBIDDEN_CROSS_TENANT"
    | "FORBIDDEN_MFA_REQUIRED"
    | "FORBIDDEN_STEP_UP_REQUIRED"
    | "FORBIDDEN_ROLE"
    | "FORBIDDEN_BREAK_GLASS_REASON_REQUIRED";
  readonly reasonFa: string;
}

export interface AuthzContext {
  readonly reasonFa?: string | undefined;
}

const ROLE_ACTIONS: Record<StaffRole, ReadonlySet<AuthzAction>> = {
  ophthalmologist: new Set([
    "clinic:read",
    "patient:read",
    "patient:enroll",
    "episode:create",
    "prescription:publish",
    "triage:manage",
    "r2:manage",
    "study:upload",
    "diagnostic:signoff",
    "report:read",
    "report:create",
    "analytics:read",
    "audit:read",
    "ops:read",
    "export:phi",
    "break_glass:access",
  ]),
  optometrist: new Set([
    "clinic:read",
    "patient:read",
    "patient:enroll",
    "triage:manage",
    "r2:manage",
    "study:upload",
    "report:read",
    "analytics:read",
  ]),
  technician: new Set(["clinic:read", "patient:read", "study:upload"]),
  coordinator: new Set([
    "clinic:read",
    "patient:read",
    "patient:enroll",
    "episode:create",
    "triage:manage",
    "r2:manage",
    "report:read",
    "report:create",
    "analytics:read",
    "ops:read",
    "break_glass:access",
  ]),
  admin: new Set([
    "clinic:read",
    "patient:read",
    "patient:enroll",
    "report:read",
    "report:create",
    "analytics:read",
    "admin:manage",
    "integrations:manage",
    "audit:read",
    "ops:read",
    "export:phi",
    "break_glass:access",
  ]),
};

/**
 * Enforces multi-tenant isolation, MFA, ophthalmologist-only clinical sign-off/Rx rules,
 * step-up verification for PHI exports & audit logs, and mandatory justification for break-glass access.
 */
export function authorizeStaffAction(
  principal: StaffPrincipal,
  action: AuthzAction,
  resourceTenantId: string,
  context: AuthzContext = {}
): AuthzDecision {
  if (principal.tenantId !== resourceTenantId) {
    return {
      allowed: false,
      code: "FORBIDDEN_CROSS_TENANT",
      reasonFa: "دسترسی بین کلینیک‌ها مجاز نیست.",
    };
  }

  if (!ROLE_ACTIONS[principal.role].has(action)) {
    return {
      allowed: false,
      code: "FORBIDDEN_ROLE",
      reasonFa:
        action === "diagnostic:signoff" || action === "prescription:publish"
          ? "این اقدام فقط توسط چشم‌پزشک مجاز است."
          : "نقش کاربری شما مجوز این عملیات را ندارد.",
    };
  }

  if (
    (action === "prescription:publish" ||
      action === "diagnostic:signoff" ||
      action === "export:phi" ||
      action === "admin:manage" ||
      action === "integrations:manage" ||
      action === "audit:read") &&
    !principal.mfaVerified
  ) {
    return {
      allowed: false,
      code: "FORBIDDEN_MFA_REQUIRED",
      reasonFa: "تایید احراز هویت دومرحله‌ای (MFA) الزامی است.",
    };
  }

  if ((action === "export:phi" || action === "audit:read") && !principal.stepUpVerified) {
    return {
      allowed: false,
      code: "FORBIDDEN_STEP_UP_REQUIRED",
      reasonFa: "برای دسترسی یا خروجی داده‌های حساس، تایید مجدد امنیتی الزامی است.",
    };
  }

  if (action === "break_glass:access") {
    const trimmedReason = context.reasonFa?.trim() ?? "";
    if (trimmedReason.length < 10) {
      return {
        allowed: false,
        code: "FORBIDDEN_BREAK_GLASS_REASON_REQUIRED",
        reasonFa: "ثبت دلیل بالینی معتبر (حداقل ۱۰ کاراکتر) برای دسترسی اضطراری الزامی است.",
      };
    }
  }

  return {
    allowed: true,
    code: "ALLOWED",
    reasonFa: "دسترسی تایید شد.",
  };
}

/**
 * Evaluates full server-derived UI/API capability booleans for a staff principal.
 */
export function getCapabilitiesForPrincipal(
  principal: StaffPrincipal
): Record<AuthzAction, boolean> {
  const out = {} as Record<AuthzAction, boolean>;
  for (const action of ALL_AUTHZ_ACTIONS) {
    const decision = authorizeStaffAction(
      principal,
      action,
      principal.tenantId,
      action === "break_glass:access" ? { reasonFa: "بررسی مجوز نقش برای دسترسی اضطراری" } : {}
    );
    out[action] = decision.allowed;
  }
  return out;
}
