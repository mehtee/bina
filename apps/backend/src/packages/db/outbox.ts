import { randomUUID } from "node:crypto";
import { validateEnvelope } from "@bina/event-schemas";
import type { TenantId } from "../domain-kernel/index.js";
import type { DbTx } from "./rls.js";

export interface OutboxInsertInput {
  readonly tenantId: TenantId | string;
  readonly eventType: string;
  readonly correlationId: string;
  readonly payload: Record<string, unknown>;
  readonly idempotencyKey?: string | undefined;
  readonly occurredAt?: Date | undefined;
}

export interface InsertedOutboxRecord {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAtIso: string;
}

/**
 * Validates domain event against canonical Draft 2020-12 JSON schemas before
 * atomically persisting it to `outbox_events` inside the caller's transaction.
 */
export async function insertOutboxEvent(
  tx: DbTx,
  input: OutboxInsertInput
): Promise<InsertedOutboxRecord> {
  const eventId = randomUUID();
  const occurredAtIso = (input.occurredAt ?? new Date()).toISOString();
  const validation = validateEnvelope({
    eventId,
    eventType: input.eventType,
    schemaVersion: 1,
    tenantId: input.tenantId,
    occurredAt: occurredAtIso,
    correlationId: input.correlationId,
    payload: input.payload,
  });

  if (!validation.valid) {
    throw new Error(
      `Invalid outbox event payload for '${input.eventType}': ${validation.errors.join("; ")}`
    );
  }

  await tx.query(
    `INSERT INTO outbox_events
      (id, tenant_id, event_type, schema_version, correlation_id, idempotency_key, payload_json, created_at)
     VALUES ($1, $2, $3, 1, $4, $5, $6::jsonb, $7::timestamptz)`,
    [
      eventId,
      input.tenantId,
      input.eventType,
      input.correlationId,
      input.idempotencyKey ?? null,
      JSON.stringify(input.payload),
      occurredAtIso,
    ]
  );

  return { eventId, eventType: input.eventType, occurredAtIso };
}
