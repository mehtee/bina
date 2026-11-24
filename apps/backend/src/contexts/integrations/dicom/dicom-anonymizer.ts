import crypto from "node:crypto";

export interface DicomTagBag {
  patientName?: string | undefined;
  patientId?: string | undefined;
  patientBirthDate?: string | undefined;
  patientTelephone?: string | undefined;
  institutionName?: string | undefined;
  performingPhysicianName?: string | undefined;
  referringPhysicianName?: string | undefined;
  studyInstanceUid?: string | undefined;
  seriesInstanceUid?: string | undefined;
  sopInstanceUid?: string | undefined;
  modality?: string | undefined;
  imageLaterality?: string | undefined;
  studyDate?: string | undefined;
  photometricInterpretation?: string | undefined;
  rows?: number | undefined;
  columns?: number | undefined;
}

export interface AnonymizedDicomSnapshot {
  pseudonymId: string;
  scrubbedTags: Readonly<Record<string, string | number>>;
  removedPhiTags: readonly string[];
  preservedLaterality: "OD" | "OS" | null;
  preservedModality: string | null;
  sha256: string;
}

const PHI_TAG_KEYS: readonly (keyof DicomTagBag)[] = [
  "patientName",
  "patientId",
  "patientBirthDate",
  "patientTelephone",
  "institutionName",
  "performingPhysicianName",
  "referringPhysicianName",
];

function hmacPseudonym(seed: string, salt: string): string {
  return `BINA-ANON-${crypto.createHmac("sha256", salt).update(seed).digest("hex").slice(0, 16)}`;
}

export function normalizeDicomLaterality(raw: string | undefined): "OD" | "OS" | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (upper === "R" || upper === "OD" || upper === "RIGHT") return "OD";
  if (upper === "L" || upper === "OS" || upper === "LEFT") return "OS";
  return null;
}

/**
 * Strips all 0010,* and identifying clinician/institution DICOM tags while preserving
 * clinically essential ophthalmic tags such as (0020,0062) ImageLaterality and (0008,0060) Modality.
 */
export function anonymizeDicomTags(
  rawTags: DicomTagBag,
  pseudonymSalt: string
): AnonymizedDicomSnapshot {
  const removedPhiTags: string[] = [];
  for (const key of PHI_TAG_KEYS) {
    const val = rawTags[key];
    if (val !== undefined && String(val).trim().length > 0) {
      removedPhiTags.push(key);
    }
  }

  const seed = `${rawTags.patientId ?? ""}:${rawTags.studyInstanceUid ?? ""}:${rawTags.sopInstanceUid ?? ""}`;
  const pseudonymId = hmacPseudonym(seed || "anonymous", pseudonymSalt);
  const laterality = normalizeDicomLaterality(rawTags.imageLaterality);

  const scrubbedTags: Record<string, string | number> = {
    "(0010,0010) PatientName": pseudonymId,
    "(0010,0020) PatientID": pseudonymId,
    "(0020,000D) StudyInstanceUID": rawTags.studyInstanceUid
      ? hmacPseudonym(rawTags.studyInstanceUid, `${pseudonymSalt}:uid`)
      : hmacPseudonym("study", pseudonymSalt),
    "(0020,000E) SeriesInstanceUID": rawTags.seriesInstanceUid
      ? hmacPseudonym(rawTags.seriesInstanceUid, `${pseudonymSalt}:series`)
      : hmacPseudonym("series", pseudonymSalt),
    "(0008,0018) SOPInstanceUID": rawTags.sopInstanceUid
      ? hmacPseudonym(rawTags.sopInstanceUid, `${pseudonymSalt}:sop`)
      : hmacPseudonym("sop", pseudonymSalt),
  };

  if (rawTags.modality) scrubbedTags["(0008,0060) Modality"] = rawTags.modality.trim().toUpperCase();
  if (laterality) scrubbedTags["(0020,0062) ImageLaterality"] = laterality;
  if (rawTags.photometricInterpretation) {
    scrubbedTags["(0028,0004) PhotometricInterpretation"] = rawTags.photometricInterpretation;
  }
  if (rawTags.rows !== undefined) scrubbedTags["(0028,0010) Rows"] = rawTags.rows;
  if (rawTags.columns !== undefined) scrubbedTags["(0028,0011) Columns"] = rawTags.columns;
  if (rawTags.studyDate && /^\d{4}/.test(rawTags.studyDate)) {
    // Keep year only for longitudinal cohort evaluation without leaking exact DOB/visit day
    scrubbedTags["(0008,0020) StudyYear"] = rawTags.studyDate.slice(0, 4);
  }

  const canonical = JSON.stringify(scrubbedTags);
  const sha256 = crypto.createHash("sha256").update(canonical).digest("hex");

  return {
    pseudonymId,
    scrubbedTags,
    removedPhiTags,
    preservedLaterality: laterality,
    preservedModality: rawTags.modality ? rawTags.modality.trim().toUpperCase() : null,
    sha256,
  };
}

/**
 * Redacts raw Patient PHI bytes directly in Explicit-VR Part 10 binary DICOM buffers for 0x0010 tags.
 */
export function scrubPart10BinaryPhi(buffer: Buffer): Buffer {
  if (buffer.length < 136 || buffer.subarray(128, 132).toString("ascii") !== "DICM") {
    throw new Error("INVALID_DICOM_PART10_BUFFER");
  }
  const copy = Buffer.from(buffer);
  let offset = 132;
  const phiElements = new Set([0x0010, 0x0020, 0x0030, 0x0032, 0x1000, 0x1040, 0x2154]);
  const longVrs = new Set(["OB", "OW", "OF", "SQ", "UT", "UN"]);

  while (offset + 8 <= copy.length) {
    const group = copy.readUInt16LE(offset);
    const element = copy.readUInt16LE(offset + 2);
    const vr = copy.subarray(offset + 4, offset + 6).toString("ascii");
    if (!/^[A-Z]{2}$/.test(vr)) {
      break;
    }

    let headerLen = 8;
    let valueLen: number;
    if (longVrs.has(vr)) {
      if (offset + 12 > copy.length) break;
      valueLen = copy.readUInt32LE(offset + 8);
      headerLen = 12;
    } else {
      valueLen = copy.readUInt16LE(offset + 6);
    }

    const valStart = offset + headerLen;
    if (valueLen === 0xffffffff || valStart + valueLen > copy.length) {
      break;
    }

    if (group === 0x0010 && phiElements.has(element) && valueLen > 0) {
      copy.fill(0x20, valStart, valStart + valueLen); // overwrite PHI cleanly with ASCII spaces
    }
    offset = valStart + valueLen;
  }
  return copy;
}
