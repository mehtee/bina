import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

export function createDbPool(connectionString: string, max = 5): Pool {
  return new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
}

export async function closeDbPool(pool: Pool): Promise<void> {
  await pool.end();
}

/**
 * Applies SQL migrations lexicographically inside an advisory lock and ensures
 * non-superuser role `bina_app` receives DML grants on all public schema tables.
 */
export async function runMigrations(adminPool: Pool, migrationsDir: string): Promise<string[]> {
  const client = await adminPool.connect();
  const appliedNow: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock(8421001)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.toLowerCase().endsWith(".sql"))
      .sort();

    for (const file of files) {
      const existing = await client.query<{ version: string }>(
        "SELECT version FROM schema_migrations WHERE version = $1",
        [file]
      );
      if ((existing.rowCount ?? 0) > 0) {
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
        await client.query("COMMIT");
        appliedNow.push(file);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bina_app') THEN
          GRANT USAGE ON SCHEMA public TO bina_app;
          GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bina_app;
          GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bina_app;
        END IF;
      END
      $$;
    `);
  } finally {
    await client.query("SELECT pg_advisory_unlock(8421001)").catch(() => undefined);
    client.release();
  }
  return appliedNow;
}
