import type { StaffRole } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import type { StaffMembershipRecord, StaffMembershipRepoPort } from "../ports/index.js";

interface MembershipRow {
  id: string;
  tenant_id: string;
  clinic_id: string;
  user_id: string;
  role: StaffRole;
  active: boolean;
}

export class PgStaffMembershipRepo implements StaffMembershipRepoPort {
  async findActiveMembership(
    tx: DbTx,
    clinicId: string,
    userId: string
  ): Promise<StaffMembershipRecord | null> {
    const res = await tx.query<MembershipRow>(
      `SELECT id, tenant_id, clinic_id, user_id, role, active
       FROM staff_memberships
       WHERE clinic_id = $1 AND user_id = $2 AND active = true`,
      [clinicId, userId]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      tenantId: row.tenant_id,
      clinicId: row.clinic_id,
      userId: row.user_id,
      role: row.role,
      active: row.active,
    };
  }
}
