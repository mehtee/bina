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
  readonly fullNameFa?: string | null | undefined;
  readonly email?: string | null | undefined;
  readonly mfaVerifiedAtIso?: string | null | undefined;
  readonly createdAtIso?: string | undefined;
}

export interface AuthorizedClinicMembershipView {
  readonly membershipId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly clinicNameFa: string;
  readonly role: StaffRole;
  readonly emergencyPhone: string;
  readonly calendarMode: "jalali" | "gregorian";
}

export interface StaffMembershipRepoPort {
  findActiveMembership(tx: DbTx, clinicId: string, userId: string): Promise<StaffMembershipRecord | null>;
  listAuthorizedClinicsForUser(tx: DbTx, userId: string): Promise<AuthorizedClinicMembershipView[]>;
  listClinicStaff(tx: DbTx, clinicId: string): Promise<StaffMembershipRecord[]>;
  findMembershipById(tx: DbTx, membershipId: string): Promise<StaffMembershipRecord | null>;
  countActiveAdminsInClinic(tx: DbTx, clinicId: string): Promise<number>;
  upsertStaffMembership(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      userId: string;
      role: StaffRole;
      fullNameFa?: string | undefined;
      email?: string | undefined;
      active: boolean;
      mfaVerified: boolean;
    }
  ): Promise<StaffMembershipRecord>;
  updateStaffMembership(
    tx: DbTx,
    membershipId: string,
    patch: {
      role?: StaffRole | undefined;
      active?: boolean | undefined;
      fullNameFa?: string | null | undefined;
      email?: string | null | undefined;
    }
  ): Promise<StaffMembershipRecord | null>;
}
