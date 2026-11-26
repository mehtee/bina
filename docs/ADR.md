# Bina AI — Architecture Decision Records (ADR-001 to ADR-055), Unified Platform Architecture & Two-Track Implementation Plan

**Document Status:** Accepted Engineering Baseline (Unified Pillar 1 Care-Ops + Pillar 2 6-Layer Multimodal Diagnostic AI + Container-First Docker + Iran/Persian-First + Bina Clinical Glass Flutter UI/UX v2.1 & Staff Web Compact Desktop UI/UX v2.0 + 2-Person Parallel Plan)  
**Date:** 26 November 2026  
**Companion Authority:** [PRD.md](file:///home/mahdi/projects/binaai/docs/PRD.md) · [AGENTS.md](file:///home/mahdi/projects/binaai/AGENTS.md) · [BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md](file:///home/mahdi/projects/binaai/docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md) · [patient-app-ui-designs/](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/) · [patient-app-visual-assets/](file:///home/mahdi/projects/binaai/docs/patient-app-visual-assets/) · [BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md](file:///home/mahdi/projects/binaai/docs/BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md) · [staff-web-ui-designs/](file:///home/mahdi/projects/binaai/docs/staff-web-ui-designs/)

---

## 1. System Architecture & Monorepo Topology

### 1.1 Monorepo Directory Structure (`ADR-042`, `ADR-049`, `ADR-050`)
Designed for **non-blocking 2-person parallel development (`Track A` vs. `Track B`)** with zero overlapping application folders and strict contract boundaries:

```text
binaai/
├── AGENTS.md                         # Low-RAM/Low-Disk/Docker guards, Flutter Web, Persian-first, E2E gates
├── README.md                         # Repository overview, docs index & verification quickstart
├── .env.example                      # Committed template (IR/fa-IR/Jalali, APP_BRAND_NAME_*, OpenAI-compatible LLM, AI_ENGINE_MODE)
├── .env                              # Untracked local secrets & runtime switches (GITIGNORED)
├── .gitignore
├── .dockerignore
├── package.json                      # Root pnpm workspace scripts
├── pnpm-workspace.yaml
├── docs/
│   ├── PRD.md                        # Unified PRD v3.0 (Pillar 1 + Pillar 2 + Wave 0–4 + Datasets + KPIs + Hazards)
│   ├── ADR.md                        # This document (ADR-001..055 + SOLID + Full 2-Track Task Plan)
│   ├── BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md # Authoritative Patient App UI/UX Spec (Bina Clinical Glass v2.1, ADR-054)
│   ├── BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md     # Authoritative Staff Web UI/UX & Clinical Design System Spec (v2.0, ADR-055)
│   ├── flutter_missing.md            # Patient App UX/onboarding/animation/spec gap tracker
│   ├── patient-app-ui-designs/       # 9 approved Light-mode Patient App reference renders (01-Today.png..09-My-Account.png)
│   ├── patient-app-visual-assets/    # 4 canonical standalone visual source PNGs (A01–A04; shared Patient App + Staff Web)
│   ├── staff-web-ui-designs/         # 8 extracted desktop Staff Web reference renders (01-Clinical-Dashboard.png..08-Care-Operations-Alternative.png)
│   ├── Bina-AI-UI-Designs.zip        # Original 9-screen Patient App reference archive (unmodified)
│   ├── Bina-AI-Visual-Assets.zip     # Original 4-asset archive (unmodified)
│   ├── Bina-AI-Staff-Web-Last-8-Designs.zip # Original 8-screen Staff Web desktop reference archive (unmodified)
│   ├── bina-ai-local-small-llm-distillation.md # Local CPU <=1.5B Persian LLM distillation & GGUF roadmap
│   ├── bina-ai-executive-summary-fa.md
│   ├── bina-ai-product-architecture-blueprint.md
│   └── bina-ai-market-benchmark-15-products-and-gtm-strategy.md
├── packages/                         # Shared Contract-First Boundary (Track A <-> Track B)
│   ├── contracts-openapi/            # Canonical OpenAPI 3.1 (Pillar 1 + Pillar 2 Diagnostic & AI Engine DTOs) + Prism mock
│   ├── event-schemas/                # Versioned JSON Schema domain & inference job events
│   ├── i18n-catalog/                 # [Track B T-B01] 100% Persian-first (fa-IR) clinical/UI/report lexicon + extensible ar/en
│   └── clinical-fixtures/            # [Track B T-B01] Golden JSON/image fixtures (OD/OS Rx, red flags, DICOM/QC, Fusion, D4 Persian reports)
├── apps/
│   ├── backend/                      # [TRACK A] Container-first TS Modular Monolith (API + Temporal Worker + Queue Orchestrator)
│   │   ├── Dockerfile                # Multi-stage node:24-alpine (< 250 MB runtime image, non-root)
│   │   ├── .dockerignore
│   │   └── src/
│   │       ├── apps/
│   │       │   ├── api/              # Fastify REST OpenAPI composition root, auth, RLS middleware
│   │       │   └── worker/           # Temporal durable workflows + Redis/Outbox AI inference job orchestrator
│   │       ├── packages/             # Pure shared backend kernel
│   │       │   ├── domain-kernel/    # Branded IDs, EyeLaterality ('OD'|'OS'), Result<T,E>, Plugin interfaces
│   │       │   ├── db/               # Postgres pool, FORCE RLS transaction wrapper, Outbox & Audit helpers
│   │       │   ├── authz/            # RBAC + ABAC + break-glass guards
│   │       │   ├── clinical-rules/   # Pure deterministic post-op red flags, 3-tier urgent-floor override, R2 trends
│   │       │   ├── feature-policy/   # Tenant/clinic protocol & AI capability flags
│   │       │   └── observability/    # PHI-redacted OpenTelemetry
│   │       └── contexts/             # Strict SRP bounded contexts (domain/, ports/, application/, infra/, api/)
│   │           ├── tenancy/          # Clinics, Jalali defaults, staffed hours, Persian templates
│   │           ├── identity-access/  # Staff OIDC/MFA/step-up, break-glass
│   │           ├── enrollment-consent/ # Patient +98 OTP, Persian consent, caregiver grant & instant revocation
│   │           ├── protocols/        # CareProtocolPlugin registry
│   │           ├── care-episodes/    # [P1] OD/OS surgical episodes, versioned Rx, 4-state adherence
│   │           ├── symptoms/         # [P1] Structured red flags + Persian symptom NLP client
│   │           ├── triage-operations/# [P1+P2] Unified SLA triage queue, 3-tier urgency, shift handoff, referrals
│   │           ├── diagnostic-studies/# [P2] Study ingestion, DICOM/image metadata, QC status, async AI job tracking, Fusion results & HITL clinician sign-off
│   │           ├── notifications/    # Domestic Iranian SMS adapter (PHI-free UCS-2) + Push/Voice ports
│   │           ├── reporting/        # Deterministic Vazirmatn Persian PDF (care summaries + signed diagnostic reports)
│   │           ├── ai-copilot/       # Switchable OpenAI-compatible Small-LLM gateway + Persian report LangGraph + validators
│   │           ├── integrations/     # DICOMweb/C-STORE bridge, DICOM anonymizer, FHIR R4/R5, iCare HOME2, HIS export
│   │           ├── audit-compliance/ # Append-only audit log + retention policy
│   │           ├── r2-monitoring/    # [P1-R2] Unified Wave 4 R2 context (calibration/testing, sensor quality, baselines, EWMA/CUSUM trends)
│   │           ├── billing-evidence/ # Optional regional billing/activity ledger
│   │           └── research/         # De-identified study lock & pseudonymized exports
│   ├── ai-engine/                    # [TRACK A] Simple Container-First Pluggable Python Inference Service (ADR-050)
│   │   ├── Dockerfile                # Lightweight python:3.12-slim CPU image on dev host (optional GPU build target)
│   │   ├── .dockerignore
│   │   ├── pyproject.toml            # uv-managed dependencies (CPU wheels default; optional [gpu] extra)
│   │   └── src/bina_ai_engine/
│   │       ├── api/                  # FastAPI contract endpoints (/v1/analyze-study, /v1/qc, /health)
│   │       ├── worker/               # Lightweight Redis/queue consumer executing the 6-layer pipeline
│   │       ├── core/                 # OCP plugin interfaces (ModalityRouterPort, QcGatePort, SpecialistModelPlugin, FusionEnginePort, ExplainabilityPort)
│   │       ├── layer1_router_qc/     # Modality Router + Blur/Lighting/OD-OS Quality Gate
│   │       ├── layer2_specialists/
│   │       │   ├── fundus/           # DINOv2/SigLIP Apache 2.0 (DR, Glaucoma, AMD, Papilledema, ROP) + optional research RETFound slot
│   │       │   ├── oct/              # MONAI/U-Net layer & fluid segmentation + AMD/DME/CNV + OCT-A metrics
│   │       │   ├── anterior/         # Slit-lamp & Topography (Keratoconus, Cataract, Keratitis, Pterygium)
│   │       │   ├── visual_field/     # HFA 8x9 spatial-temporal Glaucoma progression
│   │       │   └── tabular_xgb/      # XGBoost Diabetes/DR & Glaucoma risk + SHAP
│   │       ├── layer3_fusion/        # Masked multimodal late-fusion + clinical priors -> Differential + Confidence + Discordance
│   │       └── layer4_explainability/# Pixel segmentation mask exporter (primary) + Auxiliary Grad-CAM heatmap generator
│   ├── patient-app/                  # [TRACK B] Flutter App (Bina Clinical Glass v2.1: docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md; Android/iOS + Self-Hosted Web)
│   │   ├── pubspec.yaml
│   │   ├── assets/design/            # source/ (A01–A04 originals, non-bundled) & runtime/ (derived Light/Dark WebP/PNG per §4.4.1)
│   │   ├── lib/                      # app/, core/ (Offline Outbox + OpenAPI client/mock), shared/, features/ (auth_onboarding, care_plan, education, symptoms_sos, caregiver, vision_testing, diagnostic_results)
│   │   └── packages/                 # design_system (Bina Clinical Glass tokens, BinaCanvas/Surface/FloatingDock, fa-IR RTL, Vazirmatn, >=48dp), offline_store, device_sensors, clinical_renderer
│   ├── staff-web/                    # [TRACK B] Container-first React Router v8 + React 19 Web App (Bina Clinical Glass Desktop v2.0: docs/BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md, ADR-055; 100% fa-IR RTL + Jalali)
│   │   ├── Dockerfile                # Multi-stage Alpine (< 100 MB)
│   │   └── src/
│   │       ├── app/                  # Framework routes, root, compact desktop shell, capability route guards
│   │       ├── core/                 # Typed OpenAPI client (+ MSW mock mode), auth/step-up, Jalali/RTL, theme, redacted observability
│   │       ├── design-system/        # Appendix A Light/Dark CSS tokens, primitives, composites, lazy clinical charts & fixtures
│   │       ├── assets/design/        # runtime/ (derived Light/Dark A01–A04 desktop assets; source PNGs excluded from bundle)
│   │       └── features/             # Modules A–M (overview, patients, diagnostics, monitoring, episodes, triage, referrals, reporting, admin, integrations, ops_console, settings)
│   └── marketing-site/               # [TRACK B — Staged] Container-first Astro 7.4+ Persian site (< 50 MB)
├── ml/                               # [TRACK A] ML Training (Kaggle T4 x2 GPU Train/Test + Host Model Gathering), Datasets (D1-D5) & Benchmarks
│   ├── pyproject.toml                # uv Python workspace (CPU-light smoke tests on dev host; GPU deps inside Kaggle kernels)
│   ├── datasets/                     # D1-D5 ETL, DICOM anonymization, public dataset loaders (UWHVF, GRAPE, OCTDL, Orbscan, EyePACS), patient/site/time splitters
│   ├── features/                     # Feature builders (tabular XGBoost, VF 8x9 matrices, topography indices, telemetry)
│   ├── training/                     # Kaggle kernel training suites (`kernel1_l1_and_fundus/`, `kernel2_oct_ant_vf_tab/`, `kernel3_persian_nlp_r2_risk/`)
│   ├── kaggle/                       # Private kernel-metadata.json templates + push/eval/output gathering scripts (`kaggle kernels push` & `output`)
│   ├── evaluation/                   # Leakage verifier, Dice/IoU, urgent sensitivity, calibration/Brier, Grad-CAM plausibility, Persian D4 evals
│   ├── registry/                     # Gathered lightweight ONNX / XGBoost artifacts + metrics.json (gitignored heavy blobs)
│   └── model-cards/                  # Model cards documenting license, splits, metrics & limitations
├── infra/
│   ├── docker-compose.yml            # Container-first stack (backend, worker, ai-engine, staff-web, deps via profiles & limits)
│   ├── docker-compose.dev.yml        # Memory/disk-capped dev infra (Postgres, Redis, lightweight Temporal, MinIO)
│   ├── scripts/
│   │   ├── check-resources.sh        # Pre-flight RAM + Disk + Docker df guard & safe NODE_OPTIONS exporter
│   │   ├── check-rls-migrations.mjs  # CI migration linter: fails if tenant table lacks FORCE RLS
│   │   └── check-architecture.mjs    # Dependency & SOLID boundary checker
│   └── terraform/                    # Iran in-country IaC templates
└── tests/
    ├── process/                      # [TRACK A] Full business-process suites (Pillar 1 + Pillar 2 Diagnostic HITL pipeline)
    ├── security/                     # [TRACK A] Postgres RLS penetration, caregiver revocation, DICOM anonymization & PHI scrub suites
    ├── contract/                     # [SYNC] OpenAPI & AI Engine schema compatibility verification
    └── e2e/                          # [TRACK B + SYNC] Playwright E2E driving containerized backend + ai-engine + staff-web + Flutter Web
```

### 1.2 Unified Runtime Architecture (Pillar 1 + Pillar 2 6-Layer AI)

```mermaid
flowchart LR
    PA["Patient App (Flutter: Android/iOS + Web)"] -->|REST/OpenAPI + Idempotency| API["Backend API (TS Modular Monolith)"]
    SW["Staff Web (React Router v8: Care-Ops + Diagnostic HITL)"] -->|REST/OpenAPI + OIDC/MFA| API
    DEV["Clinic Devices & HIS (DICOM / FHIR)"] --> INT["Integrations & Anonymizer Adapter"] --> API

    API --> PG[("PostgreSQL + FORCE RLS")]
    API --> OBJ[("Encrypted MinIO/S3 (DICOM, Masks, PDFs)")]
    API --> Q[("Redis Queue / Transactional Outbox")]
    Q --> TEMP["Temporal Durable Workflows"]
    Q --> AI["Simple Pluggable AI Engine (apps/ai-engine)"]

    subgraph AI_LAYERS["6-Layer Multimodal Pipeline (Simple Single Container Now -> Split GPU Workers Later)"]
      direction TB
      L1["Layer 1: Modality Router + QC Gate (Blur / Light / OD-OS)"]
      L2["Layer 2 Specialists: Fundus (DINOv2) | OCT (MONAI) | Anterior | VF | Tabular (XGBoost)"]
      L3["Layer 3: Masked Multimodal Fusion Engine -> Differential + Severity"]
      L4V["Layer 4a: Segmentation Masks (Primary) + Auxiliary Grad-CAM"]
      L1 -->|Pass| L2 --> L3 --> L4V
    end

    AI --> AI_LAYERS
    AI_LAYERS -->|Structured JSON + Mask Keys| API
    API -->|Deterministic Urgent Floor (clinical-rules)| TRIAGE["Layer 5: 3-Tier Urgency + Ophthalmologist HITL"]
    API -->|PHI-Scrubbed JSON via .env| LLM["Layer 4b: OpenAI-Compatible Small LLM (OpenRouter inkling-2-mini -> Local Iran vLLM/Ollama)"]
    LLM -->|Validated Persian Report Draft| TRIAGE

    PG -.->|Anonymized & Consented ETL| ML["ML Lab (ml/: CPU Smoke Locally -> Kaggle T4 x2 GPU Train/Test)"]
    ML -.->|Gathered Lightweight ONNX / XGBoost Artifacts| AI
```

---

## 2. Engineering Principles: SOLID, Hexagonal & Pluggable AI

### 2.1 Single Responsibility Principle (SRP)
- Every backend bounded context (`apps/backend/src/contexts/<name>/`) maintains four internal layers (`domain/`, `ports/`, `application/`, `infrastructure/` + `api/`) and owns one cohesive clinical/operational domain.
- Inside `apps/ai-engine/`, every layer and specialist is an isolated module (`layer1_router_qc/`, `layer2_specialists/<modality>/`, `layer3_fusion/`, `layer4_explainability/`). Adding a new modality (e.g., Ultrasound B-scan) or replacing a model weights file never touches the API router, queue worker, or TypeScript backend!

### 2.2 Open/Closed Principle (OCP) — Core Extension Contracts
**TypeScript Backend (`apps/backend/src/packages/domain-kernel/`):**
```ts
// Pillar 1 Care Pathway Plugin (Post-Cataract, AMD Home Monitoring, Glaucoma)
export interface CareProtocolPlugin<TConfig, TPlanSnapshot, TCheckInInput> {
  readonly protocolType: string;
  validateTemplateConfig(config: TConfig): ValidationResult;
  buildActivePlan(config: TConfig, episode: CareEpisodeContext): TPlanSnapshot;
  evaluateCheckIn(input: TCheckInInput, context: EvaluationContext): Promise<ClinicalSignal[]>;
}

// Pillar 1 R2 Home Vision Test Plugin
export interface VisionTestDefinition<TProtocol, TRawEvidence, TMeasurement> {
  readonly testType: string;
  validateProtocol(protocol: TProtocol): ValidationResult;
  deviceRequirements(protocol: TProtocol): DeviceRequirement[];
  score(evidence: TRawEvidence, context: ScoringContext): Promise<VersionedMeasurement<TMeasurement>>;
}

// Deterministic Safety & 3-Tier Urgent-Floor Evaluator (Pure, zero LLM/vendor SDK imports)
export interface ClinicalSignalEvaluator {
  readonly evaluatorId: string;
  evaluate(input: QualifiedPatientEvidence): ClinicalSignal[];
}

// Pillar 2 Async AI Engine Client Port (Decouples Backend from Single Container vs. Future Microservices)
export interface DiagnosticInferenceGatewayPort {
  submitStudyAnalysis(job: DiagnosticAnalysisRequest): Promise<InferenceJobReceipt>;
  getJobResult(jobId: string): Promise<MultimodalDiagnosticResult>;
}

// Switchable OpenAI-Compatible Small-LLM Port (ADR-046) + Future Multimodal VLM Extension
export interface StructuredLanguageModel {
  generate<T>(request: StructuredGenerationRequest<T>): Promise<StructuredGenerationResult<T>>;
}

// External Integrations (Domestic Iranian SMS, DICOM/FHIR, HIS)
export interface NotificationTransportPort { send(msg: TemplatedNotification): Promise<NotificationDeliveryReceipt>; }
export interface EhrIntegrationAdapter { readonly adapterId: string; exportReport(doc: VersionedClinicalReport): Promise<ExternalExportReceipt>; }
```

**Python AI Engine (`apps/ai-engine/src/bina_ai_engine/core/`):**
```python
class ModalityRouterPort(Protocol):
    def detect(self, image_bytes: bytes, declared_modality: str | None) -> ModalityPrediction: ...

class QualityControlGatePort(Protocol):
    def evaluate(self, image_bytes: bytes, modality: str, declared_eye: Literal["OD", "OS"]) -> QcDecision: ...

class SpecialistModelPlugin(Protocol):
    plugin_id: str
    supported_modalities: tuple[str, ...]
    def predict(self, payload: SpecialistInput) -> SpecialistOutput: ...  # probs, biomarkers, mask_ref, gradcam_ref

class FusionEnginePort(Protocol):
    def fuse(self, specialist_outputs: list[SpecialistOutput], clinical_context: ClinicalContext) -> FusionResult: ...
```

---

## 3. Architecture Decision Records (`ADR-001` through `ADR-055`)

### Core Platform, Monorepo & Containerization
- **ADR-001:** Modular Monolith in TypeScript (`apps/backend`) Before Microservices — *Accepted*
- **ADR-002:** Flutter (Android / iOS + Self-Hosted Web Verification Target) for Patient Mobile App — *Accepted*
- **ADR-003:** Astro 7.4+ for Public Persian Marketing & Evidence Site — *Accepted (Staged)*
- **ADR-004:** React Router v8 Framework Mode + React 19 for Unified Staff & Diagnostic Web Workstation *(UI/UX & clinical desktop design system governed by `ADR-055`)* — *Accepted*
- **ADR-005:** Canonical REST + OpenAPI 3.1 Contract (`packages/contracts-openapi/`) — *Accepted*
- **ADR-006:** FHIR R4/R5 & DICOM Strictly as Integration Adapters (`contexts/integrations/`) — *Accepted*
- **ADR-041:** Unified Phased Delivery — Pillar 1 Care-Ops + Pillar 2 6-Layer Multimodal Diagnostic AI on Shared Core — *Accepted*
- **ADR-042:** Monorepo Separation (`apps/backend`, `apps/ai-engine`, `apps/patient-app`, `apps/staff-web`, `ml/`, `packages/`, `tests/`) — *Accepted*
- **ADR-045:** Low-RAM & Low-Disk Build/Test Discipline, Flutter Web Verification & Mandatory Post-Dev E2E/Process Testing — *Accepted*
- **ADR-048:** Contract-First Two-Track Parallel Delivery (`Track A: Backend + AI Engine + ML` vs. `Track B: Flutter + Staff Web + E2E`) — *Accepted*
- **ADR-049:** Container-First Backend, AI Engine & Web Deployment with Storage/Memory-Hardened Multi-Stage Docker Images (`backend <250MB`, `staff-web <100MB`, `marketing <50MB`, `mem_limit`, Compose profiles, `10m×2` log rotation, no destructive global prunes) — *Accepted*

### Data Integrity, Multi-Tenancy, Iran Residency & Workflows
- **ADR-007:** PostgreSQL + Mandatory `FORCE ROW LEVEL SECURITY` (`tenant_id`) + ABAC — *Accepted*
- **ADR-008:** Immutable Raw Evidence (Images, DICOMs, Trials, Submissions); Versioned Derived Results & Reports — *Accepted*
- **ADR-009:** Transactional Outbox Pattern — *Accepted*
- **ADR-010:** Temporal for Durable Clinical & Operational Workflows + Redis Queue for Async AI Jobs *(backed by Postgres `workflow_executions` durable state runtime in lightweight dev environments alongside the `temporalio/auto-setup` Compose profile)* — *Accepted*
- **ADR-015:** OpenTelemetry Platform Observability (PHI-Redacted) — *Accepted*
- **ADR-016:** Zero Raw Patient Face Video Persistence in Default Care — *Accepted*
- **ADR-019:** OIDC/SAML + MFA/Step-Up for Staff; Iranian `+98` OTP/Deep-Link + Revocable Caregiver Tokens for Patients — *Accepted*
- **ADR-020:** RBAC + ABAC with Audited Break-Glass — *Accepted*
- **ADR-021:** KMS Envelope Encryption & Key Rotation — *Accepted*
- **ADR-022:** Infrastructure-as-Code & Immutable Artifact Promotion — *Accepted*
- **ADR-023:** Iran (`IR`) In-Country Cloud Residency, Domestic SMS Gateway & Self-Hosted Web/Font Assets (`Vazirmatn` + CanvasKit) — *Accepted*
- **ADR-024 / ADR-025:** Traceability & Claims Discipline *(Formal IMED/FDA/ISO QMS Regulatory Filing Explicitly Deferred per Founder Direction; Engineering Safety Controls Kept Active)* — *Accepted (Light Governance)*
- **ADR-026:** Regional Billing Ledger Optional / Deferred Behind Feature Flag — *Accepted*
- **ADR-027:** Segregation of Operational Care Data vs. De-Identified ML Training Snapshots — *Accepted*
- **ADR-028:** Policy-Aware Feature Flags (Tenant, Protocol, AI Capability, Device Eligibility) — *Accepted*
- **ADR-029:** Deterministic Versioned Persian PDF/JSON Clinical Reports & `source_sha256` Manifests — *Accepted*
- **ADR-030:** Extracting Backend Business Contexts into Microservices Requires Load Proof — *Accepted*
- **ADR-031:** Deduplicated Alert & Triage Episodes — *Accepted*
- **ADR-034:** No Implied 24/7 Emergency Monitoring; Explicit Clinic Hours & Offline Hotline — *Accepted*
- **ADR-035:** 100% Persian-First (`fa-IR`) Semantic RTL, Jalali Calendar Default, Vazirmatn Typography, Centralized Rebrandable App Name (`APP_BRAND_NAME_FA` / `APP_BRAND_NAME_EN`, Flutter `BinaBrand`, Web `VITE_APP_BRAND_NAME_FA` — never hardcode `بینا` in UI/SMS/PDF strings; if rebranding later, also replace raster wordmark `A02`) & WCAG 2.2 AA Accessibility *(Patient App visual baseline specified in `ADR-054`; Staff Web desktop visual baseline specified in `ADR-055`)* — *Accepted*
- **ADR-036:** Retention Policy-as-Code by Data Class — *Accepted*
- **ADR-039:** Canonical Domain Event Taxonomy (`packages/event-schemas/`) — *Accepted*
- **ADR-040:** CI-Enforced Architectural & Dependency Boundaries — *Accepted*
- **ADR-043:** Eye-Laterality (`OD`/`OS`) Isolation & Immutable Prescription Versioning — *Accepted*
- **ADR-044:** Offline-First Patient Outbox with Idempotency Keys & Non-Smartphone `Print+Phone` Parity — *Accepted*

### Clinical AI, Local ML, Multimodal Specialists & Simplified Model Serving
- **ADR-011:** Deterministic Safety & Urgent-Floor Rules Never Overridden by ML/LLM — *Accepted*
- **ADR-012:** Statistical Baseline & Trend Engine Before Learned Home-Monitoring Risk Models — *Accepted*
- **ADR-013:** LLMs Draft Structured Persian Reports from Validated JSON Evidence Only; Mandatory Ophthalmologist HITL — *Accepted*
- **ADR-014:** LangGraph JS Strictly for Bounded Multi-Step Copilot Verification Flows — *Accepted*
- **ADR-017:** Explicit Supported-Device Qualification Registry for Pillar 1 R2 Home Testing — *Accepted*
- **ADR-018:** Isolated Flutter `clinical_renderer` Package Decoupled from OS Font Scale — *Accepted*
- **ADR-032:** ML Model Promotion Requires Shadow/Canary Evaluation & Clinician Feedback Tracking — *Accepted*
- **ADR-033:** Patient-Level, Clinic/Device-Level & Time-Level Holdout Splits Mandatory for All `ml/` Models — *Accepted*
- **ADR-037:** Multimodal Retinal, OCT, Anterior & Perimetry Imaging AI — *Status: **ACTIVATED** (Superseded from Deferred; Implemented via `ADR-050`..`053`)*
- **ADR-038:** Contrast Sensitivity & Color Vision Home Plugins — *Deferred in Flutter UI (`[X]` in `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md`); backend `008_r2_home_monitoring` schema keeps `'contrast'` in its pluggable `test_type` enum for forward extensibility*
- **ADR-046:** Switchable OpenAI-Compatible Small-LLM Gateway (`OpenRouter: thinkingmachines/inkling-2-mini` → Local Iranian vLLM/Ollama/llama.cpp via `.env` Only) with Persian Safety Validators & External PHI Scrubbing — *Accepted*
- **ADR-047: Kaggle Remote GPU (`T4 x2`) Model Training & Evaluation + Lightweight ONNX Artifact Gathering (`ml/`)** — *Accepted*
  - *Context:* Our development server has zero GPU, `~12 GiB` free disk, and `~3 GiB` free RAM, making local vision/OCT/segmentation training impossible.
  - *Decision:* Author all training, leakage-split (`ADR-033`), evaluation, and `ONNX` export pipelines in `ml/`, verify via local CPU smoke tests, and execute **full GPU training & held-out test evaluation remotely via private Kaggle GPU kernels (`kaggle kernels push` using `nvidiaTeslaT4` / `T4 x2` and `~/.kaggle/access_token`)**. Heavy raw datasets and intermediate PyTorch checkpoints are discarded inside `/kaggle/working`; **only final quantized/lightweight `ONNX` (or GBDT) models, `metrics.json`, and Model Cards are gathered back onto this host (`kaggle kernels output` -> `ml/registry/artifacts/`)** and verified locally under `apps/ai-engine/` (`onnx_cpu`). Strict privacy gate: **never upload un-anonymized PHI or raw DICOM `0010,*` tags to Kaggle**; Kaggle runs exclusively on public seed datasets and `ADR-053`-anonymized snapshots, while hospital-restricted Iranian `D5` fine-tuning runs on an in-country GPU node later.

- **ADR-050: Simple Pluggable Single-Container AI Engine Now (`apps/ai-engine/`), Independently Scalable to GPU/Triton Microservices Later** — *Status: Accepted*
  - *Context:* Managing 6–8 separate deep-learning microservices on Day 1 overwhelms a 2-person team and cannot run on our constrained dev server (`~12 GiB` free disk, `~3 GiB` free RAM, no GPU).
  - *Decision:* Implement `apps/ai-engine/` as **one clean, container-first Python FastAPI + Redis Queue Worker service** hosting all 6 layers behind strict OCP plugin interfaces (`ModalityRouterPort`, `QualityControlGatePort`, `SpecialistModelPlugin`, `FusionEnginePort`, `ExplainabilityPort`). Support `AI_ENGINE_MODE=cpu_stub` (fast deterministic fixture inference for dev server & Playwright E2E), `onnx_cpu` (executing the gathered Kaggle-trained lightweight `ONNX`/XGBoost models directly on CPU), and `gpu_full` (on dedicated GPU host). Because `apps/backend` communicates solely via async queue + OpenAPI contract, any specialist plugin can later be split into a standalone Triton/GPU microservice with **zero backend or frontend changes**.

- **ADR-051: Commercial-Safe Apache 2.0 Backbones (`DINOv2`/`SigLIP` & `MONAI`) Over Non-Commercial `RETFound`; Pixel Segmentation Masks Primary Over Auxiliary Grad-CAM** — *Status: Accepted*
  - *Context:* `RETFound` (and `VisionFM`/`EyeFM`) weights carry `CC BY-NC 4.0` non-commercial restrictions, creating commercial legal exposure. Additionally, Grad-CAM suffers low spatial resolution ($16\times16$ upsampling blur) and confounder artifacts in fine retinal structures.
  - *Decision:* Standardize commercial specialist vision backbones on **Apache 2.0** `Meta DINOv2/DINOv3` or `SigLIP` fine-tuned locally on Bina's curated/public+Iranian datasets (keeping an optional swappable `FoundationBackbonePort` adapter for `RETFound` strictly behind a `research_only` flag), and use **`MONAI`/`U-Net`/`SegFormer` pixel-level segmentation masks** as primary clinical explainability overlays with Grad-CAM/Attention maps labeled strictly as auxiliary classification hints.

- **ADR-052: Masked Multimodal Late-Fusion Differential Engine & Deterministic 3-Tier Urgency Floor** — *Status: Accepted*
  - *Context:* Clinical visits frequently contain only a subset of modalities (e.g., Fundus + IOP without Visual Field, or OCT + Fundus without Topography), and high-risk acute eye emergencies cannot risk being smoothed down by probability averaging.
  - *Decision:* Implement Layer 3 Fusion as a **modality-masked late-fusion architecture** combining specialist probability vectors, extracted anatomical/functional biomarkers (`RNFL`, `C/D`, `IRF/SRF`, `VF MD`, `Kmax`, `IOP`, `HbA1c`), and clinical availability masks into calibrated differential diagnoses + cross-modality discordance flags. Layer 5 applies deterministic `clinical-rules` **Urgent-Floor Overrides** (guaranteeing `ارجاع فوری` for infectious keratitis, papilledema, retinal detachment, active CNV, severe ROP, or post-op red flags) before queuing for mandatory ophthalmologist HITL sign-off.

- **ADR-053: DICOM/FHIR Device Ingestion, Async Queue Orchestration & Automated De-Identification Pipeline** — *Status: Accepted*
  - *Context:* Iranian clinics operate heterogeneous ophthalmic imaging devices (Zeiss, Topcon, Heidelberg, Orbscan/Pentacam, Humphrey) and HIS platforms, while ML training requires strictly de-identified artifacts.
  - *Decision:* Isolate all DICOM (`DICOMweb`/`C-STORE` metadata parsing, `ImageLaterality` extraction, multi-frame B-scan unpacking) and FHIR (`ImagingStudy`, `Observation`, `DiagnosticReport`, `ServiceRequest`) logic inside `apps/backend/src/contexts/integrations/`. Raw diagnostic uploads persist encrypted in S3/MinIO, dispatch asynchronously to `apps/ai-engine` via Redis queue, and pass through an automated DICOM tag scrubber & pseudonymizer before entering `ml/datasets/`.

- **ADR-054: Patient App UI/UX Source of Truth — Bina Clinical Glass (`v2.1`: [BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md](file:///home/mahdi/projects/binaai/docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md), [docs/patient-app-ui-designs/](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/) & [docs/patient-app-visual-assets/](file:///home/mahdi/projects/binaai/docs/patient-app-visual-assets/))** — *Status: Accepted*
  - *Context:* `apps/patient-app` requires a single reference-locked visual identity (**Bina Clinical Glass**) uniting calm ophthalmology aesthetics (luminous ice-aqua canvas, frosted white/deep-teal surfaces, emerald iris artwork, mint/teal wave ribbons, floating 5-tab dock) with strict clinical safety, WCAG 2.2 AA accessibility, Light + Dark parity, offline outbox honesty, and isolated clinical stimuli.
  - *Decision:* Lock [docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md](file:///home/mahdi/projects/binaai/docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md) as the authoritative UI/UX specification for `apps/patient-app/`, paired with:
    - **9 Approved Light-Mode UI Reference Renders** ([docs/patient-app-ui-designs/](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/), 1122×1402 PNGs, SHA-256 verified against Appendix B; original archive [Bina-AI-UI-Designs.zip](file:///home/mahdi/projects/binaai/docs/Bina-AI-UI-Designs.zip)):
      - `V01` [01-Today.png](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/01-Today.png) (`/today` — R1 care; monitoring tiles gated)
      - `V02` [02-Care.png](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/02-Care.png) (`/care` — R1)
      - `V03` [03-Tests.png](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/03-Tests.png) (`/tests` — W4 qualified Landolt C/Amsler; IOP optional; VR VF preview only until approved)
      - `V04` [04-Results.png](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/04-Results.png) (`/results` — W3 signed summaries; numeric trend tiles gated)
      - `V05` [05-Combined-Report.png](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/05-Combined-Report.png) (`/results/:signedReportId` — signed patient-safe summary; raw metrics/PDF export gated)
      - `V06` [06-Medication-Detail.png](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/06-Medication-Detail.png) (`/care/medication/:medicationId` or `/care/dose/:doseId` — R1 with explicit eye/Rx version)
      - `V07` [07-VF-Detail.png](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/07-VF-Detail.png) (`/results/:signedReportId/vf` `[G]` — visual reference; raw VF maps gated)
      - `V08` [08-IOP-Detail.png](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/08-IOP-Detail.png) (`/results/iop` `[G]` — visual reference; partner `iCare HOME2` & approved chart required)
      - `V09` [09-My-Account.png](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/09-My-Account.png) (`/account` — R1 authorized capabilities)
      - *Unpictured screens & states (`V10` + `§9.1–§9.8` — Auth/OTP/Consent, Dose Recording/Receipts, Education Details, Offline SOS/Symptoms, Caregiver Invite/Switch/Revoked, Home Test Eligibility/Preflight/Landolt C/Amsler/Quality, Dark Mode, High Contrast, Offline/Error) MUST be built from the same Bina Clinical Glass tokens and wrappers in v2.1.*
    - **4 Canonical Standalone Visual Source Assets** ([docs/patient-app-visual-assets/](file:///home/mahdi/projects/binaai/docs/patient-app-visual-assets/), opaque RGB PNGs, SHA-256 verified against Appendix C; original archive [Bina-AI-Visual-Assets.zip](file:///home/mahdi/projects/binaai/docs/Bina-AI-Visual-Assets.zip)):
      - `A01` [teal_emerald_eye_in_flowing_waves.png](file:///home/mahdi/projects/binaai/docs/patient-app-visual-assets/teal_emerald_eye_in_flowing_waves.png) (`1254×1254` — shared emerald iris hero art)
      - `A02` [bina_ai_glossy_eye_logo.png](file:///home/mahdi/projects/binaai/docs/patient-app-visual-assets/bina_ai_glossy_eye_logo.png) (`1536×1024` — full glossy eye emblem + wordmark)
      - `A03` [serene_mint_wave_layers.png](file:///home/mahdi/projects/binaai/docs/patient-app-visual-assets/serene_mint_wave_layers.png) (`2172×724` — broad footer wave)
      - `A04` [minimal_mint_teal_wave_banner.png](file:///home/mahdi/projects/binaai/docs/patient-app-visual-assets/minimal_mint_teal_wave_banner.png) (`2172×724` — compact upper-left header wave; NEVER interchange with `A03`)
    - **Implementation Precedence & Key Rules:**
      1. `PRD.md`, `ADR.md`, OpenAPI contracts, and clinical rules override mockup demo content (`پایدار`, sample IOP/VF metrics, VR VF tile, unapproved PDF export); keep an isolated developer-only synthetic preview harness for `V01–V09` visual regression while production renders only authorized, safety-checked data.
      2. Derive Light & Dark runtime assets (`≤300 KB` target) from unmodified `A01–A04` into `apps/patient-app/assets/design/runtime/` via `BinaArtId` / `BinaArtResolver` (§4.4.1–4.4.4); exclude raw source PNGs from release bundles; suppress decorative art on SOS and active `clinical_renderer` screens.
      3. Enforce repository-first Flutter SDK/Material compatibility (§1.1), exact 5-tab `BinaFloatingDock` icons (`home`, `favorite`, `assignment_turned_in`, `insert_chart`, `person` in §3.1), RTL-correct right-aligned back arrows on detail screens with no back arrows on root tabs (§14.2), explicit `چشم راست`/`چشم چپ` isolation, and full §13.4/§14 QA acceptance.
      4. *Note on PRD/ADR Wave reconciliation:* `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` §2.1/§13.1 notes an earlier Wave 3/4 discrepancy between PRD and ADR; `docs/PRD.md` §1.2 is already reconciled to match `docs/ADR.md` §5 (**Wave 4** for R2 Home Monitoring).

- **ADR-055: Staff Web UI/UX & Clinical Design System Source of Truth — Bina Clinical Glass / Compact Desktop Workstation (`v2.0`: [BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md](file:///home/mahdi/projects/binaai/docs/BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md), [docs/staff-web-ui-designs/](file:///home/mahdi/projects/binaai/docs/staff-web-ui-designs/) & shared [docs/patient-app-visual-assets/](file:///home/mahdi/projects/binaai/docs/patient-app-visual-assets/))** — *Status: Accepted*
  - *Context:* `apps/staff-web` unites high-density clinician diagnostic worklists, neutral `#090D12` multimodal image/OCT/Fundus/topography/VF review, AI report HITL editing, post-cataract care/Rx operations, unified SLA triage, remote monitoring, clinic admin, and internal ops into a single desktop-first Persian RTL workbench sharing the **Bina Clinical Glass** identity with `apps/patient-app` (`ADR-054`) without sacrificing clinical density, fidelity, or safety.
  - *Decision:* Lock [docs/BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md](file:///home/mahdi/projects/binaai/docs/BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md) (Sections `0`–`14`, Appendices `A`–`B`: 13 modules `A`–`M` / 119 views & flows anchored on 20 desktop blueprints) as the authoritative UI/UX specification for `apps/staff-web/`, paired with:
    - **8 Extracted Desktop Reference Renders** ([docs/staff-web-ui-designs/](file:///home/mahdi/projects/binaai/docs/staff-web-ui-designs/), 8-bit RGB PNGs; original archive [Bina-AI-Staff-Web-Last-8-Designs.zip](file:///home/mahdi/projects/binaai/docs/Bina-AI-Staff-Web-Last-8-Designs.zip)):
      - `R07` [01-Clinical-Dashboard.png](file:///home/mahdi/projects/binaai/docs/staff-web-ui-designs/01-Clinical-Dashboard.png) (`1586×992`, SHA-256 `97ca157a…` — `A01` primary clinical dashboard: right light ice-aqua sidebar, compact `A04` wave header, 5 KPI cards, 12-col 3/5/4 mosaic)
      - `R08` [02-OCT-Analysis.png](file:///home/mahdi/projects/binaai/docs/staff-web-ui-designs/02-OCT-Analysis.png) (`1586×992`, SHA-256 `a66195aa…` — `C07` OCT/OCT-A workspace: neutral dark B-scan canvas, filmstrip, modality rail, independent layer mask controls, quantitative table, differential & review actions)
      - `R09` [03-Care-Operations.png](file:///home/mahdi/projects/binaai/docs/staff-web-ui-designs/03-Care-Operations.png) (`1586×992`, SHA-256 `08618468…` — `E01` care coordination dashboard: 5 KPIs, Jalali agenda/follow-ups, task filters, appointment queue, team workload & referral status)
      - `R10` [04-Remote-Monitoring.png](file:///home/mahdi/projects/binaai/docs/staff-web-ui-designs/04-Remote-Monitoring.png) (`1586×992`, SHA-256 `6faa7934…` — `D01/D02` remote monitoring workspace: optional deep-teal sidebar variant, patient list, dual OD/OS chronological `IOP` & `logMAR` trends, device quality & recent tests)
      - `R11` [05-Triage-and-Alerts.png](file:///home/mahdi/projects/binaai/docs/staff-web-ui-designs/05-Triage-and-Alerts.png) (`1586×992`, SHA-256 `5428f7ff…` — `F01/F02` triage split list/detail: queue table, SLA badges, selected patient inspector, Fundus/OCT evidence thumbnails, actions & audit trail; *translate English to Persian RTL and mirror shell*)
      - `R12` [06-Patient-360.png](file:///home/mahdi/projects/binaai/docs/staff-web-ui-designs/06-Patient-360.png) (`1587×991`, SHA-256 `f46cc91f…` — `B03` patient directory + Patient 360: identity strip, paired explicit `چشم راست (OD)` / `چشم چپ (OS)` cards, scoped clinical tabs, IOP trend, active drops & event timeline)
      - `R13` [07-Fundus-Analysis.png](file:///home/mahdi/projects/binaai/docs/staff-web-ui-designs/07-Fundus-Analysis.png) (`1586×992`, SHA-256 `559e4318…` — `C06/C11` Fundus & cross-modal workspace: modality availability rail with muted missing exams, dark Fundus viewport + optic disc/cup/vessel masks, biomarker/RNFL/VF cards & differential)
      - `R14` [08-Care-Operations-Alternative.png](file:///home/mahdi/projects/binaai/docs/staff-web-ui-designs/08-Care-Operations-Alternative.png) (`1586×992`, SHA-256 `a45bab20…` — `E01/E02` care queue table + Jalali calendar + lower 4-state adherence, referrals & alerts panels)
    - **Shared Canonical Visual Brand Assets (`A01–A04`):** Reuse unmodified masters from [docs/patient-app-visual-assets/](file:///home/mahdi/projects/binaai/docs/patient-app-visual-assets/) to derive desktop Light/Dark runtime assets under `apps/staff-web/src/assets/design/runtime/` (excluding raw source PNGs and reference screenshots from runtime bundles; strictly zero decorative artwork inside clinical image viewports or charts).
    - **Mandatory Global Normalization & Safety Rules (§0, §2.0, §6–§7, §10–§12):**
      1. *Precedence:* `PRD.md`, `ADR.md`, backend RBAC/ABAC/RLS, and OpenAPI contracts always override synthetic mockup text or clinical values (e.g., active CNV enforces deterministic `ارجاع فوری` floor instead of mock routine/2–6w follow-up; `05-Triage-and-Alerts.png` English 4-tier `Urgent/High/Routine` maps strictly to Persian 3-tier `ارجاع فوری` / `پیگیری ۳ تا ۶ ماه` / `عادی`; never ship mock patient names/IDs/diagnoses).
      2. *Global RTL Shell & Density:* Normalize ALL routes to **right-hand Persian RTL sidebar** (`184px` at `1440×900`, `196px` at `1600×1000`, `60px` collapsed rail; light ice-aqua `--sidebar` default, optional deep-teal global preference via `--nav-deep-*`), single canonical Appendix A Light/Dark CSS variable file (WCAG AA contrast checked), compact desktop density (`38px` table rows, `36px` controls, `84–96px` KPI strip, `26px` max KPI headline), and self-hosted `Vazirmatn` WOFF2 (zero external CDNs).
      3. *Clinical Viewer, Chart & Workflow Fidelity:* Theme-invariant `#090D12` diagnostic canvas (`--viewer-canvas`) with zero CSS filters/inversion; primary pixel segmentation masks independent from auxiliary Grad-CAM (Grad-CAM off by default and explicitly labeled `راهنمای توجه مدل — غیرقابل استفاده به‌جای سگمنتیشن دقیق`); chronological LTR x-axes with explicit units and null gaps (no smoothing or OD/OS mixing); hard-stop Layer-1 QC rejection; ophthalmologist-only Rx publish & report sign-off via `C13/C14`; zero PHI in URL query params, logs, or unapproved `localStorage`.
      4. *Contract-First Gap Audit, Gating & Verification:* Perform a route-by-route gap audit against `packages/contracts-openapi/openapi.yaml` before coding (§0 Rule 1); keep `[G]` capabilities (`D03` Home IOP, `D11` Home VR VF, `L07` Research, `L08` Billing Evidence) explicitly gated; render explicit demo banner (`محیط نمایشی — داده آزمایشی`) in MSW mock mode with zero silent fallback in live mode; maintain `<100 MB` Alpine container & `<200 kB` initial JS budget (lazy-loaded viewers/charts/PDF/admin); verify Light/Dark captures (`1440×900`, `1600×1000`, `1280×800`, `1920×1080`, `200%` zoom) and `Q01–Q30` + `axe-core` WCAG 2.2 AA under single-worker Playwright.

---

## 4. Core Relational Data Model (Unified Pillar 1 + Pillar 2 — 34 Tables Across Migrations `001`–`008`)

```text
schema_migrations (version PK, applied_at)
tenants (id, jurisdiction ['IR'], data_residency_region ['IR'], status)
 └─ clinics (id, tenant_id, name_fa, timezone, calendar_mode ['jalali'], staffed_hours_json, emergency_phone, dicom_ae_title)
     ├─ staff_memberships (id, tenant_id, clinic_id, user_id, role ['ophthalmologist'|'optometrist'|'technician'|'coordinator'|'admin'], mfa_verified_at, active)
     ├─ protocol_templates (id, tenant_id, clinic_id, protocol_type, version, schema_json, approved_by)
     ├─ patients (id, tenant_id, clinic_id, preferred_locale ['fa-IR'], access_mode ['app'|'caregiver'|'print_phone'], ml_training_consent_flag, phone_hash, phone_masked, full_name_fa)
     │   ├─ otp_challenges, consent_acceptances & caregiver_grants (active, revoked_at)
     │   ├─ [Pillar 1] care_episodes (id, tenant_id, clinic_id, patient_id, protocol_type, eye_laterality ['OD'|'OS'], surgeon_id, access_mode, active_prescription_version, anchor_at, status)
     │   │   ├─ prescription_versions (immutable trigger) -> medication_adherence_events (idempotency_key)
     │   │   └─ symptom_reports (red flags, urgency_tier, signals_json, idempotency_key)
     │   ├─ [P1-R2] calibration_profiles -> home_vision_tests (eye_laterality, test_type, va_logmar, amsler_*, sensor QC)
     │   │   ├─ vision_baselines & vision_trend_alerts (ewma_value, cusum_value, triage_case_id)
     │   │   └─ external_tonometry_readings (device_vendor ['iCare_HOME2'], eye_laterality, iop_mm_hg, quality_score, accepted)
     │   │   *Note (W4 raw trials): per ADR-008 & BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md §10.2, add per-trial raw psychophysics/Amsler storage when T-B21/T-B22 is wired.*
     │   ├─ [Pillar 2] diagnostic_studies (id, tenant_id, clinic_id, patient_id, eye_laterality ['OD'|'OS'|'OU'], clinical_context_json, labs_json, status ['ingested'|'qc_failed'|'queued'|'analyzed'|'pending_hitl'|'signed_off'])
     │   │   ├─ study_assets (id, tenant_id, study_id, declared_modality, detected_modality, declared_eye, qc_status ['pass'|'reject'], qc_reasons_json, s3_object_key, dicom_meta_json, sha256)
     │   │   ├─ ai_inference_jobs (id, tenant_id, study_id, engine_mode, model_versions_json, status, started_at, completed_at, error_code)
     │   │   ├─ specialist_outputs (id, tenant_id, job_id, specialist_id ['fundus'|'oct'|'anterior'|'visual_field'|'tabular_xgb'], eye_laterality, predictions_json, biomarkers_json, mask_s3_key, gradcam_s3_key)
     │   │   ├─ fusion_assessments (id, tenant_id, job_id, eye_laterality, available_modalities_json, missing_modalities_json, differential_json, discordance_flags_json, raw_urgency, final_urgency ['routine'|'followup_3_6m'|'urgent'])
     │   │   ├─ ai_report_drafts (id, tenant_id, study_id, model_provider, model_id, prompt_version, evidence_ids_json, persian_report_json, validation_status)
     │   │   └─ clinician_signoffs (id, tenant_id, study_id, ophthalmologist_id, action ['approved'|'edited_approved'|'rejected'], final_differential_json, final_urgency, final_persian_report, override_reason_fa, signed_at)
     │   ├─ triage_cases (Unified Pillar 1 + Pillar 2 SLA Queue: status, urgency_tier, owner_id, sla_due_at) -> triage_triggers, contact_logs, referrals
     │   └─ report_versions (Deterministic Vazirmatn Persian PDFs + source_sha256 + pdf_sha256)
     ├─ notification_deliveries & workflow_executions (durable workflow state)
     └─ audit_logs (immutable trigger) & outbox_events (transactional outbox)
```

---

## 5. Complete Two-Person Non-Blocking Implementation Plan (`Track A` vs. `Track B`)

### 5.1 Zero-Blocking Parallel Execution Overview

| Wave | Engineer A (`Track A`: Backend + AI Engine + Local ML + DICOM/FHIR + Process/Security Tests) | Engineer B (`Track B`: Flutter Patient App [`BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` — `ADR-054`] + Unified Staff Web [`BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md` — `ADR-055`] + Playwright E2E) | Sync Checkpoint |
|---|---|---|---|
| **Wave 0** *(Foundation & Contracts)* | `T-A01..A05`: Monorepo, `check-resources.sh`, Docker Compose, OpenAPI v1 (P1+P2) + Prism Mock, Backend + `ai-engine` simple container skeletons | `T-B01..B03`: Persian `fa-IR` clinical fixtures & i18n catalog, Flutter scaffold (`ADR-054` Bina Clinical Glass + `A01–A04` runtime asset pipeline + self-hosted Web), Staff Web container scaffold (`ADR-055` Appendix A tokens, design primitives + MSW mock mode) | **`SYNC-0`:** Contracts frozen; Track B builds 100% independently against mocks |
| **Wave 1** *(Pillar 1 Core + Pillar 2 Pipeline Skeleton)* | `T-A06..A15`: Postgres RLS, Outbox, Durable Workflows, `+98` Auth/Caregiver, `OD`/`OS` Episodes & Rx, Unified Triage Queue, Study Ingestion, Async Queue -> `ai-engine` (`cpu_stub` Layers 1–4), Persian PDF & Backend Container | `T-B04..B13`: Flutter **Bina Clinical Glass** Design System (`V01–V09` + `V10`/`§9.1–9.8`), Offline Outbox, Staff Web Care-Ops UIs per `ADR-055` (`A01–A05`, `B01–B12`, `E01–E12`, `F01–F08`, `G01–G06`, `H01–H07`, `I01–I04`, `J01–J10`, `L01–L08`, `M01–M11` + `01/03/05/06/08` renders) | **`SYNC-1`:** Pillar 1 live wiring & container integration (reconcile OpenAPI gaps before live wire) |
| **Wave 2** *(Pillar 2 Diagnostic Workstation + Pillar 1 E2E)* | `T-A16..A20`: Pillar 1 Security/RLS + Process Suites; **Kaggle GPU train/test + `ONNX` gather** for **Layer 1 Router/QC**, **Layer 2 Fundus (`DINOv2`) + OCT (`MONAI`) + Tabular (`XGBoost`)** & `ai-engine` `onnx_cpu` wiring; **Switchable Small-LLM Persian Report (`inkling-2-mini` → local)** + validators | `T-B14..B17`: Pillar 1 Playwright E2E + WCAG 2.2 AA audit (`Q01–Q30`); **Staff Web Diagnostic Workstation** per `ADR-055` (`C01–C07`, `C10`, `C12–C17` + `02-OCT-Analysis.png`/`07-Fundus-Analysis.png`: upload/QC hard stop, neutral `#090D12` Mask & Auxiliary Grad-CAM viewer, Differential & Persian Report HITL sign-off) | **`SYNC-2`:** Full Pillar 1 Pilot Gate + Pillar 2 Retinal/OCT Diagnostic E2E |
| **Wave 3** *(Pillar 2 Full Specialists, Fusion & DICOM/FHIR)* | `T-A21..A25`: **Kaggle GPU train/test + `ONNX` gather** for **Anterior/Topography** (`Keratoconus`, `Cataract`, `Keratitis`, `Pterygium`) & **Visual Field** (`UWHVF`/`GRAPE`); **Layer 3 Masked Fusion Engine** + Deterministic Urgent-Floor; **DICOMweb/C-STORE + Anonymizer + FHIR** adapters; **Pillar 2 Process & Security Suites** | `T-B18..B20`: Staff Web Anterior/Topography (`C08`), Visual Field (`C09`), Fusion Discordance (`C11`) & Integrations (`K01–K07`) per `ADR-055`; Flutter Patient Signed Diagnostic Summary viewer (`V04/V05` + `RES-01..06` in `ADR-054`); **Pillar 2 Multimodal Diagnostic Playwright E2E** (QC reject -> good study -> masks/Grad-CAM -> Persian LLM report -> Urgent HITL sign-off) | **`SYNC-3`:** Full 6-Layer Multimodal Diagnostic Platform E2E Verified |
| **Wave 4** *(Pillar 1 R2 Home Vision + Local NLP + Marketing)* | `T-A26..A28`: R2 Home Monitoring (`contexts/r2-monitoring/`: Device Calibration, Quality, Baselines, Statistical Trends); Kaggle GPU train/test + `ONNX` gather for Persian Symptom NLP (`ParsBERT` on anonymized `D1`) & Sensor/Risk Models (`D2`/`D3`); Optional Home IOP (`HOME2`)/Research mode | `T-B21..B23`: Flutter `clinical_renderer` (Landolt C/Amsler), Native Sensor Preflight + Web Lab Adapter, Best-PEST VA flow (`V03/V07/V08` + `TEST-01..18` in `ADR-054`), Staff Web Remote Monitoring & Longitudinal Home-Vision Timeline (`D01–D12` + `04-Remote-Monitoring.png` in `ADR-055`), Astro 7.4+ Persian Marketing Site | **`SYNC-4`:** Complete Unified Platform Regression & Local-LLM Swap Verification |

---

### 5.2 Detailed Tasks — Wave 0: Shared Contracts, Resource Guards & Scaffolds

| Task ID | Owner | Title & Scope | Target Paths | Deps | Verification & Acceptance |
|---|---|---|---|---|---|
| `T-A01` | **Eng A** | **Monorepo Tooling, RAM+Disk Guard & Env Setup** (`pnpm`, root TS, `.dockerignore`, `check-resources.sh` checking `free -m`, `df -h /`, `docker system df`, `.env` defaults for `IR`/`fa-IR`/`Jalali`, OpenRouter `inkling-2-mini`, `AI_ENGINE_MODE=cpu_stub`) | `/package.json`, `/infra/scripts/check-resources.sh`, `/.dockerignore`, `/.env.example` | None | `check-resources.sh` enforces RAM & disk thresholds cleanly |
| `T-A02` | **Eng A** | **Profiled Container Infra + CI Architectural/RLS Guards** (`docker-compose*.yml` with `postgres:16-alpine`, `redis:7-alpine`, lightweight Temporal+Postgres, `minio`, `mem_limit`, `10m×2` logs + `check-architecture.mjs` + `check-rls-migrations.mjs`) | `/infra/docker-compose*.yml`, `/infra/scripts/` | `T-A01` | Postgres & Redis start cleanly within limits; negative import & missing-RLS fixtures fail CI |
| `T-A03` | **Eng A** | **Canonical OpenAPI 3.1 Contract (Pillar 1 + Pillar 2 Diagnostic Studies & AI Engine) + Event Schemas + Prism Mock** *(Note: sync Track A post-W1 routes — `step-up`, `r2/*`, `icare-home2`, `reports`, `fhir`, `dicom/ingest` & `PatientOtpVerify` fields — into `openapi.yaml` before Track B live integration)* | `/packages/contracts-openapi/`, `/packages/event-schemas/` | `T-A01` | OpenAPI lint passes; TS, Dart & Python Pydantic DTOs generate cleanly; Prism serves mock endpoints |
| `T-A04` | **Eng A** | **Backend Modular Monolith Skeleton (`Dockerfile <250MB`) & Domain Kernel Ports** (`CareProtocolPlugin`, `ClinicalSignalEvaluator`, `DiagnosticInferenceGatewayPort`, `StructuredLanguageModel`) | `/apps/backend/`, `/apps/backend/Dockerfile` | `T-A01`, `T-A03` | Health check, kernel tests & Alpine container build pass |
| `T-A05` | **Eng A** | **Simple Pluggable AI Engine Skeleton (`apps/ai-engine/`, `Dockerfile`, `cpu_stub` Mode)** (FastAPI + Redis queue worker + OCP plugin registry for Router/QC, 5 Specialists, Fusion & Explainability returning deterministic stub outputs + sample masks) | `/apps/ai-engine/`, `/apps/ai-engine/Dockerfile` | `T-A01`, `T-A03` | Container boots in `cpu_stub` mode on dev host; `/health` & `/v1/analyze-study` contract tests pass |
| `T-B01` | **Eng B** | **Golden Clinical Fixtures (Pillar 1 + Pillar 2 Sample Studies/Masks/Differentials) & 100% Persian `fa-IR` i18n Catalog** (Iranian cataract drugs, 3-tier urgency Persian copy, QC rejection messages, Jalali utilities, UI lexicon aligned with `docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md`) | `/packages/clinical-fixtures/`, `/packages/i18n-catalog/` | None | Schema validation, RTL bidi-isolation & 100% `fa-IR` coverage checks pass |
| `T-B02` | **Eng B** | **Flutter Patient App Scaffold, `A01–A04` Runtime Asset Pipeline & Self-Hosted Web Verification** (Per `docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` §§1, 3, 4.4, 12, 14: verify Appendix C SHA-256 of `docs/patient-app-visual-assets/`, generate Light/Dark derivatives into `assets/design/runtime/`, self-hosted Vazirmatn + CanvasKit, `fa-IR` RTL, mock/live OpenAPI toggle, isolated 412×824 visual preview harness) | `/apps/patient-app/` | `T-B01` | `flutter analyze`, `flutter test --concurrency=1`, `flutter build web` pass with zero external CDN calls; source PNGs excluded from release bundle |
| `T-B03` | **Eng B** | **Unified Staff Web Container-First Scaffold (`React Router v8 + React 19` + `Dockerfile <100MB`) + Appendix A Light/Dark Tokens + MSW Mock Harness** (Per `docs/BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md` §§0, 2–4, 10 & `docs/staff-web-ui-designs/`: route/contract gap report, `A01–A04` desktop runtime derivatives, self-hosted `Vazirmatn`, explicit demo badge) | `/apps/staff-web/`, `/apps/staff-web/Dockerfile` | `T-B01` | Vite build & Docker container build (`<100MB`, `<200 kB` initial JS) pass; mocked Pillar 1 & Pillar 2 routes render in `fa-IR` RTL with zero external CDN |

*`SYNC-0`:* Generated DTOs from `T-A03` shared with Track B; both engineers run completely unblocked from here.

---

### 5.3 Detailed Tasks — Wave 1: Pillar 1 Core Platform + Pillar 2 Async Diagnostic Pipeline

#### Track A (`Eng A`)
| Task ID | Title & Scope | Target Paths | Deps | Acceptance & Verification |
|---|---|---|---|---|
| `T-A06` | **Postgres RLS Transaction Wrapper, Audit Log, Transactional Outbox & PHI-Redacted OTel** | `/apps/backend/src/packages/db/`, `observability/`, `contexts/audit-compliance/` | `T-A02`, `T-A04` | Cross-tenant negative Postgres test returns 0 rows; rollback reverts outbox atomically |
| `T-A07` | **Tenancy (Iran `IR`/`fa-IR`/Jalali/Workweek), Staff Auth (OIDC/MFA/Step-Up/Break-Glass) & ABAC** | `/apps/backend/src/contexts/tenancy/`, `identity-access/`, `packages/authz/` | `T-A06` | Role boundaries, ophthalmologist-only sign-off/Rx permissions, and break-glass audit pass |
| `T-A08` | **Patient `+98` OTP Enrollment, Persian Consent & Instant Caregiver Revocation** | `/apps/backend/src/contexts/enrollment-consent/` | `T-A07` | Expired/replayed OTP rejected; revoked caregiver returns `403` immediately |
| `T-A09` | **Domestic Iranian SMS Notification Port (PHI-Free UCS-2 Guard) & Durable Workflow Worker Host** | `/apps/backend/src/contexts/notifications/`, `apps/worker/` | `T-A06` | SMS guard rejects drug/diagnosis PHI; workflow runtime passes crash/resume |
| `T-A10` | **Pure `clinical-rules` Package** (Post-cataract taper/red-flag rules + **Pillar 2 3-Tier Deterministic Urgent-Floor Rules** for infectious keratitis, papilledema, RD, active CNV, ROP) | `/apps/backend/src/packages/clinical-rules/` | `T-A04`, `T-B01` | 100% golden fixture pass; zero LLM/HTTP/vendor imports verified by CI |
| `T-A11` | **Pillar 1 `care-episodes` (`OD`/`OS` Isolation, Rx Versioning `v1..vN`, 4-State Idempotent Adherence) & `symptoms`** | `/apps/backend/src/contexts/protocols/`, `care-episodes/`, `symptoms/` | `T-A08`, `T-A10` | Ambiguous eye blocked; `OS` Rx `v2` leaves `OD` untouched; duplicate retry deduplicated |
| `T-A12` | **Unified Triage Operations (`P1` Care-Ops + `P2` 3-Tier Urgency Queue, Shift Handoff, Closed-Loop Referrals) & SLA Workflows** | `/apps/backend/src/contexts/triage-operations/`, `apps/worker/` | `T-A09`, `T-A11` | Time-skipping workflow tests verify 48h check, SLA escalation, urgent routing & shift handoff |
| `T-A13` | **Pillar 2 `diagnostic-studies` Context & Async Queue Bridge to `apps/ai-engine`** (Encrypted S3/MinIO upload, study/asset lifecycle, QC rejection handling, async job dispatch, Fusion & Specialist storage, Ophthalmologist HITL sign-off & override capture) | `/apps/backend/src/contexts/diagnostic-studies/` | `T-A05`, `T-A10`, `T-A12` | End-to-end backend+`ai-engine(cpu_stub)` test: bad QC rejected; valid study produces differential, masks, urgency & HITL sign-off |
| `T-A14` | **Deterministic Persian RTL PDF Reporting (`Vazirmatn` Shaping)** (Large-print patient schedule, post-op closure summary, signed multimodal diagnostic report + `source_sha256`) | `/apps/backend/src/contexts/reporting/` | `T-A11`, `T-A13` | Snapshot, hash & Persian glyph shaping tests pass |
| `T-A15` | **Live Fastify OpenAPI Composition Root & Containerized Backend + AI Engine Integration Check** | `/apps/backend/src/apps/api/`, `infra/docker-compose.yml` | `T-A07`..`T-A14` | All OpenAPI endpoints pass contract tests; Dockerized `backend` + `ai-engine` + `postgres` + `redis` pass health within RAM/disk caps |

#### Track B (`Eng B` — 100% Parallel via Mock/MSW; Patient App UI/UX MUST follow `docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md`)
| Task ID | Title & Scope | Target Paths | Deps | Acceptance & Verification |
|---|---|---|---|---|
| `T-B04` | **Flutter Bina Clinical Glass Design System (`design_system`)** (Exact §4.3 Light/Dark tokens, G01–G08 recipes, `BinaCanvas`, `BinaSurface`, `BinaHero`, `BinaFloatingDock`, `BinaGradientButton`, `BinaArtResolver`, Vazirmatn scale, >=48dp, WCAG AA per `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` §§4–8) | `/apps/patient-app/packages/design_system/` | `T-B02` | Appendix A contrast, Light/Dark/High-Contrast goldens, >=48dp, 200% `TextScaler`, RTL, bidi & semantics tests pass |
| `T-B05` | **Flutter Encrypted Offline Store, Platform Sensor Ports & Idempotent Outbox Coordinator** (Per `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` §11.4 & `ACC-07`/`SYS-*`) | `/apps/patient-app/packages/offline_store/`, `device_sensors/`, `lib/core/` | `T-B02` | Outbox survives simulated restart; honest `در انتظار ارسال` vs `ارسال شد` state; Flutter Web compiles cleanly |
| `T-B06` | **Flutter `+98` OTP Onboarding, Persian Consent, Accessibility Setup & Account Shell** (`V09` + `V10` + `AUTH-01..10`, `ACC-01..10`, `SYS-01..08` in `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md`) | `/apps/patient-app/lib/features/auth_onboarding/`, `lib/shared/` | `T-B04`, `T-B05` | Side-by-side `09-My-Account.png` Light/Dark review + OTP/consent/state-matrix widget & Web tests pass |
| `T-B07` | **Flutter Eye-Separated "Today" & Care Plan (`چشم راست`/`چشم چپ`), 4-State Adherence & Local Notification Port** (`V01`, `V02`, `V06` + `CARE-01..13` in `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md`) | `/apps/patient-app/lib/features/care_plan/` | `T-B04`, `T-B05` | Side-by-side `01-Today.png`/`02-Care.png`/`06-Medication-Detail.png` review; dual-surgery test proves `OS` `v2` leaves `OD` cards & reminders untouched |
| `T-B08` | **Flutter Persian Education, 100% Offline Red-Flag Hotline (`symptoms_sos`) & Caregiver Companion UI** (`EDU-01..04`, `SOS-01..09`, `CG-01..09` in `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md`; zero decorative art in SOS) | `/apps/patient-app/lib/features/education/`, `symptoms_sos/`, `caregiver/` | `T-B04`, `T-B05` | Offline check displays clinic hotline immediately; revoked caregiver fails closed & clears cache |
| `T-B09` | **Staff Web Core Shell, OIDC/MFA Auth, 100% Persian RTL, Jalali Dates, Overview (`A01–A05`) & Patient 360 (`B01–B12`)** (Per `BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md` & `01-Clinical-Dashboard.png` / `06-Patient-360.png`) | `/apps/staff-web/src/core/`, `src/app/`, `src/features/overview/`, `patients/`, `settings/` | `T-B03` | Route guard, right-hand RTL sidebar, Light/Dark themes, keyboard nav, Jalali & zero external CDN tests pass |
| `T-B10` | **Staff Web Surgical Enrollment, Care Dashboard (`E01–E12`), `Print+Phone` Parity & Eye-Specific Rx Builder (`v1 -> v2` Diff)** (Per `BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md` & `03-Care-Operations.png` / `08-Care-Operations-Alternative.png`) | `/apps/staff-web/src/features/episodes/` | `T-B09` | Ambiguous eye blocked; non-clinician blocked from Rx publish; `Print+Phone` triggers PDF/outreach |
| `T-B11` | **Staff Web Unified Triage Worklist (`F01–F08`, 3-Tier Urgency), Shift Handoff, Outage Log & Referral Tracker (`G01–G06`)** (Per `BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md` & Persian RTL normalization of `05-Triage-and-Alerts.png`) | `/apps/staff-web/src/features/triage/`, `referrals/` | `T-B09` | SLA timers, claim lock, shift handoff & referral outcome tests pass; exact 3 PRD urgency tiers enforced |
| `T-B12` | **Staff Web Admin Console (`J01–J10`), Pilot Scorecard Dashboard (`I01–I04`), Reports (`H01–H07`) & Audited Break-Glass Console (`L01–L08`)** (Per `BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md`) | `/apps/staff-web/src/features/reporting/`, `admin/`, `ops_console/` | `T-B09` | Scorecard matches PRD formulas; break-glass enforces reason; `[G]` research/billing routes gated |
| `T-B13` | **Staff Web Container Verification (`<100MB`, `<200 kB` initial JS) & Flutter Web Build Gate** | `/apps/staff-web/Dockerfile`, `/apps/patient-app/` | `T-B06`..`T-B12` | Both compile and run cleanly within server RAM/disk budgets; Light/Dark captures pass `ADR-054`/`ADR-055` density checks |

*`SYNC-1`:* Point `staff-web` & `patient-app` (Flutter Web) to live containerized `backend` (`T-A15`); reconcile patient-app API gaps (`openapi.yaml` OTP fields, caregiver grant listing/accept, episodes/education reads) between Track A & Track B.

---

### 5.4 Detailed Tasks — Wave 2: Pillar 1 E2E + Pillar 2 Diagnostic Workstation, Core Specialists & Persian LLM Reporting

| Task ID | Owner | Title & Scope | Target Paths | Deps | Verification & Acceptance |
|---|---|---|---|---|---|
| `T-A16` | **Eng A** | **Pillar 1 Security (RLS, Revocation, SMS PHI) & Full Business-Process Suites** (`OD`/`OS` dual surgery, offline retry dedup, SLA/shift handoff, `Print+Phone`) | `/tests/security/`, `/tests/process/` | `T-A15` | 100% pass against real Postgres + workflow runtime |
| `T-A17` | **Eng A** | **ML Workspace (`ml/`), Public Dataset Loaders, Kaggle GPU Runner (`ml/kaggle`) & Anonymized `D1`/`D5` Splitters** (`uv`, patient/clinic/time/device leakage verifier, loaders for EyePACS/APTOS/OCTDL/Orbscan/UWHVF/GRAPE, private `T4 x2` kernel templates) | `/ml/datasets/`, `/ml/evaluation/`, `/ml/kaggle/`, `/ml/pyproject.toml` | `T-A15` | Leakage check rejects any patient/eye overlap across splits; Kaggle push/output wrapper authenticated cleanly |
| `T-A18` | **Eng A** | **Layer 1 Real Models (`Modality Router` + `QC Gate`: Blur, Lighting, `OD`/`OS` Mismatch) — Kaggle GPU Train/Test + `ONNX` Gather** | `/ml/training/kernel1_l1_and_fundus/`, `/ml/registry/`, `/apps/ai-engine/src/bina_ai_engine/layer1_router_qc/` | `T-A17` | Trained & evaluated on Kaggle GPU; saved lightweight `ONNX` gathered to host; runs in `onnx_cpu` rejecting bad-quality & wrong-eye fixtures |
| `T-A19` | **Eng A** | **Layer 2 Core Specialists: Fundus (`DINOv2` Apache 2.0), OCT (`MONAI` Segmentation + Classifier) & Tabular (`XGBoost` + SHAP) — Kaggle GPU Train/Test + `ONNX` Gather** + Layer 4a Mask & Auxiliary Grad-CAM | `/ml/training/kernel1_l1_and_fundus/`, `kernel2_oct_ant_vf_tab/`, `/ml/registry/`, `/apps/ai-engine/src/bina_ai_engine/layer2_specialists/`, `layer4_explainability/` | `T-A18` | Kaggle `T4 x2` training & held-out test metrics pass; saved lightweight `ONNX`/GBDT artifacts gathered back to machine (`kaggle kernels output`); `onnx_cpu` schema & mask tests pass |
| `T-A20` | **Eng A** | **Layer 4b Switchable OpenAI-Compatible Persian Report Gateway (`OpenRouter: thinkingmachines/inkling-2-mini` → Local Iran Server) + Bounded LangGraph & Validators** | `/apps/backend/src/contexts/ai-copilot/` | `T-A15` | `.env`-only swap test passes (OpenRouter mock <-> local stub); `D4` eval rejects hallucinated/uncited/negation-flipped/`چشم راست`-swapped Persian drafts |
| `T-B14` | **Eng B** | **Pillar 1 Playwright E2E Suite (Containerized `backend` + `staff-web` + Flutter Web, `--workers=1`) & WCAG 2.2 AA `axe-core` Audit** | `/tests/e2e/`, `/tests/e2e/a11y/` | `SYNC-1` | All R1 Persian RTL + Jalali journeys pass with zero external CDN calls & zero critical a11y violations |
| `T-B15` | **Eng B** | **Staff Web Diagnostic Worklist (`C01`), Study Upload (`C02`) & Layer 1 QC Feedback UI (`C03/C04`)** (Per `BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md` §8.3: multi-modality dropzone/DICOM upload, explicit `OD`/`OS` tagging, instant Persian QC rejection banner & recapture prompt) | `/apps/staff-web/src/features/diagnostics/` | `T-B09` | Component + mock API tests verify QC rejection blocks progression and shows Persian guidance |
| `T-B16` | **Eng B** | **Staff Web Interactive Visual Explainability Viewer (`C05/C06/C07/C10/C12/C15`)** (Per `BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md` & `02-OCT-Analysis.png` / `07-Fundus-Analysis.png`: lazy-loaded theme-invariant `#090D12` canvas, toggleable **Pixel Segmentation Masks** with opacity sliders & fluid/RNFL measurements + separately labeled **Auxiliary Grad-CAM** toggle off by default) | `/apps/staff-web/src/features/diagnostics/` | `T-B15` | Canvas/overlay pixel alignment, contrast, & `<200 kB` initial JS budget preserved via lazy loading |
| `T-B17` | **Eng B** | **Staff Web Differential Diagnosis, Persian LLM Report Editor (`C13`) & 3-Tier Urgency HITL Sign-Off UI (`C14`, `H02/H05`)** (Per `BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md`: evidence citation click-highlighting, urgent-floor protection & override with mandatory reason, ophthalmologist digital sign-off, Vazirmatn PDF preview) | `/apps/staff-web/src/features/diagnostics/` | `T-B16` | Only ophthalmologist role can finalize sign-off; urgent floor cannot be downgraded; edits persist feedback payload |

*`SYNC-2`:* **Release 1 Pilot Launch Gate** + Wire Pillar 2 Diagnostic Workstation (`T-B15..B17`) to live `ai-engine` + Persian LLM (`T-A18..A20`).

---

### 5.5 Detailed Tasks — Wave 3: Full 6-Layer Specialists (Anterior/Topography, Visual Field), Multimodal Fusion & DICOM/FHIR

| Task ID | Owner | Title & Scope | Target Paths | Deps | Verification & Acceptance |
|---|---|---|---|---|---|
| `T-A21` | **Eng A** | **Layer 2 Anterior Segment & Topography Specialist** (`Keratoconus` Manifest/Subclinical/Forme Fruste from Orbscan/corneal maps + indices, `Cataract`, `Infectious Keratitis`, `Pterygium`) — Kaggle GPU Train/Test + `ONNX` Gather | `/ml/training/kernel2_oct_ant_vf_tab/`, `/ml/registry/`, `/apps/ai-engine/src/bina_ai_engine/layer2_specialists/anterior/` | `T-A17`, `T-A18` | Kaggle GPU evaluation passes; saved `ONNX` gathered to host; `onnx_cpu` plugin tests pass; keratitis triggers urgent signal |
| `T-A22` | **Eng A** | **Layer 2 Visual Field Progression Specialist** (HFA $8\times9$ `TD`/`PD`/`MD`/`PSD` longitudinal progression trained/tested on `UWHVF` + `GRAPE` via Kaggle GPU + `ONNX` Gather) | `/ml/training/kernel2_oct_ant_vf_tab/`, `/ml/registry/`, `/apps/ai-engine/src/bina_ai_engine/layer2_specialists/visual_field/` | `T-A17`, `T-A18` | Kaggle evaluation & gathered `ONNX`/GBDT spatial-temporal fast-progressor fixture tests pass |
| `T-A23` | **Eng A** | **Layer 3 Masked Multimodal Fusion Engine + Layer 5 Urgent-Floor Verification** (Kaggle-trained/tested Fusion + `GRAPE` benchmark -> gathered lightweight artifact fusing Fundus + OCT + OCT-A + Anterior + VF + Tabular XGBoost) | `/ml/training/`, `/ml/registry/`, `/apps/ai-engine/src/bina_ai_engine/layer3_fusion/` | `T-A19`, `T-A21`, `T-A22` | Tests prove 1-modality, 3-modality, and 6-modality inputs work gracefully on `onnx_cpu`; urgent floor never downgraded |
| `T-A24` | **Eng A** | **Layer 6 DICOMweb/C-STORE Ingestion, Automated DICOM PHI Anonymizer & FHIR R4/R5 Adapter** (`ImagingStudy`, `Observation`, `DiagnosticReport`, `ServiceRequest` + Iranian HIS export) | `/apps/backend/src/contexts/integrations/` | `T-A13`, `T-A14` | DICOM anonymizer strips all patient tags (`0010,*`); FHIR bundle contract tests pass |
| `T-A25` | **Eng A** | **Pillar 2 Full Diagnostic Business-Process & Security Test Suites** (DICOM ingest -> QC reject bad scan -> valid multi-modal set -> 5 specialists -> Fusion differential -> Urgent override -> Persian LLM report -> HITL sign-off -> Anonymized `D5` export) | `/tests/process/`, `/tests/security/` | `T-A23`, `T-A24` | 100% pass across `backend` + `ai-engine` + Postgres RLS + Redis |
| `T-B18` | **Eng B** | **Staff Web Anterior/Topography 4-Map View (`C08`), Visual Field Progression Chart (`C09`), Fusion Modality-Attribution / Discordance Panel (`C11`) & Device/DICOM/FHIR UI (`K01–K07`)** (Per `BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md` §6, §8.3, §8.11) | `/apps/staff-web/src/features/diagnostics/`, `integrations/` | `T-B17` | Displays missing-modality notices, cross-modal discordance alerts & longitudinal VF trend in Jalali with LTR axes |
| `T-B19` | **Eng B** | **Flutter Patient Signed Diagnostic Summary & Follow-Up Viewer** (`V04`, `V05` + `RES-01..06` per `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md`; patient-safe Persian summary released *only after* ophthalmologist sign-off, raw metrics/export gated) | `/apps/patient-app/lib/features/diagnostic_results/` | `T-B04`, `T-B05` | Side-by-side `04-Results.png`/`05-Combined-Report.png` preview; unsigned drafts never appear; signed instructions render offline |
| `T-B20` | **Eng B** | **Pillar 2 Multimodal Diagnostic Playwright E2E Suite (`--workers=1`)** (Technician uploads bad scan -> QC reject -> uploads valid Fundus+OCT+VF+Labs -> inspects masks & auxiliary Grad-CAM -> reviews Fusion differential & Persian LLM draft -> Ophthalmologist signs `ارجاع فوری` -> appears in triage queue & signed patient summary) | `/tests/e2e/` | `SYNC-2`, `T-B18`, `T-B19` | Full multi-actor diagnostic E2E passes against containerized stack within host RAM/disk caps |

*`SYNC-3`:* **Full 6-Layer Multimodal Clinical Platform E2E Verified.**

---

### 5.6 Detailed Tasks — Wave 4: Pillar 1 R2 Home Vision Monitoring, Local Persian Symptom NLP & Marketing Site

| Task ID | Owner | Title & Scope | Target Paths | Deps | Verification & Acceptance |
|---|---|---|---|---|---|
| `T-A26` | **Eng A** | **Pillar 1 R2 Backend Context (`r2-monitoring`: Calibration, Quality Preflight, Baselines & Statistical Trends + `008_r2_home_monitoring.sql`)** | `/apps/backend/src/contexts/r2-monitoring/`, `/apps/backend/src/packages/clinical-rules/r2-trend-rules.ts` | `T-A15` | Multi-session baseline, reliable-change/2-of-N/EWMA simulations pass; align raw per-trial immutable storage & OpenAPI paths before `T-B21` |
| `T-A27` | **Eng A** | **Persian Symptom NLP (`ParsBERT` on Anonymized `D1`) & Home Sensor/Longitudinal Risk Models (`D2`/`D3`) — Kaggle GPU Train/Test + `ONNX` Gather** | `/ml/training/kernel3_persian_nlp_r2_risk/`, `/ml/registry/`, `/apps/backend/src/contexts/symptoms/domain/persian-symptom-nlp.ts` | `T-A17`, `T-A26` | Kaggle held-out test achieves red-flag recall `>=99%`; patient/site/time holdout verifier passes; saved `ONNX` gathered to host |
| `T-A28` | **Eng A** | **Partner Home IOP (`iCare HOME2`), Optional Regional Billing Ledger & Research/CRO Mode** | `/apps/backend/src/contexts/integrations/`, `billing-evidence/`, `research/` | `T-A24` | Contract & SHA-manifest pseudonymized export tests pass |
| `T-B21` | **Eng B** | **Flutter `clinical_renderer` (Physical/Angular Landolt C & Amsler Canvas Isolated from App Theme/Scale/Art) & Native `device_sensors` (ARKit/MediaPipe/IMU/Lux + Web Adapter)** (Per `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` §10) | `/apps/patient-app/packages/clinical_renderer/`, `device_sensors/` | `T-B04`, `T-B05` | Golden pixel geometry immune to OS font scale/dark mode; 0 video frames uploaded; Web build green |
| `T-B22` | **Eng B** | **Flutter Best-PEST VA & Amsler UI + Staff Web Remote Monitoring & Longitudinal Home-Vision Timeline** (Flutter `V03`, gated `V07`/`V08` + `TEST-01..18` per `ADR-054`; Staff Web `D01–D12` + `04-Remote-Monitoring.png` per `ADR-055` with `D03`/`D11` gated) | `/apps/patient-app/lib/features/vision_testing/`, `/apps/staff-web/src/features/monitoring/` | `T-B21` | Side-by-side `03-Tests.png` / `04-Remote-Monitoring.png` (+ gated `07-VF-Detail.png`/`08-IOP-Detail.png` preview) & Staff Web timeline E2E pass |
| `T-B23` | **Eng B** | **Astro 7.4+ Container-First Persian Marketing & Evidence Site (`<50MB`)** | `/apps/marketing-site/`, `/apps/marketing-site/Dockerfile` | `T-B01` | Container build, `<80 kB` JS, `<1.8 s` LCP & `fa-IR` RTL pass |

*`SYNC-4`:* Full Unified Platform Regression (Pillar 1 + Pillar 2 + Local OpenAI-Compatible LLM `.env` Swap Verification).

---

## 6. Mandatory Definition of Done (DoD)
A task is **Done** ONLY when:
1. It respects bounded-context, SOLID (SRP/OCP), and PostgreSQL `FORCE ROW LEVEL SECURITY` CI checks (`check-architecture.mjs`, `check-rls-migrations.mjs`); any `apps/patient-app/` page, theme, or visual asset strictly adheres to `docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` (`ADR-054`, including §13.4 acceptance checklist & §14.1 visual regression matrix against `docs/patient-app-ui-designs/` and `docs/patient-app-visual-assets/`); and any `apps/staff-web/` page, token, clinical viewer, chart, or workflow strictly adheres to `docs/BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md` (`ADR-055`, including §0 agent contract, Appendix A Light/Dark tokens, §12.2 `Q01–Q30` safety matrix & §14.2 checklist against `docs/staff-web-ui-designs/`).
2. `AGENTS.md` **RAM (`free -m`) and Disk (`df -h /`, `docker system df`)** pre-flight guards passed prior to builds/tests, and all checks ran **after the final edit**.
3. Container-first `Dockerfile` builds and `docker compose` health checks pass within image-size, memory, and disk limits (`apps/backend`, `apps/ai-engine`, `apps/staff-web`, `apps/marketing-site`).
4. Unit, Postgres RLS, durable workflow, business-process (Pillar 1 + Pillar 2), and single-worker Playwright E2E tests (driving containerized `backend` + `ai-engine` + `staff-web` + Flutter Web `patient-app` in 100% `fa-IR` RTL + Jalali) pass with zero skipped assertions.
5. AI/ML tasks enforce commercial-safe backbones (`ADR-051`), Layer-1 QC rejection, deterministic urgent-floor non-downgrade, mandatory ophthalmologist HITL, external-LLM PHI scrubbing + `.env` OpenAI-compatible switchability (`ADR-046`), DICOM anonymization (`ADR-053`), patient/site/time holdout splits (`ADR-033`), and Kaggle remote GPU train/test runs (`ADR-047`) returning **only lightweight `ONNX`/tabular models + evaluation metrics** to this host (never raw PHI or giant PyTorch checkpoints).
