import { describe, expect, it } from "vitest";
import { EVENT_SCHEMAS, validateEnvelope, validateEvent } from "../index.js";

const UUID_1 = "11111111-1111-4111-8111-111111111111";
const UUID_2 = "22222222-2222-4222-8222-222222222222";
const UUID_3 = "33333333-3333-4333-8333-333333333333";

function makeEnvelope(eventType: string, payload: Record<string, unknown>) {
  return {
    eventId: UUID_1,
    eventType,
    schemaVersion: 1,
    tenantId: UUID_2,
    occurredAt: "2026-11-23T12:00:00Z",
    correlationId: UUID_3,
    payload,
  };
}

describe("Bina Event Schemas (Draft 2020-12)", () => {
  it("loads all 7 canonical schemas", () => {
    expect(Object.keys(EVENT_SCHEMAS)).toHaveLength(7);
  });

  it("accepts valid fixtures across all 6 domain events inside envelope.v1", () => {
    const validCases: Array<[string, Record<string, unknown>]> = [
      [
        "episode.prescription-published.v1",
        {
          episodeId: UUID_1,
          patientId: UUID_2,
          prescriptionVersion: 2,
          eyeLaterality: "OS",
          publishedByUserId: UUID_3,
          itemCount: 3,
        },
      ],
      [
        "triage.urgent-triggered.v1",
        {
          caseId: UUID_1,
          patientId: UUID_2,
          sourcePillar: "pillar2_diagnostic",
          eyeLaterality: "OD",
          urgencyTier: "urgent",
          ruleCode: "INFECTIOUS_KERATITIS_FLOOR",
        },
      ],
      [
        "diagnostic.study-submitted.v1",
        {
          studyId: UUID_1,
          jobId: UUID_2,
          patientId: UUID_3,
          clinicId: UUID_1,
          eyeLaterality: "OU",
          assetCount: 4,
        },
      ],
      [
        "diagnostic.qc-rejected.v1",
        {
          studyId: UUID_1,
          jobId: UUID_2,
          assetId: UUID_3,
          rejectionCodes: ["blur", "wrong_eye"],
          rejectionReasonsFa: ["تار بودن تصویر", "عدم تطابق چشم راست و چپ"],
        },
      ],
      [
        "diagnostic.analysis-completed.v1",
        {
          studyId: UUID_1,
          jobId: UUID_2,
          engineMode: "cpu_stub",
          recommendedUrgency: "followup_3_6m",
          specialistsExecuted: ["fundus", "oct", "tabular_xgb"],
        },
      ],
      [
        "diagnostic.clinician-signed-off.v1",
        {
          signoffId: UUID_1,
          studyId: UUID_2,
          ophthalmologistId: UUID_3,
          action: "edited_approved",
          finalUrgency: "urgent",
          signedAt: "2026-11-23T12:15:00Z",
        },
      ],
    ];

    for (const [eventType, payload] of validCases) {
      const res = validateEnvelope(makeEnvelope(eventType, payload));
      expect(res.valid, `Expected valid for ${eventType}: ${res.errors.join("; ")}`).toBe(true);
    }
  });

  it("rejects invalid payloads, ambiguous laterality, wrong urgency const, and unknown events", () => {
    expect(
      validateEvent("episode.prescription-published.v1", {
        episodeId: UUID_1,
        patientId: UUID_2,
        prescriptionVersion: 1,
        eyeLaterality: "OU",
        publishedByUserId: UUID_3,
        itemCount: 1,
      }).valid
    ).toBe(false);

    expect(
      validateEvent("triage.urgent-triggered.v1", {
        caseId: UUID_1,
        patientId: UUID_2,
        sourcePillar: "pillar1_care",
        eyeLaterality: "OD",
        urgencyTier: "routine",
        ruleCode: "POSTOP",
      }).valid
    ).toBe(false);

    expect(
      validateEnvelope({
        eventId: "not-a-uuid",
        eventType: "unknown.event.v1",
        schemaVersion: 1,
        tenantId: UUID_2,
        occurredAt: "2026-11-23T12:00:00Z",
        correlationId: UUID_3,
        payload: {},
      }).valid
    ).toBe(false);

    expect(validateEvent("diagnostic.qc-rejected.v1", { studyId: UUID_1 }).valid).toBe(false);
    expect(validateEvent("diagnostic.analysis-completed.v1", { studyId: UUID_1 }).valid).toBe(false);
    expect(validateEvent("diagnostic.clinician-signed-off.v1", { signoffId: UUID_1 }).valid).toBe(false);
    expect(validateEvent("diagnostic.study-submitted.v1", { studyId: UUID_1 }).valid).toBe(false);
  });
});
