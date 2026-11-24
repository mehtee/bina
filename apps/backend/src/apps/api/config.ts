import { z } from "zod";
import { DEFAULT_BRAND_NAME_EN, DEFAULT_BRAND_NAME_FA } from "../../packages/domain-kernel/index.js";

const EnvSchema = z.object({
  APP_BRAND_NAME_FA: z.string().min(1).default(DEFAULT_BRAND_NAME_FA),
  APP_BRAND_NAME_EN: z.string().min(1).default(DEFAULT_BRAND_NAME_EN),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DEFAULT_JURISDICTION: z.string().default("IR"),
  DATA_RESIDENCY_REGION: z.string().default("IR"),
  DEFAULT_LOCALE: z.string().default("fa-IR"),
  DEFAULT_CALENDAR: z.enum(["jalali", "gregorian"]).default("jalali"),
  DEFAULT_COUNTRY_CODE: z.string().default("+98"),
  SELF_HOST_WEB_ASSETS: z.string().default("true"),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default(
      "http://localhost:3000,http://127.0.0.1:3000,http://localhost:4173,http://127.0.0.1:4173,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080,http://127.0.0.1:8080,http://localhost:8088,http://127.0.0.1:8088"
    ),
  DATABASE_URL: z.string().default("postgresql://bina_app:bina_app_dev@127.0.0.1:15432/bina_dev"),
  DATABASE_ADMIN_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://127.0.0.1:16379"),
  AUTH_SIGNING_SECRET: z.string().default("dev_only_signing_secret_change_in_prod"),
  PHONE_HASH_SALT: z.string().default("dev_only_phone_salt_change_in_prod"),
  AUTO_MIGRATE: z.enum(["true", "false"]).default("false"),
  AI_ENGINE_URL: z.string().default("http://127.0.0.1:18000"),
  AI_ENGINE_MODE: z.enum(["cpu_stub", "onnx_cpu", "gpu_full"]).default("cpu_stub"),
  AI_ENGINE_TRANSPORT: z.enum(["http", "redis"]).default("http"),
  FOUNDATION_BACKBONE: z.string().default("dinov2_apache2"),
  LLM_PROVIDER: z.string().default("openai_compatible"),
  LLM_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  LLM_MODEL: z.string().default("thinkingmachines/inkling-2-mini"),
  LLM_API_KEY: z.string().default(""),
  LLM_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  LLM_MAX_TOKENS: z.coerce.number().int().min(128).max(8192).default(3072),
  LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),
  LLM_REQUIRE_PHI_SCRUBBING: z.string().default("true"),
  LLM_OPENROUTER_SITE_URL: z.string().default("https://binaai.local"),
  LLM_OPENROUTER_APP_NAME: z.string().default("BinaAI-Dev"),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return EnvSchema.parse(env);
}

export interface SafePublicHealthSummary {
  status: "ok";
  service: "bina-backend";
  locale: string;
  calendar: "jalali" | "gregorian";
  jurisdiction: string;
  aiEngineMode: "cpu_stub" | "onnx_cpu" | "gpu_full";
  llmProvider: string;
  llmModel: string;
  llmConfigured: boolean;
  timestamp: string;
}

export function toSafePublicSummary(config: AppConfig, now: Date = new Date()): SafePublicHealthSummary {
  return {
    status: "ok",
    service: "bina-backend",
    locale: config.DEFAULT_LOCALE,
    calendar: config.DEFAULT_CALENDAR,
    jurisdiction: config.DEFAULT_JURISDICTION,
    aiEngineMode: config.AI_ENGINE_MODE,
    llmProvider: config.LLM_PROVIDER,
    llmModel: config.LLM_MODEL,
    llmConfigured: config.LLM_API_KEY.trim().length > 0,
    timestamp: now.toISOString(),
  };
}
