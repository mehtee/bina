export const SYNTHETIC_CONSTANTS = {
  TENANT_A: "11111111-1111-4111-8111-111111111111",
  CLINIC_A1: "22222222-2222-4222-8222-222222222201",
  CLINIC_A2: "22222222-2222-4222-8222-222222222202",
  USER_OPHTH: "33333333-3333-4333-8333-333333333301",
  USER_OPTO: "33333333-3333-4333-8333-333333333302",
  USER_TECH: "33333333-3333-4333-8333-333333333303",
  USER_COORD: "33333333-3333-4333-8333-333333333304",
  USER_ADMIN: "33333333-3333-4333-8333-333333333305",
  PATIENT_1: "44444444-4444-4444-8444-444444444401",
  PATIENT_2: "44444444-4444-4444-8444-444444444402",
  PATIENT_3: "44444444-4444-4444-8444-444444444403",
  EPISODE_1_OD: "55555555-5555-4555-8555-555555555501",
  EPISODE_2_OS_PP: "55555555-5555-4555-8555-555555555502",
  STUDY_1_CNV: "66666666-6666-4666-8666-666666666601",
  STUDY_2_QC_FAIL: "66666666-6666-4666-8666-666666666602",
  STUDY_3_SIGNED_PRIOR: "66666666-6666-4666-8666-666666666603",
  CASE_1_URGENT: "77777777-7777-4777-8777-777777777701",
  CASE_2_PP: "77777777-7777-4777-8777-777777777702",
  REFERRAL_1: "88888888-8888-4888-8888-888888888801",
  SESSION_R2_1: "99999999-9999-4999-8999-999999999901",
  SESSION_R2_2: "99999999-9999-4999-8999-999999999902",
  DEVICE_1: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01",
  DEVICE_2_KILLED: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02",
  REPORT_1: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01",
  ENDPOINT_1: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
} as const;

export const SYNTHETIC_DEMO_ACCOUNTS = [
  {
    userId: SYNTHETIC_CONSTANTS.USER_OPHTH,
    role: "ophthalmologist" as const,
    nameFa: "دکتر علیرضا مرادی",
    roleLabelFa: "چشم‌پزشک (دارای مجوز تایید و نسخه)",
    oidcToken: `dev-oidc:${SYNTHETIC_CONSTANTS.USER_OPHTH}`,
  },
  {
    userId: SYNTHETIC_CONSTANTS.USER_COORD,
    role: "coordinator" as const,
    nameFa: "سهراب کاظمی",
    roleLabelFa: "هماهنگ‌کننده مراقبت و تریاژ",
    oidcToken: `dev-oidc:${SYNTHETIC_CONSTANTS.USER_COORD}`,
  },
  {
    userId: SYNTHETIC_CONSTANTS.USER_TECH,
    role: "technician" as const,
    nameFa: "سارا نادری",
    roleLabelFa: "تکنسین تصویربرداری (بدون مجوز امضا)",
    oidcToken: `dev-oidc:${SYNTHETIC_CONSTANTS.USER_TECH}`,
  },
  {
    userId: SYNTHETIC_CONSTANTS.USER_ADMIN,
    role: "admin" as const,
    nameFa: "امیرحسین رضایی",
    roleLabelFa: "مدیر کلینیک و عملیات",
    oidcToken: `dev-oidc:${SYNTHETIC_CONSTANTS.USER_ADMIN}`,
  },
] as const;

export const ALL_CAPABILITY_KEYS = [
  "clinic:read",
  "patient:read",
  "patient:enroll",
  "episode:create",
  "prescription:publish",
  "triage:manage",
  "r2:manage",
  "study:upload",
  "diagnostic:signoff",
  "report:read",
  "report:create",
  "analytics:read",
  "admin:manage",
  "integrations:manage",
  "audit:read",
  "ops:read",
  "export:phi",
  "break_glass:access",
] as const;

export function roleCapabilities(
  role: "ophthalmologist" | "optometrist" | "technician" | "coordinator" | "admin",
  stepUpVerified: boolean
): Record<string, boolean> {
  const matrix: Record<string, string[]> = {
    ophthalmologist: [
      "clinic:read",
      "patient:read",
      "patient:enroll",
      "episode:create",
      "prescription:publish",
      "triage:manage",
      "r2:manage",
      "study:upload",
      "diagnostic:signoff",
      "report:read",
      "report:create",
      "analytics:read",
      "audit:read",
      "ops:read",
      "export:phi",
      "break_glass:access",
    ],
    optometrist: [
      "clinic:read",
      "patient:read",
      "patient:enroll",
      "triage:manage",
      "r2:manage",
      "study:upload",
      "report:read",
      "analytics:read",
    ],
    technician: ["clinic:read", "patient:read", "study:upload"],
    coordinator: [
      "clinic:read",
      "patient:read",
      "patient:enroll",
      "episode:create",
      "triage:manage",
      "r2:manage",
      "report:read",
      "report:create",
      "analytics:read",
      "ops:read",
      "break_glass:access",
    ],
    admin: [
      "clinic:read",
      "patient:read",
      "patient:enroll",
      "report:read",
      "report:create",
      "analytics:read",
      "admin:manage",
      "integrations:manage",
      "audit:read",
      "ops:read",
      "export:phi",
      "break_glass:access",
    ],
  };

  const allowedSet = new Set(matrix[role] ?? []);
  const out: Record<string, boolean> = {};
  for (const key of ALL_CAPABILITY_KEYS) {
    if ((key === "audit:read" || key === "export:phi") && !stepUpVerified) {
      out[key] = false;
    } else {
      out[key] = allowedSet.has(key);
    }
  }
  return out;
}

/** Deterministic SVG clinical placeholders (zero copyrighted photos, zero external CDNs) */
export function buildSyntheticFundusSvgDataUri(label: string, hasMask = false): string {
  const maskCircle = hasMask
    ? `<circle cx="195" cy="128" r="34" fill="none" stroke="#83E8D6" stroke-width="2.5"/><circle cx="195" cy="128" r="19" fill="rgba(255,211,135,0.35)" stroke="#FFD387" stroke-width="2"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><rect width="320" height="240" fill="#090D12"/><circle cx="160" cy="120" r="102" fill="#4f2213"/><circle cx="160" cy="120" r="98" fill="#6b2e17"/><path d="M195 128 Q145 75 95 92 M195 128 Q142 162 96 156 M195 128 Q160 120 120 122 M195 128 Q232 95 250 112" stroke="#9e3922" stroke-width="2.2" fill="none" opacity="0.82"/><circle cx="195" cy="128" r="18" fill="#d99a5b" opacity="0.88"/><circle cx="132" cy="124" r="14" fill="#3a170c" opacity="0.5"/>${maskCircle}<text x="12" y="226" fill="#E8EEF1" font-size="11" font-family="sans-serif">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildSyntheticOctSvgDataUri(label: string, activeCnv = true): string {
  const fluidOverlay = activeCnv
    ? `<ellipse cx="162" cy="118" rx="34" ry="18" fill="rgba(72,169,255,0.45)" stroke="#8CC4FF" stroke-width="1.5"/><ellipse cx="196" cy="134" rx="26" ry="11" fill="rgba(255,211,135,0.42)" stroke="#FFD387" stroke-width="1.5"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="#090D12"/><path d="M12 105 Q95 94 135 122 Q160 138 188 118 Q232 92 308 104 L308 175 L12 175 Z" fill="#2c373f"/><path d="M12 105 Q95 94 135 122 Q160 138 188 118 Q232 92 308 104" stroke="#B76CE0" stroke-width="2" fill="none"/><path d="M12 142 Q125 135 162 126 Q205 134 308 144" stroke="#7AE09B" stroke-width="2" fill="none"/>${fluidOverlay}<text x="12" y="206" fill="#E8EEF1" font-size="11" font-family="sans-serif">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
