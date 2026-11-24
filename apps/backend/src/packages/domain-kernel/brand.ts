export const DEFAULT_BRAND_NAME_FA = "بینا";
export const DEFAULT_BRAND_NAME_EN = "Bina AI";

export interface AppBrandConfig {
  readonly nameFa: string;
  readonly nameEn: string;
}

/**
 * Single source of truth for user-facing brand names across backend services,
 * SMS templates, PDF metadata, FHIR descriptions, and LLM system prompts.
 * Override via APP_BRAND_NAME_FA / APP_BRAND_NAME_EN in .env to rename the product everywhere.
 */
export function getAppBrand(
  env: Readonly<Record<string, string | undefined>> = process.env
): AppBrandConfig {
  const nameFa = env.APP_BRAND_NAME_FA?.trim() || DEFAULT_BRAND_NAME_FA;
  const nameEn = env.APP_BRAND_NAME_EN?.trim() || DEFAULT_BRAND_NAME_EN;
  return { nameFa, nameEn };
}
