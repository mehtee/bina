import type { TenantId, UserId } from "../../../packages/domain-kernel/index.js";
import type { DbTx } from "../../../packages/db/index.js";

export interface AuditEntryInput {
  readonly tenantId: TenantId | string;
  readonly actorUserId: UserId | string;
  readonly actorRole: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly reasonFa?: string | undefined;
  readonly breakGlass?: boolean | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}

export interface AuditLogRecord extends AuditEntryInput {
  readonly id: string;
  readonly occurredAtIso: string;
}

export interface AuditLogPort {
  append(tx: DbTx, entry: AuditEntryInput): Promise<AuditLogRecord>;
  listByResource(tx: DbTx, resourceType: string, resourceId: string): Promise<AuditLogRecord[]>;
}
