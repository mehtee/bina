import type { EyeLaterality, UrgencyTier } from "../domain-kernel/index.js";

export type HomeTestQualityCode =
  | "distance_out_of_range"
  | "lighting_out_of_range"
  | "excessive_tilt"
  | "glare_detected";

export interface HomeTestQualityInput {
  readonly viewingDistanceCm: number;
  readonly ambientLux: number;
  readonly deviceTiltDeg: number;
  readonly glareDetected: boolean;
}

export interface HomeTestQualityResult {
  readonly passed: boolean;
  readonly rejectionCodes: readonly HomeTestQualityCode[];
  readonly reasonsFa: readonly string[];
  readonly instructionFa: string | null;
}

export function evaluateHomeTestQuality(input: HomeTestQualityInput): HomeTestQualityResult {
  const rejectionCodes: HomeTestQualityCode[] = [];
  const reasonsFa: string[] = [];

  if (input.viewingDistanceCm < 25 || input.viewingDistanceCm > 60) {
    rejectionCodes.push("distance_out_of_range");
    reasonsFa.push("فاصله گوشی تا چشم خارج از بازه مجاز ۲۵ تا ۶۰ سانتی‌متر است");
  }
  if (input.ambientLux < 80 || input.ambientLux > 1200) {
    rejectionCodes.push("lighting_out_of_range");
    reasonsFa.push("نور محیط برای سنجش دقیق دید مناسب نیست");
  }
  if (Math.abs(input.deviceTiltDeg) > 20) {
    rejectionCodes.push("excessive_tilt");
    reasonsFa.push("گوشی به صورت عمودی و صاف نگه داشته نشده است");
  }
  if (input.glareDetected) {
    rejectionCodes.push("glare_detected");
    reasonsFa.push("بازتاب نور یا خیرگی روی صفحه وجود دارد");
  }

  const passed = rejectionCodes.length === 0;
  return {
    passed,
    rejectionCodes,
    reasonsFa,
    instructionFa: passed
      ? null
      : `آزمون خانگی ثبت نشد (${reasonsFa.join("، ")}). لطفاً در محیط با نور یکنواخت آزمون را تکرار کنید.`,
  };
}

export interface LongitudinalVaPoint {
  readonly vaLogmar: number | null;
  readonly amslerDistortionScore: number;
  readonly amslerCentralScotoma: boolean;
}

export interface TrendAssessmentResult {
  readonly eyeLaterality: EyeLaterality;
  readonly alertTriggered: boolean;
  readonly severity: UrgencyTier;
  readonly ruleCode: string;
  readonly summaryFa: string;
  readonly ewmaValue: number;
  readonly cusumValue: number;
  readonly rciDeltaLogMar: number;
}

export function evaluateEwmaCusumShift(
  values: readonly number[],
  target: number,
  sigma: number,
  lambda = 0.3,
  kSigmaFactor = 0.5,
  hSigmaFactor = 4.0
): { ewma: number; cusum: number; shifted: boolean } {
  const safeSigma = Math.max(0.03, sigma);
  let ewma = target;
  let cusum = 0;
  const k = kSigmaFactor * safeSigma;
  const h = hSigmaFactor * safeSigma;

  for (const x of values) {
    ewma = lambda * x + (1 - lambda) * ewma;
    cusum = Math.max(0, cusum + (x - target - k));
  }

  const ewmaUpperLimit = target + 2.5 * safeSigma * Math.sqrt(lambda / (2 - lambda));
  return {
    ewma: Number(ewma.toFixed(4)),
    cusum: Number(cusum.toFixed(4)),
    shifted: cusum >= h || ewma >= ewmaUpperLimit,
  };
}

/**
 * Evaluates R2 Reliable Change Index (>= 0.20 logMAR), 2-of-N confirmation across the last 3 tests,
 * EWMA/CUSUM shift, and acute Amsler metamorphopsia/scotoma escalation.
 */
export function evaluateReliableChangeAnd2OfN(input: {
  eyeLaterality: EyeLaterality;
  baselineVaLogmar: number;
  baselineSigma: number;
  recentValidTests: readonly LongitudinalVaPoint[];
}): TrendAssessmentResult {
  const { eyeLaterality, baselineVaLogmar, baselineSigma, recentValidTests } = input;
  const eyeLabel = eyeLaterality === "OD" ? "چشم راست" : "چشم چپ";
  const latest = recentValidTests[recentValidTests.length - 1];
  const vaValues = recentValidTests
    .map((t) => t.vaLogmar)
    .filter((v): v is number => typeof v === "number");

  const ewmaCusum = evaluateEwmaCusumShift(
    vaValues.length > 0 ? vaValues : [baselineVaLogmar],
    baselineVaLogmar,
    baselineSigma
  );

  const latestVaDelta =
    latest && typeof latest.vaLogmar === "number"
      ? Number((latest.vaLogmar - baselineVaLogmar).toFixed(3))
      : 0;

  if (latest && (latest.amslerCentralScotoma || latest.amslerDistortionScore >= 0.72)) {
    return {
      eyeLaterality,
      alertTriggered: true,
      severity: "urgent",
      ruleCode: "R2_AMSLER_ACUTE_METAMORPHOPSIA",
      summaryFa: `اعوجاج شدید یا لکه مرکزی جدید در تست امسلر ${eyeLabel}؛ ارزیابی فوری شبکیه ضروری است.`,
      ewmaValue: ewmaCusum.ewma,
      cusumValue: ewmaCusum.cusum,
      rciDeltaLogMar: latestVaDelta,
    };
  }

  const window = recentValidTests.slice(-3);
  const significantDrops = window.filter(
    (t) => typeof t.vaLogmar === "number" && t.vaLogmar - baselineVaLogmar >= 0.2
  ).length;

  if (significantDrops >= 2) {
    return {
      eyeLaterality,
      alertTriggered: true,
      severity: latestVaDelta >= 0.4 ? "urgent" : "followup_3_6m",
      ruleCode: "R2_VA_2OFN_CONFIRMED_DROP",
      summaryFa: `افت تاییدشده حدت بینایی (${significantDrops} از ${window.length} آزمون اخیر، تغییر ${latestVaDelta.toFixed(2)} logMAR) در ${eyeLabel}.`,
      ewmaValue: ewmaCusum.ewma,
      cusumValue: ewmaCusum.cusum,
      rciDeltaLogMar: latestVaDelta,
    };
  }

  if (ewmaCusum.shifted) {
    return {
      eyeLaterality,
      alertTriggered: true,
      severity: "followup_3_6m",
      ruleCode: "R2_EWMA_CUSUM_DRIFT",
      summaryFa: `تغییر روندی معنادار (EWMA/CUSUM) نسبت به خط پایه در ${eyeLabel}.`,
      ewmaValue: ewmaCusum.ewma,
      cusumValue: ewmaCusum.cusum,
      rciDeltaLogMar: latestVaDelta,
    };
  }

  return {
    eyeLaterality,
    alertTriggered: false,
    severity: "routine",
    ruleCode: "R2_WITHIN_BASELINE",
    summaryFa: `روند بینایی ${eyeLabel} در محدوده پایدار نسبت به خط پایه است.`,
    ewmaValue: ewmaCusum.ewma,
    cusumValue: ewmaCusum.cusum,
    rciDeltaLogMar: latestVaDelta,
  };
}
