import type { DurableWorkflowHandler, WorkflowStepOutcome } from "../workflow-runtime.js";

export const POSTOP_SLA_WORKFLOW_TYPE = "postop_48h_activation_sla";

export interface PostopSlaDependencies {
  dispatchActivationReminder: (episodeId: string) => Promise<{ remindedAtIso: string }>;
  escalateUnactivatedTriage: (episodeId: string) => Promise<{ escalatedAtIso: string; urgencyTier: "urgent" | "followup_3_6m" }>;
}

export function createPostopSlaWorkflowHandler(deps: PostopSlaDependencies): DurableWorkflowHandler {
  return async ({ execution, now, runStep }): Promise<WorkflowStepOutcome> => {
    const episodeId = String(execution.state.data.episodeId ?? execution.businessKey);
    const stage = execution.state.stage;

    if (stage === "awaiting_48h_activation") {
      await runStep("send_48h_reminder", () => deps.dispatchActivationReminder(episodeId));
      const nextEscalationAt = new Date(now.getTime() + 24 * 3600 * 1000);
      return {
        status: "waiting",
        stage: "reminder_dispatched",
        nextRunAt: nextEscalationAt,
      };
    }

    if (stage === "reminder_dispatched") {
      const escalation = await runStep("escalate_triage_sla", () =>
        deps.escalateUnactivatedTriage(episodeId)
      );
      return {
        status: "escalated",
        stage: "escalated_to_triage",
        data: { escalatedUrgencyTier: escalation.urgencyTier },
        nextRunAt: null,
      };
    }

    return {
      status: "completed",
      stage,
      nextRunAt: null,
    };
  };
}
