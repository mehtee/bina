# AGENTS.md — Engineering, Resource-Safety, AI/ML & Verification Rules for Bina AI

This file governs all AI coding agents and engineers working inside the `/home/mahdi/projects/binaai` monorepo. Read `docs/PRD.md` and `docs/ADR.md` before designing or modifying any module, and read `docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` (alongside the extracted reference screens in `docs/patient-app-ui-designs/` and standalone visual assets in `docs/patient-app-visual-assets/`) before designing, scaffolding, or implementing any page, theme, widget, or visual asset in `apps/patient-app/`.

---

## 1. Repository Overview & Monorepo Layout

Bina AI is a **unified two-pillar Iranian ophthalmology platform** (100% Persian `fa-IR` user-facing):
- **Pillar 1 — Patient Care-Operations & Home Vision Monitoring:** Post-cataract shared care (`OD`/`OS` versioned drop plans, offline SOS hotline, caregiver delegation, non-smartphone `Print+Phone` parity, clinic triage queue) + R2 calibrated home functional vision testing (`Landolt C`, `Amsler`, sensors, longitudinal trends).
- **Pillar 2 — 6-Layer Multimodal Clinical Diagnostic & Triage AI Engine:** Ingestion + Modality Router & QC Gate (`blur`, `light`, `OD`/`OS`) → 5 Specialist Models (`Fundus [DINOv2 Apache 2.0]`, `OCT/OCT-A [MONAI/U-Net]`, `Anterior/Topography`, `Visual Field`, `Tabular XGBoost`) → Masked Multimodal Fusion Engine (Differential + Confidence + Severity) → Primary Segmentation Masks + Auxiliary Grad-CAM + Switchable Small-LLM Persian Structured Report → 3-Tier Urgency Triage (`عادی` / `پیگیری ۳ تا ۶ ماه` / `ارجاع فوری`) + Mandatory Ophthalmologist HITL → DICOM/FHIR & Encrypted/Anonymized Storage.

Top-level workspace layout (non-blocking 2-person parallel split: **Track A [Backend + AI Engine + Local ML]** & **Track B [Flutter + Staff Web + E2E]**):
```text
binaai/
├── AGENTS.md                 # Mandatory agent operational rules (this file)
├── README.md                 # Repository overview, docs index & verification quickstart
├── .env.example              # Environment variable template (committed)
├── .env                      # Local secrets & active LLM/AI/DB config (GITIGNORED — NEVER COMMIT)
├── docs/
│   ├── PRD.md                # Unified PRD v3.0 (Pillar 1 + Pillar 2 + Wave 0–4 + Datasets + KPIs + Hazards)
│   ├── ADR.md                # Architecture Decision Records (ADR-001..054) & 2-Track Task Plan
│   ├── BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md # Authoritative Patient App UI/UX & Design System Spec (Bina Clinical Glass v2.1, ADR-054)
│   ├── patient-app-ui-designs/      # 9 approved Light-mode UI reference renders (01-Today.png..09-My-Account.png)
│   ├── patient-app-visual-assets/   # 4 canonical standalone visual source PNGs (A01–A04; derive runtime Light/Dark assets per §4.4)
│   ├── Bina-AI-UI-Designs.zip       # Original 9-screen reference archive (keep unmodified)
│   ├── Bina-AI-Visual-Assets.zip    # Original 4-asset archive (keep unmodified)
│   ├── bina-ai-local-small-llm-distillation.md # Local CPU-hostable <=1.5B Persian LLM distillation roadmap
│   ├── bina-ai-executive-summary-fa.md
│   ├── bina-ai-product-architecture-blueprint.md
│   └── bina-ai-market-benchmark-15-products-and-gtm-strategy.md
├── packages/                 # Contract-first boundary (OpenAPI 3.1, event JSON schemas; i18n-catalog & clinical-fixtures in Track B)
├── apps/
│   ├── backend/              # [Track A] Container-first TS Modular Monolith API + Temporal Worker (Dockerfile <250MB)
│   ├── ai-engine/            # [Track A] Simple container-first pluggable Python AI Engine (FastAPI + queue worker; cpu_stub on dev host)
│   ├── patient-app/          # [Track B] Flutter Patient & Caregiver App (Android/iOS + Self-hosted Web verification target)
│   ├── staff-web/            # [Track B] Container-first React Router v8 + React 19 Unified Care-Ops & Diagnostic HITL Web App (Dockerfile <100MB)
│   └── marketing-site/       # [Track B] Container-first Astro 7.4+ Persian marketing site (Dockerfile <50MB, staged)
├── ml/                       # [Track A] ML training pipelines (`kaggle kernels push` GPU train/test + `kaggle kernels output` retrieval), D1-D5 ETL, DICOM anonymization, evaluation & model cards
├── infra/                    # Container-first Docker Compose (profiles + limits), Terraform, CI & resource guards
└── tests/                    # Cross-system E2E (Playwright), business-process suites (P1+P2), RLS/security suites
```

---

## 2. CRITICAL: Low-RAM, Low-Disk & Container-First Build/Test Protocol

This shared development server is severely constrained in **BOTH RAM and Disk Storage**:
- **Memory:** ~7.6 GiB total RAM, frequently **~1.5–3.1 GiB `available` RAM**, and ~1.0 GiB swap nearly full. Unbounded parallel builds, Gradle/Android toolchains, heavy deep-learning runs, or multi-worker test suites **will OOM-crash the server**.
- **Storage:** `/` (`/dev/vda1`) is **99 GiB total with ~86 GiB used (~89% full, only ~12 GiB free)**. Existing unrelated containers and volumes already reside on this host. Unbounded Docker caches, bloated base images, or multi-GB CUDA/PyTorch/vision weights **will exhaust disk space and break the host**.

### Mandatory Step 0 — Memory & Disk Pre-Flight Check
**Before running ANY build, Docker build/compose, code generator, ML job, bundler, linter, or test suite**, inspect memory, swap, and disk:
```bash
free -m && df -h /
```
And before any `docker build` or `docker compose` action, also check Docker disk usage:
```bash
docker system df
```

#### A. Memory Rules (`free -m` -> `available` column)
1. **CRITICAL LOW MEMORY (`available < 1024 MiB`):**
   - **STOP.** Do NOT launch any build, bundler, Docker service, ML job, or test runner.
   - Stop idle Bina containers (`docker compose stop ...` — never touch unrelated containers), clear temporary build outputs if safe, and re-run `free -m`. If still `< 1024 MiB`, report to the user and stop.
2. **TIGHT MEMORY (`1024 MiB <= available < 2200 MiB`) — Strict Serial Mode:**
   - **Never run parallel builds** across `backend`, `ai-engine`, `staff-web`, and `patient-app`. Execute sequentially with `&&`.
   - Cap Node heap explicitly: `export NODE_OPTIONS="--max-old-space-size=1024"`
   - Force single-worker execution everywhere:
     - Vitest: `--pool=forks --poolOptions.forks.singleFork` (or `--maxWorkers=1 --no-file-parallelism`)
     - Playwright E2E: `--workers=1` and Chromium launch flag `--disable-dev-shm-usage`
     - Flutter test: `flutter test --concurrency=1`
     - Python (`ai-engine` / `ml/`): single worker (`--workers 1`, `n_jobs=1`), `AI_ENGINE_MODE=cpu_stub` (or tiny ONNX fixtures)
   - Start only the minimal Docker Compose profile needed for the active check and stop unused Bina containers afterwards.
3. **MODERATE MEMORY (`available >= 2200 MiB`) — Capped Mode:**
   - Still cap `NODE_OPTIONS="--max-old-space-size=1536"`, test workers `<= 2`, Playwright `--workers=1`, sequential builds.

#### B. Disk Storage & Container-First Rules (`df -h /` -> `Avail` column)
1. **CRITICAL LOW DISK (`Avail < 3 GiB` on `/`):**
   - **STOP.** Do NOT run `docker build`, `docker pull`, `pnpm install`, `flutter build`, or ML downloads.
   - Reclaim ONLY safe dangling/Bina-specific cache (`docker builder prune -f --filter "until=24h"` or `apps/*/dist`, `apps/patient-app/build`), and re-check `df -h /`.
   - **NEVER run `docker system prune -a --volumes` or `docker volume prune` blindly** — unrelated active containers and volumes exist on this shared host!
2. **TIGHT DISK (`3 GiB <= Avail < 6 GiB`):** Build Docker images one at a time and prune untagged layers (`docker image prune -f`) after each build.
3. **Container-First Docker Discipline (`ADR-049`, `ADR-050`):**
   - `apps/backend`, `apps/ai-engine`, `apps/staff-web`, and `apps/marketing-site` MUST ship with strict `.dockerignore` and lightweight multi-stage `Dockerfile`s (`node:24-alpine`, `nginx:alpine`, `python:3.12-slim`, `postgres:16-alpine`, `redis:7-alpine`).
   - Every service in `infra/docker-compose*.yml` MUST define `mem_limit`, Compose `profiles`, and `logging` rotation (`max-size: "10m"`, `max-file: "2"`).
   - **Forbidden Heavy Images & Weights on This Host:** NEVER pull multi-GB GPU/CUDA/PyTorch Docker images, NEVER download multi-GB raw imaging datasets or giant intermediate PyTorch checkpoints onto this 12G-free dev server, NEVER install Android SDK in Docker, and NEVER duplicate Playwright inside app containers. Heavy vision/OCT training & GPU test runs execute **remotely on Kaggle (`T4 x2` private kernels via authenticated `kaggle` CLI / `~/.kaggle/access_token`)** (or a future in-country GPU host); **after training & evaluation pass, pull ONLY the exported lightweight `ONNX` (or tabular) model artifacts and evaluation reports back onto this machine (`kaggle kernels output`)**, keeping `apps/ai-engine` tested here via `AI_ENGINE_MODE=cpu_stub` or `onnx_cpu`!

---

## 3. Flutter Mobile Build & UI/UX Policy on This Host

- **Mandatory UI/UX Source of Truth (`ADR-054` — Bina Clinical Glass v2.1):** Before designing, scaffolding, or implementing ANY screen, route, token, theme, component, or visual asset in `apps/patient-app/`, read [docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md](file:///home/mahdi/projects/binaai/docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md) in full and reference the 9 approved Light-mode renders in `docs/patient-app-ui-designs/` (`01-Today.png`..`09-My-Account.png`) and the 4 canonical source assets in `docs/patient-app-visual-assets/` (`A01–A04`):
  - **Source Precedence (§0):** `docs/PRD.md`, `docs/ADR.md`, and OpenAPI/clinical contracts govern safety, scope, and data; the 9 PNGs govern Light visual appearance; v2.1 defines tokens, Dark theme, and all unpictured flows (`V10` + `§9.1–§9.8`). Never embed screenshots as app widgets or hardcode phone bezels/status bars.
  - **Canonical Visual Assets (§4.4.1–4.4.4):** Use `A01–A04` unmodified as source masters (`assets/design/source/`, excluded from release bundle) to produce Light/Dark runtime derivatives in `assets/design/runtime/` (`iris_*`, `logo_*`, `wave_footer_*`, `wave_header_*`). Never interchange compact header wave (`A04`) with broad footer wave (`A03`), never redraw `A01–A04`, and suppress decorative art in SOS and active `clinical_renderer` test surfaces.
  - **Repository-First SDK & Material (§1.1):** Use the repository's pinned Flutter SDK & Material library without unapproved breaking migrations; verify exact host SDK compatibility before generating code.
- **DO NOT run Android or iOS native builds (`flutter build apk`, `flutter build appbundle`, `flutter build ipa`, `./gradlew`) on this server.**
- **ALWAYS verify `apps/patient-app/` on this server via:**
  - `flutter analyze`
  - `flutter test --concurrency=1`
  - `flutter build web --no-wasm-dry-run` *(or `flutter build web` matching the pinned SDK per `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` §12.4; checking `free -m && df -h /` first; self-hosted CanvasKit + Vazirmatn assets with zero external CDN calls!)*
- Keep all native-only capabilities (`DeviceSensorPort`, `OfflineEncryptedStore`, `LocalReminderPort`) behind clean abstract Dart ports with deterministic Web adapters.

---

## 4. AI/ML, Switchable Small-LLM & Pluggable Engine Rules

### 4.1 Simple Pluggable `apps/ai-engine/` & Commercial-Safe Backbones (`ADR-050`, `ADR-051`)
- Keep `apps/ai-engine/` as **one simple container** hosting all 6 multimodal layers (`Router/QC`, 5 Specialists + `XGBoost`, `Fusion`, `Explainability`) behind OCP plugin protocols (`SpecialistModelPlugin`, `FusionEnginePort`). Never scatter business logic across ad-hoc Python microservices.
- **Commercial License Rule (`ADR-051`):** Default commercial vision backbones MUST be **Apache 2.0** (`DINOv2`/`DINOv3`, `SigLIP`, `MONAI`/`U-Net`/`SegFormer`). Do NOT bundle `RETFound` (`CC BY-NC 4.0`) into commercial inference paths unless explicitly enabled under a `research_only` or commercially licensed flag.
- **Explainability Rule (`ADR-051`):** Treat pixel-level **segmentation masks** as primary clinical overlays; always label **Grad-CAM/Attention maps** strictly as auxiliary classification hints.
- **No Direct DB Writes from Python:** `apps/ai-engine/` and `ml/` never write directly to PostgreSQL domain tables; TypeScript contexts own all relational persistence.

### 4.2 Switchable OpenAI-Compatible Small-LLM Policy (`ADR-046`)
- Route ALL LLM calls through `StructuredLanguageModel` / `OpenAICompatibleLanguageModel` in `apps/backend/src/contexts/ai-copilot/`, configured exclusively via `.env`:
  - `LLM_PROVIDER=openai_compatible`
  - `LLM_BASE_URL=https://openrouter.ai/api/v1` *(switchable to local Iranian vLLM/Ollama/llama.cpp `/v1` with zero code edits)*
  - `LLM_MODEL=thinkingmachines/inkling-2-mini`
  - `LLM_API_KEY=` *(in `.env`, NEVER committed)*
- **Structured JSON Input Only:** LLMs generate **Persian (`fa-IR`)** clinical reports from validated Layer 1–3 JSON evidence packets—never autonomous diagnosis from raw images. Enforce Zod schema retry, citation-ID check, negation & `چشم راست`/`چشم چپ` check, deterministic Persian template fallback, and **mandatory PHI scrubbing before any external OpenRouter call**.

### 4.3 Kaggle Remote GPU Training, Model Retrieval & Dataset Rules (`ADR-047`, `ADR-053`)
- **Two-Stage Kaggle Train-and-Gather Workflow:**
  1. Author training, evaluation, and `ONNX` export code under `ml/` and run lightweight CPU smoke/schema tests locally.
  2. Push **private** GPU batch kernels to Kaggle (`kaggle kernels push` with `"is_private": true`, `"enable_gpu": true`, `"accelerator": "nvidiaTeslaT4"` via `~/.kaggle/access_token`; set `"enable_internet": true` only when fetching public pretrained weights/datasets), enforcing **patient-, clinic/device-, and time-level holdout splits (`ADR-033`)** inside the Kaggle run itself.
  3. Inside `/kaggle/working`, run held-out test evaluation, export the final quantized/lightweight **`ONNX` (or GBDT) model + `metrics.json` + Model Card**, and **delete heavy intermediate raw datasets / PyTorch checkpoints** before kernel completion so outputs stay compact.
  4. Check `df -h /` first, then gather **only the saved models and metrics** back onto this machine via `kaggle kernels output <owner/slug> -p ml/registry/artifacts/<model>/`, wire into `apps/ai-engine/`, and verify locally in `onnx_cpu` mode.
- **Strict Privacy Boundary for Kaggle:** NEVER upload un-anonymized patient PHI, raw clinic identifiers, or un-scrubbed DICOMs (`0010,*` tags) to Kaggle (even in Private datasets). Kaggle runs use audited public seed benchmarks and strictly `ADR-053` DICOM-anonymized/consented snapshots; any hospital-restricted Iranian `D5` fine-tuning runs on an in-country GPU host later.
- Never commit Kaggle credentials (`~/.kaggle/access_token`, `kaggle.json`, `KAGGLE_API_TOKEN`) or downloaded dataset/model binaries (`ml/datasets/raw/`, `ml/datasets/processed/`, `ml/registry/artifacts/` are gitignored).

---

## 5. Mandatory E2E, Business-Process & Post-Dev Testing Policy

**No task is complete until tests run and pass AFTER your final edit.** Every feature MUST satisfy applicable layers:
1. **Unit & Domain Invariants:** `OD`/`OS` isolation, pure `clinical-rules` (post-op red flags + Pillar 2 3-tier urgent-floor override), Rx versioning, offline outbox, Layer 1 QC rejection, Layer 3 masked missing-modality Fusion, LLM JSON/citation/Persian validators.
2. **Database, RLS, Queue & Workflow Integration Tests:** Real PostgreSQL `FORCE ROW LEVEL SECURITY` cross-tenant negative tests, Transactional Outbox atomicity, Temporal time-skipping tests, DICOM anonymization tests, and async Redis queue -> `ai-engine(cpu_stub)` contract tests.
3. **Full Business-Process Tests (`tests/process/`):**
   - **Pillar 1:** Dual-eye surgery `OD`/`OS` isolation; Offline red-flag & idempotent sync; Triage & shift handoff; Non-smartphone `Print+Phone` parity; Caregiver delegation & instant revocation.
   - **Pillar 2:** Multimodal diagnostic pipeline (DICOM/image ingest -> Layer 1 QC rejects blurry/wrong-eye scan -> valid multi-modality set -> 5 specialists -> Masked Fusion differential -> Urgent floor override -> Persian LLM report -> Ophthalmologist HITL sign-off -> Anonymized `D5` export).
4. **Browser E2E Tests (`tests/e2e/`, Playwright `--workers=1`, `--disable-dev-shm-usage`):**
   - Run against containerized `backend` + `ai-engine(cpu_stub)` + `staff-web` + compiled Flutter Web `patient-app`.
   - Verify WCAG 2.2 AA (`axe-core`), 100% Persian `fa-IR` RTL + Jalali display, `>=48dp` targets, zero external CDN requests, and end-to-end continuity across both Pillar 1 (clinic ↔ patient) and Pillar 2 (technician upload → QC → mask/Grad-CAM viewer → ophthalmologist HITL sign-off → patient signed summary).

---

## 6. Architecture, SOLID, Iran/Persian-First & Safety Rules

1. **Two-Track Parallel Development (`ADR-048`, `ADR-054`):** Work contract-first against `packages/contracts-openapi/` and `packages/clinical-fixtures/` so **Track A (`backend` + `ai-engine` + `ml`)** and **Track B (`patient-app` + `staff-web` + `e2e`)** never block each other. All `apps/patient-app/` pages, themes (Light & Dark), floating dock, semantic tokens, asset derivatives (`A01–A04`), offline receipts, and isolated `clinical_renderer` boundaries MUST conform to `docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` and the 9 approved Light renders in `docs/patient-app-ui-designs/`; report unsupported backend endpoints rather than inventing API behavior.
2. **SOLID & Strict Boundaries:** No `GodService` or shared `utils` dumping grounds; bounded contexts never import another context's internals; `clinical-rules` never imports LLM/HTTP/vendor SDKs; `ai-copilot` never mutates clinical truth or downgrades urgency.
3. **Iranian Market, 100% Persian-First & Safety Non-Negotiables:**
   - **100% Persian User-Facing (`fa-IR`):** Source code & technical docs are in English; ALL user-facing patient, caregiver, clinician, diagnostic report, PDF, SMS, audio, and AI outputs MUST be fluent Persian (`fa-IR`) with **Jalali (`Solar Hijri`)** dates, semantic RTL, bidi isolation, `+98` phone support, and **self-hosted `Vazirmatn` fonts & local Web assets** (zero blocked external CDNs).
   - **Centralized Rebrandable Product Name (`APP_BRAND_NAME_FA` / `APP_BRAND_NAME_EN`):** The product display name (`بینا` / `Bina AI`) may change later — NEVER hardcode `بینا` or `Bina AI` directly in user-facing UI strings, ARB/i18n catalogs, SMS templates, PDFs, or web pages. Always read from the single brand variable:
     - **Backend (`apps/backend`):** `APP_BRAND_NAME_FA` / `APP_BRAND_NAME_EN` (`.env` -> `getAppBrand()` in `packages/domain-kernel/brand.ts` & `config.ts`).
     - **Flutter (`apps/patient-app`):** Single `BinaBrand.appNameFa` / `BinaBrand.appNameEn` in `packages/design_system/` (`String.fromEnvironment('APP_BRAND_NAME_FA', defaultValue: 'بینا')`) passed via `{appName}` into ARB/i18n templates (e.g., `به {appName} خوش آمدید`).
     - **Staff Web / Marketing (`apps/staff-web`, `apps/marketing-site`):** Single `VITE_APP_BRAND_NAME_FA` / `PUBLIC_APP_BRAND_NAME_FA` env var (default `بینا`).
   - **Multi-Tenant Isolation:** Every tenant-owned Postgres table requires `tenant_id` AND `FORCE ROW LEVEL SECURITY`.
   - **Explicit Eye Laterality:** Store `OD`/`OS` explicitly and render full Persian words (`چشم راست` / `چشم چپ`).
   - **Mandatory Human-in-the-Loop:** Never release unsigned AI diagnostic reports to patients or HIS, never output "all clear" / autonomous medication changes, and never downgrade urgent clinical findings (`کراتیت عفونی`, `ادم پاپی`, `جداشدگی شبکیه`, post-op red flags).
   - **Regulatory Scope Note:** Formal IMED/FDA/ISO QMS submission paperwork is deferred for now; focus on clean engineering safety, HITL, security, and testability.
