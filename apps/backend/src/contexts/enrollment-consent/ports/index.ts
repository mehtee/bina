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

export interface ConsentAcceptanceRecord {
  readonly id: string;
  readonly consentVersion: string;
  readonly locale: string;
  readonly acceptedAt: Date;
}

export interface CaregiverPatientLink {
  readonly grantId: string;
  readonly patientId: string;
  readonly patientNameFa: string;
  readonly relationshipFa: string;
  readonly scopes: string[];
  readonly clinicId: string;
  readonly active: boolean;
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
  findPatientById(tx: DbTx, patientId: string): Promise<PatientRecord | null>;
  recordConsentAcceptance(
    tx: DbTx,
    input: { tenantId: string; patientId: string; consentVersion: string; locale: string }
  ): Promise<void>;
  listConsentsByPatient(tx: DbTx, patientId: string): Promise<ConsentAcceptanceRecord[]>;
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
  listCaregiverGrantsByPatient(tx: DbTx, patientId: string): Promise<CaregiverGrantRecord[]>;
  listActiveGrantsByCaregiverPhoneHash(
    tx: DbTx,
    caregiverPhoneHash: string
  ): Promise<CaregiverPatientLink[]>;
  revokeCaregiverGrant(tx: DbTx, grantId: string, patientId: string, revokedAt: Date): Promise<boolean>;
}
