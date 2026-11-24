import { getAppBrand, type StructuredLanguageModel } from "../../../packages/domain-kernel/index.js";
import { buildDeterministicPersianReport } from "../domain/deterministic-fallback.js";
import { validatePersianClinicalReport } from "../domain/persian-report-validators.js";
import {
  isExternalLlmEndpoint,
  scrubEvidencePacketForExternalLlm,
} from "../domain/phi-prompt-scrubber.js";
import {
  PersianReportDraftSchema,
  type EvidencePacketInput,
  type ValidatedPersianReportDraft,
} from "../domain/report-schema.js";
import type { GeneratedPersianReportOutput, PersianReportGeneratorPort } from "../ports/index.js";

function buildSystemPrompt(): string {
  return [
    `You are a Persian (fa-IR) ophthalmology structured report drafter for ${getAppBrand().nameEn}.`,
    "Write ONLY valid JSON matching the exact schema keys:",
    "titleFa, modalityFindingsFa, differentialSummaryFa, crossModalCorrelationFa, followUpPlanFa, urgencyTier, urgencyLabelFa, evidenceIds.",
    "Strict safety rules:",
    "1) Use ONLY facts from the supplied evidence packet; NEVER invent diagnoses or citations.",
    "2) evidenceIds MUST be a non-empty subset of allowedEvidenceIds.",
    "3) Respect eyeLaterality strictly ('چشم راست' for OD, 'چشم چپ' for OS); NEVER swap eyes.",
    "4) NEVER downgrade finalUrgency and NEVER claim all-clear ('همه‌چیز عادی است') or prescribe medication changes.",
  ].join("\n");
}

export class BoundedPersianReportGraph implements PersianReportGeneratorPort {
  constructor(
    private readonly llm: StructuredLanguageModel | null,
    private readonly options: {
      readonly providerName: string;
      readonly modelId: string;
      readonly baseUrl: string;
      readonly requirePhiScrubbing?: boolean | undefined;
    }
  ) {}

  async generateReportDraft(packet: EvidencePacketInput): Promise<GeneratedPersianReportOutput> {
    if (!this.llm) {
      return {
        modelProvider: "deterministic_template",
        modelId: "bina-deterministic-fa-v1",
        draft: buildDeterministicPersianReport(packet),
        usedFallback: true,
        validationErrors: [],
      };
    }

    // Node 1: Prepare & enforce mandatory PHI scrubbing for external endpoints
    const external = isExternalLlmEndpoint(this.options.baseUrl);
    const mustScrub = external || (this.options.requirePhiScrubbing ?? true);
    const payloadJson = mustScrub
      ? scrubEvidencePacketForExternalLlm(packet)
      : (packet as unknown as Record<string, unknown>);

    let lastErrors: string[] = [];
    const maxAttempts = 2; // 1 initial attempt + 1 bounded retry

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const retryNote =
        attempt === 1 || lastErrors.length === 0
          ? ""
          : `\nFix ALL previous validation errors cleanly:\n- ${lastErrors.join("\n- ")}`;

      try {
        // Node 2: Structured generation call
        const gen = await this.llm.generate<ValidatedPersianReportDraft>({
          promptVersion: "bina-persian-report-v1",
          systemInstruction: `${buildSystemPrompt()}${retryNote}`,
          evidencePacketJson: payloadJson,
          schemaName: "PersianReportDraft",
          parseOutput: (raw) => PersianReportDraftSchema.parse(raw),
        });

        // Node 3: Clinical safety validation
        const safetyCheck = validatePersianClinicalReport(gen.output, packet);
        if (safetyCheck.valid) {
          return {
            modelProvider: gen.modelProvider,
            modelId: gen.modelId,
            draft: gen.output,
            usedFallback: false,
            validationErrors: [],
          };
        }
        lastErrors = [...safetyCheck.errors];
      } catch (err) {
        lastErrors = [err instanceof Error ? err.message : String(err)];
      }
    }

    // Node 5: Deterministic safe Persian fallback
    return {
      modelProvider: this.options.providerName,
      modelId: this.options.modelId,
      draft: buildDeterministicPersianReport(packet),
      usedFallback: true,
      validationErrors: lastErrors,
    };
  }
}
