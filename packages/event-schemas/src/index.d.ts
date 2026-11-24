export interface EventValidationResult {
  valid: boolean;
  errors: string[];
}

export type KnownEventType =
  | "envelope.v1"
  | "episode.prescription-published.v1"
  | "triage.urgent-triggered.v1"
  | "diagnostic.study-submitted.v1"
  | "diagnostic.qc-rejected.v1"
  | "diagnostic.analysis-completed.v1"
  | "diagnostic.clinician-signed-off.v1";

export declare const EVENT_SCHEMAS: Record<KnownEventType, Record<string, unknown>>;
export declare function validateEvent(eventType: string, payload: unknown): EventValidationResult;
export declare function validateEnvelope(event: {
  eventId: string;
  eventType: string;
  schemaVersion: number;
  tenantId: string;
  occurredAt: string;
  correlationId: string;
  payload: Record<string, unknown>;
}): EventValidationResult;
