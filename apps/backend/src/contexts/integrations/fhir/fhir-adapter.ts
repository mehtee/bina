import { getAppBrand } from "../../../packages/domain-kernel/index.js";

export interface FhirSignedStudyInput {
  readonly studyId: string;
  readonly patientId: string;
  readonly clinicId: string;
  readonly eyeLaterality: "OD" | "OS" | "OU";
  readonly status: string;
  readonly issuedAtIso: string;
  readonly issuedAtJalali: string;
  readonly modalities: readonly string[];
  readonly biomarkers: Readonly<Record<string, number>>;
  readonly signoff?: {
    readonly physicianId: string;
    readonly finalUrgency: "routine" | "followup_3_6m" | "urgent";
    readonly finalUrgencyLabelFa: string;
    readonly finalReportTextFa: string;
    readonly signedAtIso: string;
  } | null | undefined;
}

export class FhirExportError extends Error {
  readonly statusCode = 400;
  readonly code: string;

  constructor(code: string, messageFa: string) {
    super(messageFa);
    this.code = code;
  }
}

export interface FhirBundle {
  readonly resourceType: "Bundle";
  readonly id: string;
  readonly type: "collection";
  readonly timestamp: string;
  readonly entry: readonly {
    readonly fullUrl: string;
    readonly resource: Record<string, unknown>;
  }[];
}

function lateralitySnomed(eye: "OD" | "OS" | "OU"): { code: string; display: string } {
  if (eye === "OD") return { code: "24028007", display: "Right eye (OD)" };
  if (eye === "OS") return { code: "8966001", display: "Left eye (OS)" };
  return { code: "40638003", display: "Both eyes (OU)" };
}

/**
 * Exports a strictly signed-off diagnostic study into a HL7 FHIR R4/R5 compatible Bundle
 * (ImagingStudy + quantitative Observations + DiagnosticReport + ServiceRequest when referral required).
 */
export function buildSignedStudyFhirBundle(study: FhirSignedStudyInput): FhirBundle {
  if (study.status !== "signed_off" || !study.signoff) {
    throw new FhirExportError(
      "UNSIGNED_STUDY_FORBIDDEN",
      "گزارش تشخیصی پیش از امضای نهایی چشم‌پزشک قابل ارسال به HIS/FHIR نیست."
    );
  }

  const eyeCoding = lateralitySnomed(study.eyeLaterality);
  const imagingId = `imaging-${study.studyId}`;
  const reportId = `report-${study.studyId}`;
  const serviceReqId = `referral-${study.studyId}`;

  const entries: { fullUrl: string; resource: Record<string, unknown> }[] = [];

  entries.push({
    fullUrl: `urn:uuid:${imagingId}`,
    resource: {
      resourceType: "ImagingStudy",
      id: imagingId,
      status: "available",
      subject: { reference: `Patient/${study.patientId}` },
      started: study.issuedAtIso,
      modality: study.modalities.map((m) => ({
        system: "http://dicom.nema.org/resources/ontology/DCM",
        code: m.toUpperCase(),
      })),
      description: `${getAppBrand().nameEn} Ophthalmic Study (${eyeCoding.display})`,
      extension: [
        { url: "https://binaai.ir/fhir/StructureDefinition/jalali-date", valueString: study.issuedAtJalali },
      ],
    },
  });

  const obsRefs: { reference: string }[] = [];
  for (const [metricKey, metricValue] of Object.entries(study.biomarkers)) {
    const obsId = `obs-${study.studyId}-${metricKey}`;
    obsRefs.push({ reference: `Observation/${obsId}` });
    entries.push({
      fullUrl: `urn:uuid:${obsId}`,
      resource: {
        resourceType: "Observation",
        id: obsId,
        status: "final",
        code: {
          coding: [{ system: "https://binaai.ir/fhir/CodeSystem/biomarkers", code: metricKey, display: metricKey }],
        },
        subject: { reference: `Patient/${study.patientId}` },
        bodySite: {
          coding: [{ system: "http://snomed.info/sct", code: eyeCoding.code, display: eyeCoding.display }],
        },
        valueQuantity: { value: metricValue },
      },
    });
  }

  entries.push({
    fullUrl: `urn:uuid:${reportId}`,
    resource: {
      resourceType: "DiagnosticReport",
      id: reportId,
      language: "fa-IR",
      status: "final",
      code: {
        coding: [{ system: "http://loinc.org", code: "57133-1", display: "Ophthalmology Diagnostic Report" }],
      },
      subject: { reference: `Patient/${study.patientId}` },
      effectiveDateTime: study.issuedAtIso,
      issued: study.signoff.signedAtIso,
      performer: [{ reference: `Practitioner/${study.signoff.physicianId}` }],
      imagingStudy: [{ reference: `ImagingStudy/${imagingId}` }],
      result: obsRefs,
      conclusion: study.signoff.finalReportTextFa,
      extension: [
        {
          url: "https://binaai.ir/fhir/StructureDefinition/urgency-tier",
          valueCode: study.signoff.finalUrgency,
        },
        {
          url: "https://binaai.ir/fhir/StructureDefinition/urgency-label-fa",
          valueString: study.signoff.finalUrgencyLabelFa,
        },
      ],
    },
  });

  if (study.signoff.finalUrgency !== "routine") {
    entries.push({
      fullUrl: `urn:uuid:${serviceReqId}`,
      resource: {
        resourceType: "ServiceRequest",
        id: serviceReqId,
        status: "active",
        intent: "order",
        priority: study.signoff.finalUrgency === "urgent" ? "stat" : "asap",
        subject: { reference: `Patient/${study.patientId}` },
        requester: { reference: `Practitioner/${study.signoff.physicianId}` },
        reasonCode: [{ text: study.signoff.finalUrgencyLabelFa }],
      },
    });
  }

  return {
    resourceType: "Bundle",
    id: `bundle-${study.studyId}`,
    type: "collection",
    timestamp: study.signoff.signedAtIso,
    entry: entries,
  };
}
