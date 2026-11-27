import { ApiClientError } from "~/core/errors/error-mapper";
import { getApiBaseUrl, isMockMode } from "./modes";

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  idempotencyKey?: string;
}

type UnauthorizedHandler = () => void;
let onUnauthorizedHandler: UnauthorizedHandler | null = null;
let cachedMockHandler: ((url: string, init: RequestInit) => Promise<Response>) | null = null;
let mockHandlerPromise: Promise<(url: string, init: RequestInit) => Promise<Response>> | null = null;

// Strictly RAM-only GET response cache (never persisted to storage; cleared on logout/401/mutations)
const memoryGetCache = new Map<string, { data: unknown; storedAt: number }>();
const MAX_CACHE_ENTRIES = 120;

export function clearApiMemoryCache(): void {
  memoryGetCache.clear();
}

export function getCachedApiResponse<T>(cacheKey: string): T | null {
  const hit = memoryGetCache.get(cacheKey);
  return hit ? (hit.data as T) : null;
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorizedHandler = handler;
}

async function dispatchFetch(url: string, init: RequestInit): Promise<Response> {
  if (isMockMode()) {
    if (cachedMockHandler) {
      return cachedMockHandler(url, init);
    }
    if (!mockHandlerPromise) {
      mockHandlerPromise = import("./msw/mock-transport").then((m) => {
        cachedMockHandler = m.handleMockRequest;
        return m.handleMockRequest;
      });
    }
    const handler = await mockHandlerPromise;
    return handler(url, init);
  }
  return fetch(url, init);
}

export function warmUpTransport(): void {
  if (isMockMode() && !cachedMockHandler && !mockHandlerPromise) {
    mockHandlerPromise = import("./msw/mock-transport").then((m) => {
      cachedMockHandler = m.handleMockRequest;
      return m.handleMockRequest;
    });
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  let response: Response;
  try {
    response = await dispatchFetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw new ApiClientError(
      0,
      "NETWORK_UNAVAILABLE",
      "ارتباط با سامانه برقرار نیست؛ لطفاً اتصال شبکه را بررسی کنید."
    );
  }

  if (response.status === 401) {
    clearApiMemoryCache();
    onUnauthorizedHandler?.();
  }

  const method = options.method ?? "GET";
  if (method !== "GET") {
    clearApiMemoryCache();
  }

  const text = await response.text();
  let parsed: Record<string, unknown> | null = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const errorCode =
      (parsed && typeof parsed.error === "string" && parsed.error) || `HTTP_${response.status}`;
    const messageFa =
      (parsed && typeof parsed.messageFa === "string" && parsed.messageFa) ||
      (parsed && typeof parsed.message === "string" && parsed.message) ||
      "خطایی در پردازش درخواست رخ داد.";
    throw new ApiClientError(response.status, errorCode, messageFa, parsed ?? undefined);
  }

  return (parsed ?? ({} as Record<string, unknown>)) as T;
}

export async function apiDownloadBlob(
  path: string,
  options: { token?: string | null; signal?: AbortSignal } = {}
): Promise<{ blob: Blob; contentType: string }> {
  const url = `${getApiBaseUrl()}${path}`;
  const headers: Record<string, string> = {};
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await dispatchFetch(url, {
    method: "GET",
    headers,
    signal: options.signal,
  });

  if (response.status === 401) {
    clearApiMemoryCache();
    onUnauthorizedHandler?.();
  }

  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      `HTTP_${response.status}`,
      "دریافت فایل گزارش با خطا مواجه شد."
    );
  }

  const blob = await response.blob();
  return {
    blob,
    contentType: response.headers.get("content-type") ?? "application/pdf",
  };
}
