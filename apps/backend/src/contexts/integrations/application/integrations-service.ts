import { authorizeStaffAction, type StaffPrincipal } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import type { AuditLogPort } from "../../audit-compliance/ports/index.js";
import type {
  IntegrationAuthMode,
  IntegrationDeliveryRecord,
  IntegrationDeliveryStatus,
  IntegrationEndpointRecord,
  IntegrationEndpointType,
  IntegrationsRepoPort,
} from "../ports/index.js";

export class IntegrationsError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    messageFa: string
  ) {
    super(messageFa);
    this.name = "IntegrationsError";
  }
}

export function maskIntegrationSecret(rawSecret?: string | null): string | undefined {
  if (!rawSecret) return undefined;
  const trimmed = rawSecret.trim();
  if (!trimmed) return undefined;
  const tailLen = Math.min(4, trimmed.length);
  return `****${trimmed.slice(-tailLen)}`;
}

export class IntegrationsService {
  constructor(
    private readonly repo: IntegrationsRepoPort,
    private readonly auditLog: AuditLogPort
  ) {}

  async listEndpoints(tx: DbTx, principal: StaffPrincipal): Promise<IntegrationEndpointRecord[]> {
    const decision = authorizeStaffAction(principal, "integrations:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new IntegrationsError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listEndpoints(tx, principal.clinicId);
  }

  async createEndpoint(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      integrationType: IntegrationEndpointType;
      nameFa: string;
      endpointUrl: string;
      aeTitle?: string | undefined;
      authMode: IntegrationAuthMode;
      secret?: string | undefined;
      enabled?: boolean | undefined;
    }
  ): Promise<IntegrationEndpointRecord> {
    const decision = authorizeStaffAction(principal, "integrations:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new IntegrationsError(403, decision.code, decision.reasonFa);
    }

    const secretMasked = maskIntegrationSecret(input.secret);
    const created = await this.repo.insertEndpoint(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      integrationType: input.integrationType,
      nameFa: input.nameFa.trim(),
      endpointUrl: input.endpointUrl.trim(),
      aeTitle: input.aeTitle?.trim(),
      authMode: input.authMode,
      secretMasked,
      enabled: input.enabled ?? true,
    });

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "integrations.endpoint-created",
      resourceType: "integration_endpoint",
      resourceId: created.endpointId,
      metadata: {
        integrationType: created.integrationType,
        authMode: created.authMode,
        enabled: created.enabled,
      },
    });

    return created;
  }

  async updateEndpoint(
    tx: DbTx,
    principal: StaffPrincipal,
    endpointId: string,
    patch: {
      nameFa?: string | undefined;
      endpointUrl?: string | undefined;
      aeTitle?: string | null | undefined;
      authMode?: IntegrationAuthMode | undefined;
      secret?: string | null | undefined;
      enabled?: boolean | undefined;
    }
  ): Promise<IntegrationEndpointRecord> {
    const decision = authorizeStaffAction(principal, "integrations:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new IntegrationsError(403, decision.code, decision.reasonFa);
    }

    const nextMasked =
      patch.secret === undefined
        ? undefined
        : patch.secret === null
          ? null
          : maskIntegrationSecret(patch.secret) ?? null;

    const updated = await this.repo.updateEndpoint(tx, endpointId, {
      nameFa: patch.nameFa?.trim(),
      endpointUrl: patch.endpointUrl?.trim(),
      aeTitle: patch.aeTitle,
      authMode: patch.authMode,
      secretMasked: nextMasked,
      enabled: patch.enabled,
    });
    if (!updated) {
      throw new IntegrationsError(404, "INTEGRATION_ENDPOINT_NOT_FOUND", "نقطه اتصال یکپارچه‌سازی یافت نشد.");
    }

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "integrations.endpoint-updated",
      resourceType: "integration_endpoint",
      resourceId: updated.endpointId,
      metadata: { enabled: updated.enabled, authMode: updated.authMode },
    });

    return updated;
  }

  async testEndpoint(
    tx: DbTx,
    principal: StaffPrincipal,
    endpointId: string
  ): Promise<{ endpoint: IntegrationEndpointRecord; delivery: IntegrationDeliveryRecord }> {
    const decision = authorizeStaffAction(principal, "integrations:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new IntegrationsError(403, decision.code, decision.reasonFa);
    }
    const existing = await this.repo.findEndpointById(tx, endpointId);
    if (!existing) {
      throw new IntegrationsError(404, "INTEGRATION_ENDPOINT_NOT_FOUND", "نقطه اتصال یکپارچه‌سازی یافت نشد.");
    }

    let validConfig = existing.enabled;
    let errorCode: string | undefined;
    let errorMessageFa: string | undefined;

    if (!existing.enabled) {
      validConfig = false;
      errorCode = "ENDPOINT_DISABLED";
      errorMessageFa = "نقطه اتصال غیرفعال است.";
    } else if (existing.integrationType === "dicom_dimse") {
      if (!existing.aeTitle || existing.aeTitle.trim().length < 2) {
        validConfig = false;
        errorCode = "INVALID_AE_TITLE";
        errorMessageFa = "شناسه AE Title برای DICOM DIMSE نامعتبر است.";
      }
    } else {
      try {
        const parsed = new URL(existing.endpointUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          validConfig = false;
          errorCode = "UNSUPPORTED_PROTOCOL";
          errorMessageFa = "پروتکل نشانی باید http یا https باشد.";
        }
      } catch {
        validConfig = false;
        errorCode = "INVALID_ENDPOINT_URL";
        errorMessageFa = "فرمت نشانی نقطه اتصال نامعتبر است.";
      }
    }

    const updated = await this.repo.recordEndpointTestResult(tx, endpointId, validConfig ? "ok" : "failed");
    const delivery = await this.repo.insertDelivery(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      endpointId,
      direction: "outbound",
      payloadType: `connectivity_probe:${existing.integrationType}`,
      status: validConfig ? "delivered" : "failed",
      httpStatus: validConfig ? 200 : 422,
      errorCode,
      errorMessageFa,
    });

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "integrations.endpoint-tested",
      resourceType: "integration_endpoint",
      resourceId: endpointId,
      metadata: { result: validConfig ? "ok" : "failed", deliveryId: delivery.deliveryId },
    });

    return {
      endpoint: updated!,
      delivery,
    };
  }

  async listDeliveries(
    tx: DbTx,
    principal: StaffPrincipal,
    filter: {
      endpointId?: string | undefined;
      status?: IntegrationDeliveryStatus | undefined;
      direction?: "inbound" | "outbound" | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: IntegrationDeliveryRecord[]; total: number }> {
    const canManage = authorizeStaffAction(principal, "integrations:manage", principal.tenantId).allowed;
    const canOps = authorizeStaffAction(principal, "ops:read", principal.tenantId).allowed;
    if (!canManage && !canOps) {
      throw new IntegrationsError(403, "FORBIDDEN_ROLE", "دسترسی به تاریخچه تبادل داده‌ها مجاز نیست.");
    }
    return this.repo.listDeliveries(tx, {
      clinicId: principal.clinicId,
      endpointId: filter.endpointId,
      status: filter.status,
      direction: filter.direction,
      limit: Math.min(100, Math.max(1, filter.limit)),
      offset: Math.max(0, filter.offset),
    });
  }
}
