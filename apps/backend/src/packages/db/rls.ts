import type { Pool, PoolClient } from "pg";
import type { TenantId } from "../domain-kernel/index.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DbTx = PoolClient;

/**
 * Executes a callback inside an ACID transaction pinned to a single `tenantId`
 * via PostgreSQL `set_config('app.tenant_id', ..., true)` enforced by FORCE RLS.
 */
export async function withTenantTransaction<T>(
  pool: Pool,
  tenantId: TenantId | string,
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  if (!UUID_REGEX.test(tenantId)) {
    throw new RangeError(`Invalid tenantId UUID for RLS session: '${tenantId}'`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Runs a transaction WITHOUT setting `app.tenant_id`, used in tests to prove
 * FORCE ROW LEVEL SECURITY fails closed (`0` rows / denied writes) when unscoped.
 */
export async function withUnscopedTransaction<T>(
  pool: Pool,
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', '', true)");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
