import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_NAME_EN, DEFAULT_BRAND_NAME_FA, getAppBrand } from "../brand.js";

describe("app brand configuration", () => {
  it("falls back to default Persian and English brand names", () => {
    expect(getAppBrand({})).toEqual({
      nameFa: DEFAULT_BRAND_NAME_FA,
      nameEn: DEFAULT_BRAND_NAME_EN,
    });
  });

  it("overrides brand names dynamically from APP_BRAND_NAME_FA and APP_BRAND_NAME_EN", () => {
    expect(
      getAppBrand({
        APP_BRAND_NAME_FA: "نورچشم",
        APP_BRAND_NAME_EN: "NoorCheshm AI",
      })
    ).toEqual({
      nameFa: "نورچشم",
      nameEn: "NoorCheshm AI",
    });
  });
});
