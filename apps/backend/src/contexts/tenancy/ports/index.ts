import type { DbTx } from "../../../packages/db/index.js";
import type { ClinicId, TenantId } from "../../../packages/domain-kernel/index.js";
import type { IranStaffedHours } from "../domain/jalali.js";

export type ConsentTemplateType =
  | "care_enrollment"
  | "diagnostic_ai"
  | "research_d5"
  | "caregiver_delegation";

export type MessageChannel = "sms" | "print" | "in_app";

export interface ClinicRecord {
  readonly id: ClinicId;
  readonly tenantId: TenantId;
  readonly nameFa: string;
  readonly timezone: string;
  readonly calendarMode: "jalali" | "gregorian";
  readonly staffedHours: IranStaffedHours;
  readonly emergencyPhone: string;
  readonly dicomAeTitle?: string | undefined;
}

export interface UpdateClinicPatch {
  readonly nameFa?: string | undefined;
  readonly emergencyPhone?: string | undefined;
  readonly staffedHours?:
    | {
        readonly satToWed?: IranStaffedHours["satToWed"] | undefined;
        readonly thursday?: IranStaffedHours["thursday"] | undefined;
        readonly fridayClosed?: boolean | undefined;
      }
    | undefined;
  readonly calendarMode?: "jalali" | "gregorian" | undefined;
  readonly dicomAeTitle?: string | null | undefined;
}

export interface ClinicFeatureFlagRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly flagKey: string;
  readonly enabled: boolean;
  readonly config: Record<string, unknown>;
  readonly updatedByUserId: string;
  readonly updatedAtIso: string;
}

export interface ClinicMessageTemplateRecord {
  readonly templateId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly templateKey: string;
  readonly version: number;
  readonly bodyTemplateFa: string;
  readonly channel: MessageChannel;
  readonly active: boolean;
  readonly updatedByUserId: string;
  readonly createdAtIso: string;
}

export interface ClinicConsentTemplateRecord {
  readonly consentTemplateId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly consentType: ConsentTemplateType;
  readonly version: string;
  readonly titleFa: string;
  readonly bodyFa: string;
  readonly active: boolean;
  readonly updatedByUserId: string;
  readonly createdAtIso: string;
}

export interface ProtocolTemplateRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly protocolType: string;
  readonly version: number;
  readonly schema: Record<string, unknown>;
  readonly approvedBy?: string | undefined;
  readonly createdAtIso: string;
}

export interface TenancyRepoPort {
  findClinicById(tx: DbTx, clinicId: string): Promise<ClinicRecord | null>;
  updateClinic(tx: DbTx, clinicId: string, patch: UpdateClinicPatch): Promise<ClinicRecord | null>;
  listFeatureFlags(tx: DbTx, clinicId: string): Promise<ClinicFeatureFlagRecord[]>;
  upsertFeatureFlag(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      flagKey: string;
      enabled: boolean;
      config?: Record<string, unknown> | undefined;
      updatedByUserId: string;
    }
  ): Promise<ClinicFeatureFlagRecord>;
  listMessageTemplates(tx: DbTx, clinicId: string): Promise<ClinicMessageTemplateRecord[]>;
  createMessageTemplate(
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
  ): Promise<ClinicMessageTemplateRecord>;
  listConsentTemplates(tx: DbTx, clinicId: string): Promise<ClinicConsentTemplateRecord[]>;
  createConsentTemplate(
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
  ): Promise<ClinicConsentTemplateRecord>;
  listProtocolTemplates(tx: DbTx, clinicId: string): Promise<ProtocolTemplateRecord[]>;
  createProtocolTemplateVersion(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      protocolType: string;
      schema: Record<string, unknown>;
      approvedBy: string;
    }
  ): Promise<ProtocolTemplateRecord>;
}
