import { redactPhi } from "./phi-redactor.js";

export interface TelemetryLogEntry {
  readonly level: "info" | "warn" | "error";
  readonly service: string;
  readonly event: string;
  readonly data: Record<string, unknown>;
  readonly timestamp: string;
}

export interface PhiSafeLogger {
  info(event: string, data?: Record<string, unknown>): void;
  warn(event: string, data?: Record<string, unknown>): void;
  error(event: string, data?: Record<string, unknown>): void;
}

export function createPhiRedactedLogger(
  service: string,
  sink: (entry: TelemetryLogEntry) => void = (entry) => console.log(JSON.stringify(entry))
): PhiSafeLogger {
  const emit = (level: TelemetryLogEntry["level"], event: string, data: Record<string, unknown> = {}) => {
    sink({
      level,
      service,
      event,
      data: redactPhi(data),
      timestamp: new Date().toISOString(),
    });
  };

  return {
    info: (event, data) => emit("info", event, data),
    warn: (event, data) => emit("warn", event, data),
    error: (event, data) => emit("error", event, data),
  };
}
