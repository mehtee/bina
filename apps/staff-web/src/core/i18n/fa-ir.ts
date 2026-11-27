export type EyeCode = "OD" | "OS";
export type StudyEyeCode = "OD" | "OS" | "OU";
export type UrgencyTier = "routine" | "followup_3_6m" | "urgent";
export type AdherenceState = "taken" | "missed_with_reason" | "unavailable" | "no_response";
export type AccessMode = "app" | "caregiver" | "print_phone";

export const URGENCY_LABELS_FA: Record<UrgencyTier, string> = {
  routine: "عادی",
  followup_3_6m: "پیگیری ۳ تا ۶ ماه",
  urgent: "ارجاع فوری",
};

export const ADHERENCE_LABELS_FA: Record<AdherenceState, string> = {
  taken: "مصرف شد",
  missed_with_reason: "مصرف نشد + دلیل",
  unavailable: "دارو در دسترس نبود",
  no_response: "پاسخی دریافت نشد",
};

export const ACCESS_MODE_LABELS_FA: Record<AccessMode, string> = {
  app: "اپلیکیشن بیمار",
  caregiver: "همراه بیمار",
  print_phone: "چاپی و تلفنی (Print+Phone)",
};

export const MODALITY_LABELS_FA: Record<string, string> = {
  fundus: "فوندوس شبکیه (CFP)",
  oct: "توموگرافی OCT",
  octa: "آنژیوگرافی OCT-A",
  slit_lamp: "بخش قدامی (Slit-Lamp)",
  topography: "توپوگرافی قرنیه",
  visual_field: "میدان بینایی (VF)",
  tabular_xgb: "داده‌های بالینی و آزمایشگاهی",
  tabular_labs: "داده‌های بالینی و آزمایشگاهی",
};

export const STUDY_STATUS_LABELS_FA: Record<string, string> = {
  ingested: "دریافت‌شده",
  queued: "در صف پردازش",
  analyzed: "تحلیل‌شده",
  qc_failed: "رد کنترل کیفیت (QC)",
  pending_hitl: "در انتظار تایید چشم‌پزشک",
  signed_off: "تایید و امضاشده",
};

export const TRIAGE_STATUS_LABELS_FA: Record<string, string> = {
  New: "جدید",
  OwnerAssigned: "تخصیص‌یافته",
  ContactAttempted: "تلاش برای تماس",
  ContactEstablished: "تماس برقرار شد",
  Escalated: "ارجاع به چشم‌پزشک",
  Referred: "ارجاع‌شده به مرکز مقصد",
  Closed: "بسته‌شده",
};

export const SEVERITY_LABELS_FA: Record<string, string> = {
  normal: "طبیعی",
  mild: "خفیف",
  moderate: "متوسط",
  severe: "شدید",
  urgent: "فوری",
};

export const ROLE_LABELS_FA: Record<string, string> = {
  ophthalmologist: "چشم‌پزشک",
  optometrist: "اپتومتریست",
  technician: "تکنسین تصویربرداری",
  coordinator: "هماهنگ‌کننده مراقبت",
  admin: "مدیر کلینیک",
};

export const PROTOCOL_LABELS_FA: Record<string, string> = {
  post_cataract: "مراقبت پس از جراحی کاتاراکت",
  post_retina: "مراقبت پس از جراحی شبکیه",
  glaucoma_followup: "پیگیری گلوکوم",
};

export const REFERRAL_STATUS_LABELS_FA: Record<string, string> = {
  dispatched: "ارجاع ارسال‌شده",
  attended: "مراجعه انجام شد",
  missed: "عدم مراجعه",
};

export const FOLLOWUP_TYPE_LABELS_FA: Record<string, string> = {
  postop_call: "تماس پیگیری پس از عمل",
  referral_followup: "پیگیری نتیجه ارجاع",
  print_phone_checkin: "پیگیری تلفنی (Print+Phone)",
  clinic_visit: "ویزیت حضوری کلینیک",
};

export const FOLLOWUP_STATUS_LABELS_FA: Record<string, string> = {
  pending: "در انتظار اقدام",
  completed: "انجام شد",
  missed: "عدم حضور / ناموفق",
  cancelled: "لغوشده",
};

export const REPORT_TYPE_LABELS_FA: Record<string, string> = {
  signed_diagnostic: "گزارش تشخیصی تاییدشده",
  postop_care_plan: "برنامه چاپی مراقبت پس از عمل",
  referral_summary: "خلاصه ارجاع تخصصی",
  r2_monitoring_summary: "گزارش پایش خانگی بینایی",
};

export const R2_TEST_TYPE_LABELS_FA: Record<string, string> = {
  landolt_c: "حدت بینایی لاندولت C",
  amsler: "شبکه آمسلر",
  contrast_sensitivity: "حساسیت کنتراست",
};

export const R2_QUALITY_LABELS_FA: Record<string, string> = {
  accepted: "معتبر (تایید کیفیت)",
  rejected: "ردشده در کنترل کیفیت",
  borderline: "مرزی",
};

export const LANDOLT_DIR_LABELS_FA: Record<string, string> = {
  top: "بالا",
  bottom: "پایین",
  left: "چپ",
  right: "راست",
};

export const AUDIT_ACTION_LABELS_FA: Record<string, string> = {
  "prescription.published": "انتشار نسخه دارویی",
  "diagnostic.urgent-floor-applied": "اعمال کف فوریت قطعی",
  "diagnostic.signed-off": "امضای نهایی چشم‌پزشک",
  "triage.claimed": "تخصیص پرونده تریاژ",
  "triage.contact-logged": "ثبت تماس تریاژ",
  "triage.closed": "بستن پرونده تریاژ",
  "break_glass.opened": "ایجاد نشست دسترسی اضطراری",
  "break_glass.revoked": "لغو نشست دسترسی اضطراری",
};

export const INTEGRATION_TYPE_LABELS_FA: Record<string, string> = {
  dicomweb: "DICOMweb (PACS)",
  fhir: "HL7 FHIR",
  his: "سامانه بیمارستانی HIS",
  device: "دستگاه تصویربرداری",
};

export const DELIVERY_STATUS_LABELS_FA: Record<string, string> = {
  ok: "متصل و سالم",
  delivered: "ارسال موفق",
  outbound: "ارسالی (خروجی)",
  inbound: "دریافتی (ورودی)",
  failed: "ناموفق",
  pending: "در صف ارسال",
};

export function formatStudyStatusFa(status: string | null | undefined): string {
  return (status && STUDY_STATUS_LABELS_FA[status]) || status || "نامشخص";
}

export function formatTriageStatusFa(status: string | null | undefined): string {
  return (status && TRIAGE_STATUS_LABELS_FA[status]) || status || "نامشخص";
}

export function formatSeverityFa(sev: string | null | undefined): string {
  return (sev && SEVERITY_LABELS_FA[sev]) || sev || "نامشخص";
}

export function formatRoleFa(role: string | null | undefined): string {
  return (role && ROLE_LABELS_FA[role]) || role || "نامشخص";
}

export function formatProtocolFa(protocol: string | null | undefined): string {
  return (protocol && PROTOCOL_LABELS_FA[protocol]) || protocol || "نامشخص";
}

export function formatReferralStatusFa(status: string | null | undefined): string {
  return (status && REFERRAL_STATUS_LABELS_FA[status]) || status || "نامشخص";
}

export function formatFollowUpTypeFa(t: string | null | undefined): string {
  return (t && FOLLOWUP_TYPE_LABELS_FA[t]) || t || "نامشخص";
}

export function formatFollowUpStatusFa(s: string | null | undefined): string {
  return (s && FOLLOWUP_STATUS_LABELS_FA[s]) || s || "نامشخص";
}

export function formatReportTypeFa(t: string | null | undefined): string {
  return (t && REPORT_TYPE_LABELS_FA[t]) || t || "نامشخص";
}

export function formatModalityFa(m: string | null | undefined): string {
  return (m && MODALITY_LABELS_FA[m]) || m || "نامشخص";
}

export function formatAuditActionFa(a: string | null | undefined): string {
  return (a && AUDIT_ACTION_LABELS_FA[a]) || a || "نامشخص";
}

export function formatR2TrialPayloadFa(payload: unknown): string {
  if (!payload || typeof payload !== "object") return String(payload ?? "—");
  const rec = payload as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof rec.gapDir === "string") {
    parts.push(`جهت: ${LANDOLT_DIR_LABELS_FA[rec.gapDir] ?? rec.gapDir}`);
  }
  if (typeof rec.logmar === "number") {
    parts.push(`logMAR: ${formatPersianDigits(rec.logmar)}`);
  }
  if (parts.length > 0) return parts.join(" • ");
  return JSON.stringify(payload);
}

export const AUXILIARY_GRADCAM_LABEL_FA =
  "راهنمای توجه مدل — غیرقابل استفاده به‌جای سگمنتیشن دقیق";

export const KPI_UNAVAILABLE_FA = "قابل محاسبه نیست";

export const DEMO_BANNER_TEXT_FA = "محیط نمایشی — داده آزمایشی (بدون ارتباط زنده با سرور)";

export function formatEyeLabelFa(eye: EyeCode | StudyEyeCode | string | null | undefined): string {
  if (eye === "OD") return "چشم راست (OD)";
  if (eye === "OS") return "چشم چپ (OS)";
  if (eye === "OU") return "هر دو چشم (OU)";
  return "نامشخص";
}

export function formatPersianDigits(input: string | number): string {
  const map = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;
  return String(input).replace(/\d/g, (d) => map[Number(d)] ?? d);
}

export function normalizeLatinDigits(input: string): string {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return input
    .replace(/[۰-۹]/g, (ch) => String(persian.indexOf(ch)))
    .replace(/[٠-٩]/g, (ch) => String(arabic.indexOf(ch)))
    .replaceAll("٫", ".")
    .replaceAll("،", ".");
}

export function formatJalaliDateTime(iso: string | Date | null | undefined, withTime = false): string {
  if (!iso) return "ثبت نشده";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "نامعتبر";
  const datePart = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tehran",
  }).format(date);
  if (!withTime) return datePart;
  const timePart = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tehran",
  }).format(date);
  return `${datePart} — ${timePart}`;
}

export function formatPercentFa(rate: number | null | undefined, decimals = 0): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) {
    return KPI_UNAVAILABLE_FA;
  }
  const pct = (rate * 100).toFixed(decimals);
  return `${formatPersianDigits(pct)}٪`;
}

export function maskErrorForUser(code: string | undefined, fallbackFa?: string): string {
  if (fallbackFa && fallbackFa.trim().length > 0) return fallbackFa;
  switch (code) {
    case "URGENT_FLOOR_DOWNGRADE_FORBIDDEN":
      return "کاهش سطح فوریت زیر حد اضطراری قطعی مجاز نیست.";
    case "DRAFT_VERSION_CONFLICT":
      return "نسخه پیش‌نویس تغییر کرده است؛ لطفاً مقایسه و بازآوری انجام دهید.";
    case "REPORT_DRAFT_VALIDATION_FAILED":
      return "پیش‌نویس گزارش با قواعد ایمنی بالینی سازگار نیست.";
    case "DEVICE_KILL_SWITCH_ACTIVE":
      return "ثبت آزمون روی این دستگاه به دلیل غیرفعالسازی ایمنی (Kill-Switch) مسدود است.";
    case "URGENT_CASE_RESOLUTION_REQUIRED":
      return "بستن پرونده فوری پیش از تماس، ارجاع، یا تایید پزشک مجاز نیست.";
    case "SMS_PHI_VIOLATION":
      return "قالب پیامک نباید حاوی نام دارو، تشخیص یا اطلاعات هویتی باشد.";
    case "LAST_ACTIVE_ADMIN_FORBIDDEN":
      return "غیرفعال‌سازی یا تغییر نقش آخرین مدیر فعال کلینیک مجاز نیست.";
    case "FORBIDDEN_STEP_UP_REQUIRED":
      return "برای این عملیات، تایید مجدد امنیتی (Step-Up) الزامی است.";
    case "FORBIDDEN_ROLE":
      return "دسترسی به این بخش با نقش فعلی شما مجاز نیست.";
    default:
      return "خطایی در پردازش درخواست رخ داد؛ لطفاً دوباره تلاش کنید.";
  }
}
