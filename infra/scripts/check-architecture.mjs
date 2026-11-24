#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  let root = "apps/backend/src";
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--root" && argv[i + 1]) {
      root = argv[i + 1];
      i += 1;
    }
  }
  return path.resolve(process.cwd(), root);
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      results.push(...walkFiles(full));
    } else if (/\.(?:ts|tsx|mts|js|mjs)$/i.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      results.push(full);
    }
  }
  return results;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function extractSpecifiers(source) {
  const clean = stripComments(source);
  const specifiers = new Set();
  const patterns = [
    /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
    /require\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(clean)) !== null) {
      if (match[1]) specifiers.add(match[1]);
    }
  }
  return [...specifiers];
}

function resolveImportTarget(relFile, specifier) {
  if (specifier.startsWith(".")) {
    const baseDir = path.posix.dirname(relFile);
    return path.posix.normalize(path.posix.join(baseDir, specifier));
  }
  return specifier;
}

const CLINICAL_FORBIDDEN = [
  /(?:^|\/)contexts(?:\/|$)/,
  /(?:^|\/)apps(?:\/|$)/,
  /(?:^|\/)packages\/db(?:\/|$)/,
  /^openai(?:\/|$)/,
  /^@langchain(?:\/|$)/,
  /^pg(?:\/|$)/,
  /^ioredis(?:\/|$)/,
  /^fastify(?:\/|$)/,
  /^axios(?:\/|$)/,
  /^undici(?:\/|$)/,
  /^node:https?(?:\/|$)/,
  /^@aws-sdk(?:\/|$)/,
  /^@temporalio(?:\/|$)/,
];

const KERNEL_FORBIDDEN = [
  /(?:^|\/)contexts(?:\/|$)/,
  /(?:^|\/)apps(?:\/|$)/,
  /(?:^|\/)packages\/db(?:\/|$)/,
  /^fastify(?:\/|$)/,
  /^pg(?:\/|$)/,
  /^ioredis(?:\/|$)/,
  /^openai(?:\/|$)/,
  /^@langchain(?:\/|$)/,
  /^@aws-sdk(?:\/|$)/,
  /^@temporalio(?:\/|$)/,
];

const AI_COPILOT_FORBIDDEN_MUTATORS = new Set([
  "care-episodes",
  "triage-operations",
  "diagnostic-studies",
]);

function checkFile(rootDir, absFile) {
  const relFile = path.relative(rootDir, absFile).replace(/\\/g, "/");
  const source = fs.readFileSync(absFile, "utf8");
  const specifiers = extractSpecifiers(source);
  const violations = [];

  for (const rawSpec of specifiers) {
    const resolved = resolveImportTarget(relFile, rawSpec);

    if (relFile.startsWith("packages/clinical-rules/")) {
      if (CLINICAL_FORBIDDEN.some((rx) => rx.test(resolved) || rx.test(rawSpec))) {
        violations.push(`${relFile}: clinical-rules forbids importing '${rawSpec}'`);
      }
    }

    if (relFile.startsWith("packages/domain-kernel/")) {
      if (KERNEL_FORBIDDEN.some((rx) => rx.test(resolved) || rx.test(rawSpec))) {
        violations.push(`${relFile}: domain-kernel forbids importing '${rawSpec}'`);
      }
    }

    const srcCtxMatch = /^contexts\/([^/]+)\//.exec(relFile);
    if (srcCtxMatch) {
      const srcCtx = srcCtxMatch[1];
      const targetCtxMatch = /(?:^|\/)contexts\/([^/]+)\/(.+)$/.exec(resolved);
      if (targetCtxMatch) {
        const targetCtx = targetCtxMatch[1];
        const subpath = targetCtxMatch[2];
        if (targetCtx !== srcCtx) {
          const isAllowedPortOrBarrel =
            subpath === "index" ||
            subpath === "index.ts" ||
            subpath === "index.js" ||
            subpath === "ports" ||
            subpath.startsWith("ports/");
          if (/^(domain|application|infrastructure|api)(?:\/|$)/.test(subpath) || !isAllowedPortOrBarrel) {
            violations.push(
              `${relFile}: context '${srcCtx}' must not import '${targetCtx}' internals ('${rawSpec}'); only barrel or ports/ allowed`
            );
          }
          if (srcCtx === "ai-copilot" && AI_COPILOT_FORBIDDEN_MUTATORS.has(targetCtx) && !isAllowedPortOrBarrel) {
            violations.push(
              `${relFile}: ai-copilot cannot import internal mutators of '${targetCtx}' ('${rawSpec}')`
            );
          }
        }
      }
    }
  }

  return violations;
}

export function runArchitectureCheck(rootDir) {
  const files = walkFiles(rootDir);
  const violations = [];
  for (const file of files) {
    violations.push(...checkFile(rootDir, file));
  }
  return { fileCount: files.length, violations };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rootDir = parseArgs(process.argv);
  const { fileCount, violations } = runArchitectureCheck(rootDir);
  if (violations.length > 0) {
    for (const v of violations) {
      console.error(`[ARCH-VIOLATION] ${v}`);
    }
    process.exit(1);
  }
  console.log(`[ARCH-OK] Checked ${fileCount} files under ${path.relative(process.cwd(), rootDir) || "."}`);
}
