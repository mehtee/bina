import { describe, expect, it } from "vitest";
import { shapePersianLineForPdf } from "../domain/persian-shaper.js";
import { renderPersianReportPdf } from "../infrastructure/pdfkit-persian-renderer.js";
import type { PersianPdfDocumentPayload } from "../ports/index.js";

describe("reporting deterministic Persian PDF + Vazirmatn shaping", () => {
  it("shapes joined Persian glyphs while keeping LTR drug names intact", () => {
    const shaped = shapePersianLineForPdf("چشم راست — Betamethasone 0.1%");
    expect(shaped).toContain("Betamethasone 0.1%");
    expect(shaped).not.toBe("چشم راست — Betamethasone 0.1%");
    expect(shaped).toMatch(/[\uFB50-\uFEFF]/);
  });

  it("renders valid Vazirmatn PDF bytes and deterministic sourceSha256", async () => {
    const payload: PersianPdfDocumentPayload = {
      reportType: "patient_schedule",
      tenantId: "11111111-1111-4111-8111-111111111111",
      clinicId: "22222222-2222-4222-8222-222222222222",
      patientId: "33333333-3333-4333-8333-333333333333",
      sourceRefId: "44444444-4444-4444-8444-444444444444",
      clinicNameFa: "کلینیک چشم نور",
      issuedAtJalali: "۱۴۰۵/۰۹/۰۲",
      titleFa: "برنامه قطره‌های چشمی پس از جراحی آب‌مروارید",
      emergencyHotlinePhone: "+982182400000",
      sections: [
        {
          headingFa: "برنامه چشم راست (OD)",
          linesFa: ["قطره بتامتازون ۰.۱٪ (Betamethasone 0.1%) — درِ صورتی — هر ۴ ساعت"],
        },
      ],
    };

    const run1 = await renderPersianReportPdf(payload);
    const run2 = await renderPersianReportPdf(payload);

    expect(run1.pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(run1.pdfBuffer.toString("latin1")).toContain("Vazirmatn");
    expect(run1.sourceSha256).toHaveLength(64);
    expect(run1.sourceSha256).toBe(run2.sourceSha256);
  });
});
