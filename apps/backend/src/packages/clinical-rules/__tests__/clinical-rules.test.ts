import { describe, expect, it } from "vitest";
import { asPatientId } from "../../domain-kernel/index.js";
import {
  computeFinalUrgencyTier,
  evaluatePostCataractSymptoms,
  Pillar2UrgentFloorEvaluator,
  validateEyePrescriptionInput,
} from "../index.js";

describe("clinical-rules deterministic invariants (Pillar 1 + Pillar 2)", () => {
  it("detects structured and colloquial Persian post-cataract red flags cleanly", () => {
    const clean = evaluatePostCataractSymptoms({
      eyeLaterality: "OD",
      severePain: false,
      suddenVisionLoss: false,
      purulentDischarge: false,
      freeTextFa: "احساس خارش خفیف دارم",
    });
    expect(clean).toEqual([]);

    const redText = evaluatePostCataractSymptoms({
      eyeLaterality: "OS",
      severePain: false,
      suddenVisionLoss: false,
      purulentDischarge: false,
      freeTextFa: "از صبح درد شدید و کاهش ناگهانی دید در چشم چپ دارم",
    });
    expect(redText.length).toBeGreaterThanOrEqual(2);
    expect(redText.every((s) => s.urgencyFloor === "urgent" && s.eyeLaterality === "OS")).toBe(true);
    expect(redText[0]?.summaryFa).toContain("چشم چپ");
  });

  it("blocks ambiguous laterality or invalid doses in eye prescriptions", () => {
    expect(
      validateEyePrescriptionInput({
        eyeLaterality: "OU",
        items: [{ drugNameFa: "بتامتازون", frequencyPerDay: 4, durationDays: 7 }],
      }).valid
    ).toBe(false);

    expect(
      validateEyePrescriptionInput({
        eyeLaterality: "OD",
        items: [{ drugNameFa: "بتامتازون", frequencyPerDay: 4, durationDays: 7 }],
      }).valid
    ).toBe(true);
  });

  it("never downgrades urgent Pillar 2 findings even when Fusion recommends routine", () => {
    const evaluator = new Pillar2UrgentFloorEvaluator();
    for (const criticalCondition of [
      "infectious_keratitis",
      "papilledema",
      "retinal_detachment",
      "active_cnv",
      "high_risk_rop",
      "postop_endophthalmitis",
    ]) {
      const signals = evaluator.evaluate({
        patientId: asPatientId("pat-1"),
        eyeLaterality: "OD",
        specialistFindings: [{ probabilities: { [criticalCondition]: 0.72 } }],
      });
      expect(signals).toHaveLength(1);
      expect(computeFinalUrgencyTier("routine", signals)).toBe("urgent");
      expect(computeFinalUrgencyTier("followup_3_6m", signals)).toBe("urgent");
    }
  });
});
