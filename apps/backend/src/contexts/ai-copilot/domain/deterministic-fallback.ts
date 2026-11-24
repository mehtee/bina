import { formatLateralityFa, URGENCY_LABELS_FA } from "../../../packages/domain-kernel/index.js";
import type { EvidencePacketInput, ValidatedPersianReportDraft } from "./report-schema.js";

export function buildDeterministicPersianReport(packet: EvidencePacketInput): ValidatedPersianReportDraft {
  const eyeFa = formatLateralityFa(packet.eyeLaterality);
  const urgencyLabelFa = URGENCY_LABELS_FA[packet.finalUrgency];

  const findingsLines = packet.specialists.map((s) => s.summaryFa).join(" ");
  const diffLines = packet.differential
    .map((d) => `${d.conditionNameFa} (احتمال ${Math.round(d.confidence * 100)}٪)`)
    .join("؛ ");

  const crossModal =
    packet.discordanceFlagsFa.length > 0
      ? `${packet.discordanceFlagsFa.join(" ")} ${packet.missingModalityNoticeFa}`.trim()
      : packet.missingModalityNoticeFa;

  const followUpPlanFa =
    packet.finalUrgency === "urgent"
      ? `اولویت بالینی برای ${eyeFa}: ارجاع فوری. این گزارش پیش‌نویس کمک‌تشخیصی است و پیش از هر اقدام باید توسط چشم‌پزشک تایید و امضا شود.`
      : packet.finalUrgency === "followup_3_6m"
        ? `اولویت بالینی برای ${eyeFa}: پیگیری ۳ تا ۶ ماه. این پیش‌نویس نیازمند بررسی و تایید نهایی چشم‌پزشک است.`
        : `وضعیت ${eyeFa}: پیگیری عادی طبق نظر چشم‌پزشک. این پیش‌نویس نیازمند امضای پزشک است.`;

  return {
    titleFa: `پیش‌نویس گزارش بالینی چندوجهی چشم‌پزشکی — ${eyeFa}`,
    modalityFindingsFa: findingsLines || `خلاصه یافته‌های تصویربرداری برای ${eyeFa} ثبت شد.`,
    differentialSummaryFa: diffLines || `تشخیص افتراقی نیازمند بررسی چشم‌پزشک است.`,
    crossModalCorrelationFa: crossModal || `همبستگی بین‌مودالیتی برای ${eyeFa} ثبت شد.`,
    followUpPlanFa,
    urgencyTier: packet.finalUrgency,
    urgencyLabelFa,
    evidenceIds: [...packet.allowedEvidenceIds],
  };
}
