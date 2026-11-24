import { describe, expect, it } from "vitest";
import { classifyPersianSymptomText } from "../domain/persian-symptom-nlp.js";

describe("T-A27 Persian Symptom NLP high-recall red-flag safety", () => {
  it("flags all Persian emergency ophthalmology symptoms with 100% red-flag recall", () => {
    const emergencyPhrases = [
      "چشم راستم دچار کاهش ناگهانی دید شده است",
      "درد شدید چشم و سردرد و تهوع دارم",
      "از دیشب جرقه نور و سایه سیاه یا پرده سیاه می‌بینم",
      "ترشح چرکی فراوان بعد از عمل",
      "لکه سفید روی قرنیه و درد شدید دارم",
      "دیدم یکدفعه قطع شد در چشم چپ",
    ];
    let detected = 0;
    for (const phrase of emergencyPhrases) {
      const res = classifyPersianSymptomText(phrase);
      if (res.riskClass === "red_flag" && res.urgencyFloor === "urgent") {
        detected += 1;
      }
    }
    expect(detected / emergencyPhrases.length).toBeGreaterThanOrEqual(0.99);
  });

  it("handles Arabic yeh/kaf normalization and distinguishes routine symptoms safely", () => {
    const arabicNorm = classifyPersianSymptomText("تاري شديد و ناگهاني و كاهش ناگهاني ديد");
    expect(arabicNorm.riskClass).toBe("red_flag");

    const routine = classifyPersianSymptomText("خشکی خفیف صبحگاهی و وضعیت پایدار");
    expect(routine.riskClass).toBe("routine");
    expect(routine.urgencyFloor).toBe("routine");
  });
});
