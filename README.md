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
| [docs/ADR.md](file:///home/mahdi/projects/binaai/docs/ADR.md) | Architecture Decision Records (`ADR-001`–`ADR-054`), monorepo topology, 34-table Postgres RLS schema, and 2-Track (`Track A` / `Track B`) task plan |
| [docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md](file:///home/mahdi/projects/binaai/docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md) | **Authoritative Flutter Patient App UI/UX Source of Truth (`v2.1` — Bina Clinical Glass):** Light + Dark color/gradient/shadow tokens, typography, geometry, floating dock, `V01–V09` reference specs, `V10` + §9.1–§9.8 unpictured routes, `A01–A04` asset derivative rules, isolated `clinical_renderer`, accessibility & QA checklists (`ADR-054`) |
| [docs/patient-app-ui-designs/](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/) | 9 approved Light-mode Patient App reference renders (`01-Today.png` .. `09-My-Account.png`, 1122×1402 PNG; original archive: [Bina-AI-UI-Designs.zip](file:///home/mahdi/projects/binaai/docs/Bina-AI-UI-Designs.zip)) |
| [docs/patient-app-visual-assets/](file:///home/mahdi/projects/binaai/docs/patient-app-visual-assets/) | 4 canonical standalone raster visual sources (`A01–A04`: iris, glossy eye logo, broad footer wave, compact header wave; original archive: [Bina-AI-Visual-Assets.zip](file:///home/mahdi/projects/binaai/docs/Bina-AI-Visual-Assets.zip)) |
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
