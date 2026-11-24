const SENSITIVE_KEY_PATTERN =
  /^(phone|phonenumber|mobile|nationalid|patientname|fullnamefa|freetextfa|apikey|llmapikey|authorization|password|token|secret|otp|otpcode|caregiverphone)$/i;

export function redactPhiString(input: string): string {
  return input
    .replace(/sk-[a-zA-Z0-9_-]{12,}/g, "[REDACTED_KEY]")
    .replace(/KGAT_[a-zA-Z0-9]+/g, "[REDACTED_TOKEN]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/(?:\+98|0098|0)9\d{9}\b/g, "[REDACTED_PHONE]")
    .replace(/(کد ملی|national_?id)\s*[:=]\s*\d{10}\b/gi, "$1: [REDACTED_NID]")
    .replace(/\b\d{10}\b/g, "[REDACTED_10D]");
}

export function redactPhi<T>(value: T, depth = 0): T {
  if (depth > 8 || value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    return redactPhiString(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactPhi(item, depth + 1)) as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactPhi(val, depth + 1);
      }
    }
    return out as T;
  }
  return value;
}
