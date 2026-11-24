import { describe, expect, it } from "vitest";
import {
  anonymizeDicomTags,
  buildSignedStudyFhirBundle,
  DicomIngestValidationError,
  FhirExportError,
  normalizeDicomIngestBatch,
  scrubPart10BinaryPhi,
} from "../index.js";

function buildMinimalPart10Buffer(patientName: string, laterality: string): Buffer {
  const tags: Buffer[] = [];
  const pushTag = (group: number, elem: number, vr: string, val: string) => {
    const padded = val.length % 2 === 1 ? `${val} ` : val;
    const buf = Buffer.alloc(8 + padded.length);
    buf.writeUInt16LE(group, 0);
    buf.writeUInt16LE(elem, 2);
    buf.write(vr, 4, 2, "ascii");
    buf.writeUInt16LE(padded.length, 6);
    buf.write(padded, 8, padded.length, "ascii");
    tags.push(buf);
  };
  pushTag(0x0008, 0x0060, "CS", "OPT");
  pushTag(0x0010, 0x0010, "PN", patientName);
  pushTag(0x0010, 0x0020, "LO", "0012345678");
  pushTag(0x0020, 0x0062, "CS", laterality);

  const body = Buffer.concat(tags);
  const full = Buffer.alloc(132 + body.length, 0);
  full.write("DICM", 128, 4, "ascii");
  body.copy(full, 132);
  return full;
}

describe("integrations context: DICOM PHI anonymizer & FHIR R4/R5 export", () => {
  it("strips Patient PHI from Part 10 buffers & DICOM tag metadata while keeping OD/OS laterality", () => {
    const rawBuf = buildMinimalPart10Buffer("Reza^Karimi", "OS");
    const scrubbedBuf = scrubPart10BinaryPhi(rawBuf);
    expect(scrubbedBuf.includes("Reza^Karimi")).toBe(false);
    expect(scrubbedBuf.includes("0012345678")).toBe(false);
    expect(scrubbedBuf.includes("OPT")).toBe(true);
    expect(scrubbedBuf.includes("OS")).toBe(true);

    const snapshot = anonymizeDicomTags(
      {
        patientName: "Reza Karimi",
        patientId: "0012345678",
        patientTelephone: "+989121112233",
        institutionName: "Farabi Eye Hospital",
        studyInstanceUid: "1.2.840.10008.1",
        modality: "OPT",
        imageLaterality: "L",
        studyDate: "20261123",
      },
      "bina-anon-salt"
    );
    expect(snapshot.preservedLaterality).toBe("OS");
    expect(snapshot.preservedModality).toBe("OPT");
    expect(JSON.stringify(snapshot.scrubbedTags)).not.toContain("Karimi");
    expect(JSON.stringify(snapshot.scrubbedTags)).not.toContain("Farabi");
    expect(snapshot.removedPhiTags).toContain("patientTelephone");
  });

  it("blocks DICOM ingest if eye laterality (0020,0062) is missing", () => {
    expect(() =>
      normalizeDicomIngestBatch(
        [
          {
            assetId: "a1",
            s3ObjectKey: "s3://dicom/1",
            rawTags: { studyInstanceUid: "1.2.3", modality: "OP" },
          },
        ],
        "salt"
      )
    ).toThrow(DicomIngestValidationError);
  });

  it("refuses FHIR export for unsigned AI studies and exports complete signed R4/R5 Bundle", () => {
    expect(() =>
      buildSignedStudyFhirBundle({
        studyId: "11111111-1111-4111-8111-111111111111",
        patientId: "22222222-2222-4222-8222-222222222222",
        clinicId: "33333333-3333-4333-8333-333333333333",
        eyeLaterality: "OD",
        status: "ready_for_review",
        issuedAtIso: "2026-11-23T12:00:00Z",
        issuedAtJalali: "1405-09-02",
        modalities: ["fundus", "oct"],
        biomarkers: { cup_to_disc_ratio: 0.78 },
        signoff: null,
      })
    ).toThrow(FhirExportError);

    const bundle = buildSignedStudyFhirBundle({
      studyId: "11111111-1111-4111-8111-111111111111",
      patientId: "22222222-2222-4222-8222-222222222222",
      clinicId: "33333333-3333-4333-8333-333333333333",
      eyeLaterality: "OD",
      status: "signed_off",
      issuedAtIso: "2026-11-23T12:00:00Z",
      issuedAtJalali: "1405-09-02",
      modalities: ["fundus", "oct"],
      biomarkers: { cup_to_disc_ratio: 0.78, rnfl_um: 68.0 },
      signoff: {
        physicianId: "44444444-4444-4444-8444-444444444444",
        finalUrgency: "urgent",
        finalUrgencyLabelFa: "ارجاع فوری",
        finalReportTextFa: "گزارش تاییدشده چشم راست: افزایش نسبت کاپ به دیسک و کاهش ضخامت RNFL.",
        signedAtIso: "2026-11-23T12:30:00Z",
      },
    });
    const resourceTypes = bundle.entry.map((e) => e.resource.resourceType);
    expect(resourceTypes).toContain("ImagingStudy");
    expect(resourceTypes).toContain("Observation");
    expect(resourceTypes).toContain("DiagnosticReport");
    expect(resourceTypes).toContain("ServiceRequest");
  });
});
