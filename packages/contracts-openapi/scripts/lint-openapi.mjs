#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const specPath = path.resolve(process.cwd(), "openapi.yaml");
const doc = YAML.parse(fs.readFileSync(specPath, "utf8"));

const errors = [];

if (!doc || typeof doc !== "object") {
  console.error("[OPENAPI-ERROR] Failed to parse openapi.yaml as object.");
  process.exit(1);
}

if (doc.openapi !== "3.1.0") {
  errors.push(`Expected openapi: '3.1.0', got '${doc.openapi}'`);
}

function resolvePointer(root, pointer) {
  if (!pointer.startsWith("#/")) return undefined;
  const parts = pointer
    .slice(2)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
  let cur = root;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object" || !(part in cur)) {
      return undefined;
    }
    cur = cur[part];
  }
  return cur;
}

function walkRefs(node, loc) {
  if (Array.isArray(node)) {
    node.forEach((item, idx) => walkRefs(item, `${loc}[${idx}]`));
    return;
  }
  if (node && typeof node === "object") {
    if (typeof node.$ref === "string") {
      const target = resolvePointer(doc, node.$ref);
      if (target === undefined) {
        errors.push(`Unresolved $ref '${node.$ref}' at ${loc}`);
      }
    }
    for (const [k, v] of Object.entries(node)) {
      if (k !== "$ref") walkRefs(v, `${loc}.${k}`);
    }
  }
}

walkRefs(doc, "root");

const seenOpIds = new Set();
const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "options", "head"]);
for (const [route, pathItem] of Object.entries(doc.paths ?? {})) {
  if (!pathItem || typeof pathItem !== "object") continue;
  for (const [method, op] of Object.entries(pathItem)) {
    if (!HTTP_METHODS.has(method.toLowerCase())) continue;
    if (!op.operationId) {
      errors.push(`Missing operationId on ${method.toUpperCase()} ${route}`);
    } else if (seenOpIds.has(op.operationId)) {
      errors.push(`Duplicate operationId '${op.operationId}'`);
    } else {
      seenOpIds.add(op.operationId);
    }
    if (!op.responses || Object.keys(op.responses).length === 0) {
      errors.push(`Missing responses on ${method.toUpperCase()} ${route}`);
    }
  }
}

if (errors.length > 0) {
  for (const e of errors) console.error(`[OPENAPI-LINT-ERROR] ${e}`);
  process.exit(1);
}

console.log(
  `[OPENAPI-LINT-OK] Validated OpenAPI ${doc.openapi} (${seenOpIds.size} operations, ${Object.keys(doc.components?.schemas ?? {}).length} schemas)`
);
