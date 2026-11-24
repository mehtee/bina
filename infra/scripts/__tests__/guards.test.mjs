import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { runArchitectureCheck } from "../check-architecture.mjs";
import { checkRlsMigrations } from "../check-rls-migrations.mjs";

const RESOURCE_SCRIPT = path.resolve("infra/scripts/check-resources.sh");

function runResourceGuard(envOverrides, args = ["--eval"]) {
  return execFileSync("bash", [RESOURCE_SCRIPT, ...args], {
    env: { ...process.env, ...envOverrides },
    encoding: "utf8",
  });
}

test("check-resources.sh rejects critical low RAM (<1024 MiB)", () => {
  assert.throws(
    () => runResourceGuard({ BINA_TEST_AVAIL_MB: "512", BINA_TEST_AVAIL_GB: "10" }),
    (err) => err.status === 1
  );
});

test("check-resources.sh rejects critical low disk (<3 GiB)", () => {
  assert.throws(
    () => runResourceGuard({ BINA_TEST_AVAIL_MB: "3000", BINA_TEST_AVAIL_GB: "2" }),
    (err) => err.status === 1
  );
});

test("check-resources.sh selects strict_serial and 1024MB Node cap on tight RAM", () => {
  const out = runResourceGuard({ BINA_TEST_AVAIL_MB: "1500", BINA_TEST_AVAIL_GB: "5" });
  assert.match(out, /BINA_RESOURCE_MODE="strict_serial"/);
  assert.match(out, /NODE_OPTIONS="--max-old-space-size=1024"/);
  assert.match(out, /BINA_MAX_WORKERS="1"/);
  assert.match(out, /BINA_DISK_MODE="tight"/);
});

test("check-resources.sh selects capped mode and 1536MB Node cap when RAM >=2200", () => {
  const out = runResourceGuard({ BINA_TEST_AVAIL_MB: "3200", BINA_TEST_AVAIL_GB: "12" });
  assert.match(out, /BINA_RESOURCE_MODE="capped"/);
  assert.match(out, /NODE_OPTIONS="--max-old-space-size=1536"/);
  assert.match(out, /BINA_DISK_MODE="ok"/);
});

test("check-architecture.mjs passes valid fixture and blocks forbidden imports", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bina-arch-"));
  try {
    const validRules = path.join(tmp, "packages/clinical-rules/rules.ts");
    const validCtx = path.join(tmp, "contexts/care-episodes/application/service.ts");
    fs.mkdirSync(path.dirname(validRules), { recursive: true });
    fs.mkdirSync(path.dirname(validCtx), { recursive: true });
    fs.writeFileSync(validRules, `import type { EyeLaterality } from "../domain-kernel/laterality.js";\n`);
    fs.writeFileSync(validCtx, `import type { NotificationPort } from "../../notifications/ports/index.js";\n`);

    const cleanRes = runArchitectureCheck(tmp);
    assert.equal(cleanRes.violations.length, 0);

    // clinical-rules importing openai / fastify
    fs.writeFileSync(validRules, `import OpenAI from "openai";\nimport Fastify from "fastify";\n`);
    // cross-context internal import
    fs.writeFileSync(validCtx, `import { repo } from "../../triage-operations/domain/internal.js";\n`);
    // ai-copilot importing care-episodes infrastructure
    const badCopilot = path.join(tmp, "contexts/ai-copilot/application/draft.ts");
    fs.mkdirSync(path.dirname(badCopilot), { recursive: true });
    fs.writeFileSync(badCopilot, `import { mutate } from "../../care-episodes/infrastructure/repo.js";\n`);

    const badRes = runArchitectureCheck(tmp);
    assert.ok(badRes.violations.some((v) => v.includes("clinical-rules forbids importing 'openai'")));
    assert.ok(badRes.violations.some((v) => v.includes("clinical-rules forbids importing 'fastify'")));
    assert.ok(badRes.violations.some((v) => v.includes("must not import 'triage-operations' internals")));
    assert.ok(badRes.violations.some((v) => v.includes("ai-copilot") || v.includes("care-episodes")));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("check-rls-migrations.mjs passes compliant tables and fails missing tenant_id, FORCE RLS, or POLICY", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bina-rls-"));
  try {
    const okSql = `
      CREATE TABLE IF NOT EXISTS tenants (id uuid PRIMARY KEY, jurisdiction text NOT NULL DEFAULT 'IR');
      CREATE TABLE patients (
        id uuid PRIMARY KEY,
        tenant_id uuid NOT NULL REFERENCES tenants(id),
        status text CHECK (status IN ('active', 'closed'))
      );
      ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
      ALTER TABLE patients FORCE ROW LEVEL SECURITY;
      CREATE POLICY tenant_iso ON patients USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
    `;
    fs.writeFileSync(path.join(tmp, "001_init.sql"), okSql);
    const okRes = checkRlsMigrations(tmp);
    assert.equal(okRes.violations.length, 0);

    const badSql = `
      CREATE TABLE broken_items (id uuid PRIMARY KEY, name text);
      ALTER TABLE broken_items ENABLE ROW LEVEL SECURITY;
    `;
    fs.writeFileSync(path.join(tmp, "002_bad.sql"), badSql);
    const badRes = checkRlsMigrations(tmp);
    assert.ok(badRes.violations.some((v) => v.includes("missing a 'tenant_id'")));
    assert.ok(badRes.violations.some((v) => v.includes("missing 'FORCE ROW LEVEL SECURITY'")));
    assert.ok(badRes.violations.some((v) => v.includes("missing a 'CREATE POLICY")));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
