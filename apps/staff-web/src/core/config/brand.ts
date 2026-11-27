export interface StaffBrand {
  readonly appNameFa: string;
  readonly appNameEn: string;
  readonly clinicalSubtitleFa: string;
  readonly clinicalSubtitleEn: string;
}

export function getStaffBrand(): StaffBrand {
  const appNameFa = (import.meta.env.VITE_APP_BRAND_NAME_FA as string | undefined)?.trim() || "بینا";
  const appNameEn = (import.meta.env.VITE_APP_BRAND_NAME_EN as string | undefined)?.trim() || "Bina AI";

  return {
    appNameFa,
    appNameEn,
    clinicalSubtitleFa: `پلتفرم هوشمند چشم‌پزشکی ${appNameFa}`,
    clinicalSubtitleEn: "Clinical Workstation",
  };
}

export function formatBrandText(template: string, brand: StaffBrand = getStaffBrand()): string {
  return template.replaceAll("{appName}", brand.appNameFa).replaceAll("{appNameEn}", brand.appNameEn);
}
