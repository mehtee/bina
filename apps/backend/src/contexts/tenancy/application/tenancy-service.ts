import { authorizeStaffAction, type StaffPrincipal } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import { evaluateFeatureFlags, type EvaluatedFeatureFlag } from "../../../packages/feature-policy/index.js";
import type { AuditLogPort } from "../../audit-compliance/ports/index.js";
import { SmsPhiViolationError, validatePhiFreeTemplateText } from "../../notifications/index.js";
import { formatJalaliDate, isIranWorkweekStaffed } from "../domain/jalali.js";
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

export interface ClinicRuntimeView extends ClinicRecord {
  readonly todayJalali: string;
  readonly currentlyStaffed: boolean;
}

export class TenancyError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    messageFa: string
  ) {
    super(messageFa);
    this.name = "TenancyError";
  }
}

export class TenancyService {
  constructor(
    private readonly repo: TenancyRepoPort,
    private readonly auditLog?: AuditLogPort | undefined
  ) {}

  async getClinicProfile(
    tx: DbTx,
    clinicId: string,
    now: Date = new Date()
  ): Promise<ClinicRuntimeView | null> {
    const clinic = await this.repo.findClinicById(tx, clinicId);
    if (!clinic) return null;
    return {
      ...clinic,
      todayJalali: formatJalaliDate(now, clinic.timezone),
      currentlyStaffed: isIranWorkweekStaffed(now, clinic.staffedHours, clinic.timezone),
    };
  }

  async updateClinicProfile(
    tx: DbTx,
    principal: StaffPrincipal,
    patch: UpdateClinicPatch
  ): Promise<ClinicRuntimeView> {
    const decision = authorizeStaffAction(principal, "admin:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TenancyError(403, decision.code, decision.reasonFa);
    }

    const updated = await this.repo.updateClinic(tx, principal.clinicId, patch);
    if (!updated) {
      throw new TenancyError(404, "CLINIC_NOT_FOUND", "کلینیک یافت نشد.");
    }

    if (this.auditLog) {
      await this.auditLog.append(tx, {
        tenantId: principal.tenantId,
        actorUserId: principal.userId,
        actorRole: principal.role,
        action: "admin.clinic-updated",
        resourceType: "clinic",
        resourceId: principal.clinicId,
        metadata: { updatedKeys: Object.keys(patch) },
      });
    }

    return {
      ...updated,
      todayJalali: formatJalaliDate(new Date(), updated.timezone),
      currentlyStaffed: isIranWorkweekStaffed(new Date(), updated.staffedHours, updated.timezone),
    };
  }

  async listFeatureFlags(tx: DbTx, principal: StaffPrincipal): Promise<EvaluatedFeatureFlag[]> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new TenancyError(403, decision.code, decision.reasonFa);
    }
    const overrides = await this.repo.listFeatureFlags(tx, principal.clinicId);
    return evaluateFeatureFlags(overrides);
  }

  async upsertFeatureFlag(
    tx: DbTx,
    principal: StaffPrincipal,
    input: { flagKey: string; enabled: boolean; config?: Record<string, unknown> | undefined }
  ): Promise<ClinicFeatureFlagRecord> {
    const decision = authorizeStaffAction(principal, "admin:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TenancyError(403, decision.code, decision.reasonFa);
    }
    const saved = await this.repo.upsertFeatureFlag(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      flagKey: input.flagKey,
      enabled: input.enabled,
      config: input.config,
      updatedByUserId: principal.userId,
    });
    if (this.auditLog) {
      await this.auditLog.append(tx, {
        tenantId: principal.tenantId,
        actorUserId: principal.userId,
        actorRole: principal.role,
        action: "admin.feature-flag-updated",
        resourceType: "clinic_feature_flag",
        resourceId: saved.id,
        metadata: { flagKey: input.flagKey, enabled: input.enabled },
      });
    }
    return saved;
  }

  async listMessageTemplates(tx: DbTx, principal: StaffPrincipal): Promise<ClinicMessageTemplateRecord[]> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new TenancyError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listMessageTemplates(tx, principal.clinicId);
  }

  async createMessageTemplate(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      templateKey: string;
      bodyTemplateFa: string;
      channel: MessageChannel;
      active?: boolean | undefined;
    }
  ): Promise<ClinicMessageTemplateRecord> {
    const decision = authorizeStaffAction(principal, "admin:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TenancyError(403, decision.code, decision.reasonFa);
    }

    try {
      validatePhiFreeTemplateText(input.bodyTemplateFa, input.channel);
    } catch (err) {
      if (err instanceof SmsPhiViolationError) {
        throw new TenancyError(422, "SMS_PHI_VIOLATION", err.message);
      }
      throw err;
    }

    const saved = await this.repo.createMessageTemplate(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      templateKey: input.templateKey,
      bodyTemplateFa: input.bodyTemplateFa.trim(),
      channel: input.channel,
      active: input.active ?? true,
      updatedByUserId: principal.userId,
    });

    if (this.auditLog) {
      await this.auditLog.append(tx, {
        tenantId: principal.tenantId,
        actorUserId: principal.userId,
        actorRole: principal.role,
        action: "admin.message-template-created",
        resourceType: "clinic_message_template",
        resourceId: saved.templateId,
        metadata: { templateKey: saved.templateKey, version: saved.version, channel: saved.channel },
      });
    }
    return saved;
  }

  async listConsentTemplates(tx: DbTx, principal: StaffPrincipal): Promise<ClinicConsentTemplateRecord[]> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new TenancyError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listConsentTemplates(tx, principal.clinicId);
  }

  async createConsentTemplate(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      consentType: ConsentTemplateType;
      version: string;
      titleFa: string;
      bodyFa: string;
      active?: boolean | undefined;
    }
  ): Promise<ClinicConsentTemplateRecord> {
    const decision = authorizeStaffAction(principal, "admin:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TenancyError(403, decision.code, decision.reasonFa);
    }
    const saved = await this.repo.createConsentTemplate(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      consentType: input.consentType,
      version: input.version,
      titleFa: input.titleFa.trim(),
      bodyFa: input.bodyFa.trim(),
      active: input.active ?? true,
      updatedByUserId: principal.userId,
    });
    if (this.auditLog) {
      await this.auditLog.append(tx, {
        tenantId: principal.tenantId,
        actorUserId: principal.userId,
        actorRole: principal.role,
        action: "admin.consent-template-created",
        resourceType: "clinic_consent_template",
        resourceId: saved.consentTemplateId,
        metadata: { consentType: saved.consentType, version: saved.version },
      });
    }
    return saved;
  }

  async listProtocols(
    tx: DbTx,
    principal: StaffPrincipal,
    builtInProtocolTypes: readonly string[]
  ): Promise<{ builtInTypes: readonly string[]; versions: ProtocolTemplateRecord[] }> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new TenancyError(403, decision.code, decision.reasonFa);
    }
    const versions = await this.repo.listProtocolTemplates(tx, principal.clinicId);
    return {
      builtInTypes: builtInProtocolTypes,
      versions,
    };
  }

  async createProtocolTemplateVersion(
    tx: DbTx,
    principal: StaffPrincipal,
    input: { protocolType: string; schema: Record<string, unknown> }
  ): Promise<ProtocolTemplateRecord> {
    const decision = authorizeStaffAction(principal, "admin:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new TenancyError(403, decision.code, decision.reasonFa);
    }
    const created = await this.repo.createProtocolTemplateVersion(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      protocolType: input.protocolType,
      schema: input.schema,
      approvedBy: principal.userId,
    });
    if (this.auditLog) {
      await this.auditLog.append(tx, {
        tenantId: principal.tenantId,
        actorUserId: principal.userId,
        actorRole: principal.role,
        action: "admin.protocol-version-created",
        resourceType: "protocol_template",
        resourceId: created.id,
        metadata: { protocolType: created.protocolType, version: created.version },
      });
    }
    return created;
  }
}
