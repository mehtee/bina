import type { DbTx } from "../../../packages/db/index.js";
import type {
  CaregiverGrantRecord,
  EnrollmentRepoPort,
  OtpChallengeRecord,
  PatientRecord,
} from "../ports/index.js";

export class PgEnrollmentRepo implements EnrollmentRepoPort {
  async createOtpChallenge(
    tx: DbTx,
    input: {
      id: string;
      tenantId: string;
      clinicId: string;
      phoneHash: string;
      codeHash: string;
      expiresAt: Date;
    }
  ): Promise<void> {
    await tx.query(
      `INSERT INTO otp_challenges (id, tenant_id, clinic_id, phone_hash, code_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6::timestamptz)`,
      [input.id, input.tenantId, input.clinicId, input.phoneHash, input.codeHash, input.expiresAt.toISOString()]
    );
  }

  async findOtpChallengeById(tx: DbTx, challengeId: string): Promise<OtpChallengeRecord | null> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      phone_hash: string;
      code_hash: string;
      expires_at: Date;
      consumed_at: Date | null;
      attempts: number;
    }>(
      `SELECT id, tenant_id, clinic_id, phone_hash, code_hash, expires_at, consumed_at, attempts
       FROM otp_challenges WHERE id = $1`,
      [challengeId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      phoneHash: r.phone_hash,
      codeHash: r.code_hash,
      expiresAt: r.expires_at,
      consumedAt: r.consumed_at,
      attempts: r.attempts,
    };
  }

  async incrementOtpAttempts(tx: DbTx, challengeId: string): Promise<number> {
    const res = await tx.query<{ attempts: number }>(
      `UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts`,
      [challengeId]
    );
    return res.rows[0]?.attempts ?? 0;
  }

  async markOtpConsumed(tx: DbTx, challengeId: string, consumedAt: Date): Promise<boolean> {
    const res = await tx.query(
      `UPDATE otp_challenges
       SET consumed_at = $2::timestamptz
       WHERE id = $1 AND consumed_at IS NULL`,
      [challengeId, consumedAt.toISOString()]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async upsertPatientByPhoneHash(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      phoneHash: string;
      phoneMasked: string;
      fullNameFa?: string | undefined;
    }
  ): Promise<PatientRecord> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      preferred_locale: string;
      access_mode: "app" | "caregiver" | "print_phone";
      phone_hash: string;
      phone_masked: string;
      full_name_fa: string;
    }>(
      `INSERT INTO patients (tenant_id, clinic_id, phone_hash, phone_masked, full_name_fa)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, phone_hash) DO UPDATE
         SET phone_masked = EXCLUDED.phone_masked
       RETURNING id, tenant_id, clinic_id, preferred_locale, access_mode, phone_hash, phone_masked, full_name_fa`,
      [input.tenantId, input.clinicId, input.phoneHash, input.phoneMasked, input.fullNameFa ?? "بیمار محترم"]
    );
    const r = res.rows[0]!;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      preferredLocale: r.preferred_locale,
      accessMode: r.access_mode,
      phoneHash: r.phone_hash,
      phoneMasked: r.phone_masked,
      fullNameFa: r.full_name_fa,
    };
  }

  async recordConsentAcceptance(
    tx: DbTx,
    input: { tenantId: string; patientId: string; consentVersion: string; locale: string }
  ): Promise<void> {
    await tx.query(
      `INSERT INTO consent_acceptances (tenant_id, patient_id, consent_version, locale)
       VALUES ($1, $2, $3, $4)`,
      [input.tenantId, input.patientId, input.consentVersion, input.locale]
    );
  }

  async createCaregiverGrant(
    tx: DbTx,
    input: {
      tenantId: string;
      patientId: string;
      caregiverPhoneHash: string;
      relationshipFa: string;
      scopes: string[];
    }
  ): Promise<CaregiverGrantRecord> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      patient_id: string;
      caregiver_phone_hash: string;
      relationship_fa: string;
      scopes_json: string[];
      active: boolean;
      revoked_at: Date | null;
      created_at: Date;
    }>(
      `INSERT INTO caregiver_grants (tenant_id, patient_id, caregiver_phone_hash, relationship_fa, scopes_json)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, tenant_id, patient_id, caregiver_phone_hash, relationship_fa, scopes_json, active, revoked_at, created_at`,
      [
        input.tenantId,
        input.patientId,
        input.caregiverPhoneHash,
        input.relationshipFa,
        JSON.stringify(input.scopes),
      ]
    );
    const r = res.rows[0]!;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      patientId: r.patient_id,
      caregiverPhoneHash: r.caregiver_phone_hash,
      relationshipFa: r.relationship_fa,
      scopes: r.scopes_json,
      active: r.active,
      revokedAt: r.revoked_at,
      createdAt: r.created_at,
    };
  }

  async findCaregiverGrant(tx: DbTx, grantId: string, patientId: string): Promise<CaregiverGrantRecord | null> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      patient_id: string;
      caregiver_phone_hash: string;
      relationship_fa: string;
      scopes_json: string[];
      active: boolean;
      revoked_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, tenant_id, patient_id, caregiver_phone_hash, relationship_fa, scopes_json, active, revoked_at, created_at
       FROM caregiver_grants
       WHERE id = $1 AND patient_id = $2`,
      [grantId, patientId]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      patientId: r.patient_id,
      caregiverPhoneHash: r.caregiver_phone_hash,
      relationshipFa: r.relationship_fa,
      scopes: r.scopes_json,
      active: r.active,
      revokedAt: r.revoked_at,
      createdAt: r.created_at,
    };
  }

  async revokeCaregiverGrant(tx: DbTx, grantId: string, patientId: string, revokedAt: Date): Promise<boolean> {
    const res = await tx.query(
      `UPDATE caregiver_grants
       SET active = false, revoked_at = $3::timestamptz
       WHERE id = $1 AND patient_id = $2 AND active = true`,
      [grantId, patientId, revokedAt.toISOString()]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
