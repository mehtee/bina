import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FA_IR_CATALOG = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../catalog/fa-IR.json"), "utf8")
);

export function formatBrandTemplate(template, appNameFa) {
  return String(template).replaceAll("{appName}", appNameFa);
}
