import type { DbTx } from "../../../packages/db/index.js";
import type {
  CaregiverGrantRecord,
  CaregiverPatientLink,
  ConsentAcceptanceRecord,
  EnrollmentRepoPort,
  OtpChallengeRecord,
  PatientClinicalHistoryRecord,
  PatientListItem,
  PatientRecord,
} from "../ports/index.js";

interface PatientRow {
  id: string;
  tenant_id: string;
  clinic_id: string;
  preferred_locale: string;
  access_mode: "app" | "caregiver" | "print_phone";
  ml_training_consent_flag: boolean;
  phone_hash: string;
  phone_masked: string;
  full_name_fa: string;
  national_id_masked: string | null;
  birth_year_jalali: number | null;
  notes_fa: string | null;
  created_at: Date;
}

function mapPatientRow(r: PatientRow): PatientRecord {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    clinicId: r.clinic_id,
    preferredLocale: r.preferred_locale,
    accessMode: r.access_mode,
    mlTrainingConsentFlag: r.ml_training_consent_flag,
    phoneHash: r.phone_hash,
    phoneMasked: r.phone_masked,
    fullNameFa: r.full_name_fa,
    nationalIdMasked: r.national_id_masked,
    birthYearJalali: r.birth_year_jalali,
    notesFa: r.notes_fa,
    createdAt: r.created_at,
  };
}

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
      accessMode?: "app" | "caregiver" | "print_phone" | undefined;
      nationalIdMasked?: string | undefined;
      birthYearJalali?: number | undefined;
      notesFa?: string | undefined;
    }
  ): Promise<PatientRecord> {
    const res = await tx.query<PatientRow>(
      `INSERT INTO patients
         (tenant_id, clinic_id, phone_hash, phone_masked, full_name_fa, access_mode, national_id_masked, birth_year_jalali, notes_fa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tenant_id, phone_hash) DO UPDATE
         SET phone_masked = EXCLUDED.phone_masked,
             full_name_fa = CASE WHEN $10 THEN EXCLUDED.full_name_fa ELSE patients.full_name_fa END,
             access_mode = COALESCE($11, patients.access_mode),
             national_id_masked = COALESCE(EXCLUDED.national_id_masked, patients.national_id_masked),
             birth_year_jalali = COALESCE(EXCLUDED.birth_year_jalali, patients.birth_year_jalali),
             notes_fa = COALESCE(EXCLUDED.notes_fa, patients.notes_fa)
       RETURNING id, tenant_id, clinic_id, preferred_locale, access_mode, ml_training_consent_flag,
                 phone_hash, phone_masked, full_name_fa, national_id_masked, birth_year_jalali, notes_fa, created_at`,
      [
        input.tenantId,
        input.clinicId,
        input.phoneHash,
        input.phoneMasked,
        input.fullNameFa ?? "بیمار محترم",
        input.accessMode ?? "app",
        input.nationalIdMasked ?? null,
        input.birthYearJalali ?? null,
        input.notesFa ?? null,
        Boolean(input.fullNameFa && input.fullNameFa.trim().length > 0),
        input.accessMode ?? null,
      ]
    );
    return mapPatientRow(res.rows[0]!);
  }

  async findPatientById(tx: DbTx, patientId: string): Promise<PatientRecord | null> {
    const res = await tx.query<PatientRow>(
      `SELECT id, tenant_id, clinic_id, preferred_locale, access_mode, ml_training_consent_flag,
              phone_hash, phone_masked, full_name_fa, national_id_masked, birth_year_jalali, notes_fa, created_at
       FROM patients WHERE id = $1`,
      [patientId]
    );
    return res.rows[0] ? mapPatientRow(res.rows[0]) : null;
  }

  async listPatients(
    tx: DbTx,
    filter: {
      clinicId?: string | undefined;
      q?: string | undefined;
      accessMode?: "app" | "caregiver" | "print_phone" | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: PatientListItem[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const push = (v: unknown): string => {
      params.push(v);
      return `$${params.length}`;
    };

    if (filter.clinicId) {
      conditions.push(`p.clinic_id = ${push(filter.clinicId)}`);
    }
    if (filter.accessMode) {
      conditions.push(`p.access_mode = ${push(filter.accessMode)}`);
    }
    if (filter.q && filter.q.trim().length > 0) {
      const pattern = `%${filter.q.trim()}%`;
      const qParam = push(pattern);
      conditions.push(
        `(p.full_name_fa ILIKE ${qParam} OR COALESCE(p.national_id_masked, '') ILIKE ${qParam} OR p.phone_masked ILIKE ${qParam})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRes = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt FROM patients p ${whereClause}`,
      params
    );
    const total = Number(countRes.rows[0]?.cnt ?? "0");

    const limitP = push(filter.limit);
    const offsetP = push(filter.offset);

    const rowsRes = await tx.query<{
      id: string;
      clinic_id: string;
      full_name_fa: string;
      phone_masked: string;
      national_id_masked: string | null;
      access_mode: "app" | "caregiver" | "print_phone";
      preferred_locale: string;
      active_ep_cnt: string;
      open_triage_cnt: string;
      created_at: Date;
    }>(
      `SELECT p.id,
              p.clinic_id,
              p.full_name_fa,
              p.phone_masked,
              p.national_id_masked,
              p.access_mode,
              p.preferred_locale,
              (SELECT count(*)::text FROM care_episodes ce WHERE ce.patient_id = p.id AND ce.status = 'active') AS active_ep_cnt,
              (SELECT count(*)::text FROM triage_cases tc WHERE tc.patient_id = p.id AND tc.status <> 'Closed') AS open_triage_cnt,
              p.created_at
       FROM patients p
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ${limitP} OFFSET ${offsetP}`,
      params
    );

    const items: PatientListItem[] = rowsRes.rows.map((r) => ({
      patientId: r.id,
      clinicId: r.clinic_id,
      fullNameFa: r.full_name_fa,
      phoneMasked: r.phone_masked,
      nationalIdMasked: r.national_id_masked,
      accessMode: r.access_mode,
      preferredLocale: r.preferred_locale,
      activeEpisodeCount: Number(r.active_ep_cnt),
      openTriageCount: Number(r.open_triage_cnt),
      createdAtIso: r.created_at.toISOString(),
    }));

    return { items, total };
  }

  async insertClinicalHistory(
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
  ): Promise<PatientClinicalHistoryRecord> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      patient_id: string;
      recorded_by_user_id: string;
      summary_fa: string;
      conditions_json: string[];
      allergies_json: string[];
      medications_json: string[];
      risk_factors_json: Record<string, unknown>;
      labs_json: Record<string, unknown>;
      created_at: Date;
    }>(
      `INSERT INTO patient_clinical_histories
         (tenant_id, clinic_id, patient_id, recorded_by_user_id, summary_fa, conditions_json, allergies_json, medications_json, risk_factors_json, labs_json)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb)
       RETURNING id, tenant_id, clinic_id, patient_id, recorded_by_user_id, summary_fa, conditions_json, allergies_json, medications_json, risk_factors_json, labs_json, created_at`,
      [
        input.tenantId,
        input.clinicId,
        input.patientId,
        input.recordedByUserId,
        input.summaryFa,
        JSON.stringify(input.conditions),
        JSON.stringify(input.allergies),
        JSON.stringify(input.medications),
        JSON.stringify(input.riskFactors),
        JSON.stringify(input.labs),
      ]
    );
    const r = res.rows[0]!;
    return {
      historyId: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      patientId: r.patient_id,
      recordedByUserId: r.recorded_by_user_id,
      summaryFa: r.summary_fa,
      conditions: r.conditions_json ?? [],
      allergies: r.allergies_json ?? [],
      medications: r.medications_json ?? [],
      riskFactors: r.risk_factors_json ?? {},
      labs: r.labs_json ?? {},
      createdAtIso: r.created_at.toISOString(),
    };
  }

  async listClinicalHistory(tx: DbTx, patientId: string): Promise<PatientClinicalHistoryRecord[]> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      patient_id: string;
      recorded_by_user_id: string;
      summary_fa: string;
      conditions_json: string[];
      allergies_json: string[];
      medications_json: string[];
      risk_factors_json: Record<string, unknown>;
      labs_json: Record<string, unknown>;
      created_at: Date;
    }>(
      `SELECT id, tenant_id, clinic_id, patient_id, recorded_by_user_id, summary_fa, conditions_json, allergies_json, medications_json, risk_factors_json, labs_json, created_at
       FROM patient_clinical_histories
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [patientId]
    );
    return res.rows.map((r) => ({
      historyId: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      patientId: r.patient_id,
      recordedByUserId: r.recorded_by_user_id,
      summaryFa: r.summary_fa,
      conditions: r.conditions_json ?? [],
      allergies: r.allergies_json ?? [],
      medications: r.medications_json ?? [],
      riskFactors: r.risk_factors_json ?? {},
      labs: r.labs_json ?? {},
      createdAtIso: r.created_at.toISOString(),
    }));
  }

  async updatePatientMlConsent(tx: DbTx, patientId: string, mlTrainingConsentFlag: boolean): Promise<void> {
    await tx.query(`UPDATE patients SET ml_training_consent_flag = $2 WHERE id = $1`, [
      patientId,
      mlTrainingConsentFlag,
    ]);
  }

  async recordConsentAcceptance(
    tx: DbTx,
    input: {
      tenantId: string;
      patientId: string;
      consentVersion: string;
      locale: string;
      action?: "accepted" | "withdrawn" | undefined;
      recordedByUserId?: string | undefined;
    }
  ): Promise<ConsentAcceptanceRecord> {
    const res = await tx.query<{
      id: string;
      consent_version: string;
      locale: string;
      action: "accepted" | "withdrawn";
      recorded_by_user_id: string | null;
      accepted_at: Date;
    }>(
      `INSERT INTO consent_acceptances (tenant_id, patient_id, consent_version, locale, action, recorded_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, consent_version, locale, action, recorded_by_user_id, accepted_at`,
      [
        input.tenantId,
        input.patientId,
        input.consentVersion,
        input.locale,
        input.action ?? "accepted",
        input.recordedByUserId ?? null,
      ]
    );
    const r = res.rows[0]!;
    return {
      id: r.id,
      consentVersion: r.consent_version,
      locale: r.locale,
      action: r.action,
      recordedByUserId: r.recorded_by_user_id,
      acceptedAt: r.accepted_at,
    };
  }

  async listConsentsByPatient(tx: DbTx, patientId: string): Promise<ConsentAcceptanceRecord[]> {
    const res = await tx.query<{
      id: string;
      consent_version: string;
      locale: string;
      action: "accepted" | "withdrawn";
      recorded_by_user_id: string | null;
      accepted_at: Date;
    }>(
      `SELECT id, consent_version, locale, action, recorded_by_user_id, accepted_at
       FROM consent_acceptances
       WHERE patient_id = $1
       ORDER BY accepted_at DESC
       LIMIT 30`,
      [patientId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      consentVersion: r.consent_version,
      locale: r.locale,
      action: r.action,
      recordedByUserId: r.recorded_by_user_id,
      acceptedAt: r.accepted_at,
    }));
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

  async listCaregiverGrantsByPatient(tx: DbTx, patientId: string): Promise<CaregiverGrantRecord[]> {
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
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [patientId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      patientId: r.patient_id,
      caregiverPhoneHash: r.caregiver_phone_hash,
      relationshipFa: r.relationship_fa,
      scopes: r.scopes_json,
      active: r.active,
      revokedAt: r.revoked_at,
      createdAt: r.created_at,
    }));
  }

  async listActiveGrantsByCaregiverPhoneHash(
    tx: DbTx,
    caregiverPhoneHash: string
  ): Promise<CaregiverPatientLink[]> {
    const res = await tx.query<{
      grant_id: string;
      patient_id: string;
      full_name_fa: string;
      relationship_fa: string;
      scopes_json: string[];
      clinic_id: string;
      active: boolean;
      created_at: Date;
    }>(
      `SELECT g.id AS grant_id, g.patient_id, p.full_name_fa, g.relationship_fa, g.scopes_json, p.clinic_id, g.active, g.created_at
       FROM caregiver_grants g
       JOIN patients p ON p.id = g.patient_id
       WHERE g.caregiver_phone_hash = $1 AND g.active = true AND g.revoked_at IS NULL
       ORDER BY g.created_at DESC`,
      [caregiverPhoneHash]
    );
    return res.rows.map((r) => ({
      grantId: r.grant_id,
      patientId: r.patient_id,
      patientNameFa: r.full_name_fa,
      relationshipFa: r.relationship_fa,
      scopes: r.scopes_json,
      clinicId: r.clinic_id,
      active: r.active,
      createdAt: r.created_at,
    }));
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
