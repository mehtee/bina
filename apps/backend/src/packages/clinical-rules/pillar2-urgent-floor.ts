import {
  formatLateralityFa,
  maxUrgency,
  type ClinicalSignal,
  type ClinicalSignalEvaluator,
  type QualifiedPatientEvidence,
  type UrgencyTier,
} from "../domain-kernel/index.js";

const URGENT_CONDITION_FLOOR_MAP: Readonly<Record<string, { ruleCode: string; labelFa: string }>> = {
  infectious_keratitis: {
    ruleCode: "URGENT_FLOOR_INFECTIOUS_KERATITIS",
    labelFa: "کف فوریت قطعی: شک به کراتیت عفونی قرنیه — ارجاع فوری و غیرقابل کاهش به سطح پایین‌تر.",
  },
  papilledema: {
    ruleCode: "URGENT_FLOOR_PAPILLEDEMA",
    labelFa: "کف فوریت قطعی: ادم پاپی — نیازمند ارجاع فوری و ارزیابی عصبی/چشمی.",
  },
  retinal_detachment: {
    ruleCode: "URGENT_FLOOR_RETINAL_DETACHMENT",
    labelFa: "کف فوریت قطعی: جداشدگی شبکیه — نیازمند مداخله اورژانسی شبکیه.",
  },
  active_cnv: {
    ruleCode: "URGENT_FLOOR_ACTIVE_CNV",
    labelFa: "کف فوریت قطعی: CNV فعال شبکیه — نیازمند ارجاع فوری برای بررسی تزریق.",
  },
  high_risk_rop: {
    ruleCode: "URGENT_FLOOR_HIGH_RISK_ROP",
    labelFa: "کف فوریت قطعی: رتینوپاتی نوزادان نارس (ROP) پرخطر — نیازمند اقدام فوری.",
  },
  postop_endophthalmitis: {
    ruleCode: "URGENT_FLOOR_POSTOP_ENDOPHTHALMITIS",
    labelFa: "کف فوریت قطعی: شک به اندوفتالمیت پس از عمل — ارجاع فوری به اورژانس چشم.",
  },
};

export const URGENT_PROBABILITY_THRESHOLD = 0.55;

export class Pillar2UrgentFloorEvaluator implements ClinicalSignalEvaluator {
  readonly evaluatorId = "pillar2-deterministic-urgent-floor-v1";

  evaluate(input: QualifiedPatientEvidence): ClinicalSignal[] {
    const signals: ClinicalSignal[] = [];
    const seen = new Set<string>();
    const eyeFa = formatLateralityFa(input.eyeLaterality);

    for (const finding of input.specialistFindings ?? []) {
      const probs = (finding.probabilities ?? {}) as Record<string, unknown>;
      for (const [conditionCode, meta] of Object.entries(URGENT_CONDITION_FLOOR_MAP)) {
        const val = probs[conditionCode];
        if (typeof val === "number" && val >= URGENT_PROBABILITY_THRESHOLD && !seen.has(meta.ruleCode)) {
          seen.add(meta.ruleCode);
          signals.push({
            ruleCode: meta.ruleCode,
            urgencyFloor: "urgent",
            eyeLaterality: input.eyeLaterality,
            summaryFa: `${meta.labelFa} (${eyeFa})`,
          });
        }
      }
    }

    const differential = (input.clinicalContext?.differential ?? []) as ReadonlyArray<Record<string, unknown>>;
    for (const item of differential) {
      const code = typeof item.conditionCode === "string" ? item.conditionCode : "";
      const conf = typeof item.confidence === "number" ? item.confidence : 0;
      const meta = URGENT_CONDITION_FLOOR_MAP[code];
      if (meta && conf >= URGENT_PROBABILITY_THRESHOLD && !seen.has(meta.ruleCode)) {
        seen.add(meta.ruleCode);
        signals.push({
          ruleCode: meta.ruleCode,
          urgencyFloor: "urgent",
          eyeLaterality: input.eyeLaterality,
          summaryFa: `${meta.labelFa} (${eyeFa})`,
        });
      }
    }

    return signals;
  }
}

/**
 * Computes final deterministic urgency tier. Fusion probability smoothing or LLM text
 * can NEVER downgrade a triggered deterministic urgency floor.
 */
export function computeFinalUrgencyTier(
  fusionRecommendedUrgency: UrgencyTier,
  signals: readonly ClinicalSignal[]
): UrgencyTier {
  let finalTier: UrgencyTier = fusionRecommendedUrgency;
  for (const sig of signals) {
    finalTier = maxUrgency(finalTier, sig.urgencyFloor);
  }
  return finalTier;
}
