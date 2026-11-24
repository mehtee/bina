import type { Pool } from "pg";
import { withTenantTransaction, type DbTx } from "../../packages/db/index.js";

export type WorkflowStatus = "running" | "waiting" | "completed" | "escalated" | "failed";

export interface WorkflowStateEnvelope {
  readonly stage: string;
  readonly steps: Record<string, unknown>;
  readonly data: Record<string, unknown>;
}

export interface WorkflowExecutionRow {
  readonly id: string;
  readonly tenantId: string;
  readonly workflowType: string;
  readonly businessKey: string;
  readonly status: WorkflowStatus;
  readonly state: WorkflowStateEnvelope;
  readonly nextRunAt: Date | null;
  readonly attemptCount: number;
}

export interface WorkflowStepOutcome {
  readonly status: WorkflowStatus;
  readonly stage: string;
  readonly data?: Record<string, unknown> | undefined;
  readonly nextRunAt?: Date | null | undefined;
}

export interface WorkflowRunContext {
  readonly execution: WorkflowExecutionRow;
  readonly now: Date;
  runStep<T>(stepId: string, activityFn: () => Promise<T>): Promise<T>;
}

export type DurableWorkflowHandler = (ctx: WorkflowRunContext) => Promise<WorkflowStepOutcome>;

function mapRow(r: {
  id: string;
  tenant_id: string;
  workflow_type: string;
  business_key: string;
  status: WorkflowStatus;
  state_json: WorkflowStateEnvelope;
  next_run_at: Date | null;
  attempt_count: number;
}): WorkflowExecutionRow {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    workflowType: r.workflow_type,
    businessKey: r.business_key,
    status: r.status,
    state: {
      stage: r.state_json?.stage ?? "init",
      steps: r.state_json?.steps ?? {},
      data: r.state_json?.data ?? {},
    },
    nextRunAt: r.next_run_at,
    attemptCount: r.attempt_count,
  };
}

export class DurableWorkflowRuntime {
  constructor(private readonly pool: Pool) {}

  async startWorkflow(input: {
    tenantId: string;
    workflowType: string;
    businessKey: string;
    initialStage: string;
    initialData?: Record<string, unknown> | undefined;
    nextRunAt: Date;
  }): Promise<WorkflowExecutionRow> {
    return withTenantTransaction(this.pool, input.tenantId, async (tx: DbTx) => {
      const state: WorkflowStateEnvelope = {
        stage: input.initialStage,
        steps: {},
        data: input.initialData ?? {},
      };
      const res = await tx.query<{
        id: string;
        tenant_id: string;
        workflow_type: string;
        business_key: string;
        status: WorkflowStatus;
        state_json: WorkflowStateEnvelope;
        next_run_at: Date | null;
        attempt_count: number;
      }>(
        `INSERT INTO workflow_executions (tenant_id, workflow_type, business_key, status, state_json, next_run_at)
         VALUES ($1, $2, $3, 'waiting', $4::jsonb, $5::timestamptz)
         ON CONFLICT (tenant_id, workflow_type, business_key) DO UPDATE
           SET updated_at = workflow_executions.updated_at
         RETURNING id, tenant_id, workflow_type, business_key, status, state_json, next_run_at, attempt_count`,
        [input.tenantId, input.workflowType, input.businessKey, JSON.stringify(state), input.nextRunAt.toISOString()]
      );
      return mapRow(res.rows[0]!);
    });
  }

  async resumeDueWorkflows(
    tenantId: string,
    workflowType: string,
    handler: DurableWorkflowHandler,
    now: Date = new Date()
  ): Promise<WorkflowExecutionRow[]> {
    const dueIds = await withTenantTransaction(this.pool, tenantId, async (tx) => {
      const res = await tx.query<{ id: string }>(
        `SELECT id FROM workflow_executions
         WHERE workflow_type = $1
           AND status IN ('running', 'waiting')
           AND (next_run_at IS NULL OR next_run_at <= $2::timestamptz)
         ORDER BY created_at ASC`,
        [workflowType, now.toISOString()]
      );
      return res.rows.map((r) => r.id);
    });

    const updatedRows: WorkflowExecutionRow[] = [];

    for (const id of dueIds) {
      const row = await withTenantTransaction(this.pool, tenantId, async (tx) => {
        const res = await tx.query<{
          id: string;
          tenant_id: string;
          workflow_type: string;
          business_key: string;
          status: WorkflowStatus;
          state_json: WorkflowStateEnvelope;
          next_run_at: Date | null;
          attempt_count: number;
        }>(
          `SELECT id, tenant_id, workflow_type, business_key, status, state_json, next_run_at, attempt_count
           FROM workflow_executions WHERE id = $1`,
          [id]
        );
        return res.rows[0] ? mapRow(res.rows[0]) : null;
      });
      if (!row) continue;

      const mutableSteps: Record<string, unknown> = { ...row.state.steps };

      try {
        const outcome = await handler({
          execution: row,
          now,
          runStep: async <T>(stepId: string, activityFn: () => Promise<T>): Promise<T> => {
            if (Object.prototype.hasOwnProperty.call(mutableSteps, stepId)) {
              return mutableSteps[stepId] as T;
            }
            const stepResult = await activityFn();
            mutableSteps[stepId] = stepResult;

            const checkpointState: WorkflowStateEnvelope = {
              stage: row.state.stage,
              steps: mutableSteps,
              data: row.state.data,
            };
            await withTenantTransaction(this.pool, tenantId, async (tx) => {
              await tx.query(
                `UPDATE workflow_executions
                 SET state_json = $2::jsonb, updated_at = $3::timestamptz
                 WHERE id = $1`,
                [row.id, JSON.stringify(checkpointState), now.toISOString()]
              );
            });
            return stepResult;
          },
        });

        const nextState: WorkflowStateEnvelope = {
          stage: outcome.stage,
          steps: mutableSteps,
          data: { ...row.state.data, ...(outcome.data ?? {}) },
        };

        const saved = await withTenantTransaction(this.pool, tenantId, async (tx) => {
          const res = await tx.query<{
            id: string;
            tenant_id: string;
            workflow_type: string;
            business_key: string;
            status: WorkflowStatus;
            state_json: WorkflowStateEnvelope;
            next_run_at: Date | null;
            attempt_count: number;
          }>(
            `UPDATE workflow_executions
             SET status = $2,
                 state_json = $3::jsonb,
                 next_run_at = $4::timestamptz,
                 attempt_count = attempt_count + 1,
                 last_error = NULL,
                 updated_at = $5::timestamptz
             WHERE id = $1
             RETURNING id, tenant_id, workflow_type, business_key, status, state_json, next_run_at, attempt_count`,
            [
              row.id,
              outcome.status,
              JSON.stringify(nextState),
              outcome.nextRunAt ? outcome.nextRunAt.toISOString() : null,
              now.toISOString(),
            ]
          );
          return mapRow(res.rows[0]!);
        });

        updatedRows.push(saved);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await withTenantTransaction(this.pool, tenantId, async (tx) => {
          await tx.query(
            `UPDATE workflow_executions
             SET attempt_count = attempt_count + 1,
                 last_error = $2,
                 updated_at = $3::timestamptz
             WHERE id = $1`,
            [row.id, message, now.toISOString()]
          );
        });
        throw err;
      }
    }

    return updatedRows;
  }
}
