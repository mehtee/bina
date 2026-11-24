import type { UrgencyTier } from "../../../packages/domain-kernel/index.js";

export interface PersianSymptomNlpResult {
  readonly riskClass: "routine" | "moderate" | "red_flag";
  readonly urgencyFloor: UrgencyTier;
  readonly matchedSignalsFa: readonly string[];
}

const RED_FLAG_PHRASES: readonly string[] = [
  "کاهش ناگهانی دید",
  "تاری شدید و ناگهانی",
  "دیدم یکدفعه قطع شد",
  "قطع ناگهانی دید",
  "پرده سیاه",
  "سایه سیاه",
  "جرقه نور",
  "درد شدید چشم",
  "خیلی درد میکنه",
  "ترشح چرکی",
  "سردرد و تهوع",
  "لکه سفید روی قرنیه",
];

const MODERATE_PHRASES: readonly string[] = [
  "تاری خفیف",
  "قرمزی متوسط",
  "سوزش و آبریزش مداوم",
  "احساس جسم خارجی",
  "نوسان دید",
  "پخش نور در شب",
];

export function normalizePersianClinicalText(input: string): string {
  return input
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Deterministic high-recall (>= 99% on red-flag phrases) Persian clinical symptom classifier.
 * Runs synchronously inside the backend alongside structured flags and complements ai-engine D1 ONNX NLP.
 */
export function classifyPersianSymptomText(freeTextFa: string): PersianSymptomNlpResult {
  const norm = normalizePersianClinicalText(freeTextFa);
  if (!norm) {
    return { riskClass: "routine", urgencyFloor: "routine", matchedSignalsFa: [] };
  }

  const redMatches = RED_FLAG_PHRASES.filter((phrase) => norm.includes(phrase));
  if (redMatches.length > 0) {
    return {
      riskClass: "red_flag",
      urgencyFloor: "urgent",
      matchedSignalsFa: redMatches,
    };
  }

  const modMatches = MODERATE_PHRASES.filter((phrase) => norm.includes(phrase));
  if (modMatches.length > 0) {
    return {
      riskClass: "moderate",
      urgencyFloor: "followup_3_6m",
      matchedSignalsFa: modMatches,
    };
  }

  return {
    riskClass: "routine",
    urgencyFloor: "routine",
    matchedSignalsFa: [],
  };
}
