import type { DbTx } from "../../../packages/db/index.js";
import { asClinicId, asTenantId } from "../../../packages/domain-kernel/index.js";
import { DEFAULT_IRAN_STAFFED_HOURS, type IranStaffedHours } from "../domain/jalali.js";
import type { ClinicRecord, TenancyRepoPort } from "../ports/index.js";

interface ClinicRow {
  id: string;
  tenant_id: string;
  name_fa: string;
  timezone: string;
  calendar_mode: "jalali" | "gregorian";
  staffed_hours_json: Partial<IranStaffedHours> | null;
  emergency_phone: string;
  dicom_ae_title: string | null;
}

export class PgTenancyRepo implements TenancyRepoPort {
  async findClinicById(tx: DbTx, clinicId: string): Promise<ClinicRecord | null> {
    const res = await tx.query<ClinicRow>(
      `SELECT id, tenant_id, name_fa, timezone, calendar_mode, staffed_hours_json, emergency_phone, dicom_ae_title
       FROM clinics
       WHERE id = $1`,
      [clinicId]
    );
    const row = res.rows[0];
    if (!row) return null;

    return {
      id: asClinicId(row.id),
      tenantId: asTenantId(row.tenant_id),
      nameFa: row.name_fa,
      timezone: row.timezone,
      calendarMode: row.calendar_mode,
      staffedHours: {
        ...DEFAULT_IRAN_STAFFED_HOURS,
        ...(row.staffed_hours_json ?? {}),
      },
      emergencyPhone: row.emergency_phone,
      dicomAeTitle: row.dicom_ae_title ?? undefined,
    };
  }
}
