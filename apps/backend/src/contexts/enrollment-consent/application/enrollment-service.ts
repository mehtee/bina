import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { DbTx } from "../../../packages/db/index.js";
import { asClinicId, asTenantId, type NotificationTransportPort } from "../../../packages/domain-kernel/index.js";
import type { AuditLogPort } from "../../audit-compliance/ports/index.js";
import { signSessionToken } from "../../identity-access/index.js";
import { hashIranPhone, hashOtpCode, maskIranPhone, normalizeIranPhone } from "../domain/phone.js";
import type { CaregiverGrantRecord, EnrollmentRepoPort } from "../ports/index.js";

export class EnrollmentHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    messageFa: string
  ) {
    super(messageFa);
    this.name = "EnrollmentHttpError";
  }
}

export class EnrollmentService {
  constructor(
    private readonly repo: EnrollmentRepoPort,
    private readonly notifications: NotificationTransportPort,
    private readonly auditLog: AuditLogPort,
    private readonly salt: string,
    private readonly signingSecret: string
  ) {}

  async requestPatientOtp(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      phoneNumber: string;
      fixedOtpForTest?: string | undefined;
      now?: Date | undefined;
    }
  ): Promise<{ challengeId: string; expiresInSeconds: number; maskedPhone: string }> {
    const e164 = normalizeIranPhone(input.phoneNumber);
    const challengeId = randomUUID();
    const otpCode = input.fixedOtpForTest ?? String(randomInt(100000, 999999));
    const now = input.now ?? new Date();
    const expiresInSeconds = 180;
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);

    await this.repo.createOtpChallenge(tx, {
      id: challengeId,
      tenantId: input.tenantId,
      clinicId: input.clinicId,
      phoneHash: hashIranPhone(e164, this.salt),
      codeHash: hashOtpCode(challengeId, otpCode, this.salt),
      expiresAt,
    });

    await this.notifications.send({
      tenantId: asTenantId(input.tenantId),
      clinicId: asClinicId(input.clinicId),
      recipientPhoneE164: e164,
      templateKey: "patient_otp",
      paramsFa: { code: otpCode, ttlMinutes: "۳" },
    });

    return {
      challengeId,
      expiresInSeconds,
      maskedPhone: maskIranPhone(e164),
    };
  }

  async verifyPatientOtp(
    tx: DbTx,
    input: {
      tenantId: string;
      challengeId: string;
      otpCode: string;
      consentAccepted: boolean;
      consentVersion: string;
      phoneNumberForMask: string;
      now?: Date | undefined;
    }
  ): Promise<{ accessToken: string; patientId: string; locale: string; calendarMode: "jalali" }> {
    if (!input.consentAccepted) {
      throw new EnrollmentHttpError(400, "CONSENT_REQUIRED", "پذیرش رضایت‌نامه فارسی بیمار الزامی است.");
    }

    const challenge = await this.repo.findOtpChallengeById(tx, input.challengeId);
    if (!challenge) {
      throw new EnrollmentHttpError(404, "OTP_CHALLENGE_NOT_FOUND", "درخواست کد تایید یافت نشد.");
    }

    if (challenge.consumedAt !== null) {
      throw new EnrollmentHttpError(409, "OTP_REPLAYED", "این کد تایید قبلاً استفاده شده است.");
    }

    const now = input.now ?? new Date();
    if (challenge.expiresAt.getTime() <= now.getTime()) {
      throw new EnrollmentHttpError(401, "OTP_EXPIRED", "کد تایید منقضی شده است.");
    }

    if (challenge.attempts >= 5) {
      throw new EnrollmentHttpError(429, "OTP_ATTEMPTS_EXCEEDED", "تعداد تلاش مجاز به پایان رسید.");
    }

    const candidateHash = hashOtpCode(challenge.id, input.otpCode, this.salt);
    const a = Buffer.from(candidateHash, "hex");
    const b = Buffer.from(challenge.codeHash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      await this.repo.incrementOtpAttempts(tx, challenge.id);
      throw new EnrollmentHttpError(401, "OTP_INVALID", "کد تایید واردشده نادرست است.");
    }

    const consumed = await this.repo.markOtpConsumed(tx, challenge.id, now);
    if (!consumed) {
      throw new EnrollmentHttpError(409, "OTP_REPLAYED", "این کد تایید قبلاً مصرف شده است.");
    }

    const e164 = normalizeIranPhone(input.phoneNumberForMask);
    const patient = await this.repo.upsertPatientByPhoneHash(tx, {
      tenantId: input.tenantId,
      clinicId: challenge.clinicId,
      phoneHash: challenge.phoneHash,
      phoneMasked: maskIranPhone(e164),
    });

    await this.repo.recordConsentAcceptance(tx, {
      tenantId: input.tenantId,
      patientId: patient.id,
      consentVersion: input.consentVersion,
      locale: patient.preferredLocale,
    });

    const exp = Math.floor(now.getTime() / 1000) + 3600;
    const accessToken = signSessionToken(
      {
        sub: patient.id,
        tenantId: patient.tenantId,
        clinicId: patient.clinicId,
        actorType: "patient",
        exp,
      },
      this.signingSecret
    );

    return {
      accessToken,
      patientId: patient.id,
      locale: patient.preferredLocale,
      calendarMode: "jalali",
    };
  }

  async grantCaregiver(
    tx: DbTx,
    input: {
      tenantId: string;
      patientId: string;
      actorUserId: string;
      caregiverPhone: string;
      relationshipFa: string;
      scopes: string[];
    }
  ): Promise<CaregiverGrantRecord> {
    const e164 = normalizeIranPhone(input.caregiverPhone);
    const grant = await this.repo.createCaregiverGrant(tx, {
      tenantId: input.tenantId,
      patientId: input.patientId,
      caregiverPhoneHash: hashIranPhone(e164, this.salt),
      relationshipFa: input.relationshipFa,
      scopes: input.scopes,
    });

    await this.auditLog.append(tx, {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorRole: "patient",
      action: "caregiver_granted",
      resourceType: "caregiver_grant",
      resourceId: grant.id,
      metadata: { relationshipFa: input.relationshipFa },
    });

    return grant;
  }

  async revokeCaregiver(
    tx: DbTx,
    input: {
      tenantId: string;
      patientId: string;
      grantId: string;
      actorUserId: string;
      now?: Date | undefined;
    }
  ): Promise<void> {
    const revoked = await this.repo.revokeCaregiverGrant(
      tx,
      input.grantId,
      input.patientId,
      input.now ?? new Date()
    );
    if (!revoked) {
      throw new EnrollmentHttpError(404, "CAREGIVER_GRANT_NOT_FOUND", "مجوز همراه فعال یافت نشد.");
    }

    await this.auditLog.append(tx, {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorRole: "patient",
      action: "caregiver_revoked",
      resourceType: "caregiver_grant",
      resourceId: input.grantId,
    });
  }

  async assertCaregiverActive(tx: DbTx, grantId: string, patientId: string): Promise<CaregiverGrantRecord> {
    const grant = await this.repo.findCaregiverGrant(tx, grantId, patientId);
    if (!grant || !grant.active || grant.revokedAt !== null) {
      throw new EnrollmentHttpError(403, "CAREGIVER_REVOKED", "دسترسی همراه فوراً لغو شده است.");
    }
    return grant;
  }
}
