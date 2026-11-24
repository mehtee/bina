# Bina AI — Product Requirements Document (PRD v3.0 — Unified Care-Operations & 6-Layer Multimodal Ophthalmology AI Platform)

**Document Status:** Authoritative Unified Requirements Specification (Option 1 — Full Platform: Patient Care-Operations + 6-Layer Clinical Diagnostic & Triage AI Engine)  
**Date:** 23 November 2026  
**Target Market & Language:** **Islamic Republic of Iran (`IR`) — 100% Persian (`fa-IR`) User-Facing Experience** (Technical Docs & Source Code in English)  
**Regulatory Scope Note:** Formal regulatory clearance filings (IMED/MOHME/FDA/CE SaMD dossiers and ISO 13485 QMS audits) are **explicitly deferred / out-of-scope for the current engineering build**; however, core clinical engineering safety controls (mandatory ophthalmologist Human-in-the-Loop sign-off, explicit `OD`/`OS` laterality, deterministic urgent-triage floors, PHI encryption/anonymization, and zero-leakage ML evaluation) remain mandatory by design.  
**Synthesizes:**
- [bina-ai-product-architecture-blueprint.md](file:///home/mahdi/projects/binaai/docs/bina-ai-product-architecture-blueprint.md)
- [bina-ai-market-benchmark-15-products-and-gtm-strategy.md](file:///home/mahdi/projects/binaai/docs/bina-ai-market-benchmark-15-products-and-gtm-strategy.md)

**Companion Engineering & UI/UX Specifications:**
- [ADR.md](file:///home/mahdi/projects/binaai/docs/ADR.md) (`ADR-001`–`ADR-054` + 2-Track Wave 0–4 Implementation Plan)
- [BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md](file:///home/mahdi/projects/binaai/docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md) (Authoritative Flutter Patient App UI/UX Source of Truth — **Bina Clinical Glass** `v2.1`, Light & Dark themes, tokens, components, full screen inventory & QA gates)
- [docs/patient-app-ui-designs/](file:///home/mahdi/projects/binaai/docs/patient-app-ui-designs/) (9 approved Light-mode reference renders `01-Today.png`..`09-My-Account.png`, 1122×1402 PNGs; archive: [Bina-AI-UI-Designs.zip](file:///home/mahdi/projects/binaai/docs/Bina-AI-UI-Designs.zip))
- [docs/patient-app-visual-assets/](file:///home/mahdi/projects/binaai/docs/patient-app-visual-assets/) (4 canonical standalone visual source assets `A01`–`A04`: iris, glossy eye logo, broad footer wave, compact header wave; archive: [Bina-AI-Visual-Assets.zip](file:///home/mahdi/projects/binaai/docs/Bina-AI-Visual-Assets.zip))

---

## 1. Executive Vision & Unified Two-Pillar Platform Strategy

### 1.1 Product Definition
> **Bina AI is an end-to-end Iranian ophthalmology platform uniting two synergistic clinical pillars on one multi-tenant foundation:**
> 1. **Pillar 1 — Patient Care-Operations & Remote Vision Monitoring:** Clinician-issued, eye-specific (`OD`/`OS`) post-cataract shared care (patient + caregiver + clinic + non-smartphone parity) expanding into calibrated home functional-vision monitoring (AMD/retina VA & Amsler, glaucoma drop/IOP tracking).
> 2. **Pillar 2 — 6-Layer Multimodal Clinical Diagnostic & Triage AI Engine:** An ophthalmologist-in-the-loop clinical decision-support system that ingests multi-device ophthalmic imaging (Fundus, OCT, OCT-A, Slit-Lamp, Corneal Topography), Visual Field perimetry, labs, and clinical history; validates quality; executes specialist models; fuses evidence into ranked differential diagnoses; renders visual explainability and Persian structured reports; and prioritizes 3-tier clinical urgency for ophthalmologist sign-off.

### 1.2 Phased Delivery Without Compromising Full Scope
Both pillars share one tenant/patient/episode identity model, one encrypted storage and PostgreSQL RLS layer, one asynchronous job queue, one staff web workspace (`apps/staff-web`), and one Persian-first design system (`Wave 0`–`Wave 4`, aligned with `docs/ADR.md` §5):
- **Wave 0 (Foundation, Contracts & Scaffolds — `SYNC-0`):** Establishes monorepo resource guards (`check-resources.sh`), profiled Docker Compose infra, canonical OpenAPI 3.1 + event schemas + Prism mock, golden Persian (`fa-IR`) fixtures, and initial `backend`, `ai-engine`, `patient-app`, and `staff-web` scaffolds.
- **Wave 1 (Core Foundation + Pillar 1 Post-Cataract Wedge + Pillar 2 Diagnostic Ingestion/Pipeline Skeleton — `SYNC-1`):** Launches multi-tenant clinic ops, eye-separated cataract care (`apps/patient-app` built to `docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` + `docs/patient-app-ui-designs/` + `docs/patient-app-visual-assets/` and `apps/staff-web`), offline SOS hotline, caregiver delegation, `Print+Phone` parity, DICOM/FHIR ingestion, Layer 1 Modality Router/QC, and the pluggable AI engine container (`apps/ai-engine/`) wired end-to-end with the Clinician Diagnostic HITL Workspace.
- **Wave 2 (Pillar 1 Pilot Gate + Pillar 2 Core Retinal & Tabular Specialists + Visual Explainability + Persian LLM Reporting — `SYNC-2`):** Completes Pillar 1 E2E & WCAG 2.2 AA pilot gate and activates Fundus (`DR`, `Glaucoma`, `AMD`, `Papilledema`, `ROP`), OCT segmentation + classification (`AMD`/`DME`/`CNV` + layer/fluid masks), Tabular `XGBoost` risk, auxiliary Grad-CAM + primary segmentation mask viewer, switchable small-LLM Persian reporting (`thinkingmachines/inkling-2-mini` → local Iran inference), and 3-tier urgency triage.
- **Wave 3 (Pillar 2 Full Multimodal Fusion, Anterior/Topography, Visual Field, DICOM/FHIR & Patient Signed Summaries — `SYNC-3`):** Adds Anterior Segment (`Keratoconus`, `Cataract`, `Infectious Keratitis`, `Pterygium`), Visual Field glaucoma progression, OCT-A metrics, the full Layer 3 **Multimodal Fusion Engine** (handling partial/missing modalities), full DICOMweb/C-STORE + PHI anonymizer + FHIR R4/R5 adapters, and patient-safe signed diagnostic summary viewing (`apps/patient-app`).
- **Wave 4 (Pillar 1 Release 2 Calibrated Home Vision Monitoring, Local Persian Symptom NLP & Marketing Site — `SYNC-4`):** Adds Pillar 1 Release 2 calibrated home vision monitoring (`Landolt C` via isolated `clinical_renderer`, `Amsler`, native sensors + web verification adapter, statistical EWMA/CUSUM/2-of-N longitudinal trends, optional partner `iCare HOME2` IOP ingestion & optional billing/research modules), local Persian symptom NLP (`ParsBERT`) & home risk models, and the Astro Persian marketing site.

### 1.3 Non-Negotiable Clinical Safety Boundaries
- **Mandatory Ophthalmologist HITL Sign-Off:** Neither Pillar 1 nor Pillar 2 autonomously diagnoses patients or changes prescriptions. Every AI differential, urgency classification, and Persian clinical report is a **clinician draft** until signed off by an ophthalmologist.
- **Strict Eye Laterality (`OD`/`OS`):** Every image, visual field, prescription, drop alert, segmentation mask, and report is explicitly bound to `OD` (`چشم راست`) or `OS` (`چشم چپ`); mismatched or ambiguous laterality is blocked at ingestion and publishing.
- **Deterministic Urgency Safety Floor:** High-risk urgent findings (infectious keratitis, papilledema, retinal detachment, active CNV, severe post-op pain/vision drop) trigger non-suppressible urgent flags; LLMs can never downgrade urgency or deterministic red flags.
- **No Raw Autonomous Image Diagnosis by LLMs:** LLMs write structured Persian reports from validated specialist/fusion JSON outputs—never hallucinating diagnoses from raw images alone.
- **Privacy & Anonymization:** Zero raw patient face video persisted in home care (`ADR-016`); all DICOM/clinical records used for ML training pass through automated PHI tag anonymization; no unredacted PHI is sent to external hosted LLM APIs.

---

## 2. Locked Iran Launch Profile & Operational Decisions

- **Launch Market (`P0-DEC-01` — LOCKED):** **Islamic Republic of Iran (`IR`)**, **100% Persian (`fa-IR`)** user-facing experience across every patient screen, clinician screen, PDF report, SMS, audio instruction, and AI clinical summary, with **Jalali (`Solar Hijri`)** default dates, **in-country data residency (`ADR-023`)**, self-hosted Persian typography (`Vazirmatn`) and web assets (zero blocked CDN dependencies), and `+98` domestic SMS adapters. English (`en`) and Arabic (`ar`) remain supported purely via extensible `i18n` architecture.
- **Formal Regulatory Paperwork Status:** Deferred for now per founder direction; engineering architecture retains audit logs, versioning, model cards, and HITL traceability so future IMED/MOHME/international certification remains straightforward without rewrites.

| Operational Decision | Status / Needed Input from Clinic Partners |
|---|---|
| `P0-DEC-01` **Market & Language** | **LOCKED: Iran (`IR`) / 100% Persian (`fa-IR`) + Jalali + In-Country Hosting** |
| `P0-DEC-02` **Design-Partner Eye Hospitals / Clinics** | Select 1–2 Iranian surgical & diagnostic centers to provide baseline workflows, anonymized local DICOM/topography/VF training data (`D5`), and post-op pilot patients (`D1`) |
| `P0-DEC-03` **GPU Training & Model Gathering Strategy (Kaggle -> In-Country GPU)** | Train & test heavy vision/OCT/segmentation/perimetry models **remotely on Kaggle (`T4 x2` private GPU kernels via `kaggle` CLI)** using public seeds and strictly anonymized snapshots, then **gather only the saved lightweight `ONNX` / tabular models + evaluation metrics back onto this machine** (the dev server has ~12 GiB free disk / ~3 GiB free RAM and zero GPU, running `cpu_stub`/`onnx_cpu` tests only). Provision an in-country GPU node later for hospital-restricted `D5` fine-tuning and production GPU inference |
| `P0-DEC-04` **Target Device Brands & HIS Format** | Confirm specific clinic camera/OCT/topography/perimetry models (Zeiss, Topcon, Heidelberg, Pentacam/Orbscan, Humphrey) and Iranian HIS integration protocol (DICOM/FHIR/HL7/JSON) |

---

## 3. Product Surfaces & Personas

### 3.1 Application Surfaces & Deployment Model
| Surface | Stack & Packaging | Primary Users | Core Responsibility |
|---|---|---|---|
| **Patient & Caregiver Mobile App** (`apps/patient-app`) | **Flutter** (Android/iOS native; **Flutter Web** target for server verification/E2E; UI/UX Source of Truth: `docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` + `docs/patient-app-ui-designs/` + `docs/patient-app-visual-assets/`) | Patients, Caregivers | Pillar 1 "Today" eye-separated drop plans, 4-state adherence, offline SOS hotline, time-released Persian education, caregiver mode, Pillar 1 R2 home VA/Amsler tests, and signed clinician summary viewing |
| **Unified Clinician, Diagnostic & Care-Ops Web App** (`apps/staff-web`) | **React Router v8 + React 19** (**Container-first Docker `< 100 MB`**) | Ophthalmologists, Optometrists, Technicians, Triage Nurses/Coordinators, Clinic Admins | **Pillar 1:** Surgery enrollment, `OD`/`OS` Rx versioning, triage queue, shift handoff, `Print+Phone` parity. **Pillar 2:** Multi-modality image/DICOM/VF/lab ingestion, QC status, interactive mask + Grad-CAM viewer, Fusion differential breakdown, Persian AI report editor, 3-tier urgency HITL sign-off |
| **Backend API & Durable Workflows** (`apps/backend`) | **TypeScript Modular Monolith + Temporal + Redis Queue** (**Container-first Docker `< 250 MB`**) | All Surfaces & Devices/HIS | Multi-tenant Postgres RLS, clinical rules, Rx versioning, care/triage state machines, async AI job orchestration, DICOM/FHIR adapters, switchable OpenAI-compatible LLM gateway |
| **Pluggable Multimodal AI Engine** (`apps/ai-engine`) | **Python FastAPI + Queue Worker** (**Simple single container now**, OCP specialist plugins) | Called asynchronously by `apps/backend` | Executes Layers 1–4 (`Router/QC`, 5 Specialists + `XGBoost`, `Fusion Engine`, Segmentation Masks & Auxiliary Grad-CAM); runs `cpu_stub`/`onnx_cpu` on dev server and full GPU weights on GPU host |
| **ML Training, Kaggle GPU Runner & Evaluation Lab** (`ml/`) | **Python (`uv`) + Kaggle CLI (`T4 x2` GPU)** | ML Engineers (Track A) | Dataset ETL (`D1`–`D5`), DICOM anonymization, patient/site/time split verification, remote Kaggle GPU training & test evaluation, **lightweight `ONNX` model gathering back to host**, calibration & Model Cards |
| **Marketing & Evidence Site** (`apps/marketing-site`) | **Astro 7.4+** (**Container-first Docker `< 50 MB`**, staged) | Clinic Directors, Partners | Static-first Persian clinical overview & partner onboarding |

### 3.2 Personas
1. **Post-Op / Chronic Eye Patient & Non-Smartphone Patient (`Print+Phone` parity)** — Needs unambiguous Persian eye-specific drop/care instructions, offline emergency access, and large-print/phone fallback.
2. **Caregiver / Companion** — Scoped, revocable access to manage elderly patient plans.
3. **Diagnostic Technician / Optometrist** — Uploads/routes DICOM, fundus, OCT, OCT-A, slit-lamp, topography, and visual field studies; receives immediate Layer-1 QC feedback if a scan is blurry, dark, or wrong-eye so it can be retaken while the patient is still in the chair.
4. **Ophthalmologist / Subspecialist (Retina, Glaucoma, Cornea, Cataract)** — Reviews prioritized 3-tier urgency worklist, inspects pixel-accurate segmentation masks + auxiliary Grad-CAM + multimodal Fusion differential, edits/signs the Persian structured report (HITL), and approves post-op prescriptions.
5. **Triage Nurse / Care Coordinator** — Runs post-op follow-up & urgent-referral closed-loop queues with SLA tracking and shift handoff.
6. **Clinic Admin & Internal Ops** — Configures clinic hours, Persian templates, device endpoints (DICOM/HIS), and RBAC/break-glass governance.

---

## 4. Detailed Functional Requirements — Pillar 2: 6-Layer Multimodal Ophthalmology AI Engine

### 4.1 Layer 1 — Multimodal Ingestion, Modality Router & Quality Control (QC)

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| `REQ-AI-L1-001` | **Multi-Modal Diagnostic Ingestion** | Ingests Color Fundus (`CFP`), `OCT` (2D B-scans & 3D volumes), `OCT-A`, `Slit-Lamp`, `Corneal Topography` (maps + structured indices), `Visual Field` (HFA 24-2 / 10-2 grids & global indices), `Lab Results`, and structured `Clinical History` via DICOMweb/C-STORE, FHIR, or Staff Web upload. |
| `REQ-AI-L1-002` | **Automatic Modality Router** | Lightweight image classifier (`MobileNetV3`/`ConvNeXt-Tiny`/`EfficientNet-B0` ONNX) identifies exact modality (`fundus`, `oct`, `octa`, `slit_lamp`, `topography`, `unknown`) and flags mismatches against DICOM/upload tags. |
| `REQ-AI-L1-003` | **Strict Quality Control (QC) Gate** | Evaluates every incoming image for **blur/defocus**, **under/over-illumination & glare/motion artifacts**, and **eye laterality mismatch (`OD` vs `OS`)** (e.g., optic-disc nasal/temporal position check on fundus/OCT vs. declared `OD`/`OS`). |
| `REQ-AI-L1-004` | **Hard Rejection of Low-Quality Scans** | Images failing QC are **blocked from entering Layer 2 specialist models**; technician/clinician immediately receives a clear Persian rejection reason (`تار بودن تصویر`، `نور نامناسب`، `عدم تطابق چشم راست/چپ`) prompting recapture while keeping the failed artifact archived in audit history. |

### 4.2 Layer 2 — Specialist Diagnostic Models (All 5 Domains Required)

| ID | Specialist Domain | Target Conditions / Biomarkers | Commercial-Safe Architecture & Mitigation of Licensing Trap |
|---|---|---|---|
| `REQ-AI-L2-001` | **Fundus Specialist** | **DR** (Diabetic Retinopathy grading), **Glaucoma** (ONH/cup-to-disc), **AMD**, **Papilledema** (`ادم پاپی`), **ROP** (`رتینوپاتی نوزادان نارس`) | **Apache 2.0 foundation backbone** (`Meta DINOv2 / DINOv3` or `SigLIP`) fine-tuned locally with multi-head task classifiers (`ADR-051`). Avoids the **`RETFound` `CC BY-NC 4.0` non-commercial license trap** in commercial builds while supporting a swappable `FoundationBackbonePort` if `RETFound` is ever licensed or benchmarked strictly in non-commercial research. |
| `REQ-AI-L2-002` | **OCT & OCT-A Specialist** | **Pixel-level Retinal Layer Segmentation** (`RNFL`, `GCIPL`, `RPE/BM` thickness maps) + **Fluid Segmentation** (`IRF`, `SRF`, `PED`) + **Disease Classification** (`AMD`, `DME`, `CNV`) + **OCT-A** microvascular/neovascular density biomarkers | Dedicated segmentation network (**MONAI / U-Net / SegFormer**, Apache 2.0) producing exact quantitative layer thicknesses & fluid volumes, paired with volumetric/B-scan multi-label classifier. |
| `REQ-AI-L2-003` | **Anterior Segment & Topography Specialist** | **Keratoconus** (Manifest, Subclinical, Forme Fruste via corneal axial/elevation/pachymetry maps + indices `Kmax`, astigmatism, thinnest pachymetry), **Cataract** grading, **Infectious Keratitis** (`کراتیت عفونی`), **Pterygium** (`ناخنک`) | Dual-branch specialist: Slit-lamp vision classifier/segmenter (`DINOv2`/`ConvNeXt`) + Topography multi-map & structured-index network. |
| `REQ-AI-L2-004` | **Visual Field (Perimetry) Specialist** | **Glaucoma Progression** (rate of progression, fast-progressor alert, spatial scotoma worsening) | Spatial-temporal model over standardized $8 \times 9$ sensitivity/`TD`/`PD` grids + global indices (`MD`, `PSD`, `VFI`) across longitudinal visits (`UWHVF` / `GRAPE` format). |
| `REQ-AI-L2-005` | **Tabular / Lab & Clinical Risk Specialist** | **Diabetes/DR Risk** & **Glaucoma Risk** | **XGBoost** (with LightGBM benchmark support) over structured labs (`HbA1c`, FBS, creatinine, lipids, BP), `IOP (mmHg)`, CCT/pachymetry, age, duration of diabetes, and clinical history, outputting calibrated risk probabilities + SHAP feature contributions. |

### 4.3 Layer 3 — Multimodal Fusion Engine

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| `REQ-AI-L3-001` | **Cross-Modal Evidence Fusion** | Combines calibrated probabilities, extracted quantitative biomarkers (e.g., OCT `RNFL` thickness + `VF MD/TD` defect + `IOP` + Fundus `C/D` ratio), and clinical history into a unified patient/eye-level assessment (`ADR-052`). |
| `REQ-AI-L3-002` | **Graceful Partial-Modality Handling** | Real clinical visits rarely capture all 6 modalities simultaneously; Fusion Engine uses **modality-availability masks** (masked late-fusion meta-model + deterministic clinical prior rules) so inference works accurately whether 1, 2, or all 6 modalities are present, explicitly noting missing confirmatory exams (e.g., *"OCT RNFL unavailable; recommendation based on Fundus + IOP"*). |
| `REQ-AI-L3-003` | **Differential Diagnosis Output Contract** | Outputs a ranked **Differential Diagnosis List** per eye (`OD` / `OS` independently) containing: `condition_code`, Persian clinical name, **calibrated confidence (%) + uncertainty interval**, **severity grade** (`mild`/`moderate`/`severe`/`urgent`), **per-modality evidence weights**, and **discordance flags** (e.g., structural OCT thinning without VF loss yet). |

### 4.4 Layer 4 — Visual Explainability & Persian Structured Reporting

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| `REQ-AI-L4-001` | **Primary Pixel-Level Segmentation Overlays** | Renders true anatomical/lesion segmentation masks (retinal fluid `IRF`/`SRF`/`PED`, RNFL/RPE boundaries, optic cup/disc, corneal infiltrates/keratoconus hot zones) as toggleable, calibrated overlays with quantitative measurements (mitigating Grad-CAM spatial blur limitations, `ADR-051`). |
| `REQ-AI-L4-002` | **Auxiliary Grad-CAM / Attention Heatmaps** | Generates Grad-CAM / ViT attention maps for classification heads strictly labeled in UI as **auxiliary attention hints (`راهنمای توجه مدل — غیرقابل استفاده به‌جای سگمنتیشن دقیق`)**, toggleable independently from masks. |
| `REQ-AI-L4-003` | **Structured Persian Report Generation (Switchable Small-LLM + VLM-Ready Port)** | Generates a structured **Persian (`fa-IR`)** clinical draft report (Findings by Modality, Quantitative Biomarkers, Ranked Differential, Cross-Modal Correlation, Suggested Follow-Up/Urgency, Explicit Evidence Citations) consuming **only structured Layer 1–3 JSON outputs** via `.env`-switchable OpenAI-compatible LLM (`thinkingmachines/inkling-2-mini` on OpenRouter → local Iranian vLLM/Ollama/llama.cpp, `ADR-046`). Exposes a clean `MultimodalReportModelPort` for optional future local VLM inputs without allowing autonomous raw-image diagnosis. Enforces Zod schema validation, citation grounding, negation & `چشم راست`/`چشم چپ` checks, PHI scrubbing for external hosts, and deterministic Persian template fallback. |

### 4.5 Layer 5 — 3-Tier Urgency Triage & Ophthalmologist HITL

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| `REQ-AI-L5-001` | **3-Tier Clinical Urgency Classification** | Classifies every analyzed study/eye into one of three explicit Persian tiers: **`عادی` (Routine / Normal)**, **`پیگیری ۳ تا ۶ ماه` (Scheduled 3–6 Month Follow-Up)**, or **`ارجاع فوری` (Urgent Referral)**. |
| `REQ-AI-L5-002` | **Deterministic Urgent-Floor Override** | Critical sight- or life-threatening findings—including **infectious keratitis (`کراتیت عفونی`)**, **papilledema (`ادم پاپی`)**, **retinal detachment (`جداشدگی شبکیه`)**, **active wet AMD/CNV**, **high-risk ROP**, or **post-op endophthalmitis symptoms**—immediately enforce `ارجاع فوری` via deterministic rules (`packages/clinical-rules/`) that cannot be downgraded by Fusion confidence smoothing or LLM output. |
| `REQ-AI-L5-003` | **Mandatory Ophthalmologist Sign-Off & Active-Learning Feedback** | Every diagnostic case enters the Staff Web review queue as `Pending Clinician Review`. Only an authorized ophthalmologist can finalize/sign the report (`Approved` / `Edited & Approved` / `Rejected`). All edits to differential, urgency, or masks are stored immutably as clinician-adjudicated labels feeding local retraining (`Dataset D5`). |

### 4.6 Layer 6 — Clinical Infrastructure, Queue, DICOM/FHIR & Security

| ID | Requirement | Acceptance Criteria |
|---|---|---|
| `REQ-AI-L6-001` | **Async Processing Queue & Simple Pluggable AI Engine** | Image ingestion returns immediately (`202 Accepted` + `job_id`), pushing work through a durable Redis/Temporal queue to `apps/ai-engine/` (kept **intentionally simple** as one container with clean internal `SpecialistModelPlugin` modules now, splittable into independent GPU/Triton microservices later without changing API contracts, `ADR-050`). |
| `REQ-AI-L6-002` | **DICOM & FHIR Interoperability** | Supports DICOM metadata parsing (`StudyInstanceUID`, `Modality`, `ImageLaterality`), DICOMweb/C-STORE bridge adapter, and FHIR R4/R5 (`ImagingStudy`, `Observation`, `DiagnosticReport`, `ServiceRequest`) adapter for Iranian clinic devices and HIS integration (`ADR-053`). |
| `REQ-AI-L6-003` | **Encryption, RLS & Automated Anonymization** | All raw images, masks, and reports stored encrypted in S3/MinIO with tenant-scoped Postgres RLS pointers; automated DICOM tag scrubber & pseudonymizer strips patient names, national IDs, birth dates, and burned-in overlays before exporting any dataset into `ml/datasets/`. |

---

## 5. Detailed Functional Requirements — Pillar 1: Patient Care-Operations & Remote Vision Monitoring

Pillar 1 retains 100% of our validated post-cataract wedge and Release 2 home monitoring requirements (all unified onto the same tenant/patient/triage backbone):

### 5.1 Core Platform & Post-Cataract Shared-Care Wedge
- `REQ-CORE-001..005`: Multi-tenant Postgres `FORCE ROW LEVEL SECURITY` + ABAC; Staff OIDC/MFA/step-up + Break-Glass; Patient `+98` OTP/deep-link + Scoped Caregiver delegation with instant revocation (`<1s` `403`); Immutable versioned templates/prescriptions (`v1..vN`); Atomic audit log + Transactional Outbox.
- `REQ-CAT-001..011`:
  - Strict `OD`/`OS` isolation per surgical episode (`چشم راست` / `چشم چپ` always rendered in full Persian words; updating `OS` Rx `v2` never alters `OD` schedule/notifications).
  - Clinic-issued Persian "Today" drop plan (Iranian generic/brand name, cap/bottle visual cue, Jalali date/time, taper step — zero patient manual Rx entry).
  - 4-state adherence logging (`مصرف شد`, `مصرف نشد + دلیل`, `دارو در دسترس نبود`, `پاسخی دریافت نشد`) + clinic-approved missed-dose guidance.
  - Time-released `T0` pre/post-op Persian education + optional voice playback.
  - Deterministic post-op red-flag checklist + **100% offline clinic emergency hotline & out-of-hours ER card**.
  - Encrypted offline Flutter outbox with explicit `در انتظار ارسال` (`Pending Upload`) status and UUID `idempotency_key` deduplication.
  - **Non-Smartphone `Print+Phone` Parity Mode:** Large-print Persian Vazirmatn schedule PDF + scheduled coordinator phone check-ins tracked in the exact same triage worklist & KPI denominators.
  - Prioritized Staff Triage Queue (`New → OwnerAssigned → ContactAttempted → ContactEstablished → Escalated → Referred → Closed`), Temporal SLA timers, Shift Handoff, Closed-Loop Referral Tracking (delivery + attendance + miss reason), and deterministic Vazirmatn Persian PDF Closure Summary with `source_sha256`.

### 5.2 Calibrated Home Functional Vision Monitoring (Pillar 1 — Release 2 Plugin)
- `REQ-RET-001..008`: Device Qualification Registry + kill-switch; Isolated Flutter `clinical_renderer` (physical/angular Landolt C 8-orientation logMAR decoupled from OS font scaling); Native ARKit/MediaPipe/IMU/Lux sensor preflight (zero raw face video saved); Best-PEST adaptive psychophysics capturing full raw trials; deterministic Amsler distortion geometry; multi-session baseline series; statistical longitudinal trend engine (Reliable Change, 2-of-N, EWMA/CUSUM); deduplicated `AlertEpisode`.
- `REQ-EXP-001..005`: Glaucoma home IOP (`iCare HOME2`) ingestion, Diabetic Retinopathy screening referral closure, optional regional billing-evidence ledger, and Research/CRO governance mode.

---

## 6. Comprehensive AI/ML Models, Public Benchmarks & Proprietary Datasets (`D1`–`D5`)

All custom models are developed inside `ml/`, smoke-tested locally on CPU, **trained and evaluated remotely on Kaggle GPU (`T4 x2` private kernels via `kaggle kernels push`)** on public benchmarks and strictly `ADR-053`-anonymized snapshots, and then **saved lightweight `ONNX`/tabular artifacts + metrics are gathered back into this machine (`kaggle kernels output`)** for `apps/ai-engine` integration (`onnx_cpu` / `cpu_stub`). Hospital-restricted Iranian `D5` fine-tuning that cannot leave in-country servers runs on a dedicated domestic GPU node once provisioned. Every training pipeline strictly enforces **patient-, clinic/device-, and time-level holdout splits (`ADR-033`)** and **shadow/canary evaluation (`ADR-032`)**.

### 6.1 Complete Model Inventory (Pillar 1 + Pillar 2)

| Layer / Domain | Model / Algorithm | Backbone / Stack (Commercial-Safe) | Inputs | Outputs | Primary Evaluation Gate |
|---|---|---|---|---|---|
| **P2-L1 Router** | Modality Classifier | `ConvNeXt-Tiny` / `MobileNetV3` (Apache 2.0, ONNX) | Raw uploaded/DICOM image | Modality label + confidence | `>= 99%` macro-F1 across 5 imaging types |
| **P2-L1 QC Gate** | Quality + Laterality Classifier | Lightweight CNN + blur/exposure metrics + OD/OS spatial detector | Routed image + declared laterality | `Pass` / `Reject (blur | light | wrong_eye)` | High bad-image rejection sensitivity; zero `OD`/`OS` leak |
| **P2-L2 Fundus** | Multi-Disease Retinal Classifier | **`DINOv2 / DINOv3`** or `SigLIP` (Apache 2.0) fine-tuned locally *(optional `RETFound` research-only plugin)* | QC-passed CFP | Probabilities & severity for `DR`, `Glaucoma`, `AMD`, `Papilledema`, `ROP` + auxiliary attention map | Per-disease AUROC, sensitivity on urgent classes (`Papilledema`, `ROP`, referable DR) |
| **P2-L2 OCT / OCT-A** | Retinal Segmentation + Disease Classifier | **`MONAI` / `U-Net` / `SegFormer`** (Apache 2.0) + 2.5D/3D classifier | QC-passed OCT B-scans/volumes (+ OCT-A) | Pixel masks (`RNFL`, `RPE/BM`, `IRF`, `SRF`, `PED`), fluid volume, thickness + `AMD`/`DME`/`CNV` scores | Dice/IoU per layer/fluid class, `CNV`/`DME` sensitivity |
| **P2-L2 Anterior** | Slit-Lamp & Corneal Topography Specialist | `DINOv2`/`ConvNeXt` + multi-map topography CNN/tabular branch | QC-passed Slit-lamp + Topography maps & indices (`Kmax`, pachymetry) | `Keratoconus` (Manifest/Subclinical/Forme Fruste), `Cataract`, `Infectious Keratitis`, `Pterygium` + lesion masks | `Infectious Keratitis` urgent recall; Subclinical KC sensitivity/specificity |
| **P2-L2 Visual Field** | Perimetry Progression Model | Spatial-temporal CNN/RNN or GBDT over $8\times9$ HFA grids (`TD`, `PD`, `MD`, `PSD`) | Longitudinal visual field sequences | Glaucoma progression probability, rate (`dB/yr`), fast-progressor flag | Fast-progressor sensitivity/PPV, lead time |
| **P2-L2 Tabular** | Systemic & Ocular Risk Model | **`XGBoost`** (+ LightGBM benchmark) + SHAP | Labs (`HbA1c`, BP, lipids), `IOP`, CCT, age, history | Calibrated Diabetes/DR & Glaucoma risk + top SHAP factors | Brier score / ECE calibration, AUROC, decision-curve utility |
| **P2-L3 Fusion** | Masked Multimodal Fusion Engine | Calibrated late-fusion meta-model (Masked Attention / GBDT / Bayesian stack) + deterministic clinical rules | All available L2 scores, biomarkers (`RNFL`, `VF`, `IOP`, `C/D`), clinical history + availability mask | Ranked **Differential Diagnosis**, confidence %, severity, modality attribution, discordance flags | Multi-disease top-k accuracy, calibration, missing-modality robustness |
| **P2-L4 Report LLM** | Persian Structured Report Generator | **`.env`-switchable OpenAI-compatible Small LLM** (`thinkingmachines/inkling-2-mini` on OpenRouter → local Iranian vLLM/Ollama/llama.cpp) + bounded LangGraph | Structured L1–L3 JSON evidence packet (PHI-scrubbed if external) | Fluent **Persian (`fa-IR`)** structured ophthalmology report + citations (`evidence_ids`) | 100% Zod schema & citation coverage, 0% `چشم راست`/`چشم چپ` swap, 0% dropped negation |
| **P1 Symptom NLP** | Persian Symptom Urgency Classifier | Locally fine-tuned `ParsBERT` / distilled `XLM-R` | Colloquial Iranian Persian free-text / call notes | Structured symptom concepts + urgency flag (never downgrades deterministic red flags) | **Red-flag recall `>= 99%`** |
| **P1 Home Vision** | Psychophysics, Sensor QC & Longitudinal Risk | Best-PEST Landolt C, deterministic Amsler, local depth/lux/stability models, EWMA/CUSUM → local LightGBM/Survival | Home raw trials, ARKit/MediaPipe/IMU/lux telemetry | Home logMAR, Amsler area delta, quality status, longitudinal worsening risk | Bland–Altman vs. ETDRS, actionable-alert PPV |

### 6.2 Public Benchmarks & Proprietary Iranian Datasets to Gather (`D1`–`D5`)

#### A. Public Seed / Pre-Training Datasets (Strictly Audited for Licensing & Domain Shift)
| Modality | Public Datasets | Verified Utility & Important Caveat |
|---|---|---|
| **Fundus (`CFP`)** | **EyePACS**, **Messidor / Messidor-2**, **APTOS**, **AREDS**, **REFUGE/AIROGS**, **PAPILA** | Strong seed benchmarks for DR/Glaucoma/AMD; **check commercial/research license restrictions** before production training; weak coverage for ROP & Papilledema -> requires Iranian clinic data (`D5`). |
| **OCT / OCT-A** | **OCTDL**, **Kermany OCT**, **RETOUCH** (fluid segmentation), **Duke SD-OCT**, **Mendeley paired CFP+OCT** | Excellent for initial fluid/layer segmentation & AMD/DME/CNV prototyping; vendor domain shift (Heidelberg vs. Zeiss vs. Topcon) requires multi-device local adaptation (`D5`). |
| **Anterior / Topography** | **Orbscan Corneal Topography (Zenodo 2025, 1,454 eyes)**, **ESCRS Public Datasets Portal** (slit-lamp, AS-OCT), **CADMUS** *(institutional access, 945k images)* | Orbscan 2025 provides 4 standard corneal maps + structured indices (`Kmax`, pachymetry) for keratoconus; infectious keratitis & slit-lamp cataract grading require local hospital curation (`D5`). |
| **Visual Field & Multimodal Glaucoma** | **UWHVF** (~28,943 HFA 24-2 tests, JSON + $8\times9$ spatial matrices), **GRAPE** (1,115 longitudinal follow-ups / 263 eyes combining **Fundus + OCT + VF**) | **UWHVF** is the gold-standard open perimetry progression set; **GRAPE** is the ideal open seed dataset for developing and testing the Layer-3 Multimodal Glaucoma Fusion Engine! |

#### B. Proprietary Iranian Datasets to Gather (`D1`–`D5`)
1. **`D1` (Pillar 1 Post-Cataract Ops & Colloquial Persian Symptom Corpus):** 60–120 pilot -> 1,000+ episodes; `OD`/`OS` drops, 4-state adherence, 500–3,000+ clinician-labeled colloquial Persian utterances, SLA/call metrics.
2. **`D2` (Pillar 1 R2 Lab Sensor Calibration Set):** Ruler/depth distance (`30–60 cm`), lux-meter pairs, head-pose & IMU shake ground truth across target Iranian phone tiers.
3. **`D3` (Pillar 1 R2 Prospective Home Vision + ETDRS Cohort):** Paired home raw VA/Amsler trials + clinic ETDRS + clinical OCT/treatment outcomes.
4. **`D4` (Persian Structured Clinical Report & Safety Eval Corpus):** 200–500+ de-identified multimodal + post-op JSON packets paired with ophthalmologist-written gold **Persian (`fa-IR`)** reports & safety rubrics (`inkling-2-mini` vs. local models).
5. **`D5` (Pillar 2 Iranian Multi-Device Multimodal Clinic Cohort — CRITICAL FOR FUSION & RARE URGENCIES):** Anonymized DICOM & structured records gathered from partner Iranian eye hospitals/clinics spanning local camera/OCT/topography/perimetry brands, with **ophthalmologist HITL adjudications** especially targeting underrepresented & urgent classes (**Papilledema, ROP, Infectious Keratitis, Retinal Detachment, OCT-A, and paired multi-modality Fusion cases**).

---

## 7. Non-Functional Requirements (Persian RTL, A11y, Performance, Container Footprint & Security)

- **100% Persian-First (`fa-IR`) & Iran Infrastructure Resilience (`ADR-023`, `ADR-035`):** Native semantic RTL, default **Jalali (`Solar Hijri`)** dates and Persian digits (`۰–۹`), Unicode bidi isolation for Latin drug/DICOM/metric strings, full Persian laterality words (`چشم راست`/`چشم چپ`), Iranian `+98` phone OTP & domestic SMS adapters, **self-hosted `Vazirmatn` fonts & local Flutter Web CanvasKit** (zero blocked Google Fonts/CDN calls inside Iran).
- **Accessibility:** WCAG 2.2 AA release gate (`axe-core` automated audit), `>= 48dp` touch targets on Flutter patient screens, `>= 4.5:1` contrast, VoiceOver/TalkBack Persian semantics, clinical stimuli isolated from OS font scaling.
- **Performance & Container-First Footprint (`ADR-049`):**
  - `apps/backend`: `< 250 MB` (`node:24-alpine`), read API `p95 < 300 ms`.
  - `apps/staff-web`: `< 100 MB` (Alpine multi-stage), `p75 LCP < 2.2 s`, `INP < 180 ms`, `CLS < 0.05`, `< 200 kB` initial JS (DICOM/chart/mask viewers lazy-loaded).
  - `apps/ai-engine`: Lightweight single container (`python:3.12-slim` CPU-only on dev server; GPU profile on dedicated GPU node), async inference SLA `< 30 s` per study on GPU (`< 5 s` stub/ONNX in dev).
  - `apps/marketing-site`: `< 50 MB` (`nginx:alpine`), `p75 LCP < 1.8 s`, `< 80 kB` JS.
  - All Compose services enforce `mem_limit`, Compose `profiles`, and `10m × 2` log rotation.
- **Security & Privacy:** Default-deny PostgreSQL `FORCE ROW LEVEL SECURITY` (`tenant_id`), KMS envelope encryption for S3/MinIO DICOM/images/reports, staff OIDC/MFA + step-up export + audited break-glass, automated DICOM tag anonymization, PHI-scrubbed OpenTelemetry, zero PHI in SMS or external OpenRouter prompts.

---

## 8. KPIs, Pilot Scorecards & Commercial Packaging

### 8.1 Pillar 1 — Release 1 Post-Cataract Pilot Scorecard (12 Weeks, 2 Iranian Centers, 60–120 Patients)
| Metric | Go / Decision Threshold |
|---|---|
| 48h Discharge Activation (`Patient App`, `Caregiver`, `Print+Phone`) | **`>= 70%`** |
| Scheduled Follow-Up Completion | **`>= 75%`** |
| In-SLA Actionable Triage Rate | **`>= 95%`** |
| Repeat Calls or Staff Time Reduction | **`>= 20%`** reduction in one without `> 10%` rise in the other |
| System-Attributed Critical Safety Incidents (wrong eye, lost emergency, PHI leak) | **`0`** |
| Post-Pilot Paid Continuation Commitment | **`>= 1` of 2 centers** |

### 8.2 Pillar 2 — Multimodal Diagnostic & Triage AI Evaluation KPIs
- **Layer 1 QC:** Bad-image rejection recall `>= 95%`, Modality Router macro-F1 `>= 99%`, `OD`/`OS` mismatch catch rate `>= 99%`.
- **Layer 2 & 3 Clinical Accuracy:** Urgent-condition sensitivity (**Infectious Keratitis, Papilledema, RD, active CNV, high-risk ROP**) `>= 95%` on held-out Iranian clinic validation (`D5`), calibrated Brier/ECE score, and measurable Fusion uplift over unimodal specialists on `GRAPE` + `D5`.
- **Layer 4 Reporting & HITL Efficiency:** `100%` Zod schema & citation validity, `0%` `چشم راست`/`چشم چپ` swap or dropped negation on `D4`, clinician report editing time reduction, and HITL override rate tracking.

### 8.3 Commercial Packaging (Iranian Clinic Economics First)
- **Care-Ops Core (Pillar 1):** Per-center monthly tier or per-active-episode fee (`IRR/Toman`) for post-op shared care & triage.
- **Diagnostic AI Suite (Pillar 2):** Per-study / tiered clinic subscription for multimodal imaging triage, segmentation overlays, and Persian structured reporting (priced to cover local GPU/inference amortization + storage).
- **Enterprise Hospital / Network:** Unified Pillar 1 + Pillar 2 + DICOM/HIS integration + on-premise Iranian deployment.

---

## 9. Risk & Hazard Controls (`HAZ-001` .. `HAZ-012`)

| ID | Hazard | Severity | Mandatory Engineering Control |
|---|---|---|---|
| `HAZ-001` | Wrong-eye (`OD`/`OS`) Rx, drop alert, or diagnostic report | Critical | Episode/study laterality isolation; Layer 1 `OD`/`OS` QC mismatch gate; full Persian wording (`چشم راست`/`چشم چپ`) |
| `HAZ-002` | Missed urgent pathology (keratitis, papilledema, RD, endophthalmitis) | Critical | Deterministic urgent-floor rules (`clinical-rules`), offline hotline, non-suppressible `ارجاع فوری` queue, mandatory ophthalmologist HITL |
| `HAZ-003` | Poor-quality/blurry scan producing false normal AI result | Critical | Hard Layer-1 QC rejection gate before Layer-2 models; explicit recapture feedback to technician |
| `HAZ-004` | Misleading Grad-CAM heatmap creating false clinician confidence | High | Primary pixel-level segmentation masks (`MONAI`/`U-Net`); Grad-CAM labeled strictly as auxiliary hint (`ADR-051`) |
| `HAZ-005` | Commercial license violation from `RETFound` (`CC BY-NC 4.0`) | High | Commercial-safe Apache 2.0 `DINOv2`/`SigLIP` default backbone (`ADR-051`); `RETFound` isolated to research-only flag |
| `HAZ-006` | Missing modalities crashing or distorting Fusion scores | High | Modality availability masks + missing-exam disclosure in Fusion output & Persian report (`ADR-052`) |
| `HAZ-007` | Small-LLM hallucination, dropped negation, or Persian medical errors | High | Structured JSON input only (never raw-image diagnosis), Zod retry, citation/`OD`-`OS`/negation validators, deterministic Persian fallback, HITL |
| `HAZ-008` | Unredacted PHI sent to external OpenRouter API or leaked in DICOM training sets | Critical | Mandatory PHI scrubber before external LLM; `.env` switch to local Iran LLM; automated DICOM anonymizer for `ml/` (`ADR-046`, `ADR-053`) |
| `HAZ-009` | Cross-tenant clinic PHI leak | Critical | PostgreSQL `FORCE ROW LEVEL SECURITY` + ABAC + automated DB negative tests (`ADR-007`) |
| `HAZ-010` | Patient offline illusion or elderly non-smartphone exclusion | High | Explicit `در انتظار ارسال` status, cached offline hotline, caregiver mode, `Print+Phone` parity (`ADR-044`) |
| `HAZ-011` | Dataset leakage across patient/eye/device splits | High | Automated patient/clinic/time/device split verification in `ml/evaluation/` (`ADR-033`) |
| `HAZ-012` | Host OOM / Disk exhaustion on constrained dev server (`12G` disk / `3G` RAM) | High | Mandatory `check-resources.sh` preflight, Alpine multi-stage images, `cpu_stub` AI engine mode on dev server, zero CUDA images here (`ADR-045`, `ADR-049`, `ADR-050`) |
