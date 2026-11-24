import { URGENCY_LABELS_FA, type ValidationResult } from "../../../packages/domain-kernel/index.js";
import type { EvidencePacketInput, ValidatedPersianReportDraft } from "./report-schema.js";

const DISALLOWED_ALL_CLEAR_PHRASES = [
  "همه‌چیز عادی است",
  "همه چیز عادی است",
  "مشکلی وجود ندارد",
  "نیاز به پیگیری ندارد",
  "کاملاً سالم",
  "کاملا سالم",
  "all clear",
  "completely normal",
];

const DISALLOWED_RX_CHANGE_PHRASES = [
  "قطره را قطع کنید",
  "دوز دارو را تغییر دهید",
  "تجویز خودکار",
  "مصرف را قطع کنید",
  "دارو را عوض کنید",
];

const CLAIMED_ALL_TESTS_PHRASES = [
  "تمام تست‌ها انجام شده",
  "همه تست‌ها انجام شد",
  "تمام آزمایش‌ها موجود است",
];

export function validatePersianClinicalReport(
  draft: ValidatedPersianReportDraft,
  packet: EvidencePacketInput
): ValidationResult {
  const errors: string[] = [];
  const allowedSet = new Set(packet.allowedEvidenceIds);

  // 1. Citation grounding
  for (const id of draft.evidenceIds) {
    if (!allowedSet.has(id)) {
      errors.push(`Uncited or hallucinated evidenceId '${id}' not present in allowedEvidenceIds.`);
    }
  }

  const combinedText = [
    draft.titleFa,
    draft.modalityFindingsFa,
    draft.differentialSummaryFa,
    draft.crossModalCorrelationFa,
    draft.followUpPlanFa,
  ].join("\n");

  // 2. Eye laterality consistency (چشم راست vs چشم چپ)
  const hasRight = combinedText.includes("چشم راست");
  const hasLeft = combinedText.includes("چشم چپ");
  if (packet.eyeLaterality === "OD") {
    if (!hasRight) {
      errors.push("Laterality omission: OD study report must explicitly mention 'چشم راست'.");
    }
    if (hasLeft) {
      errors.push("Laterality swap: OD study report illegally mentions 'چشم چپ'.");
    }
  } else if (packet.eyeLaterality === "OS") {
    if (!hasLeft) {
      errors.push("Laterality omission: OS study report must explicitly mention 'چشم چپ'.");
    }
    if (hasRight) {
      errors.push("Laterality swap: OS study report illegally mentions 'چشم راست'.");
    }
  }

  // 3. Urgent floor non-downgrade & anti-"all clear" check
  if (packet.finalUrgency === "urgent") {
    if (draft.urgencyTier !== "urgent") {
      errors.push(`Urgency downgrade rejected: expected 'urgent', got '${draft.urgencyTier}'.`);
    }
    if (draft.urgencyLabelFa !== URGENCY_LABELS_FA.urgent) {
      errors.push(`Urgency Persian label mismatch: expected 'ارجاع فوری', got '${draft.urgencyLabelFa}'.`);
    }
  } else if (draft.urgencyTier === "routine" && packet.finalUrgency === "followup_3_6m") {
    errors.push("Urgency downgrade rejected: cannot downgrade 'followup_3_6m' to 'routine'.");
  }

  const expectedLabel = URGENCY_LABELS_FA[draft.urgencyTier];
  if (draft.urgencyLabelFa !== expectedLabel) {
    errors.push(`Inconsistent urgencyLabelFa '${draft.urgencyLabelFa}' for tier '${draft.urgencyTier}'.`);
  }

  const lowerCombined = combinedText.toLowerCase();
  for (const phrase of DISALLOWED_ALL_CLEAR_PHRASES) {
    if (lowerCombined.includes(phrase.toLowerCase())) {
      errors.push(`Unsafe reassurance phrase '${phrase}' is forbidden.`);
    }
  }

  // 4. Autonomous prescription modification prohibition
  for (const phrase of DISALLOWED_RX_CHANGE_PHRASES) {
    if (combinedText.includes(phrase)) {
      errors.push(`Autonomous medication directive '${phrase}' is forbidden.`);
    }
  }

  // 5. Missing-modality negation check
  if (packet.missingModalities.length > 0) {
    for (const phrase of CLAIMED_ALL_TESTS_PHRASES) {
      if (combinedText.includes(phrase)) {
        errors.push(`Negation/completeness error: claimed '${phrase}' despite missing modalities.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
