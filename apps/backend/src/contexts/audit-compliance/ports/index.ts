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

export interface AuditLogFilter {
  readonly action?: string | undefined;
  readonly resourceType?: string | undefined;
  readonly actorUserId?: string | undefined;
  readonly breakGlassOnly?: boolean | undefined;
  readonly limit: number;
  readonly offset: number;
}

export interface BreakGlassSessionRecord {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly actorUserId: string;
  readonly actorRole: string;
  readonly patientId: string;
  readonly reasonFa: string;
  readonly expiresAtIso: string;
  readonly revokedAtIso: string | null;
  readonly revokedByUserId: string | null;
  readonly active: boolean;
  readonly createdAtIso: string;
}

export interface AuditLogPort {
  append(tx: DbTx, entry: AuditEntryInput): Promise<AuditLogRecord>;
  listByResource(tx: DbTx, resourceType: string, resourceId: string): Promise<AuditLogRecord[]>;
}

export interface AuditComplianceRepoPort extends AuditLogPort {
  listAuditLogs(
    tx: DbTx,
    filter: AuditLogFilter
  ): Promise<{ items: AuditLogRecord[]; total: number }>;
  patientExists(tx: DbTx, patientId: string): Promise<boolean>;
  insertBreakGlassSession(
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
  ): Promise<BreakGlassSessionRecord>;
  findBreakGlassSessionById(tx: DbTx, sessionId: string): Promise<BreakGlassSessionRecord | null>;
  listBreakGlassSessions(
    tx: DbTx,
    filter: { activeOnly?: boolean | undefined; limit: number; offset: number }
  ): Promise<{ items: BreakGlassSessionRecord[]; total: number }>;
  revokeBreakGlassSession(
    tx: DbTx,
    sessionId: string,
    revokedByUserId: string
  ): Promise<BreakGlassSessionRecord | null>;
}
