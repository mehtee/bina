export type KnownFeatureFlagKey =
  | "wave1_care_ops"
  | "wave3_diagnostics"
  | "wave4_r2_monitoring"
  | "icare_home2"
  | "research_exports"
  | "billing_evidence"
  | "ai_copilot_llm"
  | "staff_web_dark_sidebar_default";

export interface FeatureFlagDescriptor {
  readonly flagKey: KnownFeatureFlagKey;
  readonly labelFa: string;
  readonly descriptionFa: string;
  readonly defaultEnabled: boolean;
}

export const KNOWN_FEATURE_FLAGS: readonly FeatureFlagDescriptor[] = [
  {
    flagKey: "wave1_care_ops",
    labelFa: "ماژول مراقبت پس از عمل و تریاژ",
    descriptionFa: "مدیریت اپیزودهای چشم‌جدا، نسخه‌های قطره و صف تریاژ کلینیک.",
    defaultEnabled: true,
  },
  {
    flagKey: "wave3_diagnostics",
    labelFa: "موتور تشخیص هوشمند ۶لایه (Pillar 2)",
    descriptionFa: "تحلیل چندوجهی فاندوس، OCT، توپوگرافی، میدان بینایی و آزمایش‌ها با تایید چشم‌پزشک.",
    defaultEnabled: true,
  },
  {
    flagKey: "wave4_r2_monitoring",
    labelFa: "پایش خانگی بینایی (R2)",
    descriptionFa: "آزمون‌های کالیبره‌شده Landolt C و Amsler در منزل همراه با پایش کیفیت سنسورها.",
    defaultEnabled: true,
  },
  {
    flagKey: "icare_home2",
    labelFa: "اتصال فشارسنج خانگی iCare HOME2",
    descriptionFa: "دریافت و ارزیابی فشار داخل چشم خانگی و ایجاد هشدار در صورت افزایش غیرطبیعی.",
    defaultEnabled: true,
  },
  {
    flagKey: "research_exports",
    labelFa: "خروجی پژوهشی شبه‌نام‌دار (IRB)",
    descriptionFa: "استخراج کوهورت تحقیقاتی با حذف هویت بیمار و نیازمند کد مصوبه اخلاق و تایید مجدد.",
    defaultEnabled: true,
  },
  {
    flagKey: "billing_evidence",
    labelFa: "بسته مستندات بیمه‌ای و پیگیری",
    descriptionFa: "تهیه مستندات غیرتشخیصی پایبندی و پایش از راه دور جهت ارائه به بیمه تکمیلی.",
    defaultEnabled: true,
  },
  {
    flagKey: "ai_copilot_llm",
    labelFa: "پیش‌نویس گزارش ساختاریافته فارسی LLM",
    descriptionFa: "تولید پیش‌نویس فارسی گزارش بالینی از شواهد تاییدشده لایه‌های ۱ تا ۳.",
    defaultEnabled: true,
  },
  {
    flagKey: "staff_web_dark_sidebar_default",
    labelFa: "پیش‌فرض منوی تیره در پنل وب",
    descriptionFa: "نمایش منوی کناری با پوسته تیره در داشبورد وب کادر درمان.",
    defaultEnabled: false,
  },
];

export interface FeatureFlagOverrideInput {
  readonly flagKey: string;
  readonly enabled: boolean;
  readonly config?: Record<string, unknown> | undefined;
  readonly updatedAtIso?: string | undefined;
}

export interface EvaluatedFeatureFlag {
  readonly flagKey: string;
  readonly labelFa: string;
  readonly descriptionFa: string;
  readonly enabled: boolean;
  readonly config: Record<string, unknown>;
  readonly updatedAtIso?: string | undefined;
}

export function evaluateFeatureFlags(
  overrides: readonly FeatureFlagOverrideInput[]
): EvaluatedFeatureFlag[] {
  const byKey = new Map<string, FeatureFlagOverrideInput>();
  for (const ov of overrides) {
    byKey.set(ov.flagKey, ov);
  }

  const results: EvaluatedFeatureFlag[] = KNOWN_FEATURE_FLAGS.map((desc) => {
    const ov = byKey.get(desc.flagKey);
    return {
      flagKey: desc.flagKey,
      labelFa: desc.labelFa,
      descriptionFa: desc.descriptionFa,
      enabled: ov ? ov.enabled : desc.defaultEnabled,
      config: ov?.config ?? {},
      updatedAtIso: ov?.updatedAtIso,
    };
  });

  const knownSet = new Set<string>(KNOWN_FEATURE_FLAGS.map((f) => f.flagKey));
  for (const ov of overrides) {
    if (!knownSet.has(ov.flagKey)) {
      results.push({
        flagKey: ov.flagKey,
        labelFa: ov.flagKey,
        descriptionFa: "تنظیم سفارشی کلینیک",
        enabled: ov.enabled,
        config: ov.config ?? {},
        updatedAtIso: ov.updatedAtIso,
      });
    }
  }

  return results;
}
