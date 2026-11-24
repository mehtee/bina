import { z } from "zod";
import type { StudyLaterality, UrgencyTier } from "../../../packages/domain-kernel/index.js";

export const PersianReportDraftSchema = z.object({
  titleFa: z.string().min(5),
  modalityFindingsFa: z.string().min(10),
  differentialSummaryFa: z.string().min(5),
  crossModalCorrelationFa: z.string().min(5),
  followUpPlanFa: z.string().min(5),
  urgencyTier: z.enum(["routine", "followup_3_6m", "urgent"]),
  urgencyLabelFa: z.enum(["عادی", "پیگیری ۳ تا ۶ ماه", "ارجاع فوری"]),
  evidenceIds: z.array(z.string().min(1)).min(1),
});

export type ValidatedPersianReportDraft = z.infer<typeof PersianReportDraftSchema>;

export interface EvidencePacketSpecialistSummary {
  readonly specialistId: string;
  readonly eyeLaterality: string;
  readonly probabilities: Record<string, number>;
  readonly biomarkers: Record<string, number>;
  readonly summaryFa: string;
}

export interface EvidencePacketDifferentialItem {
  readonly conditionCode: string;
  readonly conditionNameFa: string;
  readonly confidence: number;
  readonly severity: string;
}

export interface EvidencePacketInput {
  readonly studyId: string;
  readonly eyeLaterality: StudyLaterality;
  readonly finalUrgency: UrgencyTier;
  readonly availableModalities: readonly string[];
  readonly missingModalities: readonly string[];
  readonly missingModalityNoticeFa: string;
  readonly specialists: readonly EvidencePacketSpecialistSummary[];
  readonly differential: readonly EvidencePacketDifferentialItem[];
  readonly discordanceFlagsFa: readonly string[];
  readonly allowedEvidenceIds: readonly string[];
  readonly freeNotes?: string | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}
