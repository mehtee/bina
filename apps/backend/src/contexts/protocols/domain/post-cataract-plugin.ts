import { evaluatePostCataractSymptoms } from "../../../packages/clinical-rules/index.js";
import type {
  CareEpisodeContext,
  CareProtocolPlugin,
  ClinicalSignal,
  EvaluationContext,
  ValidationResult,
} from "../../../packages/domain-kernel/index.js";

export interface PostCataractTemplateConfig {
  readonly defaultFollowUpHours: number;
  readonly offlineHotlinePhone: string;
}

export interface PostCataractActivePlan {
  readonly episodeId: string;
  readonly eyeLaterality: "OD" | "OS";
  readonly followUpDueIso: string;
  readonly offlineHotlinePhone: string;
}

export interface PostCataractCheckInInput {
  readonly severePain: boolean;
  readonly suddenVisionLoss: boolean;
  readonly purulentDischarge: boolean;
  readonly flashesOrCurtain?: boolean | undefined;
  readonly freeTextFa?: string | undefined;
}

export class PostCataractProtocolPlugin
  implements CareProtocolPlugin<PostCataractTemplateConfig, PostCataractActivePlan, PostCataractCheckInInput>
{
  readonly protocolType = "post_cataract";

  validateTemplateConfig(config: PostCataractTemplateConfig): ValidationResult {
    const errors: string[] = [];
    if (config.defaultFollowUpHours < 1 || config.defaultFollowUpHours > 168) {
      errors.push("ساعت پیگیری اولیه باید بین ۱ تا ۱۶۸ ساعت باشد.");
    }
    if (!config.offlineHotlinePhone || config.offlineHotlinePhone.trim().length < 5) {
      errors.push("شماره خط اورژانس آفلاین کلینیک الزامی است.");
    }
    return { valid: errors.length === 0, errors };
  }

  buildActivePlan(config: PostCataractTemplateConfig, episode: CareEpisodeContext): PostCataractActivePlan {
    const anchor = new Date(episode.anchorAtIso);
    const followUpDue = new Date(anchor.getTime() + config.defaultFollowUpHours * 3600 * 1000);
    return {
      episodeId: episode.episodeId,
      eyeLaterality: episode.eyeLaterality,
      followUpDueIso: followUpDue.toISOString(),
      offlineHotlinePhone: config.offlineHotlinePhone,
    };
  }

  async evaluateCheckIn(input: PostCataractCheckInInput, context: EvaluationContext): Promise<ClinicalSignal[]> {
    return evaluatePostCataractSymptoms({
      eyeLaterality: context.episode.eyeLaterality,
      severePain: input.severePain,
      suddenVisionLoss: input.suddenVisionLoss,
      purulentDischarge: input.purulentDischarge,
      flashesOrCurtain: input.flashesOrCurtain,
      freeTextFa: input.freeTextFa,
    });
  }
}
