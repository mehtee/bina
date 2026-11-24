import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";

describe("GET /health", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it("returns 200 with Iran fa-IR / Jalali profile and never leaks LLM_API_KEY", async () => {
    const fakeSecret = "sk-or-v1-super-secret-do-not-expose-123456";
    const config = loadConfig({
      NODE_ENV: "test",
      PORT: "3000",
      DEFAULT_LOCALE: "fa-IR",
      DEFAULT_CALENDAR: "jalali",
      DEFAULT_JURISDICTION: "IR",
      AI_ENGINE_MODE: "cpu_stub",
      LLM_PROVIDER: "openai_compatible",
      LLM_MODEL: "thinkingmachines/inkling-2-mini",
      LLM_API_KEY: fakeSecret,
    });

    app = buildApp(config);
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain(fakeSecret);

    const payload = response.json();
    expect(payload).toMatchObject({
      status: "ok",
      service: "bina-backend",
      locale: "fa-IR",
      calendar: "jalali",
      jurisdiction: "IR",
      aiEngineMode: "cpu_stub",
      llmProvider: "openai_compatible",
      llmModel: "thinkingmachines/inkling-2-mini",
      llmConfigured: true,
    });
    expect(typeof payload.timestamp).toBe("string");
  });

  it("handles CORS preflight and allows Flutter Web localhost origins in dev/test", async () => {
    const config = loadConfig({ NODE_ENV: "test" });
    app = buildApp(config);

    const preflight = await app.inject({
      method: "OPTIONS",
      url: "/health",
      headers: { origin: "http://localhost:54321" },
    });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers["access-control-allow-origin"]).toBe("http://localhost:54321");
    expect(preflight.headers["access-control-allow-headers"]).toContain("Idempotency-Key");
  });
});
