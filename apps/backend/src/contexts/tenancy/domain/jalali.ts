export interface StaffedHoursWindow {
  readonly open: string;
  readonly close: string;
}

export interface IranStaffedHours {
  readonly satToWed: StaffedHoursWindow;
  readonly thursday: StaffedHoursWindow;
  readonly fridayClosed: boolean;
}

export const DEFAULT_IRAN_STAFFED_HOURS: IranStaffedHours = {
  satToWed: { open: "08:00", close: "20:00" },
  thursday: { open: "08:00", close: "14:00" },
  fridayClosed: true,
};

export function formatJalaliDate(date: Date, timeZone = "Asia/Tehran"): string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatJalaliDateTime(date: Date, timeZone = "Asia/Tehran"): string {
  const d = formatJalaliDate(date, timeZone);
  const t = new Intl.DateTimeFormat("fa-IR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${d} — ${t}`;
}

function parseMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(":");
  return Number(hStr ?? 0) * 60 + Number(mStr ?? 0);
}

export function isIranWorkweekStaffed(
  date: Date,
  schedule: IranStaffedHours = DEFAULT_IRAN_STAFFED_HOURS,
  timeZone = "Asia/Tehran"
): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const totalMinutes = (hour === 24 ? 0 : hour) * 60 + minute;

  if (weekday === "Fri" && schedule.fridayClosed) {
    return false;
  }
  const win = weekday === "Thu" ? schedule.thursday : schedule.satToWed;
  return totalMinutes >= parseMinutes(win.open) && totalMinutes <= parseMinutes(win.close);
}
