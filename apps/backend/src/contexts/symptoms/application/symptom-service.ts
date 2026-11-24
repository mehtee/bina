import { randomUUID } from "node:crypto";
import { evaluatePostCataractSymptoms } from "../../../packages/clinical-rules/index.js";
import { insertOutboxEvent, type DbTx } from "../../../packages/db/index.js";
import {
  assertSingleEyeLaterality,
  maxUrgency,
  URGENCY_LABELS_FA,
  type UrgencyTier,
} from "../../../packages/domain-kernel/index.js";
import type { TriageCaseCreatorPort } from "../../triage-operations/ports/index.js";
import { classifyPersianSymptomText } from "../domain/persian-symptom-nlp.js";
import type { SymptomRepoPort } from "../ports/index.js";

export class SymptomService {
  constructor(
    private readonly repo: SymptomRepoPort,
    private readonly triageCreator: TriageCaseCreatorPort
  ) {}

  async submitSymptomReport(
    tx: DbTx,
    input: {
      episodeId: string;
      eyeLaterality: string;
      severePain: boolean;
      suddenVisionLoss: boolean;
      purulentDischarge: boolean;
      flashesOrCurtain?: boolean | undefined;
      freeTextFa: string;
      idempotencyKey: string;
    }
  ): Promise<{
    reportId: string;
    urgencyTier: UrgencyTier;
    urgencyLabelFa: string;
    triggeredTriageCaseId: string | null;
    guidanceFa: string;
    deduplicated: boolean;
  }> {
    const ep = await this.repo.findEpisodeContext(tx, input.episodeId);
    if (!ep) {
      throw new Error("EPISODE_NOT_FOUND");
    }

    const eye = assertSingleEyeLaterality(input.eyeLaterality);
    if (eye !== ep.eyeLaterality) {
      throw new Error("EYE_LATERALITY_MISMATCH");
    }

    const signals = evaluatePostCataractSymptoms({
      eyeLaterality: eye,
      severePain: input.severePain,
      suddenVisionLoss: input.suddenVisionLoss,
      purulentDischarge: input.purulentDischarge,
      flashesOrCurtain: input.flashesOrCurtain,
      freeTextFa: input.freeTextFa,
    });

    const nlpResult = classifyPersianSymptomText(input.freeTextFa);
    let urgencyTier: UrgencyTier = nlpResult.urgencyFloor;
    for (const sig of signals) {
      urgencyTier = maxUrgency(urgencyTier, sig.urgencyFloor);
    }

    const stored = await this.repo.insertReportIdempotent(tx, {
      tenantId: ep.tenantId,
      episodeId: ep.episodeId,
      eyeLaterality: eye,
      severePain: input.severePain,
      suddenVisionLoss: input.suddenVisionLoss,
      purulentDischarge: input.purulentDischarge,
      flashesOrCurtain: input.flashesOrCurtain ?? false,
      freeTextFa: input.freeTextFa,
      urgencyTier,
      signals,
      idempotencyKey: input.idempotencyKey,
    });

    let triggeredTriageCaseId: string | null = null;
    if (!stored.deduplicated && urgencyTier === "urgent") {
      const triageCase = await this.triageCreator.createOrEscalateCase(tx, {
        tenantId: ep.tenantId,
        clinicId: ep.clinicId,
        patientId: ep.patientId,
        sourcePillar: "pillar1_care",
        sourceRefId: stored.reportId,
        eyeLaterality: eye,
        urgencyTier: "urgent",
        ruleCode: signals[0]?.ruleCode ?? "POSTOP_RED_FLAG",
        summaryFa: signals.map((s) => s.summaryFa).join(" | "),
      });
      triggeredTriageCaseId = triageCase.id;

      await insertOutboxEvent(tx, {
        tenantId: ep.tenantId,
        eventType: "triage.urgent-triggered.v1",
        correlationId: randomUUID(),
        idempotencyKey: `symptom:${stored.reportId}:urgent`,
        payload: {
          caseId: triageCase.id,
          patientId: ep.patientId,
          sourcePillar: "pillar1_care",
          eyeLaterality: eye,
          urgencyTier: "urgent",
          ruleCode: signals[0]?.ruleCode ?? "POSTOP_RED_FLAG",
        },
      });
    }

    const guidanceFa =
      urgencyTier === "urgent"
        ? "علائم نیازمند بررسی فوری است؛ لطفاً فوراً با شماره اورژانس کلینیک تماس بگیرید و به اورژانس چشم مراجعه کنید."
        : "گزارش علائم شما ثبت شد. در صورت تشدید درد یا افت دید فوراً با کلینیک تماس بگیرید.";

    return {
      reportId: stored.reportId,
      urgencyTier,
      urgencyLabelFa: URGENCY_LABELS_FA[urgencyTier],
      triggeredTriageCaseId,
      guidanceFa,
      deduplicated: stored.deduplicated,
    };
  }
}
