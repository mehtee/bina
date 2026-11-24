import {
  assertSingleEyeLaterality,
  formatLateralityFa,
  type ClinicalSignal,
  type EyeLaterality,
  type ValidationResult,
} from "../domain-kernel/index.js";

export interface PostCataractSymptomInput {
  readonly eyeLaterality: EyeLaterality;
  readonly severePain: boolean;
  readonly suddenVisionLoss: boolean;
  readonly purulentDischarge: boolean;
  readonly flashesOrCurtain?: boolean | undefined;
  readonly freeTextFa?: string | undefined;
}

const PERSIAN_RED_FLAG_KEYWORDS: readonly { keyword: string; ruleCode: string }[] = [
  { keyword: "درد شدید", ruleCode: "POSTOP_SEVERE_PAIN_TEXT" },
  { keyword: "کاهش ناگهانی دید", ruleCode: "POSTOP_SUDDEN_VISION_LOSS_TEXT" },
  { keyword: "تاری ناگهانی", ruleCode: "POSTOP_SUDDEN_VISION_LOSS_TEXT" },
  { keyword: "نابینایی ناگهانی", ruleCode: "POSTOP_SUDDEN_VISION_LOSS_TEXT" },
  { keyword: "ترشح چرکی", ruleCode: "POSTOP_PURULENT_DISCHARGE_TEXT" },
  { keyword: "چرک", ruleCode: "POSTOP_PURULENT_DISCHARGE_TEXT" },
  { keyword: "جرقه", ruleCode: "POSTOP_RETINAL_FLASHES_TEXT" },
  { keyword: "پرده سیاه", ruleCode: "POSTOP_RETINAL_CURTAIN_TEXT" },
  { keyword: "قرمزی شدید", ruleCode: "POSTOP_SEVERE_REDNESS_TEXT" },
];

export function evaluatePostCataractSymptoms(input: PostCataractSymptomInput): ClinicalSignal[] {
  const eye = assertSingleEyeLaterality(input.eyeLaterality);
  const eyeFa = formatLateralityFa(eye);
  const signals: ClinicalSignal[] = [];
  const seenCodes = new Set<string>();

  const pushUnique = (ruleCode: string, summaryFa: string) => {
    if (seenCodes.has(ruleCode)) return;
    seenCodes.add(ruleCode);
    signals.push({
      ruleCode,
      urgencyFloor: "urgent",
      eyeLaterality: eye,
      summaryFa,
    });
  };

  if (input.severePain) {
    pushUnique(
      "POSTOP_SEVERE_PAIN",
      `هشدار فوری در ${eyeFa}: درد شدید چشمی نیازمند معاینه اورژانسی برای رد اندوفتالمیت یا افزایش فشار چشم.`
    );
  }
  if (input.suddenVisionLoss) {
    pushUnique(
      "POSTOP_SUDDEN_VISION_LOSS",
      `هشدار فوری در ${eyeFa}: کاهش ناگهانی دید پس از عمل آب‌مروارید نیازمند ارجاع فوری.`
    );
  }
  if (input.purulentDischarge) {
    pushUnique(
      "POSTOP_PURULENT_DISCHARGE",
      `هشدار فوری در ${eyeFa}: ترشح چرکی چشم نیازمند بررسی فوری عفونت چشمی.`
    );
  }
  if (input.flashesOrCurtain) {
    pushUnique(
      "POSTOP_RETINAL_DETACHMENT_RISK",
      `هشدار فوری در ${eyeFa}: جرقه یا پرده سیاه در میدان دید نیازمند بررسی فوری شبکیه.`
    );
  }

  const text = input.freeTextFa?.trim() ?? "";
  if (text.length > 0) {
    for (const item of PERSIAN_RED_FLAG_KEYWORDS) {
      if (text.includes(item.keyword)) {
        pushUnique(
          item.ruleCode,
          `هشدار فوری در ${eyeFa}: عبارت خطرساز «${item.keyword}» در گزارش بیمار شناسایی شد.`
        );
      }
    }
  }

  return signals;
}

export interface EyeDropItemRuleInput {
  readonly drugNameFa: string;
  readonly frequencyPerDay: number;
  readonly durationDays: number;
}

export interface EyePrescriptionRuleInput {
  readonly eyeLaterality: string;
  readonly items: readonly EyeDropItemRuleInput[];
}

export function validateEyePrescriptionInput(input: EyePrescriptionRuleInput): ValidationResult {
  const errors: string[] = [];

  try {
    assertSingleEyeLaterality(input.eyeLaterality);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Invalid eyeLaterality");
  }

  if (input.items.length === 0) {
    errors.push("نسخه باید حداقل شامل یک قطره چشمی باشد.");
  }

  input.items.forEach((item, idx) => {
    if (!item.drugNameFa || item.drugNameFa.trim().length < 2) {
      errors.push(`نام فارسی دارو در ردیف ${idx + 1} نامعتبر است.`);
    }
    if (!Number.isInteger(item.frequencyPerDay) || item.frequencyPerDay < 1 || item.frequencyPerDay > 24) {
      errors.push(`تعداد دفعات مصرف روزانه در ردیف ${idx + 1} باید بین ۱ تا ۲۴ باشد.`);
    }
    if (!Number.isInteger(item.durationDays) || item.durationDays < 1 || item.durationDays > 180) {
      errors.push(`مدت مصرف دارو در ردیف ${idx + 1} باید بین ۱ تا ۱۸۰ روز باشد.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
