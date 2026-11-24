import { redactPhi } from "../../../packages/observability/index.js";
import type { EvidencePacketInput } from "./report-schema.js";

const PRIVATE_IPV4_RX =
  /^(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/;

export function isExternalLlmEndpoint(baseUrl: string): boolean {
  try {
    const parsed = new URL(baseUrl);
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]" ||
      host === "host.docker.internal" ||
      host.endsWith(".local") ||
      PRIVATE_IPV4_RX.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

export function scrubEvidencePacketForExternalLlm(packet: EvidencePacketInput): Record<string, unknown> {
  const safePacket: Record<string, unknown> = {
    studyId: packet.studyId,
    eyeLaterality: packet.eyeLaterality,
    finalUrgency: packet.finalUrgency,
    availableModalities: packet.availableModalities,
    missingModalities: packet.missingModalities,
    missingModalityNoticeFa: redactPhi(packet.missingModalityNoticeFa),
    specialists: packet.specialists.map((s) => ({
      specialistId: s.specialistId,
      eyeLaterality: s.eyeLaterality,
      probabilities: s.probabilities,
      biomarkers: s.biomarkers,
      summaryFa: redactPhi(s.summaryFa),
    })),
    differential: packet.differential,
    discordanceFlagsFa: packet.discordanceFlagsFa.map((f) => redactPhi(f)),
    allowedEvidenceIds: packet.allowedEvidenceIds,
  };

  if (packet.freeNotes) {
    safePacket.freeNotes = redactPhi(packet.freeNotes);
  }
  if (packet.metadata) {
    safePacket.metadata = redactPhi(packet.metadata);
  }
  return safePacket;
}
