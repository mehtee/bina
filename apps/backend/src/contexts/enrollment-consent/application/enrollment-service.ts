import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { authorizeStaffAction, type StaffPrincipal } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import { asClinicId, asTenantId, type NotificationTransportPort } from "../../../packages/domain-kernel/index.js";
import type { AuditLogPort } from "../../audit-compliance/ports/index.js";
import { signSessionToken } from "../../identity-access/index.js";
import { hashIranPhone, hashOtpCode, maskIranPhone, normalizeIranPhone } from "../domain/phone.js";
import type {
  CaregiverGrantRecord,
  CaregiverPatientLink,
  ConsentAcceptanceRecord,
  EnrollmentRepoPort,
  PatientClinicalHistoryRecord,
  PatientListItem,
} from "../ports/index.js";

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
  ): Promise<{
    accessToken: string;
    patientId: string;
    tenantId: string;
    clinicId: string;
    locale: string;
    calendarMode: "jalali";
  }> {
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
      action: "accepted",
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
      tenantId: patient.tenantId,
      clinicId: patient.clinicId,
      locale: patient.preferredLocale,
      calendarMode: "jalali",
    };
  }

  async verifyCaregiverOtp(
    tx: DbTx,
    input: {
      tenantId: string;
      challengeId: string;
      otpCode: string;
      patientId?: string | undefined;
      now?: Date | undefined;
    }
  ): Promise<{
    accessToken: string;
    grantId: string;
    patientId: string;
    tenantId: string;
    clinicId: string;
    locale: string;
    calendarMode: "jalali";
    patients: CaregiverPatientLink[];
  }> {
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

    const patients = await this.repo.listActiveGrantsByCaregiverPhoneHash(tx, challenge.phoneHash);
    if (patients.length === 0) {
      throw new EnrollmentHttpError(
        403,
        "CAREGIVER_GRANT_NOT_FOUND",
        "هیچ مجوز فعال همراهی برای این شماره ثبت نشده است."
      );
    }

    const selected =
      (input.patientId ? patients.find((p) => p.patientId === input.patientId) : undefined) ?? patients[0]!;

    const exp = Math.floor(now.getTime() / 1000) + 3600;
    const accessToken = signSessionToken(
      {
        sub: challenge.phoneHash,
        tenantId: input.tenantId,
        clinicId: selected.clinicId,
        actorType: "caregiver",
        grantId: selected.grantId,
        exp,
      },
      this.signingSecret
    );

    return {
      accessToken,
      grantId: selected.grantId,
      patientId: selected.patientId,
      tenantId: input.tenantId,
      clinicId: selected.clinicId,
      locale: "fa-IR",
      calendarMode: "jalali",
      patients,
    };
  }

  async listPatients(
    tx: DbTx,
    principal: StaffPrincipal,
    filter: {
      q?: string | undefined;
      accessMode?: "app" | "caregiver" | "print_phone" | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: PatientListItem[]; total: number }> {
    const decision = authorizeStaffAction(principal, "patient:read", principal.tenantId);
    if (!decision.allowed) {
      throw new EnrollmentHttpError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listPatients(tx, {
      clinicId: principal.clinicId,
      q: filter.q,
      accessMode: filter.accessMode,
      limit: Math.min(100, Math.max(1, filter.limit)),
      offset: Math.max(0, filter.offset),
    });
  }

  async enrollPatientByStaff(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      fullNameFa: string;
      phoneNumber: string;
      accessMode: "app" | "caregiver" | "print_phone";
      nationalIdMasked?: string | undefined;
      birthYearJalali?: number | undefined;
      notesFa?: string | undefined;
      consentVersion?: string | undefined;
      mlTrainingConsentFlag?: boolean | undefined;
    }
  ): Promise<{
    patientId: string;
    tenantId: string;
    clinicId: string;
    fullNameFa: string;
    phoneMasked: string;
    nationalIdMasked?: string | null | undefined;
    birthYearJalali?: number | null | undefined;
    notesFa?: string | null | undefined;
    accessMode: "app" | "caregiver" | "print_phone";
    preferredLocale: string;
    mlTrainingConsentFlag: boolean;
    consents: ConsentAcceptanceRecord[];
  }> {
    const decision = authorizeStaffAction(principal, "patient:enroll", principal.tenantId);
    if (!decision.allowed) {
      throw new EnrollmentHttpError(403, decision.code, decision.reasonFa);
    }

    let e164: string;
    try {
      e164 = normalizeIranPhone(input.phoneNumber);
    } catch (err) {
      throw new EnrollmentHttpError(
        400,
        "INVALID_IRAN_PHONE",
        err instanceof Error ? err.message : "شماره موبایل ایران نامعتبر است (+989xxxxxxxxx)."
      );
    }

    const patient = await this.repo.upsertPatientByPhoneHash(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      phoneHash: hashIranPhone(e164, this.salt),
      phoneMasked: maskIranPhone(e164),
      fullNameFa: input.fullNameFa.trim(),
      accessMode: input.accessMode,
      nationalIdMasked: input.nationalIdMasked,
      birthYearJalali: input.birthYearJalali,
      notesFa: input.notesFa,
    });

    if (typeof input.mlTrainingConsentFlag === "boolean") {
      await this.repo.updatePatientMlConsent(tx, patient.id, input.mlTrainingConsentFlag);
    }

    if (input.consentVersion) {
      await this.repo.recordConsentAcceptance(tx, {
        tenantId: principal.tenantId,
        patientId: patient.id,
        consentVersion: input.consentVersion,
        locale: patient.preferredLocale,
        action: "accepted",
        recordedByUserId: principal.userId,
      });
    }

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "patient.enrolled-by-staff",
      resourceType: "patient",
      resourceId: patient.id,
      metadata: { accessMode: input.accessMode },
    });

    const refreshed = await this.repo.findPatientById(tx, patient.id);
    const consents = await this.repo.listConsentsByPatient(tx, patient.id);
    const p = refreshed ?? patient;
    return {
      patientId: p.id,
      tenantId: p.tenantId,
      clinicId: p.clinicId,
      fullNameFa: p.fullNameFa,
      phoneMasked: p.phoneMasked,
      nationalIdMasked: p.nationalIdMasked,
      birthYearJalali: p.birthYearJalali,
      notesFa: p.notesFa,
      accessMode: p.accessMode,
      preferredLocale: p.preferredLocale,
      mlTrainingConsentFlag: p.mlTrainingConsentFlag,
      consents,
    };
  }

  async getPatientProfileByStaff(
    tx: DbTx,
    principal: StaffPrincipal,
    patientId: string
  ) {
    const decision = authorizeStaffAction(principal, "patient:read", principal.tenantId);
    if (!decision.allowed) {
      throw new EnrollmentHttpError(403, decision.code, decision.reasonFa);
    }
    return this.getPatientProfile(tx, patientId);
  }

  async listClinicalHistory(
    tx: DbTx,
    principal: StaffPrincipal,
    patientId: string
  ): Promise<PatientClinicalHistoryRecord[]> {
    const decision = authorizeStaffAction(principal, "patient:read", principal.tenantId);
    if (!decision.allowed) {
      throw new EnrollmentHttpError(403, decision.code, decision.reasonFa);
    }
    const patient = await this.repo.findPatientById(tx, patientId);
    if (!patient) {
      throw new EnrollmentHttpError(404, "PATIENT_NOT_FOUND", "پروفایل بیمار یافت نشد.");
    }
    return this.repo.listClinicalHistory(tx, patientId);
  }

  async addClinicalHistory(
    tx: DbTx,
    principal: StaffPrincipal,
    patientId: string,
    input: {
      summaryFa: string;
      conditions?: string[] | undefined;
      allergies?: string[] | undefined;
      medications?: string[] | undefined;
      riskFactors?: Record<string, unknown> | undefined;
      labs?: Record<string, unknown> | undefined;
    }
  ): Promise<PatientClinicalHistoryRecord> {
    const decision = authorizeStaffAction(principal, "patient:enroll", principal.tenantId);
    if (!decision.allowed) {
      throw new EnrollmentHttpError(403, decision.code, decision.reasonFa);
    }
    const patient = await this.repo.findPatientById(tx, patientId);
    if (!patient) {
      throw new EnrollmentHttpError(404, "PATIENT_NOT_FOUND", "پروفایل بیمار یافت نشد.");
    }
    const saved = await this.repo.insertClinicalHistory(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      patientId,
      recordedByUserId: principal.userId,
      summaryFa: input.summaryFa.trim(),
      conditions: input.conditions ?? [],
      allergies: input.allergies ?? [],
      medications: input.medications ?? [],
      riskFactors: input.riskFactors ?? {},
      labs: input.labs ?? {},
    });
    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "patient.clinical-history-added",
      resourceType: "patient_clinical_history",
      resourceId: saved.historyId,
      metadata: { patientId },
    });
    return saved;
  }

  async updatePatientConsent(
    tx: DbTx,
    principal: StaffPrincipal,
    patientId: string,
    input: {
      consentVersion: string;
      action: "accepted" | "withdrawn";
      mlTrainingConsentFlag?: boolean | undefined;
      noteFa?: string | undefined;
    }
  ): Promise<ConsentAcceptanceRecord> {
    const decision = authorizeStaffAction(principal, "patient:enroll", principal.tenantId);
    if (!decision.allowed) {
      throw new EnrollmentHttpError(403, decision.code, decision.reasonFa);
    }
    const patient = await this.repo.findPatientById(tx, patientId);
    if (!patient) {
      throw new EnrollmentHttpError(404, "PATIENT_NOT_FOUND", "پروفایل بیمار یافت نشد.");
    }
    if (typeof input.mlTrainingConsentFlag === "boolean") {
      await this.repo.updatePatientMlConsent(tx, patientId, input.mlTrainingConsentFlag);
    }
    const record = await this.repo.recordConsentAcceptance(tx, {
      tenantId: principal.tenantId,
      patientId,
      consentVersion: input.consentVersion,
      locale: patient.preferredLocale,
      action: input.action,
      recordedByUserId: principal.userId,
    });
    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: `patient.consent-${input.action}`,
      resourceType: "consent_acceptance",
      resourceId: record.id,
      reasonFa: input.noteFa,
      metadata: {
        patientId,
        consentVersion: input.consentVersion,
        mlTrainingConsentFlag: input.mlTrainingConsentFlag,
      },
    });
    return record;
  }

  async listCaregiversForPatient(tx: DbTx, patientId: string): Promise<CaregiverGrantRecord[]> {
    return this.repo.listCaregiverGrantsByPatient(tx, patientId);
  }

  async listCaregiverPatients(tx: DbTx, caregiverPhoneHash: string): Promise<CaregiverPatientLink[]> {
    return this.repo.listActiveGrantsByCaregiverPhoneHash(tx, caregiverPhoneHash);
  }

  async getPatientProfile(
    tx: DbTx,
    patientId: string
  ): Promise<{
    patientId: string;
    tenantId: string;
    clinicId: string;
    fullNameFa: string;
    phoneMasked: string;
    nationalIdMasked?: string | null | undefined;
    birthYearJalali?: number | null | undefined;
    notesFa?: string | null | undefined;
    preferredLocale: string;
    accessMode: "app" | "caregiver" | "print_phone";
    mlTrainingConsentFlag: boolean;
    consents: ConsentAcceptanceRecord[];
  }> {
    const patient = await this.repo.findPatientById(tx, patientId);
    if (!patient) {
      throw new EnrollmentHttpError(404, "PATIENT_NOT_FOUND", "پروفایل بیمار یافت نشد.");
    }
    const consents = await this.repo.listConsentsByPatient(tx, patientId);
    return {
      patientId: patient.id,
      tenantId: patient.tenantId,
      clinicId: patient.clinicId,
      fullNameFa: patient.fullNameFa,
      phoneMasked: patient.phoneMasked,
      nationalIdMasked: patient.nationalIdMasked,
      birthYearJalali: patient.birthYearJalali,
      notesFa: patient.notesFa,
      preferredLocale: patient.preferredLocale,
      accessMode: patient.accessMode,
      mlTrainingConsentFlag: patient.mlTrainingConsentFlag,
      consents,
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
