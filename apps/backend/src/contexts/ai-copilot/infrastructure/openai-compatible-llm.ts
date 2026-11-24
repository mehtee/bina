import type {
  MultimodalReportModelPort,
  StructuredGenerationRequest,
  StructuredGenerationResult,
} from "../../../packages/domain-kernel/index.js";

export interface OpenAICompatibleLlmConfig {
  readonly providerName: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly apiKey: string;
  readonly timeoutMs?: number | undefined;
  readonly maxTokens?: number | undefined;
  readonly temperature?: number | undefined;
  readonly openRouterSiteUrl?: string | undefined;
  readonly openRouterAppName?: string | undefined;
}

function extractJsonObject(rawContent: string): unknown {
  const trimmed = rawContent.trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const candidate = fenceMatch?.[1] ? fenceMatch[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("LLM response was not valid JSON.");
  }
}

/**
 * Switchable OpenAI-compatible structured LLM adapter (ADR-046).
 * Works identically against OpenRouter (thinkingmachines/inkling-2-mini) or
 * a local Iranian vLLM / Ollama / llama.cpp `/v1` server configured strictly via `.env`.
 */
export class OpenAICompatibleLanguageModel implements MultimodalReportModelPort {
  readonly supportsVisualContext = false;

  constructor(private readonly config: OpenAICompatibleLlmConfig) {}

  async generate<T>(request: StructuredGenerationRequest<T>): Promise<StructuredGenerationResult<T>> {
    const endpoint = `${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.apiKey.trim().length > 0) {
      headers.Authorization = `Bearer ${this.config.apiKey.trim()}`;
    }

    try {
      const parsedHost = new URL(this.config.baseUrl).hostname.toLowerCase();
      if (parsedHost.endsWith("openrouter.ai")) {
        if (this.config.openRouterSiteUrl) headers["HTTP-Referer"] = this.config.openRouterSiteUrl;
        if (this.config.openRouterAppName) headers["X-Title"] = this.config.openRouterAppName;
      }
    } catch {
      // ignore URL metadata error cleanly
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 30_000),
      body: JSON.stringify({
        model: this.config.model,
        temperature: this.config.temperature ?? 0.1,
        max_tokens: this.config.maxTokens ?? 3072,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: request.systemInstruction },
          { role: "user", content: JSON.stringify(request.evidencePacketJson) },
        ],
      }),
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      throw new Error(`LLM HTTP ${res.status}: ${bodyText.slice(0, 200) || res.statusText}`);
    }

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new Error("LLM returned empty completion content.");
    }

    const parsedJson = extractJsonObject(content);
    const output = request.parseOutput(parsedJson);

    return {
      modelProvider: this.config.providerName,
      modelId: this.config.model,
      output,
      usedFallback: false,
    };
  }
}
