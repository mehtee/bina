import type { UrgencyTier } from "../../../packages/domain-kernel/index.js";

export type TriageStatus =
  | "New"
  | "OwnerAssigned"
  | "ContactAttempted"
  | "ContactEstablished"
  | "Escalated"
  | "Referred"
  | "Closed";

export function computeSlaDueAt(urgencyTier: UrgencyTier, now: Date = new Date()): Date {
  const offsetMs =
    urgencyTier === "urgent"
      ? 30 * 60 * 1000
      : urgencyTier === "followup_3_6m"
        ? 24 * 3600 * 1000
        : 72 * 3600 * 1000;
  return new Date(now.getTime() + offsetMs);
}
