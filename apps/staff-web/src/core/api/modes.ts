export type ApiMode = "live" | "mock";

export function getApiMode(): ApiMode {
  const raw = (import.meta.env.VITE_API_MODE as string | undefined)?.trim().toLowerCase();
  return raw === "mock" ? "mock" : "live";
}

export function getApiBaseUrl(): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function isMockMode(): boolean {
  return getApiMode() === "mock";
}
