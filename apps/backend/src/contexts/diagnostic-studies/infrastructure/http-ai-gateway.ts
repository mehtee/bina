import { randomUUID } from "node:crypto";
import type {
  DiagnosticAnalysisRequest,
  DiagnosticInferenceGatewayPort,
  InferenceJobReceipt,
  JobId,
  MultimodalDiagnosticResult,
} from "../../../packages/domain-kernel/index.js";

export class HttpAiEngineGateway implements DiagnosticInferenceGatewayPort {
  private readonly completedResults = new Map<string, MultimodalDiagnosticResult>();

  constructor(
    private readonly baseUrl: string,
    private readonly engineMode: "cpu_stub" | "onnx_cpu" | "gpu_full" = "cpu_stub"
  ) {}

  async submitStudyAnalysis(job: DiagnosticAnalysisRequest): Promise<InferenceJobReceipt> {
    const response = await fetch(`${this.baseUrl.replace(/\/+$/, "")}/v1/analyze-study`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studyId: job.studyId,
        jobId: job.jobId,
        eyeLaterality: job.eyeLaterality,
        assets: job.assets,
        labs: job.labs ?? null,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`AI Engine HTTP ${response.status}: ${errText || response.statusText}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const status = payload.status === "qc_failed" ? "qc_failed" : "analyzed";

    this.completedResults.set(job.jobId, {
      studyId: job.studyId,
      jobId: job.jobId,
      status,
      payload,
    });

    return {
      jobId: job.jobId || (randomUUID() as JobId),
      acceptedAtIso: new Date().toISOString(),
      engineMode: this.engineMode,
    };
  }

  async getJobResult(jobId: JobId): Promise<MultimodalDiagnosticResult> {
    const res = this.completedResults.get(jobId);
    if (!res) {
      throw new Error(`AI inference job '${jobId}' not found in HttpAiEngineGateway cache.`);
    }
    this.completedResults.delete(jobId);
    return res;
  }
}
