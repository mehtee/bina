import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";

const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;
const addFormats = addFormatsModule.default ?? addFormatsModule;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMAS_DIR = path.resolve(__dirname, "../schemas");

function loadSchema(filename) {
  return JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, filename), "utf8"));
}

export const EVENT_SCHEMAS = {
  "envelope.v1": loadSchema("envelope.v1.json"),
  "episode.prescription-published.v1": loadSchema("episode.prescription-published.v1.json"),
  "triage.urgent-triggered.v1": loadSchema("triage.urgent-triggered.v1.json"),
  "diagnostic.study-submitted.v1": loadSchema("diagnostic.study-submitted.v1.json"),
  "diagnostic.qc-rejected.v1": loadSchema("diagnostic.qc-rejected.v1.json"),
  "diagnostic.analysis-completed.v1": loadSchema("diagnostic.analysis-completed.v1.json"),
  "diagnostic.clinician-signed-off.v1": loadSchema("diagnostic.clinician-signed-off.v1.json"),
};

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const validators = new Map();
for (const [key, schema] of Object.entries(EVENT_SCHEMAS)) {
  validators.set(key, ajv.compile(schema));
}

export function validateEvent(eventType, payload) {
  const validate = validators.get(eventType);
  if (!validate) {
    return {
      valid: false,
      errors: [`Unknown eventType '${eventType}'`],
    };
  }
  const valid = Boolean(validate(payload));
  return {
    valid,
    errors: valid ? [] : (validate.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`),
  };
}

export function validateEnvelope(event) {
  const envResult = validateEvent("envelope.v1", event);
  if (!envResult.valid) {
    return envResult;
  }
  return validateEvent(event.eventType, event.payload);
}
