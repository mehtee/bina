import type { DbTx } from "../../../packages/db/index.js";
import type {
  IntegrationAuthMode,
  IntegrationDeliveryRecord,
  IntegrationDeliveryStatus,
  IntegrationEndpointRecord,
  IntegrationEndpointType,
  IntegrationsRepoPort,
} from "../ports/index.js";

interface EndpointRow {
  id: string;
  tenant_id: string;
  clinic_id: string;
  integration_type: IntegrationEndpointType;
  name_fa: string;
  endpoint_url: string;
  ae_title: string | null;
  auth_mode: IntegrationAuthMode;
  secret_masked: string | null;
  enabled: boolean;
  last_tested_at: Date | null;
  last_test_status: "ok" | "failed" | null;
  created_at: Date;
  updated_at: Date;
}

function mapEndpointRow(r: EndpointRow): IntegrationEndpointRecord {
  return {
    endpointId: r.id,
    tenantId: r.tenant_id,
    clinicId: r.clinic_id,
    integrationType: r.integration_type,
    nameFa: r.name_fa,
    endpointUrl: r.endpoint_url,
    aeTitle: r.ae_title,
    authMode: r.auth_mode,
    secretMasked: r.secret_masked,
    enabled: r.enabled,
    lastTestedAtIso: r.last_tested_at ? r.last_tested_at.toISOString() : null,
    lastTestStatus: r.last_test_status,
    createdAtIso: r.created_at.toISOString(),
    updatedAtIso: r.updated_at.toISOString(),
  };
}

export class PgIntegrationsRepo implements IntegrationsRepoPort {
  async listEndpoints(tx: DbTx, clinicId: string): Promise<IntegrationEndpointRecord[]> {
    const res = await tx.query<EndpointRow>(
      `SELECT id, tenant_id, clinic_id, integration_type, name_fa, endpoint_url, ae_title, auth_mode,
              secret_masked, enabled, last_tested_at, last_test_status, created_at, updated_at
       FROM integration_endpoints
       WHERE clinic_id = $1
       ORDER BY created_at DESC`,
      [clinicId]
    );
    return res.rows.map(mapEndpointRow);
  }

  async findEndpointById(tx: DbTx, endpointId: string): Promise<IntegrationEndpointRecord | null> {
    const res = await tx.query<EndpointRow>(
      `SELECT id, tenant_id, clinic_id, integration_type, name_fa, endpoint_url, ae_title, auth_mode,
              secret_masked, enabled, last_tested_at, last_test_status, created_at, updated_at
       FROM integration_endpoints WHERE id = $1`,
      [endpointId]
    );
    return res.rows[0] ? mapEndpointRow(res.rows[0]) : null;
  }

  async insertEndpoint(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      integrationType: IntegrationEndpointType;
      nameFa: string;
      endpointUrl: string;
      aeTitle?: string | undefined;
      authMode: IntegrationAuthMode;
      secretMasked?: string | undefined;
      enabled: boolean;
    }
  ): Promise<IntegrationEndpointRecord> {
    const res = await tx.query<EndpointRow>(
      `INSERT INTO integration_endpoints
         (tenant_id, clinic_id, integration_type, name_fa, endpoint_url, ae_title, auth_mode, secret_masked, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, tenant_id, clinic_id, integration_type, name_fa, endpoint_url, ae_title, auth_mode,
                 secret_masked, enabled, last_tested_at, last_test_status, created_at, updated_at`,
      [
        input.tenantId,
        input.clinicId,
        input.integrationType,
        input.nameFa,
        input.endpointUrl,
        input.aeTitle ?? null,
        input.authMode,
        input.secretMasked ?? null,
        input.enabled,
      ]
    );
    return mapEndpointRow(res.rows[0]!);
  }

  async updateEndpoint(
    tx: DbTx,
    endpointId: string,
    patch: {
      nameFa?: string | undefined;
      endpointUrl?: string | undefined;
      aeTitle?: string | null | undefined;
      authMode?: IntegrationAuthMode | undefined;
      secretMasked?: string | null | undefined;
      enabled?: boolean | undefined;
    }
  ): Promise<IntegrationEndpointRecord | null> {
    const existing = await this.findEndpointById(tx, endpointId);
    if (!existing) return null;

    const res = await tx.query<EndpointRow>(
      `UPDATE integration_endpoints
       SET name_fa = $2,
           endpoint_url = $3,
           ae_title = $4,
           auth_mode = $5,
           secret_masked = $6,
           enabled = $7,
           updated_at = now()
       WHERE id = $1
       RETURNING id, tenant_id, clinic_id, integration_type, name_fa, endpoint_url, ae_title, auth_mode,
                 secret_masked, enabled, last_tested_at, last_test_status, created_at, updated_at`,
      [
        endpointId,
        patch.nameFa ?? existing.nameFa,
        patch.endpointUrl ?? existing.endpointUrl,
        patch.aeTitle === undefined ? existing.aeTitle : patch.aeTitle,
        patch.authMode ?? existing.authMode,
        patch.secretMasked === undefined ? existing.secretMasked : patch.secretMasked,
        patch.enabled ?? existing.enabled,
      ]
    );
    return res.rows[0] ? mapEndpointRow(res.rows[0]) : null;
  }

  async recordEndpointTestResult(
    tx: DbTx,
    endpointId: string,
    status: "ok" | "failed"
  ): Promise<IntegrationEndpointRecord | null> {
    const res = await tx.query<EndpointRow>(
      `UPDATE integration_endpoints
       SET last_tested_at = now(),
           last_test_status = $2,
           updated_at = now()
       WHERE id = $1
       RETURNING id, tenant_id, clinic_id, integration_type, name_fa, endpoint_url, ae_title, auth_mode,
                 secret_masked, enabled, last_tested_at, last_test_status, created_at, updated_at`,
      [endpointId, status]
    );
    return res.rows[0] ? mapEndpointRow(res.rows[0]) : null;
  }

  async insertDelivery(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      endpointId?: string | undefined;
      direction: "inbound" | "outbound";
      payloadType: string;
      referenceId?: string | undefined;
      status: IntegrationDeliveryStatus;
      httpStatus?: number | undefined;
      errorCode?: string | undefined;
      errorMessageFa?: string | undefined;
    }
  ): Promise<IntegrationDeliveryRecord> {
    const res = await tx.query<{
      id: string;
      clinic_id: string;
      endpoint_id: string | null;
      direction: "inbound" | "outbound";
      payload_type: string;
      reference_id: string | null;
      status: IntegrationDeliveryStatus;
      http_status: number | null;
      error_code: string | null;
      error_message_fa: string | null;
      attempt_count: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO integration_deliveries
         (tenant_id, clinic_id, endpoint_id, direction, payload_type, reference_id, status, http_status, error_code, error_message_fa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, clinic_id, endpoint_id, direction, payload_type, reference_id, status, http_status, error_code, error_message_fa, attempt_count, created_at, updated_at`,
      [
        input.tenantId,
        input.clinicId,
        input.endpointId ?? null,
        input.direction,
        input.payloadType,
        input.referenceId ?? null,
        input.status,
        input.httpStatus ?? null,
        input.errorCode ?? null,
        input.errorMessageFa ?? null,
      ]
    );
    const r = res.rows[0]!;
    return {
      deliveryId: r.id,
      clinicId: r.clinic_id,
      endpointId: r.endpoint_id,
      endpointNameFa: null,
      direction: r.direction,
      payloadType: r.payload_type,
      referenceId: r.reference_id,
      status: r.status,
      httpStatus: r.http_status,
      errorCode: r.error_code,
      errorMessageFa: r.error_message_fa,
      attemptCount: r.attempt_count,
      createdAtIso: r.created_at.toISOString(),
      updatedAtIso: r.updated_at.toISOString(),
    };
  }

  async listDeliveries(
    tx: DbTx,
    filter: {
      clinicId: string;
      endpointId?: string | undefined;
      status?: IntegrationDeliveryStatus | undefined;
      direction?: "inbound" | "outbound" | undefined;
      limit: number;
      offset: number;
    }
  ): Promise<{ items: IntegrationDeliveryRecord[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const push = (v: unknown): string => {
      params.push(v);
      return `$${params.length}`;
    };

    conditions.push(`d.clinic_id = ${push(filter.clinicId)}`);
    if (filter.endpointId) conditions.push(`d.endpoint_id = ${push(filter.endpointId)}`);
    if (filter.status) conditions.push(`d.status = ${push(filter.status)}`);
    if (filter.direction) conditions.push(`d.direction = ${push(filter.direction)}`);

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const countRes = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt FROM integration_deliveries d ${whereClause}`,
      params
    );
    const total = Number(countRes.rows[0]?.cnt ?? "0");

    const limitP = push(filter.limit);
    const offsetP = push(filter.offset);

    const rowsRes = await tx.query<{
      id: string;
      clinic_id: string;
      endpoint_id: string | null;
      endpoint_name_fa: string | null;
      direction: "inbound" | "outbound";
      payload_type: string;
      reference_id: string | null;
      status: IntegrationDeliveryStatus;
      http_status: number | null;
      error_code: string | null;
      error_message_fa: string | null;
      attempt_count: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT d.id, d.clinic_id, d.endpoint_id, ie.name_fa AS endpoint_name_fa,
              d.direction, d.payload_type, d.reference_id, d.status, d.http_status,
              d.error_code, d.error_message_fa, d.attempt_count, d.created_at, d.updated_at
       FROM integration_deliveries d
       LEFT JOIN integration_endpoints ie ON ie.id = d.endpoint_id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT ${limitP} OFFSET ${offsetP}`,
      params
    );

    const items: IntegrationDeliveryRecord[] = rowsRes.rows.map((r) => ({
      deliveryId: r.id,
      clinicId: r.clinic_id,
      endpointId: r.endpoint_id,
      endpointNameFa: r.endpoint_name_fa,
      direction: r.direction,
      payloadType: r.payload_type,
      referenceId: r.reference_id,
      status: r.status,
      httpStatus: r.http_status,
      errorCode: r.error_code,
      errorMessageFa: r.error_message_fa,
      attemptCount: r.attempt_count,
      createdAtIso: r.created_at.toISOString(),
      updatedAtIso: r.updated_at.toISOString(),
    }));

    return { items, total };
  }
}
