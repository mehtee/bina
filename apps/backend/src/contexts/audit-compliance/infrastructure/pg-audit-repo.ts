import { redactPhi, redactPhiString } from "../../../packages/observability/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import type {
  AuditComplianceRepoPort,
  AuditEntryInput,
  AuditLogFilter,
  AuditLogRecord,
  BreakGlassSessionRecord,
} from "../ports/index.js";

interface AuditRow {
  id: string;
  tenant_id: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  reason_fa: string | null;
  break_glass: boolean;
  metadata_json: Record<string, unknown>;
  occurred_at: Date;
}

interface BreakGlassRow {
  id: string;
  tenant_id: string;
  clinic_id: string;
  actor_user_id: string;
  actor_role: string;
  patient_id: string;
  reason_fa: string;
  expires_at: Date;
  revoked_at: Date | null;
  revoked_by_user_id: string | null;
  created_at: Date;
}

function mapAuditRow(row: AuditRow): AuditLogRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    reasonFa: row.reason_fa ? redactPhiString(row.reason_fa) : undefined,
    breakGlass: row.break_glass,
    metadata: redactPhi(row.metadata_json ?? {}),
    occurredAtIso: row.occurred_at.toISOString(),
  };
}

function mapBreakGlassRow(row: BreakGlassRow, nowMs = Date.now()): BreakGlassSessionRecord {
  return {
    sessionId: row.id,
    tenantId: row.tenant_id,
    clinicId: row.clinic_id,
    actorUserId: row.actor_user_id,
    actorRole: row.actor_role,
    patientId: row.patient_id,
    reasonFa: row.reason_fa,
    expiresAtIso: row.expires_at.toISOString(),
    revokedAtIso: row.revoked_at ? row.revoked_at.toISOString() : null,
    revokedByUserId: row.revoked_by_user_id,
    active: row.revoked_at === null && row.expires_at.getTime() > nowMs,
    createdAtIso: row.created_at.toISOString(),
  };
}

export class PgAuditLogRepo implements AuditComplianceRepoPort {
  async append(tx: DbTx, entry: AuditEntryInput): Promise<AuditLogRecord> {
    const safeMeta = redactPhi(entry.metadata ?? {});
    const safeReason = entry.reasonFa ? redactPhiString(entry.reasonFa) : null;
    const res = await tx.query<AuditRow>(
      `INSERT INTO audit_logs
        (tenant_id, actor_user_id, actor_role, action, resource_type, resource_id, reason_fa, break_glass, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       RETURNING id, tenant_id, actor_user_id, actor_role, action, resource_type, resource_id, reason_fa, break_glass, metadata_json, occurred_at`,
      [
        entry.tenantId,
        entry.actorUserId,
        entry.actorRole,
        entry.action,
        entry.resourceType,
        entry.resourceId,
        safeReason,
        entry.breakGlass ?? false,
        JSON.stringify(safeMeta),
      ]
    );
    return mapAuditRow(res.rows[0]!);
  }

  async listByResource(tx: DbTx, resourceType: string, resourceId: string): Promise<AuditLogRecord[]> {
    const res = await tx.query<AuditRow>(
      `SELECT id, tenant_id, actor_user_id, actor_role, action, resource_type, resource_id, reason_fa, break_glass, metadata_json, occurred_at
       FROM audit_logs
       WHERE resource_type = $1 AND resource_id = $2
       ORDER BY occurred_at ASC`,
      [resourceType, resourceId]
    );
    return res.rows.map(mapAuditRow);
  }

  async listAuditLogs(
    tx: DbTx,
    filter: AuditLogFilter
  ): Promise<{ items: AuditLogRecord[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const push = (v: unknown): string => {
      params.push(v);
      return `$${params.length}`;
    };

    if (filter.action) conditions.push(`action = ${push(filter.action)}`);
    if (filter.resourceType) conditions.push(`resource_type = ${push(filter.resourceType)}`);
    if (filter.actorUserId) conditions.push(`actor_user_id = ${push(filter.actorUserId)}`);
    if (filter.breakGlassOnly) conditions.push(`break_glass = true`);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRes = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt FROM audit_logs ${whereClause}`,
      params
    );
    const total = Number(countRes.rows[0]?.cnt ?? "0");

    const limitP = push(filter.limit);
    const offsetP = push(filter.offset);

    const rowsRes = await tx.query<AuditRow>(
      `SELECT id, tenant_id, actor_user_id, actor_role, action, resource_type, resource_id, reason_fa, break_glass, metadata_json, occurred_at
       FROM audit_logs
       ${whereClause}
       ORDER BY occurred_at DESC
       LIMIT ${limitP} OFFSET ${offsetP}`,
      params
    );

    return {
      items: rowsRes.rows.map(mapAuditRow),
      total,
    };
  }

  async patientExists(tx: DbTx, patientId: string): Promise<boolean> {
    const res = await tx.query<{ id: string }>(`SELECT id FROM patients WHERE id = $1 LIMIT 1`, [patientId]);
    return (res.rowCount ?? 0) > 0;
  }

  async insertBreakGlassSession(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      actorUserId: string;
      actorRole: string;
      patientId: string;
      reasonFa: string;
      expiresAt: Date;
    }
  ): Promise<BreakGlassSessionRecord> {
    const res = await tx.query<BreakGlassRow>(
      `INSERT INTO break_glass_sessions
         (tenant_id, clinic_id, actor_user_id, actor_role, patient_id, reason_fa, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
       RETURNING id, tenant_id, clinic_id, actor_user_id, actor_role, patient_id, reason_fa, expires_at, revoked_at, revoked_by_user_id, created_at`,
      [
        input.tenantId,
        input.clinicId,
        input.actorUserId,
        input.actorRole,
        input.patientId,
        input.reasonFa,
        input.expiresAt.toISOString(),
      ]
    );
    return mapBreakGlassRow(res.rows[0]!);
  }

  async findBreakGlassSessionById(tx: DbTx, sessionId: string): Promise<BreakGlassSessionRecord | null> {
    const res = await tx.query<BreakGlassRow>(
      `SELECT id, tenant_id, clinic_id, actor_user_id, actor_role, patient_id, reason_fa, expires_at, revoked_at, revoked_by_user_id, created_at
       FROM break_glass_sessions WHERE id = $1`,
      [sessionId]
    );
    return res.rows[0] ? mapBreakGlassRow(res.rows[0]) : null;
  }

  async listBreakGlassSessions(
    tx: DbTx,
    filter: { activeOnly?: boolean | undefined; limit: number; offset: number }
  ): Promise<{ items: BreakGlassSessionRecord[]; total: number }> {
    const whereClause = filter.activeOnly ? `WHERE revoked_at IS NULL AND expires_at > now()` : "";
    const countRes = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt FROM break_glass_sessions ${whereClause}`
    );
    const total = Number(countRes.rows[0]?.cnt ?? "0");
    const rowsRes = await tx.query<BreakGlassRow>(
      `SELECT id, tenant_id, clinic_id, actor_user_id, actor_role, patient_id, reason_fa, expires_at, revoked_at, revoked_by_user_id, created_at
       FROM break_glass_sessions
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [filter.limit, filter.offset]
    );
    return {
      items: rowsRes.rows.map((r) => mapBreakGlassRow(r)),
      total,
    };
  }

  async revokeBreakGlassSession(
    tx: DbTx,
    sessionId: string,
    revokedByUserId: string
  ): Promise<BreakGlassSessionRecord | null> {
    const res = await tx.query<BreakGlassRow>(
      `UPDATE break_glass_sessions
       SET revoked_at = COALESCE(revoked_at, now()),
           revoked_by_user_id = COALESCE(revoked_by_user_id, $2)
       WHERE id = $1
       RETURNING id, tenant_id, clinic_id, actor_user_id, actor_role, patient_id, reason_fa, expires_at, revoked_at, revoked_by_user_id, created_at`,
      [sessionId, revokedByUserId]
    );
    return res.rows[0] ? mapBreakGlassRow(res.rows[0]) : null;
  }
}
