import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HttpAiEngineGateway, RedisQueueAiEngineGateway } from "../../contexts/diagnostic-studies/index.js";
import { closeDbPool, createDbPool, runMigrations } from "../../packages/db/index.js";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveMigrationsDir(): string {
  const candidates = [
    path.resolve(__dirname, "../../../migrations"),
    path.resolve(__dirname, "../../../../migrations"),
    path.resolve(process.cwd(), "migrations"),
    path.resolve(process.cwd(), "apps/backend/migrations"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Could not locate SQL migrations directory. Checked: ${candidates.join(", ")}`);
}

const config = loadConfig();

if (config.AUTO_MIGRATE === "true") {
  const adminPool = createDbPool(config.DATABASE_ADMIN_URL ?? config.DATABASE_URL, 2);
  try {
    await runMigrations(adminPool, resolveMigrationsDir());
  } finally {
    await closeDbPool(adminPool);
  }
}

const appPool = createDbPool(config.DATABASE_URL, 6);
const redisGateway =
  config.AI_ENGINE_TRANSPORT === "redis"
    ? new RedisQueueAiEngineGateway(config.REDIS_URL, { engineMode: config.AI_ENGINE_MODE })
    : undefined;

const aiGateway =
  redisGateway ?? new HttpAiEngineGateway(config.AI_ENGINE_URL, config.AI_ENGINE_MODE);

const app = buildApp(config, {
  appPool,
  aiGateway,
  resolveTenantByClinicId: async (clinicId: string) => {
    const adminPool = createDbPool(config.DATABASE_ADMIN_URL ?? config.DATABASE_URL, 1);
    try {
      const res = await adminPool.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM clinics WHERE id = $1 LIMIT 1",
        [clinicId]
      );
      return res.rows[0]?.tenant_id ?? null;
    } finally {
      await closeDbPool(adminPool);
    }
  },
});

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutting down Bina backend cleanly");
  await app.close();
  if (redisGateway) {
    await redisGateway.close();
  }
  await closeDbPool(appPool);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: "0.0.0.0", port: config.PORT });
} catch (error) {
  app.log.error({ err: error }, "Failed to start Bina backend");
  process.exit(1);
}
