#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const specPath = path.resolve(process.cwd(), "openapi.yaml");
const pyOut = path.resolve(process.cwd(), "generated/py/bina_contracts.py");
const dartOut = path.resolve(process.cwd(), "generated/dart/bina_api_dtos.dart");

const doc = YAML.parse(fs.readFileSync(specPath, "utf8"));
const schemas = doc.components?.schemas ?? {};

function normalizeSchemaType(schema) {
  if (!schema) return { baseType: "object", nullable: false };
  if (Array.isArray(schema.type)) {
    const nullable = schema.type.includes("null");
    const nonNull = schema.type.find((t) => t !== "null") ?? "string";
    return { baseType: nonNull, nullable };
  }
  return { baseType: schema.type, nullable: false };
}

function refName(refStr) {
  return refStr.split("/").pop();
}

function toEnumMemberName(raw) {
  let clean = raw.replace(/[^a-zA-Z0-9_]/g, "_");
  if (/^[0-9]/.test(clean)) clean = `v_${clean}`;
  return clean;
}

function toDartEnumMemberName(raw) {
  let parts = raw.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length === 0) return "unknownValue";
  let camel = parts
    .map((p, idx) =>
      idx === 0 ? p.charAt(0).toLowerCase() + p.slice(1) : p.charAt(0).toUpperCase() + p.slice(1)
    )
    .join("");
  if (/^[0-9]/.test(camel)) camel = `v${camel}`;
  if (camel === "new" || camel === "default" || camel === "in" || camel === "is") {
    camel = `${camel}Value`;
  }
  return camel;
}

function pyTypeFor(schema) {
  if (!schema) return "Any";
  if (schema.$ref) return refName(schema.$ref);
  const { baseType, nullable } = normalizeSchemaType(schema);
  let inner = "Any";
  if (baseType === "string") inner = "str";
  else if (baseType === "integer") inner = "int";
  else if (baseType === "number") inner = "float";
  else if (baseType === "boolean") inner = "bool";
  else if (baseType === "array") inner = `list[${pyTypeFor(schema.items)}]`;
  else if (baseType === "object") {
    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      inner = `dict[str, ${pyTypeFor(schema.additionalProperties)}]`;
    } else {
      inner = "dict[str, Any]";
    }
  }
  return nullable ? `${inner} | None` : inner;
}

function generatePython() {
  const lines = [
    "# GENERATED FROM packages/contracts-openapi/openapi.yaml — DO NOT EDIT BY HAND",
    "from __future__ import annotations",
    "",
    "from enum import StrEnum",
    "from typing import Any",
    "",
    "from pydantic import BaseModel, ConfigDict, Field",
    "",
    "",
    "class BinaContractModel(BaseModel):",
    '    model_config = ConfigDict(populate_by_name=True, extra="ignore")',
    "",
  ];

  for (const [name, schema] of Object.entries(schemas)) {
    if (Array.isArray(schema.enum)) {
      lines.push(`class ${name}(StrEnum):`);
      for (const val of schema.enum) {
        const key = toEnumMemberName(String(val)).toUpperCase();
        lines.push(`    ${key} = "${val}"`);
      }
      lines.push("");
      lines.push("");
      continue;
    }

    lines.push(`class ${name}(BinaContractModel):`);
    const props = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const entries = Object.entries(props);
    if (entries.length === 0) {
      lines.push("    pass");
      lines.push("");
      lines.push("");
      continue;
    }

    for (const [propName, propSchema] of entries) {
      const pyAnnot = pyTypeFor(propSchema);
      const isReq = required.has(propName);
      if (isReq) {
        lines.push(`    ${propName}: ${pyAnnot}`);
      } else {
        const optionalAnnot = pyAnnot.endsWith("| None") ? pyAnnot : `${pyAnnot} | None`;
        lines.push(`    ${propName}: ${optionalAnnot} = Field(default=None)`);
      }
    }
    lines.push("");
    lines.push("");
  }

  fs.mkdirSync(path.dirname(pyOut), { recursive: true });
  fs.writeFileSync(pyOut, lines.join("\n"));
}

const enumNames = new Set(
  Object.entries(schemas)
    .filter(([, s]) => Array.isArray(s.enum))
    .map(([n]) => n)
);

function dartTypeFor(schema, isOptional) {
  if (!schema) return "Object?";
  if (schema.$ref) {
    const t = refName(schema.$ref);
    return isOptional ? `${t}?` : t;
  }
  const { baseType, nullable } = normalizeSchemaType(schema);
  const opt = isOptional || nullable;
  let inner = "Object";
  if (baseType === "string") inner = "String";
  else if (baseType === "integer") inner = "int";
  else if (baseType === "number") inner = "double";
  else if (baseType === "boolean") inner = "bool";
  else if (baseType === "array") {
    inner = `List<${dartTypeFor(schema.items, false)}>`;
  } else if (baseType === "object") {
    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      inner = `Map<String, ${dartTypeFor(schema.additionalProperties, false)}>`;
    } else {
      inner = "Map<String, Object?>";
    }
  }
  return opt ? `${inner}?` : inner;
}

function dartFromJsonExpr(schema, accessor, isOptional) {
  if (!schema) return accessor;
  if (schema.$ref) {
    const target = refName(schema.$ref);
    if (isOptional) {
      return `${accessor} == null ? null : ${target}.fromJson(${enumNames.has(target) ? `${accessor} as String` : `${accessor} as Map<String, Object?>`})`;
    }
    return enumNames.has(target)
      ? `${target}.fromJson(${accessor} as String)`
      : `${target}.fromJson(${accessor} as Map<String, Object?>)`;
  }
  const { baseType, nullable } = normalizeSchemaType(schema);
  const opt = isOptional || nullable;
  if (baseType === "string") return opt ? `${accessor} as String?` : `${accessor} as String`;
  if (baseType === "integer") return opt ? `(${accessor} as num?)?.toInt()` : `(${accessor} as num).toInt()`;
  if (baseType === "number") return opt ? `(${accessor} as num?)?.toDouble()` : `(${accessor} as num).toDouble()`;
  if (baseType === "boolean") return opt ? `${accessor} as bool?` : `${accessor} as bool`;
  if (baseType === "array") {
    const itemExpr = dartFromJsonExpr(schema.items, "e", false);
    const baseList = `(${accessor} as List<Object?>).map((e) => ${itemExpr}).toList()`;
    return opt ? `${accessor} == null ? null : ${baseList}` : baseList;
  }
  if (baseType === "object") {
    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      const valExpr = dartFromJsonExpr(schema.additionalProperties, "v", false);
      const mapped = `(${accessor} as Map<String, Object?>).map((k, v) => MapEntry(k, ${valExpr}))`;
      return opt ? `${accessor} == null ? null : ${mapped}` : mapped;
    }
    return opt ? `${accessor} as Map<String, Object?>?` : `${accessor} as Map<String, Object?>`;
  }
  return accessor;
}

function dartToJsonExpr(schema, fieldExpr, isOptional) {
  if (!schema) return fieldExpr;
  if (schema.$ref) {
    const target = refName(schema.$ref);
    if (isOptional) return `${fieldExpr}?.toJson()`;
    return `${fieldExpr}.toJson()`;
  }
  const { baseType, nullable } = normalizeSchemaType(schema);
  const opt = isOptional || nullable;
  if (baseType === "array") {
    const inner = dartToJsonExpr(schema.items, "e", false);
    if (inner === "e") return fieldExpr;
    return opt
      ? `${fieldExpr}?.map((e) => ${inner}).toList()`
      : `${fieldExpr}.map((e) => ${inner}).toList()`;
  }
  return fieldExpr;
}

function generateDart() {
  const lines = [
    "// GENERATED FROM packages/contracts-openapi/openapi.yaml — DO NOT EDIT BY HAND",
    "// ignore_for_file: sort_constructors_first",
    "",
  ];

  for (const [name, schema] of Object.entries(schemas)) {
    if (!Array.isArray(schema.enum)) continue;
    lines.push(`enum ${name} {`);
    const members = schema.enum.map((v) => ({
      raw: String(v),
      id: toDartEnumMemberName(String(v)),
    }));
    members.forEach((m, idx) => {
      const sep = idx === members.length - 1 ? ";" : ",";
      lines.push(`  ${m.id}('${m.raw}')${sep}`);
    });
    lines.push("");
    lines.push(`  const ${name}(this.value);`);
    lines.push("  final String value;");
    lines.push("");
    lines.push("  String toJson() => value;");
    lines.push("");
    lines.push(`  static ${name} fromJson(String raw) {`);
    lines.push(`    return ${name}.values.firstWhere(`);
    lines.push(`      (e) => e.value == raw,`);
    lines.push(`      orElse: () => throw ArgumentError('Unknown ${name}: \$raw'),`);
    lines.push(`    );`);
    lines.push("  }");
    lines.push("}");
    lines.push("");
  }

  for (const [name, schema] of Object.entries(schemas)) {
    if (Array.isArray(schema.enum)) continue;
    const props = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const entries = Object.entries(props);

    lines.push(`class ${name} {`);
    for (const [propName, propSchema] of entries) {
      const isOpt = !required.has(propName);
      const dtype = dartTypeFor(propSchema, isOpt);
      lines.push(`  final ${dtype} ${propName};`);
    }
    lines.push("");

    if (entries.length === 0) {
      lines.push(`  const ${name}();`);
    } else {
      lines.push(`  const ${name}({`);
      for (const [propName, propSchema] of entries) {
        const isOpt = !required.has(propName) || normalizeSchemaType(propSchema).nullable;
        lines.push(`    ${isOpt ? "" : "required "}this.${propName},`);
      }
      lines.push("  });");
    }

    lines.push("");
    lines.push(`  factory ${name}.fromJson(Map<String, Object?> json) {`);
    lines.push(`    return ${name}(`);
    for (const [propName, propSchema] of entries) {
      const isOpt = !required.has(propName);
      const expr = dartFromJsonExpr(propSchema, `json['${propName}']`, isOpt);
      lines.push(`      ${propName}: ${expr},`);
    }
    lines.push("    );");
    lines.push("  }");
    lines.push("");
    lines.push("  Map<String, Object?> toJson() {");
    lines.push("    return <String, Object?>{");
    for (const [propName, propSchema] of entries) {
      const isOpt = !required.has(propName);
      const expr = dartToJsonExpr(propSchema, propName, isOpt);
      lines.push(`      '${propName}': ${expr},`);
    }
    lines.push("    };");
    lines.push("  }");
    lines.push("}");
    lines.push("");
  }

  fs.mkdirSync(path.dirname(dartOut), { recursive: true });
  fs.writeFileSync(dartOut, lines.join("\n"));
}

generatePython();
generateDart();
console.log(
  `[DTO-CODEGEN-OK] Generated ${path.relative(process.cwd(), pyOut)} and ${path.relative(process.cwd(), dartOut)} from ${Object.keys(schemas).length} schemas.`
);
