import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const V01_V09_PREVIEW_FIXTURE = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../fixtures/v01-v09-preview.json"), "utf8")
);
