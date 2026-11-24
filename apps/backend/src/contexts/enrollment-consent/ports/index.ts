import type { DbTx } from "../../../packages/db/index.js";

export interface OtpChallengeRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly phoneHash: string;
  readonly codeHash: string;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly attempts: number;
}

export interface PatientRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly preferredLocale: string;
  readonly accessMode: "app" | "caregiver" | "print_phone";
  readonly phoneHash: string;
  readonly phoneMasked: string;
  readonly fullNameFa: string;
}

export interface CaregiverGrantRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly patientId: string;
  readonly caregiverPhoneHash: string;
  readonly relationshipFa: string;
  readonly scopes: string[];
  readonly active: boolean;
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
}

export interface EnrollmentRepoPort {
  createOtpChallenge(
    tx: DbTx,
    input: {
      id: string;
      tenantId: string;
      clinicId: string;
      phoneHash: string;
      codeHash: string;
      expiresAt: Date;
    }
  ): Promise<void>;
  findOtpChallengeById(tx: DbTx, challengeId: string): Promise<OtpChallengeRecord | null>;
  incrementOtpAttempts(tx: DbTx, challengeId: string): Promise<number>;
  markOtpConsumed(tx: DbTx, challengeId: string, consumedAt: Date): Promise<boolean>;
  upsertPatientByPhoneHash(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      phoneHash: string;
      phoneMasked: string;
      fullNameFa?: string | undefined;
    }
  ): Promise<PatientRecord>;
  recordConsentAcceptance(
    tx: DbTx,
    input: { tenantId: string; patientId: string; consentVersion: string; locale: string }
  ): Promise<void>;
  createCaregiverGrant(
    tx: DbTx,
    input: {
      tenantId: string;
      patientId: string;
      caregiverPhoneHash: string;
      relationshipFa: string;
      scopes: string[];
    }
  ): Promise<CaregiverGrantRecord>;
  findCaregiverGrant(tx: DbTx, grantId: string, patientId: string): Promise<CaregiverGrantRecord | null>;
  revokeCaregiverGrant(tx: DbTx, grantId: string, patientId: string, revokedAt: Date): Promise<boolean>;
}
