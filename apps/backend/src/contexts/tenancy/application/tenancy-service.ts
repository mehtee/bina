import type { DbTx } from "../../../packages/db/index.js";
import { formatJalaliDate, isIranWorkweekStaffed } from "../domain/jalali.js";
import type { ClinicRecord, TenancyRepoPort } from "../ports/index.js";

export interface ClinicRuntimeView extends ClinicRecord {
  readonly todayJalali: string;
  readonly currentlyStaffed: boolean;
}

export class TenancyService {
  constructor(private readonly repo: TenancyRepoPort) {}

  async getClinicProfile(
    tx: DbTx,
    clinicId: string,
    now: Date = new Date()
  ): Promise<ClinicRuntimeView | null> {
    const clinic = await this.repo.findClinicById(tx, clinicId);
    if (!clinic) return null;
    return {
      ...clinic,
      todayJalali: formatJalaliDate(now, clinic.timezone),
      currentlyStaffed: isIranWorkweekStaffed(now, clinic.staffedHours, clinic.timezone),
    };
  }
}
