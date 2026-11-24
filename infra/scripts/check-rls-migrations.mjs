#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const GLOBAL_NON_TENANT_TABLES = new Set(["tenants", "schema_migrations", "device_models"]);

function parseArgs(argv) {
  let dir = "apps/backend/migrations";
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--dir" && argv[i + 1]) {
      dir = argv[i + 1];
      i += 1;
    }
  }
  return path.resolve(process.cwd(), dir);
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ");
}

function normalizeTableName(rawName) {
  const cleaned = rawName.replace(/"/g, "").trim().toLowerCase();
  const parts = cleaned.split(".");
  return parts[parts.length - 1];
}

function extractCreateTables(sql) {
  const tables = [];
  const rx = /create\s+table\s+(?:if\s+not\s+exists\s+)?((?:"?[a-zA-Z_][a-zA-Z0-9_]*"?\.)?"?[a-zA-Z_][a-zA-Z0-9_]*"?)\s*\(/gi;
  let match;
  while ((match = rx.exec(sql)) !== null) {
    const tableName = normalizeTableName(match[1]);
    let idx = rx.lastIndex;
    let depth = 1;
    let inSingleQuote = false;
    while (idx < sql.length && depth > 0) {
      const ch = sql[idx];
      if (ch === "'") {
        if (inSingleQuote && sql[idx + 1] === "'") {
          idx += 2;
          continue;
        }
        inSingleQuote = !inSingleQuote;
      } else if (!inSingleQuote) {
        if (ch === "(") depth += 1;
        else if (ch === ")") depth -= 1;
      }
      idx += 1;
    }
    const body = sql.slice(rx.lastIndex, Math.max(rx.lastIndex, idx - 1));
    tables.push({ tableName, body });
  }
  return tables;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function checkRlsMigrations(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return { migrationCount: 0, tableCount: 0, violations: [] };
  }
  const files = fs
    .readdirSync(dirPath)
    .filter((f) => f.toLowerCase().endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    return { migrationCount: 0, tableCount: 0, violations: [] };
  }

  const combinedSql = files
    .map((f) => stripSqlComments(fs.readFileSync(path.join(dirPath, f), "utf8")))
    .join("\n;\n");

  const tables = extractCreateTables(combinedSql);
  const violations = [];

  for (const { tableName, body } of tables) {
    if (GLOBAL_NON_TENANT_TABLES.has(tableName)) {
      continue;
    }
    const tPattern = `(?:public\\.)?"?${escapeRegExp(tableName)}"?`;

    if (!/\btenant_id\b/i.test(body)) {
      violations.push(`Table '${tableName}' is missing a 'tenant_id' column.`);
    }
    const enableRx = new RegExp(`alter\\s+table\\s+(?:only\\s+)?${tPattern}\\s+enable\\s+row\\s+level\\s+security`, "i");
    if (!enableRx.test(combinedSql)) {
      violations.push(`Table '${tableName}' is missing 'ENABLE ROW LEVEL SECURITY'.`);
    }
    const forceRx = new RegExp(`alter\\s+table\\s+(?:only\\s+)?${tPattern}\\s+force\\s+row\\s+level\\s+security`, "i");
    if (!forceRx.test(combinedSql)) {
      violations.push(`Table '${tableName}' is missing 'FORCE ROW LEVEL SECURITY'.`);
    }
    const policyRx = new RegExp(`create\\s+policy\\s+["a-zA-Z0-9_]+\\s+on\\s+${tPattern}\\b`, "i");
    if (!policyRx.test(combinedSql)) {
      violations.push(`Table '${tableName}' is missing a 'CREATE POLICY ... ON ${tableName}' statement.`);
    }
  }

  return { migrationCount: files.length, tableCount: tables.length, violations };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dirPath = parseArgs(process.argv);
  const { migrationCount, tableCount, violations } = checkRlsMigrations(dirPath);
  if (violations.length > 0) {
    for (const v of violations) {
      console.error(`[RLS-VIOLATION] ${v}`);
    }
    process.exit(1);
  }
  console.log(
    `[RLS-OK] Checked ${migrationCount} migration file(s) and ${tableCount} table(s) under ${path.relative(process.cwd(), dirPath) || "."}`
  );
}
