export type UrgencyTier = "routine" | "followup_3_6m" | "urgent";

export const URGENCY_LABELS_FA = {
  routine: "عادی",
  followup_3_6m: "پیگیری ۳ تا ۶ ماه",
  urgent: "ارجاع فوری",
} as const satisfies Record<UrgencyTier, string>;

export const URGENCY_RANK = {
  routine: 0,
  followup_3_6m: 1,
  urgent: 2,
} as const satisfies Record<UrgencyTier, number>;

/**
 * Monotonic urgency floor combiner: safety signals may escalate urgency,
 * never downgrade an existing higher-urgency tier.
 */
export function maxUrgency(a: UrgencyTier, b: UrgencyTier): UrgencyTier {
  return URGENCY_RANK[a] >= URGENCY_RANK[b] ? a : b;
}
