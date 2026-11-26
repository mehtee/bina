# Bina AI — Unified Iranian Ophthalmology Platform

> **100% Persian (`fa-IR`) User-Facing Experience · Jalali Calendar Default · In-Country Data Residency (`IR`) · Mandatory Ophthalmologist HITL**

Bina AI is a unified two-pillar Iranian ophthalmology platform built on a multi-tenant PostgreSQL `FORCE ROW LEVEL SECURITY` core:

1. **Pillar 1 — Patient Care-Operations & Calibrated Home Vision Monitoring (`R1` + `R2`):**
   * Eye-isolated (`OD` `چشم راست` / `OS` `چشم چپ`) post-cataract drop plans with immutable prescription versioning (`v1..vN`), 4-state idempotent offline adherence, 100% offline SOS hotline, revocable caregiver delegation (`<1s` `403`), non-smartphone `Print+Phone` parity, and clinic SLA triage workflows.
   * Release 2 (Wave 4) calibrated home functional vision monitoring (`Landolt C` via isolated `clinical_renderer`, `Amsler`, sensor preflight, EWMA/CUSUM/2-of-N statistical trend engine, optional `iCare HOME2` partner IOP).
2. **Pillar 2 — 6-Layer Multimodal Clinical Diagnostic & Triage AI Engine:**
   * Layer 1 Modality Router & QC Gate (`blur`, `lighting`, `OD`/`OS` laterality) -> Layer 2 5 Commercial-Safe Specialist Models (`Fundus [DINOv2 Apache 2.0]`, `OCT/OCT-A [MONAI/U-Net]`, `Anterior/Topography`, `Visual Field`, `Tabular XGBoost`) -> Layer 3 Masked Multimodal Fusion Engine -> Layer 4 Primary Pixel Segmentation Masks + Auxiliary Grad-CAM + `.env`-switchable Persian Structured Report LLM -> Layer 5 3-Tier Urgency Triage (`عادی` / `پیگیری ۳ تا ۶ ماه` / `ارجاع فوری`) with deterministic urgent-floor overrides & mandatory ophthalmologist HITL -> Layer 6 DICOMweb/C-STORE, PHI Anonymizer & FHIR R4/R5.

---

## Authoritative Documentation & Design Sources

| Document / Directory | Role & Scope |
| :--- | :--- |
| [AGENTS.md](file:///home/mahdi/projects/binaai/AGENTS.md) | Mandatory agent & engineering guardrails (low-RAM/low-disk preflight, Docker limits, Flutter Web verification, Kaggle GPU workflow, rebrandable brand config, E2E gates) |
| [docs/PRD.md](file:///home/mahdi/projects/binaai/docs/PRD.md) | Unified Product Requirements Document (`v3.0`, Waves 0–4, Pillar 1 + Pillar 2 requirements, datasets `D1–D5`, KPIs, hazards `HAZ-001..012`) |
| [docs/ADR.md](file:///home/mahdi/projects/binaai/docs/ADR.md) | Architecture Decision Records (`ADR-001`–`ADR-055`), monorepo topology, 34-table Postgres RLS schema, and 2-Track (`Track A` / `Track B`) task plan |
| [docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md](file:///home/mahdi/projects/binaai/docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md) | **Authoritative Flutter Patient App UI/UX Source of Truth (`v2.1` — Bina Clinical Glass):** Light + Dark color/gradient/shadow tokens, typography, geometry, floating dock, `V01–V09` reference specs, `V10` + §9.1–§9.8 unpictured routes, `A01–A04` asset derivative rules, isolated `clinical_renderer`, accessibility & QA checklists (`ADR-054`) |
| [docs/BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md](file:///home/mahdi/projects/binaai/docs/BINA_AI_STAFF_WEB_UI_UX_SPEC_V2.md) | **Authoritative Staff Web UI/UX & Clinical Design System Source of Truth (`v2.0` — Bina Clinical Glass Desktop):** 13 modules (`A`–`M`) / 119 views & flows, 20 anchor blueprints, Appendix A Light/Dark CSS tokens, neutral `#090D12` diagnostic viewer & chart contracts, `Q01–Q30` clinical safety matrix (`ADR-055`) |
| [docs/flutter_missing.md](file:///home/mahdi/projects/binaai/docs/flutter_missing.md) | Patient App gap closure inventory covering first-run onboarding, motion system, Web `localStorage` persistence, spec components, gated routes, and demo profile flags |
| [docs/patient-app-ui-designs/](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/) | 9 approved Light-mode Patient App reference renders (`01-Today.png` .. `09-My-Account.png`, 1122×1402 PNG; original archive: [Bina-AI-UI-Designs.zip](file:///home/mahdi/projects/binaai/docs/Bina-AI-UI-Designs.zip)) |
| [docs/patient-app-visual-assets/](file:///home/mahdi/projects/binaai/docs/patient-app-visual-assets/) | 4 canonical standalone raster visual sources shared across Patient App & Staff Web (`A01–A04`: iris, glossy eye logo, broad footer wave, compact header wave; original archive: [Bina-AI-Visual-Assets.zip](file:///home/mahdi/projects/binaai/docs/Bina-AI-Visual-Assets.zip)) |
| [docs/staff-web-ui-designs/](file:///home/mahdi/projects/binaai/docs/staff-web-ui-designs/) | 8 extracted desktop Staff Web reference renders (`01-Clinical-Dashboard.png` .. `08-Care-Operations-Alternative.png`, `1586×992` / `1587×991` PNG; original archive: [Bina-AI-Staff-Web-Last-8-Designs.zip](file:///home/mahdi/projects/binaai/docs/Bina-AI-Staff-Web-Last-8-Designs.zip)) |
| [docs/bina-ai-executive-summary-fa.md](file:///home/mahdi/projects/binaai/docs/bina-ai-executive-summary-fa.md) | Persian executive & technical summary of the unified platform and 51-task two-track roadmap |
| [docs/bina-ai-local-small-llm-distillation.md](file:///home/mahdi/projects/binaai/docs/bina-ai-local-small-llm-distillation.md) | Roadmap for distilling a local CPU-hostable `≤1.5B` Persian report LLM (`GGUF Q4_K_M`) |

---

## Monorepo Layout

```text
binaai/
├── AGENTS.md                         # Engineering, resource-safety & verification rules
├── README.md                         # This overview
├── .env.example                      # Config template (IR/fa-IR/Jalali, APP_BRAND_NAME_*, LLM, AI_ENGINE_MODE)
├── docs/                             # PRD, ADR, Patient App UI/UX v2.1 Spec, extracted UI designs & visual assets
├── packages/
│   ├── contracts-openapi/            # Canonical OpenAPI 3.1 contract + TS / Dart / Python generated DTOs + Prism mock
│   ├── event-schemas/                # Versioned domain & inference event JSON schemas
│   ├── i18n-catalog/                 # [Track B] 100% fa-IR lexicon + Jalali helpers
│   └── clinical-fixtures/            # [Track B] Golden P1 + P2 fixtures
├── apps/
│   ├── backend/                      # [Track A] Fastify 5 + TS Modular Monolith + Postgres RLS (34 tables) + PDFKit + LLM Gateway
│   ├── ai-engine/                    # [Track A] Pluggable Python FastAPI + Redis Worker 6-layer inference service (cpu_stub / onnx_cpu)
│   ├── patient-app/                  # [Track B] Flutter Patient & Caregiver App (Bina Clinical Glass v2.1; Android/iOS + self-hosted Web)
│   ├── staff-web/                    # [Track B] React Router v8 + React 19 Unified Care-Ops & Diagnostic HITL Workstation
│   └── marketing-site/               # [Track B — Staged] Astro 7.4+ Persian marketing site
├── ml/                               # [Track A] Kaggle GPU training kernels (T4 x2), leakage checks & gathered ONNX artifacts
├── infra/                            # Profiled Docker Compose, check-resources.sh, architecture & RLS CI linters
└── tests/                            # Pillar 1 & 2 business-process, RLS security & Playwright E2E suites
```

---

## Rebrandable App Name & Environment Configuration

Copy `.env.example` to `.env` (never commit `.env`). Product display names are centralized via:
* **Backend:** `APP_BRAND_NAME_FA` (default `بینا`) and `APP_BRAND_NAME_EN` (default `Bina AI`) via `apps/backend/src/packages/domain-kernel/brand.ts` and `config.ts`.
* **Flutter (`apps/patient-app`):** `BinaBrand.appNameFa` / `BinaBrand.appNameEn` (`--dart-define=APP_BRAND_NAME_FA=...`) passed via `{appName}` in `fa-IR` ARB templates (note: update `A02` raster wordmark if renaming the logo graphic).
* **Staff Web / Marketing:** `VITE_APP_BRAND_NAME_FA` / `PUBLIC_APP_BRAND_NAME_FA`.

---

## Resource-Safe Verification Commands

Always run the memory/disk preflight before builds, Docker commands, or tests (see [AGENTS.md](file:///home/mahdi/projects/binaai/AGENTS.md) §2):

```bash
bash infra/scripts/check-resources.sh
node infra/scripts/check-architecture.mjs
node infra/scripts/check-rls-migrations.mjs
(cd packages/contracts-openapi && node scripts/lint-openapi.mjs)
```

For `apps/backend` and `apps/ai-engine`:

```bash
export NODE_OPTIONS="--max-old-space-size=1024"
pnpm run typecheck:backend && pnpm run test:backend
pnpm run test:ai-engine
```

---

## Flutter Patient App (`apps/patient-app`)

Built around **Bina Clinical Glass (`v2.1`)** with modular workspace packages under `apps/patient-app/packages/`:
* `design_system`: Light/Dark/High-Contrast tokens, RTL typography, floating dock/rail (`BinaShellLayout`), motion helpers (`BinaMotion`, `BinaFadeSlideIn`, `BinaAnimatedScaleReveal`, `buildBinaRouteTransition`) with persistent OS & in-app `reduceMotion` support, plus spec components (`BinaStepHeader`, `showBinaBottomSheet`, `BinaPermissionPanel`, `BinaIOPChart`, `BinaVFMap`, `BinaTimeline`, `BinaVectorArt`).
* `offline_store`: Partitioned outbox & preference store with `localStorage` backing on Web (`app_prefs` always persisted; clinical payloads cached on Web only when `allowClinicalPayloads` is enabled in mock/demo mode).
* `device_sensors` & `clinical_renderer`: Isolated R2 preflight adapters and ISO 8596 `Landolt C` / `Amsler` renderers immune to Dark Theme inversion, RTL mirroring, outer `TextScaler`, and route/card animations.
* Key flows: interactive 4-slide RTL onboarding (`/onboarding`, replayable from Help), dual-eye (`چشم راست`/`چشم چپ`) drop plans & stale-Rx reminder guard (`CARE-13`), offline SOS (`/help/urgent`), caregiver delegation & revocation, education audio timer (`EDU-03`), signed reports & `RES-06` modal, baseline/paired `iCare HOME2` (`TEST-14`, `TEST-16..18`), and system gates (`AUTH-10`, `SYS-05`, `SYS-06`).

### Analyze & Test (Linux Host — No Native Android/iOS Builds)

```bash
bash infra/scripts/check-resources.sh
(cd apps/patient-app/packages/design_system && flutter analyze && flutter test --concurrency=1)
(cd apps/patient-app/packages/offline_store && dart analyze)
(cd apps/patient-app/packages/device_sensors && dart analyze)
(cd apps/patient-app/packages/clinical_renderer && dart analyze)
(cd apps/patient-app && flutter analyze && flutter test --concurrency=1)
```

### Self-Hosted Flutter Web Build & Nginx Deployment (`bina-flutter.mehtea.ir`)

Build a zero-CDN self-hosted Web bundle (`canvaskit/` + local `Vazirmatn` + `assets/design/runtime/` only):

```bash
# Full 5-tab demo bundle (onboarding + W3 Results + W4 Tests + Web Lab + V01–V09 preview)
(cd apps/patient-app && flutter build web --release --no-wasm-dry-run \
  --dart-define=BINA_DATA_MODE=mock \
  --dart-define=ENABLE_WAVE3_RESULTS=true \
  --dart-define=ENABLE_WAVE4_TESTS=true \
  --dart-define=ENABLE_WEB_LAB_MODE=true \
  --dart-define=ENABLE_ONBOARDING=true \
  --dart-define=ALLOW_DEMO_PREVIEW=true \
  --dart-define=ENABLE_PREVIEW_HARNESS=true)
```

Deploy or rebuild & sync to Nginx (`/var/www/bina-flutter.mehtea.ir` using [infra/nginx/bina-flutter.mehtea.ir.conf](infra/nginx/bina-flutter.mehtea.ir.conf)):

```bash
sudo bash infra/scripts/deploy-patient-web.sh --profile=demo          # sync prebuilt demo bundle
sudo bash infra/scripts/deploy-patient-web.sh --profile=demo --build  # check RAM/disk, rebuild, sync
sudo bash infra/scripts/deploy-patient-web.sh --profile=prod --build  # strict R1 production profile
```

---

## Exported ML Artifacts (`ml/registry/artifacts/`)

Trained Kaggle GPU (`T4 x2`) ONNX models, evaluation metrics (`metrics_kernel*.json`), model cards (`MODEL_CARD_KERNEL*.md`), and run logs are committed for offline verification in `onnx_cpu` / `cpu_stub` mode:
* **Kernel 1 (`kernel1/`):** `modality_router.onnx`, `qc_gate.onnx`, `fundus_dinov2.onnx`
* **Kernel 2 (`kernel2/`):** `oct_monai.onnx`, `anterior_vision.onnx`, `masked_fusion.onnx`, `visual_field_prog.onnx`, `tabular_diabetes.onnx`, `tabular_glaucoma.onnx`
* **Kernel 3 (`kernel3/`):** `persian_symptom_nlp.onnx`, `home_risk_r2.onnx`

