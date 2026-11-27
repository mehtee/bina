import { maskErrorForUser } from "~/core/i18n/fa-ir";

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly messageFa: string;
  readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    messageFa: string,
    details?: Record<string, unknown>
  ) {
    super(messageFa);
    this.name = "ApiClientError";
    this.statusCode = statusCode;
    this.code = code;
    this.messageFa = maskErrorForUser(code, messageFa);
    this.details = details;
  }
}

export function toFriendlyError(err: unknown): {
  statusCode: number;
  code: string;
  messageFa: string;
} {
  if (err instanceof ApiClientError) {
    return {
      statusCode: err.statusCode,
      code: err.code,
      messageFa: err.messageFa,
    };
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return {
      statusCode: 0,
      code: "REQUEST_ABORTED",
      messageFa: "درخواست در حال اجرا لغو شد.",
    };
  }
  return {
    statusCode: 0,
    code: "NETWORK_UNAVAILABLE",
    messageFa: "ارتباط با سامانه برقرار نیست؛ لطفاً اتصال شبکه را بررسی کرده و دوباره تلاش کنید.",
  };
}
