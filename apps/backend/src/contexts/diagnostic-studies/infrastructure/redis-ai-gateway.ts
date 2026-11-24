import { Redis } from "ioredis";
import type {
  DiagnosticAnalysisRequest,
  DiagnosticInferenceGatewayPort,
  InferenceJobReceipt,
  JobId,
  MultimodalDiagnosticResult,
} from "../../../packages/domain-kernel/index.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RedisQueueAiEngineGateway implements DiagnosticInferenceGatewayPort {
  private readonly redis: Redis;
  private readonly ownsClient: boolean;

  constructor(
    redisOrUrl: Redis | string,
    private readonly options: {
      readonly queueKey?: string | undefined;
      readonly resultPrefix?: string | undefined;
      readonly pollTimeoutMs?: number | undefined;
      readonly engineMode?: "cpu_stub" | "onnx_cpu" | "gpu_full" | undefined;
    } = {}
  ) {
    if (typeof redisOrUrl === "string") {
      this.redis = new Redis(redisOrUrl, { maxRetriesPerRequest: 2 });
      this.ownsClient = true;
    } else {
      this.redis = redisOrUrl;
      this.ownsClient = false;
    }
  }

  async submitStudyAnalysis(job: DiagnosticAnalysisRequest): Promise<InferenceJobReceipt> {
    const queueKey = this.options.queueKey ?? "bina:ai:jobs";
    const serialized = JSON.stringify({
      studyId: job.studyId,
      jobId: job.jobId,
      eyeLaterality: job.eyeLaterality,
      assets: job.assets,
      labs: job.labs ?? null,
    });
    await this.redis.rpush(queueKey, serialized);
    return {
      jobId: job.jobId,
      acceptedAtIso: new Date().toISOString(),
      engineMode: this.options.engineMode ?? "cpu_stub",
    };
  }

  async getJobResult(jobId: JobId): Promise<MultimodalDiagnosticResult> {
    const prefix = this.options.resultPrefix ?? "bina:ai:result:";
    const timeoutMs = this.options.pollTimeoutMs ?? 15_000;
    const deadline = Date.now() + timeoutMs;
    const key = `${prefix}${jobId}`;

    while (Date.now() < deadline) {
      const raw = await this.redis.get(key);
      if (raw) {
        const payload = JSON.parse(raw) as Record<string, unknown>;
        return {
          studyId: String(payload.studyId ?? "") as MultimodalDiagnosticResult["studyId"],
          jobId,
          status: payload.status === "qc_failed" ? "qc_failed" : "analyzed",
          payload,
        };
      }
      await sleep(100);
    }

    throw new Error(`Timed out waiting for AI Engine Redis worker result for job '${jobId}'.`);
  }

  async close(): Promise<void> {
    if (this.ownsClient) {
      await this.redis.quit();
    }
  }
}
