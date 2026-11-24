import { createHash } from "node:crypto";

const IRAN_E164_REGEX = /^\+989\d{9}$/;

export function normalizeIranPhone(raw: string): string {
  const digitsOnly = raw.replace(/[\s\-()]/g, "");
  let normalized = digitsOnly;
  if (normalized.startsWith("0098")) {
    normalized = `+98${normalized.slice(4)}`;
  } else if (normalized.startsWith("98") && normalized.length === 12) {
    normalized = `+${normalized}`;
  } else if (normalized.startsWith("09") && normalized.length === 11) {
    normalized = `+98${normalized.slice(1)}`;
  }

  if (!IRAN_E164_REGEX.test(normalized)) {
    throw new RangeError(
      `Invalid Iranian mobile number '${raw}'; expected +989xxxxxxxxx or 09xxxxxxxxx.`
    );
  }
  return normalized;
}

export function hashIranPhone(e164: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${e164}`).digest("hex");
}

export function maskIranPhone(e164: string): string {
  if (!IRAN_E164_REGEX.test(e164)) {
    return "***";
  }
  return `${e164.slice(0, 6)}***${e164.slice(9)}`;
}

export function hashOtpCode(challengeId: string, otpCode: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${challengeId}:${otpCode.trim()}`).digest("hex");
}
