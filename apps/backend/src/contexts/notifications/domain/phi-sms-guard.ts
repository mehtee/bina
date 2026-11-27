import { getAppBrand, type TemplatedNotification } from "../../../packages/domain-kernel/index.js";

const ALLOWED_SMS_TEMPLATES: Readonly<Record<string, (params: Readonly<Record<string, string>>) => string>> = {
  patient_otp: (p) => `کلینیک چشم ${getAppBrand().nameFa}: کد ورود شما ${p.code ?? ""} (اعتبار ${p.ttlMinutes ?? "۳"} دقیقه)`,
  caregiver_invite: (p) => `بیمار شما در پلتفرم ${getAppBrand().nameFa} دسترسی همراه (${p.relationshipFa ?? "همراه"}) را فعال کرد.`,
  appointment_reminder: (p) => `یادآوری ${getAppBrand().nameFa}: نوبت معاینه کلینیک شما در تاریخ ${p.jalaliDate ?? ""} ثبت شده است.`,
  urgent_callback_prompt: () => `کلینیک ${getAppBrand().nameFa}: لطفاً در اسرع وقت با پذیرش کلینیک تماس بگیرید.`,
};

const FORBIDDEN_PHI_TERMS = [
  "بتامتازون",
  "سیپروفلوکساسین",
  "تیمولول",
  "لاتانوپروست",
  "بتادین",
  "قطره",
  "کراتیت",
  "گلوکوم",
  "آب‌مروارید",
  "آب مروارید",
  "ادم پاپی",
  "جداشدگی شبکیه",
  "اندوفتالمیت",
  "شبکیه",
  "betamethasone",
  "ciprofloxacin",
  "timolol",
  "latanoprost",
  "keratitis",
  "glaucoma",
  "cataract",
  "papilledema",
  "cnv",
  "dme",
  "rop",
];

export const UCS2_MAX_CHARS = 134;

export class SmsPhiViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmsPhiViolationError";
  }
}

/**
 * Renders an allowlisted Persian SMS template and enforces zero PHI leakage
 * (no drug names or diagnoses) plus strict Iranian UCS-2 character segmentation bounds.
 */
export function renderAndValidatePhiFreeSms(msg: TemplatedNotification): string {
  const renderer = ALLOWED_SMS_TEMPLATES[msg.templateKey];
  if (!renderer) {
    throw new SmsPhiViolationError(`Disallowed SMS templateKey '${msg.templateKey}'.`);
  }

  for (const val of Object.values(msg.paramsFa)) {
    const lowerVal = val.toLowerCase();
    for (const term of FORBIDDEN_PHI_TERMS) {
      if (lowerVal.includes(term.toLowerCase())) {
        throw new SmsPhiViolationError(`SMS parameter contains forbidden clinical PHI term '${term}'.`);
      }
    }
  }

  const body = renderer(msg.paramsFa);
  const lowerBody = body.toLowerCase();
  for (const term of FORBIDDEN_PHI_TERMS) {
    if (lowerBody.includes(term.toLowerCase())) {
      throw new SmsPhiViolationError(`Rendered SMS contains forbidden clinical PHI term '${term}'.`);
    }
  }

  if (body.length > UCS2_MAX_CHARS) {
    throw new SmsPhiViolationError(
      `SMS UCS-2 length (${body.length}) exceeds safe 2-part ceiling (${UCS2_MAX_CHARS} chars).`
    );
  }

  return body;
}

/**
 * Validates clinic-authored message templates before persistence so SMS templates
 * cannot contain clinical PHI terms (drugs/diagnoses) or exceed safe UCS-2 limits.
 */
export function validatePhiFreeTemplateText(
  bodyTemplateFa: string,
  channel: "sms" | "print" | "in_app"
): void {
  const trimmed = bodyTemplateFa.trim();
  if (trimmed.length < 5) {
    throw new SmsPhiViolationError("متن قالب پیام باید حداقل ۵ کاراکتر باشد.");
  }
  if (channel !== "sms") {
    return;
  }
  const lowerBody = trimmed.toLowerCase();
  for (const term of FORBIDDEN_PHI_TERMS) {
    if (lowerBody.includes(term.toLowerCase())) {
      throw new SmsPhiViolationError(
        `قالب پیامک حاوی واژه حساس بالینی («${term}») است و برای پیامک مجاز نیست.`
      );
    }
  }
  if (trimmed.length > UCS2_MAX_CHARS) {
    throw new SmsPhiViolationError(
      `طول قالب پیامک (${trimmed.length} کاراکتر) از سقف مجاز ${UCS2_MAX_CHARS} کاراکتر UCS-2 بیشتر است.`
    );
  }
}
