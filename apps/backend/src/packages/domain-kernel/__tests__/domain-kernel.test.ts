import { describe, expect, it } from "vitest";
import {
  asEpisodeId,
  asPatientId,
  asTenantId,
  assertSingleEyeLaterality,
  err,
  flatMap,
  formatLateralityFa,
  isErr,
  isOk,
  map,
  maxUrgency,
  ok,
  URGENCY_LABELS_FA,
} from "../index.js";

describe("domain-kernel invariants", () => {
  it("enforces branded non-empty identifiers", () => {
    expect(asTenantId("11111111-1111-4111-8111-111111111111")).toBe("11111111-1111-4111-8111-111111111111");
    expect(asPatientId("pat-1")).toBe("pat-1");
    expect(asEpisodeId("ep-1")).toBe("ep-1");
    expect(() => asTenantId("   ")).toThrow(RangeError);
  });

  it("renders full Persian eye wording and blocks ambiguous single-eye laterality", () => {
    expect(formatLateralityFa("OD")).toBe("چشم راست");
    expect(formatLateralityFa("OS")).toBe("چشم چپ");
    expect(formatLateralityFa("OU")).toBe("هر دو چشم");
    expect(assertSingleEyeLaterality("od")).toBe("OD");
    expect(assertSingleEyeLaterality(" OS ")).toBe("OS");
    expect(() => assertSingleEyeLaterality("OU")).toThrow(RangeError);
    expect(() => assertSingleEyeLaterality("")).toThrow(RangeError);
  });

  it("enforces monotonic urgent-floor non-downgrade and Persian urgency labels", () => {
    expect(URGENCY_LABELS_FA.routine).toBe("عادی");
    expect(URGENCY_LABELS_FA.followup_3_6m).toBe("پیگیری ۳ تا ۶ ماه");
    expect(URGENCY_LABELS_FA.urgent).toBe("ارجاع فوری");

    expect(maxUrgency("urgent", "routine")).toBe("urgent");
    expect(maxUrgency("routine", "urgent")).toBe("urgent");
    expect(maxUrgency("followup_3_6m", "routine")).toBe("followup_3_6m");
    expect(maxUrgency("followup_3_6m", "urgent")).toBe("urgent");
  });

  it("handles Result monadic helpers cleanly", () => {
    const r1 = ok(21);
    expect(isOk(r1)).toBe(true);
    const doubled = map(r1, (n) => n * 2);
    expect(doubled).toEqual({ ok: true, value: 42 });

    const rErr = flatMap(doubled, () => err("rejected"));
    expect(isErr(rErr)).toBe(true);
  });
});
