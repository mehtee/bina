import type { StaffRole } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";

export interface OidcIdentity {
  readonly userId: string;
  readonly mfaVerified: boolean;
}

export interface OidcVerifierPort {
  verifyIdToken(token: string): Promise<OidcIdentity | null>;
}

export interface StaffMembershipRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly userId: string;
  readonly role: StaffRole;
  readonly active: boolean;
}

export interface StaffMembershipRepoPort {
  findActiveMembership(tx: DbTx, clinicId: string, userId: string): Promise<StaffMembershipRecord | null>;
}
