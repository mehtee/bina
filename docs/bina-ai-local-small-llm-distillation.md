# Bina AI — Local CPU-Hostable Small LLM (0.5B–1.7B) Distillation & Deployment Plan

> **Status:** Future Enhancement Roadmap (Ready when switching from OpenRouter dev endpoint to fully offline in-country CPU inference)  
> **Architecture Alignment:** `ADR-046` (Switchable OpenAI-Compatible Small-LLM), `ADR-047` (Kaggle Remote Training + Artifact Gather), `ADR-053` (Strict PHI Scrubbing & D5 Anonymization)

---

## 1. Context & Observed Baseline

Bina AI's Layer 4b clinical report drafter (`apps/backend/src/contexts/ai-copilot/`) routes all requests through `OpenAICompatibleLanguageModel` and `BoundedPersianReportGraph`:

- **Current Development Baseline:** Configured via `.env` against OpenRouter (`LLM_BASE_URL=https://openrouter.ai/api/v1`, `LLM_MODEL=thinkingmachines/inkling-2-mini`).
- **Observed Live Behavior (2026-11-23):**
  - Produces accurate, zero-hallucination Persian (`fa-IR`) structured JSON matching `PersianReportDraftSchema` (`titleFa`, `modalityFindingsFa`, `differentialSummaryFa`, `crossModalCorrelationFa`, `followUpPlanFa`, `urgencyTier`, `urgencyLabelFa`, `evidenceIds`) and respects strict safety guards (`چشم راست` / `چشم چپ` laterality isolation, no urgency downgrade, no autonomous prescription edits).
  - Because `inkling-2-mini` is a reasoning model (~1,000+ internal `reasoning` tokens per clinical packet), `LLM_MAX_TOKENS` was raised to `3072` (and `LLM_TIMEOUT_MS=30000`) in `apps/backend/src/apps/api/config.ts`, `openai-compatible-llm.ts`, `.env.example`, and `.env` so `message.content` never truncates empty.
  - Because it emits reasoning tokens before content, latency is typically ~5–12 seconds via external API, and requires outbound internet + OpenRouter credentials.

**Goal:** Replace external API reliance in Iranian clinic/hospital deployments with a **≤ 1.5B parameter local LLM** running fast on **standard CPU servers** (`llama.cpp` / `Ollama` / `vLLM`) with **zero TypeScript code changes** (`.env` swap only).

---

## 2. Why a ≤ 1B–1.5B SLM Can Perform Exceptionally Well Here

In Bina AI's 6-layer pipeline, the LLM is **not** asked to perform autonomous medical diagnosis or general reasoning:

1. **Layers 1–3 & Layer 5** (`apps/ai-engine` + pure `packages/clinical-rules/`) already compute QC status, disease probabilities, quantitative biomarkers (`cup_to_disc_ratio`, `rnfl_um`, `irf_volume_nl`, `md_slope_db_per_year`, `iop_mmhg`), missing-modality notices, cross-modal discordance flags, and the deterministic urgency floor.
2. The LLM's entire job is a tightly bounded **JSON-to-Persian-JSON (`Schema-to-Text`)** transformation:
   - Input: Validated `EvidencePacketInput` JSON (`allowedEvidenceIds`, `eyeLaterality`, `finalUrgency`, specialist biomarkers/summaries).
   - Output: Validated `ValidatedPersianReportDraft` JSON in fluent clinical Persian (`fa-IR`), strictly citing only `allowedEvidenceIds`.
3. Narrow task-specific **Knowledge Distillation + LoRA Fine-Tuning (SFT)** routinely allows `0.6B–1.5B` non-reasoning models to match or outperform much larger general-purpose models on schema adherence, Persian clinical terminology, and numerical faithfulness.

---

## 3. Size vs. Quality & CPU Speed Trade-Offs

| Tier | Candidate Base Models | Quantized Footprint (`GGUF Q4_K_M`) | CPU Inference Profile (4–8 Cores) | Expected Reliability |
| :--- | :--- | :---: | :--- | :--- |
| **Ultra-Compact (`0.5B–0.6B`)** | `Qwen2.5-0.5B-Instruct`, `Qwen3-0.6B` (non-thinking mode) | **~350–450 MB RAM** | Very fast (**~3–8s** per ~350-token report) | Requires larger/cleaner SFT dataset (3,000–5,000 curated examples) to avoid occasional Persian phrasing glitches or dropped numbers. |
| **Sweet Spot (`1.0B–1.7B`)** *(Recommended)* | `Qwen2.5-1.5B-Instruct`, `Gemma-3-1B-it`, `Qwen3-1.7B` (`/no_think`) | **~0.7–1.2 GB RAM** | Fast (**~8–20s** per ~350-token report) | Strong native Persian fluency + near-100% JSON schema adherence after LoRA SFT on 2,000–3,000 examples. |

> **Critical Optimization:** Always train/serve **non-reasoning (`non-thinking`)** output formatting on CPU. Eliminating ~1,000 hidden reasoning tokens cuts generated token count by ~3–4× (~350 tokens total output), yielding proportional CPU speedup.

---

## 4. Implementation Plan (3 Stages)

### Stage 1 — Build Verified Distillation Dataset (`ml/datasets/` — Zero PHI)
1. Generate **2,000–3,000 diverse `EvidencePacketInput` scenarios** covering:
   - Single-modality and partial multi-modality inputs (`1..5` modalities, explicit `missingModalities`).
   - Strict `OD` (`چشم راست`), `OS` (`چشم چپ`), and bilateral (`OU`) cases.
   - All urgency tiers (`routine`, `followup_3_6m`, `urgent`) including post-cataract and Pillar 2 red-flag conditions (`infectious_keratitis`, `papilledema`, `retinal_detachment`, `active_cnv`, `high_risk_rop`).
   - Explicit discordance cases (`discordanceFlagsFa`) and numerical edge values.
2. Run outputs from a high-capability teacher model (e.g., `thinkingmachines/inkling-2-mini` or equivalent teacher) and filter **100%** through `PersianReportDraftSchema` + `validatePersianClinicalReport` (`apps/backend/src/contexts/ai-copilot/domain/persian-report-validators.ts`).
3. Ensure zero real PHI and full localization (translate any stray English terms such as `fast progressor` cleanly into standard Persian ophthalmology phrasing).

### Stage 2 — LoRA Fine-Tuning on Kaggle & `GGUF Q4_K_M` Export
1. Push a private Kaggle kernel (`enable_gpu: true`, `machine_shape: "NvidiaTeslaT4"`) using `TRL` / `PEFT` (`Unsloth` optional) to SFT `Qwen2.5-1.5B-Instruct` or `Gemma-3-1B-it` on the curated `(EvidencePacketInput -> ValidatedPersianReportDraft)` pairs using chat template formatting.
2. Merge LoRA weights into FP16 inside `/kaggle/working`, convert to **`GGUF Q4_K_M`** (~700 MB – 1.0 GB) via `llama.cpp` converter + `llama-quantize`, and delete intermediate FP16 checkpoints so kernel output stays compact.
3. Evaluate the quantized GGUF on a held-out clinical scenario set (zero overlap with training packet IDs) before gathering back via `kaggle kernels output`.

### Stage 3 — Local CPU Serving & Zero-Code `.env` Switch
1. Deploy a lightweight `llama.cpp` server (`ghcr.io/ggerganov/llama.cpp:server`) alongside Postgres/Redis in `infra/docker-compose.yml` under an optional `local-llm` profile with memory limits (`mem_limit: 1536m`).
2. Leverage OpenAI-compatible `response_format` JSON schema grammar in `llama-server` to guarantee syntactically valid JSON on every token generation step.
3. Switch the backend cleanly via `.env` with **zero TypeScript code changes**:
   ```env
   LLM_PROVIDER=openai_compatible
   LLM_BASE_URL=http://local-llm:8080/v1
   LLM_MODEL=bina-persian-report-1.5b-q4_k_m.gguf
   LLM_API_KEY=local-no-key-required
   LLM_TIMEOUT_MS=45000
   LLM_MAX_TOKENS=1024
   LLM_TEMPERATURE=0.05
   ```
4. Re-run `D4 Safety Eval` (`apps/backend/src/contexts/ai-copilot/__tests__/ai-copilot.test.ts` + full held-out eval suite) verifying:
   - `0%` schema failures, `0%` hallucinated citations, `0%` `OD`/`OS` swaps, `0%` urgency downgrades, and `0%` autonomous medication prescriptions.
