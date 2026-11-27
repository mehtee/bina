import type { StaffRole } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import type {
  AuthorizedClinicMembershipView,
  StaffMembershipRecord,
  StaffMembershipRepoPort,
} from "../ports/index.js";

interface MembershipRow {
  id: string;
  tenant_id: string;
  clinic_id: string;
  user_id: string;
  role: StaffRole;
  active: boolean;
  full_name_fa: string | null;
  email: string | null;
  mfa_verified_at: Date | null;
  created_at: Date;
}

function mapMembershipRow(row: MembershipRow): StaffMembershipRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    clinicId: row.clinic_id,
    userId: row.user_id,
    role: row.role,
    active: row.active,
    fullNameFa: row.full_name_fa,
    email: row.email,
    mfaVerifiedAtIso: row.mfa_verified_at ? row.mfa_verified_at.toISOString() : null,
    createdAtIso: row.created_at.toISOString(),
  };
}

export class PgStaffMembershipRepo implements StaffMembershipRepoPort {
  async findActiveMembership(
    tx: DbTx,
    clinicId: string,
    userId: string
  ): Promise<StaffMembershipRecord | null> {
    const res = await tx.query<MembershipRow>(
      `SELECT id, tenant_id, clinic_id, user_id, role, active, full_name_fa, email, mfa_verified_at, created_at
       FROM staff_memberships
       WHERE clinic_id = $1 AND user_id = $2 AND active = true`,
      [clinicId, userId]
    );
    const row = res.rows[0];
    return row ? mapMembershipRow(row) : null;
  }

  async listAuthorizedClinicsForUser(
    tx: DbTx,
    userId: string
  ): Promise<AuthorizedClinicMembershipView[]> {
    const res = await tx.query<{
      membership_id: string;
      tenant_id: string;
      clinic_id: string;
      name_fa: string;
      role: StaffRole;
      emergency_phone: string;
      calendar_mode: "jalali" | "gregorian";
    }>(
      `SELECT sm.id AS membership_id,
              sm.tenant_id,
              sm.clinic_id,
              c.name_fa,
              sm.role,
              c.emergency_phone,
              c.calendar_mode
       FROM staff_memberships sm
       JOIN clinics c ON c.id = sm.clinic_id
       WHERE sm.user_id = $1 AND sm.active = true
       ORDER BY c.name_fa ASC`,
      [userId]
    );
    return res.rows.map((r) => ({
      membershipId: r.membership_id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      clinicNameFa: r.name_fa,
      role: r.role,
      emergencyPhone: r.emergency_phone,
      calendarMode: r.calendar_mode,
    }));
  }

  async listClinicStaff(tx: DbTx, clinicId: string): Promise<StaffMembershipRecord[]> {
    const res = await tx.query<MembershipRow>(
      `SELECT id, tenant_id, clinic_id, user_id, role, active, full_name_fa, email, mfa_verified_at, created_at
       FROM staff_memberships
       WHERE clinic_id = $1
       ORDER BY created_at ASC`,
      [clinicId]
    );
    return res.rows.map(mapMembershipRow);
  }

  async findMembershipById(tx: DbTx, membershipId: string): Promise<StaffMembershipRecord | null> {
    const res = await tx.query<MembershipRow>(
      `SELECT id, tenant_id, clinic_id, user_id, role, active, full_name_fa, email, mfa_verified_at, created_at
       FROM staff_memberships
       WHERE id = $1`,
      [membershipId]
    );
    const row = res.rows[0];
    return row ? mapMembershipRow(row) : null;
  }

  async countActiveAdminsInClinic(tx: DbTx, clinicId: string): Promise<number> {
    const res = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt
       FROM staff_memberships
       WHERE clinic_id = $1 AND role = 'admin' AND active = true`,
      [clinicId]
    );
    return Number(res.rows[0]?.cnt ?? "0");
  }

  async upsertStaffMembership(
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
  ): Promise<StaffMembershipRecord> {
    const res = await tx.query<MembershipRow>(
      `INSERT INTO staff_memberships
         (tenant_id, clinic_id, user_id, role, active, full_name_fa, email, mfa_verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $8 THEN now() ELSE NULL END)
       ON CONFLICT (tenant_id, clinic_id, user_id) DO UPDATE
         SET role = EXCLUDED.role,
             active = EXCLUDED.active,
             full_name_fa = COALESCE(EXCLUDED.full_name_fa, staff_memberships.full_name_fa),
             email = COALESCE(EXCLUDED.email, staff_memberships.email)
       RETURNING id, tenant_id, clinic_id, user_id, role, active, full_name_fa, email, mfa_verified_at, created_at`,
      [
        input.tenantId,
        input.clinicId,
        input.userId,
        input.role,
        input.active,
        input.fullNameFa ?? null,
        input.email ?? null,
        input.mfaVerified,
      ]
    );
    return mapMembershipRow(res.rows[0]!);
  }

  async updateStaffMembership(
    tx: DbTx,
    membershipId: string,
    patch: {
      role?: StaffRole | undefined;
      active?: boolean | undefined;
      fullNameFa?: string | null | undefined;
      email?: string | null | undefined;
    }
  ): Promise<StaffMembershipRecord | null> {
    const existing = await this.findMembershipById(tx, membershipId);
    if (!existing) return null;

    const res = await tx.query<MembershipRow>(
      `UPDATE staff_memberships
       SET role = $2,
           active = $3,
           full_name_fa = $4,
           email = $5
       WHERE id = $1
       RETURNING id, tenant_id, clinic_id, user_id, role, active, full_name_fa, email, mfa_verified_at, created_at`,
      [
        membershipId,
        patch.role ?? existing.role,
        patch.active ?? existing.active,
        patch.fullNameFa === undefined ? existing.fullNameFa ?? null : patch.fullNameFa,
        patch.email === undefined ? existing.email ?? null : patch.email,
      ]
    );
    const row = res.rows[0];
    return row ? mapMembershipRow(row) : null;
  }
}
