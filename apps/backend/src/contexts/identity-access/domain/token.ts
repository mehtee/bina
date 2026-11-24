import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionTokenClaims {
  readonly sub: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly actorType: "staff" | "patient" | "caregiver";
  readonly role?: string | undefined;
  readonly grantId?: string | undefined;
  readonly mfaVerified?: boolean | undefined;
  readonly stepUpVerified?: boolean | undefined;
  readonly exp: number;
}

export function signSessionToken(claims: SessionTokenClaims, signingSecret: string): string {
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const sig = createHmac("sha256", signingSecret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(
  token: string,
  signingSecret: string,
  nowMs: number = Date.now()
): SessionTokenClaims | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload || !sig) return null;

  const expectedSig = createHmac("sha256", signingSecret).update(payload).digest("base64url");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionTokenClaims;
    if (typeof parsed.exp !== "number" || parsed.exp * 1000 <= nowMs) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
