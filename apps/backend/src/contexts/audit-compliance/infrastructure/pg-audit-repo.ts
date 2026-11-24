import { redactPhi } from "../../../packages/observability/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import type { AuditEntryInput, AuditLogPort, AuditLogRecord } from "../ports/index.js";

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

export class PgAuditLogRepo implements AuditLogPort {
  async append(tx: DbTx, entry: AuditEntryInput): Promise<AuditLogRecord> {
    const safeMeta = redactPhi(entry.metadata ?? {});
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
        entry.reasonFa ?? null,
        entry.breakGlass ?? false,
        JSON.stringify(safeMeta),
      ]
    );

    const row = res.rows[0]!;
    return {
      id: row.id,
      tenantId: row.tenant_id,
      actorUserId: row.actor_user_id,
      actorRole: row.actor_role,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      reasonFa: row.reason_fa ?? undefined,
      breakGlass: row.break_glass,
      metadata: row.metadata_json,
      occurredAtIso: row.occurred_at.toISOString(),
    };
  }

  async listByResource(tx: DbTx, resourceType: string, resourceId: string): Promise<AuditLogRecord[]> {
    const res = await tx.query<AuditRow>(
      `SELECT id, tenant_id, actor_user_id, actor_role, action, resource_type, resource_id, reason_fa, break_glass, metadata_json, occurred_at
       FROM audit_logs
       WHERE resource_type = $1 AND resource_id = $2
       ORDER BY occurred_at ASC`,
      [resourceType, resourceId]
    );
    return res.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      actorUserId: row.actor_user_id,
      actorRole: row.actor_role,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      reasonFa: row.reason_fa ?? undefined,
      breakGlass: row.break_glass,
      metadata: row.metadata_json,
      occurredAtIso: row.occurred_at.toISOString(),
    }));
  }
}
