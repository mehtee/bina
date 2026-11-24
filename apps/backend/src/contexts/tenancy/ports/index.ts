import type { DbTx } from "../../../packages/db/index.js";
import type { ClinicId, TenantId } from "../../../packages/domain-kernel/index.js";
import type { IranStaffedHours } from "../domain/jalali.js";

export interface ClinicRecord {
  readonly id: ClinicId;
  readonly tenantId: TenantId;
  readonly nameFa: string;
  readonly timezone: string;
  readonly calendarMode: "jalali" | "gregorian";
  readonly staffedHours: IranStaffedHours;
  readonly emergencyPhone: string;
  readonly dicomAeTitle?: string | undefined;
}

export interface TenancyRepoPort {
  findClinicById(tx: DbTx, clinicId: string): Promise<ClinicRecord | null>;
}
