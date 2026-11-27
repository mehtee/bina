import type { DbTx } from "../../../packages/db/index.js";
import { asClinicId, asTenantId } from "../../../packages/domain-kernel/index.js";
import { DEFAULT_IRAN_STAFFED_HOURS, type IranStaffedHours } from "../domain/jalali.js";
import type {
  ClinicConsentTemplateRecord,
  ClinicFeatureFlagRecord,
  ClinicMessageTemplateRecord,
  ClinicRecord,
  ConsentTemplateType,
  MessageChannel,
  ProtocolTemplateRecord,
  TenancyRepoPort,
  UpdateClinicPatch,
} from "../ports/index.js";

interface ClinicRow {
  id: string;
  tenant_id: string;
  name_fa: string;
  timezone: string;
  calendar_mode: "jalali" | "gregorian";
  staffed_hours_json: Partial<IranStaffedHours> | null;
  emergency_phone: string;
  dicom_ae_title: string | null;
}

function mapClinicRow(row: ClinicRow): ClinicRecord {
  return {
    id: asClinicId(row.id),
    tenantId: asTenantId(row.tenant_id),
    nameFa: row.name_fa,
    timezone: row.timezone,
    calendarMode: row.calendar_mode,
    staffedHours: {
      ...DEFAULT_IRAN_STAFFED_HOURS,
      ...(row.staffed_hours_json ?? {}),
    },
    emergencyPhone: row.emergency_phone,
    dicomAeTitle: row.dicom_ae_title ?? undefined,
  };
}

export class PgTenancyRepo implements TenancyRepoPort {
  async findClinicById(tx: DbTx, clinicId: string): Promise<ClinicRecord | null> {
    const res = await tx.query<ClinicRow>(
      `SELECT id, tenant_id, name_fa, timezone, calendar_mode, staffed_hours_json, emergency_phone, dicom_ae_title
       FROM clinics
       WHERE id = $1`,
      [clinicId]
    );
    const row = res.rows[0];
    return row ? mapClinicRow(row) : null;
  }

  async updateClinic(tx: DbTx, clinicId: string, patch: UpdateClinicPatch): Promise<ClinicRecord | null> {
    const existing = await this.findClinicById(tx, clinicId);
    if (!existing) return null;

    const nextStaffedHours: IranStaffedHours = patch.staffedHours
      ? {
          satToWed: patch.staffedHours.satToWed ?? existing.staffedHours.satToWed,
          thursday: patch.staffedHours.thursday ?? existing.staffedHours.thursday,
          fridayClosed: patch.staffedHours.fridayClosed ?? existing.staffedHours.fridayClosed,
        }
      : existing.staffedHours;

    const res = await tx.query<ClinicRow>(
      `UPDATE clinics
       SET name_fa = $2,
           emergency_phone = $3,
           staffed_hours_json = $4::jsonb,
           calendar_mode = $5,
           dicom_ae_title = $6
       WHERE id = $1
       RETURNING id, tenant_id, name_fa, timezone, calendar_mode, staffed_hours_json, emergency_phone, dicom_ae_title`,
      [
        clinicId,
        patch.nameFa ?? existing.nameFa,
        patch.emergencyPhone ?? existing.emergencyPhone,
        JSON.stringify(nextStaffedHours),
        patch.calendarMode ?? existing.calendarMode,
        patch.dicomAeTitle === undefined ? existing.dicomAeTitle ?? null : patch.dicomAeTitle,
      ]
    );
    const row = res.rows[0];
    return row ? mapClinicRow(row) : null;
  }

  async listFeatureFlags(tx: DbTx, clinicId: string): Promise<ClinicFeatureFlagRecord[]> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      flag_key: string;
      enabled: boolean;
      config_json: Record<string, unknown>;
      updated_by_user_id: string;
      updated_at: Date;
    }>(
      `SELECT id, tenant_id, clinic_id, flag_key, enabled, config_json, updated_by_user_id, updated_at
       FROM clinic_feature_flags
       WHERE clinic_id = $1
       ORDER BY flag_key ASC`,
      [clinicId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      flagKey: r.flag_key,
      enabled: r.enabled,
      config: r.config_json ?? {},
      updatedByUserId: r.updated_by_user_id,
      updatedAtIso: r.updated_at.toISOString(),
    }));
  }

  async upsertFeatureFlag(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      flagKey: string;
      enabled: boolean;
      config?: Record<string, unknown> | undefined;
      updatedByUserId: string;
    }
  ): Promise<ClinicFeatureFlagRecord> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      flag_key: string;
      enabled: boolean;
      config_json: Record<string, unknown>;
      updated_by_user_id: string;
      updated_at: Date;
    }>(
      `INSERT INTO clinic_feature_flags
         (tenant_id, clinic_id, flag_key, enabled, config_json, updated_by_user_id, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, now())
       ON CONFLICT (tenant_id, clinic_id, flag_key) DO UPDATE
         SET enabled = EXCLUDED.enabled,
             config_json = EXCLUDED.config_json,
             updated_by_user_id = EXCLUDED.updated_by_user_id,
             updated_at = now()
       RETURNING id, tenant_id, clinic_id, flag_key, enabled, config_json, updated_by_user_id, updated_at`,
      [
        input.tenantId,
        input.clinicId,
        input.flagKey,
        input.enabled,
        JSON.stringify(input.config ?? {}),
        input.updatedByUserId,
      ]
    );
    const r = res.rows[0]!;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      flagKey: r.flag_key,
      enabled: r.enabled,
      config: r.config_json ?? {},
      updatedByUserId: r.updated_by_user_id,
      updatedAtIso: r.updated_at.toISOString(),
    };
  }

  async listMessageTemplates(tx: DbTx, clinicId: string): Promise<ClinicMessageTemplateRecord[]> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      template_key: string;
      version: number;
      body_template_fa: string;
      channel: MessageChannel;
      active: boolean;
      updated_by_user_id: string;
      created_at: Date;
    }>(
      `SELECT id, tenant_id, clinic_id, template_key, version, body_template_fa, channel, active, updated_by_user_id, created_at
       FROM clinic_message_templates
       WHERE clinic_id = $1
       ORDER BY template_key ASC, version DESC`,
      [clinicId]
    );
    return res.rows.map((r) => ({
      templateId: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      templateKey: r.template_key,
      version: r.version,
      bodyTemplateFa: r.body_template_fa,
      channel: r.channel,
      active: r.active,
      updatedByUserId: r.updated_by_user_id,
      createdAtIso: r.created_at.toISOString(),
    }));
  }

  async createMessageTemplate(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      templateKey: string;
      bodyTemplateFa: string;
      channel: MessageChannel;
      active: boolean;
      updatedByUserId: string;
    }
  ): Promise<ClinicMessageTemplateRecord> {
    const verRes = await tx.query<{ next_ver: number }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_ver
       FROM clinic_message_templates
       WHERE clinic_id = $1 AND template_key = $2`,
      [input.clinicId, input.templateKey]
    );
    const version = Number(verRes.rows[0]?.next_ver ?? 1);

    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      template_key: string;
      version: number;
      body_template_fa: string;
      channel: MessageChannel;
      active: boolean;
      updated_by_user_id: string;
      created_at: Date;
    }>(
      `INSERT INTO clinic_message_templates
         (tenant_id, clinic_id, template_key, version, body_template_fa, channel, active, updated_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tenant_id, clinic_id, template_key, version, body_template_fa, channel, active, updated_by_user_id, created_at`,
      [
        input.tenantId,
        input.clinicId,
        input.templateKey,
        version,
        input.bodyTemplateFa,
        input.channel,
        input.active,
        input.updatedByUserId,
      ]
    );
    const r = res.rows[0]!;
    return {
      templateId: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      templateKey: r.template_key,
      version: r.version,
      bodyTemplateFa: r.body_template_fa,
      channel: r.channel,
      active: r.active,
      updatedByUserId: r.updated_by_user_id,
      createdAtIso: r.created_at.toISOString(),
    };
  }

  async listConsentTemplates(tx: DbTx, clinicId: string): Promise<ClinicConsentTemplateRecord[]> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      consent_type: ConsentTemplateType;
      version: string;
      title_fa: string;
      body_fa: string;
      active: boolean;
      updated_by_user_id: string;
      created_at: Date;
    }>(
      `SELECT id, tenant_id, clinic_id, consent_type, version, title_fa, body_fa, active, updated_by_user_id, created_at
       FROM clinic_consent_templates
       WHERE clinic_id = $1
       ORDER BY consent_type ASC, created_at DESC`,
      [clinicId]
    );
    return res.rows.map((r) => ({
      consentTemplateId: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      consentType: r.consent_type,
      version: r.version,
      titleFa: r.title_fa,
      bodyFa: r.body_fa,
      active: r.active,
      updatedByUserId: r.updated_by_user_id,
      createdAtIso: r.created_at.toISOString(),
    }));
  }

  async createConsentTemplate(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      consentType: ConsentTemplateType;
      version: string;
      titleFa: string;
      bodyFa: string;
      active: boolean;
      updatedByUserId: string;
    }
  ): Promise<ClinicConsentTemplateRecord> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      consent_type: ConsentTemplateType;
      version: string;
      title_fa: string;
      body_fa: string;
      active: boolean;
      updated_by_user_id: string;
      created_at: Date;
    }>(
      `INSERT INTO clinic_consent_templates
         (tenant_id, clinic_id, consent_type, version, title_fa, body_fa, active, updated_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (tenant_id, clinic_id, consent_type, version) DO UPDATE
         SET title_fa = EXCLUDED.title_fa,
             body_fa = EXCLUDED.body_fa,
             active = EXCLUDED.active,
             updated_by_user_id = EXCLUDED.updated_by_user_id
       RETURNING id, tenant_id, clinic_id, consent_type, version, title_fa, body_fa, active, updated_by_user_id, created_at`,
      [
        input.tenantId,
        input.clinicId,
        input.consentType,
        input.version,
        input.titleFa,
        input.bodyFa,
        input.active,
        input.updatedByUserId,
      ]
    );
    const r = res.rows[0]!;
    return {
      consentTemplateId: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      consentType: r.consent_type,
      version: r.version,
      titleFa: r.title_fa,
      bodyFa: r.body_fa,
      active: r.active,
      updatedByUserId: r.updated_by_user_id,
      createdAtIso: r.created_at.toISOString(),
    };
  }

  async listProtocolTemplates(tx: DbTx, clinicId: string): Promise<ProtocolTemplateRecord[]> {
    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      protocol_type: string;
      version: number;
      schema_json: Record<string, unknown>;
      approved_by: string | null;
      created_at: Date;
    }>(
      `SELECT id, tenant_id, clinic_id, protocol_type, version, schema_json, approved_by, created_at
       FROM protocol_templates
       WHERE clinic_id = $1
       ORDER BY protocol_type ASC, version DESC`,
      [clinicId]
    );
    return res.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      protocolType: r.protocol_type,
      version: r.version,
      schema: r.schema_json ?? {},
      approvedBy: r.approved_by ?? undefined,
      createdAtIso: r.created_at.toISOString(),
    }));
  }

  async createProtocolTemplateVersion(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      protocolType: string;
      schema: Record<string, unknown>;
      approvedBy: string;
    }
  ): Promise<ProtocolTemplateRecord> {
    const verRes = await tx.query<{ next_ver: number }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_ver
       FROM protocol_templates
       WHERE clinic_id = $1 AND protocol_type = $2`,
      [input.clinicId, input.protocolType]
    );
    const version = Number(verRes.rows[0]?.next_ver ?? 1);

    const res = await tx.query<{
      id: string;
      tenant_id: string;
      clinic_id: string;
      protocol_type: string;
      version: number;
      schema_json: Record<string, unknown>;
      approved_by: string | null;
      created_at: Date;
    }>(
      `INSERT INTO protocol_templates (tenant_id, clinic_id, protocol_type, version, schema_json, approved_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING id, tenant_id, clinic_id, protocol_type, version, schema_json, approved_by, created_at`,
      [
        input.tenantId,
        input.clinicId,
        input.protocolType,
        version,
        JSON.stringify(input.schema),
        input.approvedBy,
      ]
    );
    const r = res.rows[0]!;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      clinicId: r.clinic_id,
      protocolType: r.protocol_type,
      version: r.version,
      schema: r.schema_json ?? {},
      approvedBy: r.approved_by ?? undefined,
      createdAtIso: r.created_at.toISOString(),
    };
  }
}
