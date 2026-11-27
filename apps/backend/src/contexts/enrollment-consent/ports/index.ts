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
  readonly mlTrainingConsentFlag: boolean;
  readonly phoneHash: string;
  readonly phoneMasked: string;
  readonly fullNameFa: string;
  readonly nationalIdMasked?: string | null | undefined;
  readonly birthYearJalali?: number | null | undefined;
  readonly notesFa?: string | null | undefined;
  readonly createdAt?: Date | undefined;
}

export interface PatientListItem {
  readonly patientId: string;
  readonly clinicId: string;
  readonly fullNameFa: string;
  readonly phoneMasked: string;
  readonly nationalIdMasked?: string | null | undefined;
  readonly accessMode: "app" | "caregiver" | "print_phone";
  readonly preferredLocale: string;
  readonly activeEpisodeCount: number;
  readonly openTriageCount: number;
  readonly createdAtIso: string;
}

export interface PatientClinicalHistoryRecord {
  readonly historyId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly recordedByUserId: string;
  readonly summaryFa: string;
  readonly conditions: string[];
  readonly allergies: string[];
  readonly medications: string[];
  readonly riskFactors: Record<string, unknown>;
  readonly labs: Record<string, unknown>;
  readonly createdAtIso: string;
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
  readonly action: "accepted" | "withdrawn";
  readonly recordedByUserId?: string | null | undefined;
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
      accessMode?: "app" | "caregiver" | "print_phone" | undefined;
      nationalIdMasked?: string | undefined;
      birthYearJalali?: number | undefined;
      notesFa?: string | undefined;
    }
  ): Promise<PatientRecord>;
  findPatientById(tx: DbTx, patientId: string): Promise<PatientRecord | null>;
  listPatients(
    tx: DbTx,
    filter: {
      clinicId?: string | undefined;
      q?: string | undefined;
      accessMode?: "app" | "caregiver" | "print_phone" | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: PatientListItem[]; total: number }>;
  insertClinicalHistory(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      patientId: string;
      recordedByUserId: string;
      summaryFa: string;
      conditions: string[];
      allergies: string[];
      medications: string[];
      riskFactors: Record<string, unknown>;
      labs: Record<string, unknown>;
    }
  ): Promise<PatientClinicalHistoryRecord>;
  listClinicalHistory(tx: DbTx, patientId: string): Promise<PatientClinicalHistoryRecord[]>;
  updatePatientMlConsent(tx: DbTx, patientId: string, mlTrainingConsentFlag: boolean): Promise<void>;
  recordConsentAcceptance(
    tx: DbTx,
    input: {
      tenantId: string;
      patientId: string;
      consentVersion: string;
      locale: string;
      action?: "accepted" | "withdrawn" | undefined;
      recordedByUserId?: string | undefined;
    }
  ): Promise<ConsentAcceptanceRecord>;
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
