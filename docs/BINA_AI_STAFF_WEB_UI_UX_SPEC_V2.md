# Bina AI — Staff Web UI/UX & Clinical Design System Specification

**Version:** 2.0 — Bina Clinical Glass / Compact Desktop Workstation (reference-driven rewrite)  
**Date:** 26 November 2026  
**Audience:** Codex, Antigravity, frontend engineers, designers, clinical reviewers, QA and product owners  
**Target:** `apps/staff-web` — Unified Clinician, Diagnostic & Care-Ops Web App  
**Language:** English technical specification; production UI is Persian (`fa-IR`), semantic RTL, Jalali dates.  
**Visual baseline:** Latest 14 independently generated desktop screenshots (R01–R14) and latest 20-screen board (BOARD), with mobile V2.1 brand assets. See §2.0. Supersedes Staff Web V1 in full.
**Authority:** `docs/PRD.md` (v3.0, 23 Nov 2026), `docs/ADR.md` (ADR-001–053, 23 Nov 2026), `AGENTS.md`, canonical OpenAPI/event schemas and clinical fixtures.  
**Status:** Reference-driven implementation specification; no existing repository, real clinical data, clinical validation, regulatory clearance or completed implementation is claimed. Dark theme and non-rendered screens are designed counterparts.

## 0. Mandatory agent contract — read before editing

1. Read the actual repository `AGENTS.md`, PRD, ADR, contracts, current routes, auth, dependencies, tests and build scripts. Preserve working flows and use repository conventions. Do not copy Flutter code or recreate the app from scratch. Make a route-by-route gap report first.
2. Requirements marked **[R]** are supported by PRD/ADR; **[D]** is a proposed design/implementation decision; **[G]** is gated by phase, contract, device, clinical or product approval; **[X]** is out of current scope. A [R] screen can have a proposed [D] route, layout and fields; they are not API requirements. All sizing, motion, example values and layouts here are [D] unless attributed. If any conflict occurs, clinical safety and PRD/ADR win; raise the discrepancy explicitly.
3. Implement desktop-first, both themes, semantic RTL, localization, responsive layouts, keyboard operation and every applicable loading/error/empty/permission/stale/partial state. Do not mark a screenshot as a finished feature. Use real generated DTOs and capability/permission contracts; never invent endpoints, confidence, diagnostic thresholds, SLA values, clinical workflows, prescriptions or unsupported server operations.
4. Keep patient, tenant, clinic, episode, study, laterality, source, measurement time, model version and signed report version explicit. Never infer eye from position, swap OD/OS on RTL, mix eyes in one Rx, auto-diagnose, auto-sign or let UI/LLM downgrade deterministic urgency. QC rejection is a hard stop, not a soft warning. Raw evidence is immutable; derived data and reports are versioned.
5. Never expose an unsigned draft to the patient app. Staff views distinguish AI suggestion, clinician adjudication, finalized report, missing evidence, QC failure and unavailable capabilities. A failed or partial assessment is never a green “normal”. Clinical data visualization must be faithful to the source, not a decorative chart.
6. No cross-tenant client cache reuse, secrets or PHI in URL query strings, analytics, console logs, crash reports, third-party CDN or unapproved browser persistence. Authorization comes from backend RBAC/ABAC and RLS; hiding a button does not enforce security. Recheck permissions on every protected operation. Export and break-glass require the server-approved step-up path and audit.
7. Use semantic design tokens and shared primitives. No raw HEX, ad hoc spacing, duplicated chart wrappers, excessive glass, random gradients, stock imagery, AI-generated fake clinical images, or nonfunctional actions in feature modules. Local assets only. Preserve the four canonical brand artworks. Keep clinical viewports neutral and free of artwork.
8. Build mock-first with deterministic synthetic fixtures and a prominent demo marker; do not silently fall back to mock data in live mode. Use only supported backend fields. If a capability is unavailable, show an approved disabled/empty state or hide the gated route; document blockers.
9. Before builds/tests run resource guards; honor single-worker Playwright and constrained Docker budgets. Report exact commands, outputs, visual captures for both themes, unresolved issues and tests not run. Do not bypass or skip assertions to achieve a green build.
10. Do not perform autonomous edits to backend, ML, deployment secrets, data retention, model promotion or production clinical data as part of this design task. Coordinate Track A contracts; keep changes in Track B scope.

### Reading map

- §1 product boundaries and roles; §2 visual identity/tokens; §3 shell/layout; §4 components; §5 motion; §6 data and clinical visualization; §7 workflows and security; §8 full screen inventory; §9 metrics and analytics; §10 architecture; §11 accessibility/localization; §12 test matrix; §13 delivery and open decisions; §14 references and final checklist.

## 1. Product and UX model

### 1.1 Product boundaries

The staff application joins Pillar 1 (post-cataract eye-specific care operations, follow-up, triage, Print+Phone, later calibrated home vision) and Pillar 2 (multimodal ingestion/QC, specialist AI, masked fusion, explainability, Persian report drafting, urgency and ophthalmologist sign-off) on one patient/tenant identity. PRD §3.1–3.2 and ADR §1.1 are authoritative. Staff web is not the Flutter patient app, marketing site, full HIS, pharmacy inventory, insurance, or autonomous diagnostic engine. Optional HOME2 ingestion and research/billing evidence are gated; home VR visual field is a proposed extension, not a PRD requirement. Clinical VF ingestion and progression are required in Wave 3.

### 1.2 Design philosophy: clinical glass, not consumer decoration

The product should look like a premium ophthalmology workbench: calm ice-aqua canvas, deep teal identity, mint selection states, clean rounded panels, rich but accurate clinical visuals, precise typography and generous alignment. It must remain fast, information-dense and safe. Use warmth in login, overview, empty states and brand headers; use precision in tables, prescription forms, triage, reports and diagnostic workspaces. Prefer purposeful whitespace, one primary action per action group, real evidence and stable layouts over decorative effects. Do not create a giant eye hero in every screen, pill-shape every control, or put charts inside translucent containers that reduce contrast.

### 1.3 Personas and role-aware entry points

| Persona | Default landing [D] | Main job | Highest priority information | Limits |
|---|---|---|---|---|
| Ophthalmologist | My clinical overview | Review evidence, assess, sign, publish Rx, escalate | Urgent queue, pending HITL, longitudinal evidence, missing data | Authorized patients/clinic only; sign-off and Rx publication require ophthalmologist permission |
| Optometrist | Diagnostic worklist | Capture and review authorized measurements | Quality, studies needing completion, test history | No final ophthalmologist sign-off/Rx publish; exact actions via policy |
| Technician | Acquisition worklist | Ingest correct patient/eye/modality, recapture | QC failures, device connection, queue status | No sign-off or autonomous interpretation |
| Triage nurse/coordinator | Unified triage | Claim, contact, escalate, refer, close loop | SLA due, ownership, contact outcomes, staffed hours | No changing clinical urgency floor or prescription |
| Clinic admin | Clinic operations overview | Configure staff, hours, templates, permitted integrations, pilot KPIs | Capacity, access, operational failures | No blanket clinical access; no final sign-off merely from admin role |
| Internal support | Internal operations console | Investigate service issues, audited support | Tenant scope, job IDs, health, access events | Default-deny PHI, time-limited break-glass only per policy |
| Research-authorized user [G] | Research governance | Review consented pseudonymized dataset exports | Consent status, manifest, eligibility, audit | Separate from ordinary clinical care, no raw PHI export |

Role combinations are allowed only as backend grants. The frontend consumes capabilities, not hardcoded role-name assumptions. Example matrix is proposed: ophthalmologist read/write clinical, sign/publish; optometrist and technician capture within scope; coordinator contact/referral; admin operational settings; internal ops redacted diagnostics. All exports, cross-clinic selection, patient merge or sensitive audit access require explicit server permission. Do not implement patient merge unless approved by a contract.

### 1.4 Critical journeys and success criteria

- **Care:** enroll patient → identify eye-specific surgical episode → approved template → draft Rx → version diff/validate → authorized publish → app/caregiver/Print+Phone receipt → adherence/symptoms → triage → referral/outcome → closure summary.
- **Diagnosis:** patient selection → study/eye/modality → upload/device ingestion → QC hard gate → valid async job → specialist viewer → evidence fusion/discordance → grounded Persian draft → authorized ophthalmologist review/sign → urgent routing and signed patient-safe summary where available.
- **Home vision:** eligible device/approved protocol → qualified session receipt → baseline/trend → clinician review and deduplicated alert → next action. No unqualified values incorporated into a trend unless a validated policy explicitly supports them.
- **Administration:** configure authorized clinic and staffed hours → provision staff grants → version templates → test integration → verify audit and pilot scorecard. Every critical mutation has server acknowledgment and visible outcome.

## 2. Visual system — Bina Clinical Glass Desktop

### 2.0 Desktop reference registry and reconstruction method (V2, normative visual direction)

The approved direction is the **latest independent desktop renders**, not the earlier oversized card system. The last 20-screen board supplies the remaining screen concepts. These are raster concept images, not Figma or DOM exports: the measurements below are deliberately normalized CSS design targets, not claims about exact source-layer dimensions. Do not copy their synthetic patient identities, inconsistent numeric values, clinical conclusions, or anatomical imagery into production. Never use a screenshot as the actual UI background. Reconstruct components as accessible HTML/CSS and real medical-data viewers.

Visual precedence: (1) PRD/ADR/backend policy for behavior and clinical safety; (2) this V2 for normalized visual tokens, RTL and density; (3) independent references for layout/composition; (4) 20-screen board for screens without an independent render; (5) mobile V2.1 for brand assets and family resemblance. The generated images disagree on navigation side, sidebar color, language, logo drawing, some medical content and urgency labels. **Resolve once globally:** right-hand navigation in Persian RTL, light ice-aqua sidebar by default, optional deep-teal sidebar variant only as a deliberate global preference if approved (not a different route-specific theme), original A02 logo, same component sizes across all pages. Translate English-only triage references into Persian; do not copy LTR navigation. Dark is a designed counterpart, not an observed generated screenshot. A screenshot's medical content never overrides PRD/ADR (e.g., active CNV urgent floor, not the mock follow-up suggestion). For a conflict with layout only, use the reference with the most relevant information architecture and the rules below.

#### 2.0.1 Exact source inventory

Store these unmodified references in `docs/design/reference/staff-web/`; do not ship them in the runtime bundle. The alias is used throughout this specification, not a renaming requirement. Fourteen separate renders are available (seven unique page families, several variants), plus the 20-tile board. There are not 20 independently rendered final screens. Missing independent renders are deliberately specified from the board and original functional inventory.

| Alias | Exact source filename | Raster W×H | Visual use / what to keep |
|---|---|---|---|
| R01 | `a_wide_ultra_detailed_polished_desktop_web_appli.png` | 1672×941 | OCT diagnostic review: black central image, compact measurements, evidence strip, left differential/action panel, right nav |
| R02 | `a_high_detail_realistic_desktop_ui_screenshot_of.png` | 1672×941 | Patient 360: patient directory, identity and KPI strip, split trends, eye summaries, recent studies, timeline and context rail |
| R03 | `a_highly_detailed_realistic_ui_dashboard_screensh.png` | 1672×941 | Care dashboard: five metrics, wide dense episode table, calendar/agenda, four-state adherence and referral cards |
| R04 | `a_wide_detailed_high_fidelity_ui_screenshot_da.png` | 1672×941 | Triage: queue, selected alert context, urgent preview, charts, ownership/actions; translate English and mirror shell only |
| R05 | `a_high_resolution_detailed_ui_dashboard_screensho.png` | 1672×941 | Main dashboard alternate: agenda, operational trend, diagnostic status ring, alerts, clinic metrics, patient table, quick actions |
| R06 | `a_wide_high_resolution_detailed_modern_dashboard.png` | 1672×941 | Monitoring population: KPI strip, multi-filter table, device state, trend/adherence and selected patient inspector |
| R07 | `a_high_detail_modern_desktop_dashboard_ui_screens.png` | 1586×992 | Primary overview reference: right nav, compact wave header, five KPIs, 3-column card mosaic, recent activity |
| R08 | `a_highly_detailed_polished_ui_screenshot_of_a_cli.png` | 1586×992 | OCT alternative: thumbnail modality rail, frame filmstrip, quantitative measures, layer controls, draft AI evidence |
| R09 | `a_detailed_realistic_ui_screenshot_of_a_desktop_w.png` | 1586×992 | Care coordination: compact tasks, agenda, team assignment and referral timeline |
| R10 | `a_detailed_realistic_ui_screenshot_a_polished_m.png` | 1586×992 | Monitoring patient workspace alternate: patient list, dual trends, device quality, recent tests, dark teal sidebar variant |
| R11 | `a_detailed_realistic_desktop_ui_screenshot_of_a_m.png` | 1586×992 | Triage alternate: list/detail split, selected row, evidence thumbnails, timeline, persistent action area; English to Persian |
| R12 | `a_high_detail_realistic_ui_dashboard_screenshot_o.png` | 1587×991 | Patient directory and 360 split, dark teal nav variant, OD/OS summaries and recent metrics |
| R13 | `a_highly_detailed_modern_clean_ui_screenshot_of.png` | 1586×992 | Fundus: large evidence viewport, modality rail, raw/mask controls, compact cross-modal cards and differential |
| R14 | `a_detailed_clean_modern_persian_rtl_medical_we.png` | 1586×992 | Care dashboard alternate: queue/calendar, adherence/alerts/referrals; reuse components from R03/R09 |
| BOARD | `bina_ai_ophthalmology_ui_system.png` (latest 20-tile board, gen bdcd3f2a) | 1448×1086 | Navigation/content concept for all 20 anchor pages; no upscaling tiles as standalone deliverables |

Source values sampled using RGB quantization on resized raster regions (not design tokens): R07 common pale tones `#EAF3F5`, `#F4FAFB`, `#F3F7F9`, `#EDF6F8`, `#D5E5E8`; R01 common light tones `#F0F4F8`, `#F5F8FC`, `#F1F7FA`, `#FAFCFE`, dark evidence `#171B1E`; R10 dark sidebar clusters `#034D52`, `#013C41`, `#01363B`, `#0A484D`; R12 dark sidebar clusters `#0E4144`, `#0E3A3F`, `#0A3339`. These establish the neutral/aqua character and dark sidebar variant, not exact authored hex values. §2.2–2.4 defines contrast-checked canonical colors, adjusted for consistency and legibility. Do not sample text antialiasing or medical imagery as a UI token.

#### 2.0.2 Density is an acceptance requirement, not a subjective suggestion

- Use native desktop CSS viewport sizes, not an enlarged mobile card. At 1600×1000, expanded nav 196px, content 1404px, gutters 16px, usable 1372px; at 1440×900, nav 184px, content 1256px, gutters 12px, usable 1232px. A separate 56px global bar; no desktop browser chrome inside application. Most mock screenshots are 16:9 or 16:10; use both in tests. No fixed-size artboard, global CSS scale, zoom hack or bitmap layout.
- Standard header 48–56px total including one subtitle; KPI strip 84–96px; chart/queue middle band 228–280px; bottom content visible above fold on normal desktop. First useful worklist starts around y=170–230 on lists and y=175–205 on overview. Aim for 8–12 readable worklist rows on list-first pages at 1440×900 when available (with selection/context open, 6–10 depending on layout); do not fabricate rows to meet density. Detail pages may scroll; no arbitrary cut-off of clinical evidence.
- Page h1 22px, panel title 15px, body/table 13–14px, labels 12–13px, numeric KPI 26px max default. Keep all important clinical text at least 13px, urgent/action text at least 14px; scale with browser zoom. Default buttons 36px with 12px horizontal padding, nav items 36px, rows 38px, 12px cards, 10–12px gaps. Accessibility density expands controls; never reduce readable text or focus targets just to fit a screenshot.
- Cards size to content, not viewport: use 12-column dashboard mosaics, compact horizontal status tiles, split views, in-card dividers, stacked rows, context drawers, miniature charts only when appropriate. Most panels show at least two meaningful pieces of information (e.g., metric+source, chart+legend). Avoid giant empty surfaces, excessive gradients, full-page greetings and oversized donut charts. Clinical image may occupy substantial central space because source inspection needs it; surrounding tools/summary remain compact.
- Use real semantic containers and HTML text. Do not copy fake window controls, giant floating logos, marketing upgrade banners, decorative stock avatars, inconsistent eye assignments, sample drug recommendations or imaginary SLA tiers. Use initials for absent patient photos. Use approved artwork on login and selected headers; no image/photo as evidence unless from actual authorized clinical source or validated synthetic fixture.

### 2.1 Reference hierarchy and assets

Visual priority: see §2.0. Desktop composition follows R01–R14 and BOARD; the mobile V2.1 artwork and semantic family remain shared. Dark is a coordinated translation, not inversion. Use the four approved local brand artworks below.

| Asset ID | Original filename | Use on desktop | Size and treatment |
|---|---|---|---|
| A01 | `teal_emerald_eye_in_flowing_waves.png` | Login brand panel; optional empty onboarding illustration; small overview banner only | 320–480px square login crop, max 168px overview; `object-fit:contain`, soft edge mask; no clinical viewer use |
| A02 | `bina_ai_glossy_eye_logo.png` | Sidebar, login, approved print branding | Crop whitespace without distorting logo; horizontal lockup 132–156px wide, 36–40px high; collapsed rail mark-only derivative 32px; login width 200px; brand name unchanged in LTR |
| A03 | `serene_mint_wave_layers.png` | Login background footer or rare nonclinical empty state | full brand panel width, height 100–180px; gradient mask toward content; never full clinical table background |
| A04 | `minimal_mint_teal_wave_banner.png` | Small overview or settings header behind title, not across table body | max 560×140px desktop, anchored inline-end (physical left in RTL) matching source composition; opacity .35–.65 Light / .15–.30 Dark after derivative; fade toward text |

Proposed paths: `apps/staff-web/src/assets/design/source/` (originals, not imported into entry bundle), `src/assets/design/runtime/` (cropped transparent or theme-compatible derivatives, local WebP/PNG/SVG when honestly vectorized). If a shared monorepo asset package exists, reuse it instead of duplicating originals. Ship only runtime derivatives. For A02 preserve wordmark shape and negative space; dark version needs a light wordmark with preserved teal/lime mark, not a bright rectangular source backdrop. Cropping/alpha cleanup requires manual QA; do not claim generated vector is the exact original. A01/A03/A04 dark versions maintain curves and iris hue but reduce luminance and fade to canvas; never apply theme filters to medical assets. If derivatives missing, use a plain text brand or static CSS ribbon fallback until approved. Decorative artwork `aria-hidden=true`, no pointer events, absolutely positioned within clipped header, no layout shift. Logo has accessible brand name once. No external image CDN.

### 2.2 Canonical semantic color tokens (desktop V2, aligned with mobile V2.1)

Use these tokens as CSS custom properties with kebab-case names (`canvasTop` → `--canvas-top`). Token parity matters more than library presets. The table retains the mobile semantic family but adjusts selected light neutrals and selection colors to the latest desktop renders; desktop-only additions follow. Contrast must be tested on composited colors, especially gradients. Green is not synonymous with normal; teal is the identity. Clinical colors use explicit legends, not brand colors by default.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| canvas | `#EDF5F7` | `#091B20` | Main ice-aqua / midnight teal scaffold |
| canvasTop | `#F4F8FA` | `#10272D` | Top luminous background |
| canvasBottom | `#E5F0F3` | `#0C2228` | Bottom background |
| surface | `#F8FBFC` | `#142C32` | Opaque fallback card, nav surface |
| surfaceRaised | `#FFFFFF` | `#1B373D` | Dialog, menu, focused input |
| surfaceSoft | `#EAF3F5` | `#18343A` | Secondary surface, segmented track |
| surfaceMint | `#E5F8F2` | `#173F3A` | Tests/hero soft mint base |
| surfaceAqua | `#E5F5F8` | `#17343D` | Cool card or subpanel |
| surfaceCream | `#F5F9E8` | `#293C30` | Pale warm metric cards |
| onSurface | `#102126` | `#F1F8F7` | Headings, default text |
| onSurfaceVariant | `#40565D` | `#B8D0D1` | Secondary copy, dates |
| muted | `#50676D` | `#A7C2C4` | Noncritical metadata |
| primary | `#006C66` | `#77E0CE` | Primary text/links, focus accents |
| onPrimary | `#FFFFFF` | `#062823` | Foreground on solid Material primary |
| primaryContainer | `#D1EFEC` | `#194B42` | Selected navigation capsule |
| onPrimaryContainer | `#005D48` | `#9BF1D2` | Selected icon/label |
| primaryGradStart | `#007D77` | `#097D74` | Text-bearing gradient start |
| primaryGradEnd | `#005C57` | `#07554F` | Text-bearing gradient end |
| onPrimaryGradient | `#FFFFFF` | `#FFFFFF` | Shared white label for gradient button |
| primaryShine | `#06A99E` | `#29B7A6` | Decorative top edge only, never behind label |
| secondary | `#007F78` | `#68D9D1` | Secondary icon, supporting metric |
| onSecondary | `#FFFFFF` | `#082E2B` | Foreground on solid secondary |
| tertiary | `#5654A6` | `#BEBBFF` | VR/education icon accent |
| onTertiary | `#FFFFFF` | `#222052` | Foreground on solid tertiary |
| tertiaryContainer | `#E7E8FC` | `#302D58` | VR/education icon well |
| onTertiaryContainer | `#41418E` | `#D4D1FF` | VR/education line icon |
| outline | `#55747A` | `#7FA1A6` | Essential control boundaries |
| outlineVariant | `#D5E5E8` | `#35535A` | Decorative divider/card stroke |
| glassEdge | `#FFFFFF` | `#3D6267` | Soft highlight around frosted card |
| focus | `#006C66` | `#80E7D5` | Visible focus ring |
| shadow | `#2D777C` | `#00090C` | Subtle colored light shadow / dark depth |
| scrim | `#10292D` | `#000000` | Modal backdrop, applied at 45% |
| disabledBg | `#E1EBED` | `#243B40` | Disabled control |
| disabledFg | `#52686D` | `#A1B8BB` | Disabled label |
| success | `#216F1C` | `#9AE78F` | Stable/confirmed *when authorized* text |
| successBg | `#DDF6D5` | `#203E29` | Stable/confirmed container |
| successIcon | `#237A19` | `#287A3A` | Solid check circle with white tick |
| successVivid | `#20B600` | `#6AD950` | Decorative green highlight; not text/sole signal |
| warning | `#805200` | `#FFD387` | Attention/pending text |
| warningBg | `#FFF2D3` | `#44351D` | Attention/pending container |
| error | `#A72D35` | `#FFB3B5` | Error text, urgent foreground on pale container |
| errorBg | `#FDE8E8` | `#49262D` | Error/urgent container |
| urgentAction | `#A72D35` | `#AA303A` | High-priority urgent call button |
| onUrgentAction | `#FFFFFF` | `#FFFFFF` | Urgent call label |
| info | `#195B89` | `#A8D6FF` | Information text |
| infoBg | `#E1F0FA` | `#1C364B` | Info card |
| neutral | `#40565D` | `#C3D4D5` | Unknown, no result, neutral text |
| neutralBg | `#EAF2F3` | `#263D42` | Unknown/neutral label |
| medicationWell | `#FFF3D8` | `#44351D` | Golden drug/drop icon background |
| medicationInk | `#8A5800` | `#FFD387` | Accessible golden line icon |
| planWell | `#E3EEFF` | `#203A55` | Calendar/report blue background |
| planInk | `#2255A4` | `#A8CAFF` | Blue icon stroke |
| testWell | `#DCF5EF` | `#1D463F` | Teal dot-matrix/IOP icon background |
| testInk | `#006C66` | `#8FE3D6` | Teal icon stroke |
| profileWell | `#E0F4D9` | `#273E30` | Profile green icon background |
| profileInk | `#296B2B` | `#B1E8A6` | Profile green icon |
| chart1 | `#287A19` | `#9AE78F` | IOP primary series, non-semantic |
| chart2 | `#006E7A` | `#72DBEE` | Alternative series if approved |
| chartAxis | `#40565D` | `#B8D0D1` | Tick labels and necessary axis lines |
| chartGrid | `#D2E3E6` | `#36545A` | Decorative grid |
| chartBand | `#DDF6D5` | `#28482D` | Prescribed target zone, optional |
| chartBandEdge | `#447B37` | `#9AD58E` | Boundary/dashed line and legend mark |
| ribbonAqua | `#A6EAE9` | `#16484E` | Decorative aqua ribbon |
| ribbonTeal | `#7BDCCB` | `#176052` | Decorative teal ribbon |
| ribbonMint | `#BDEED8` | `#1D513F` | Decorative mint ribbon |
| ribbonLime | `#D9F3AE` | `#40572E` | Decorative warm green ribbon |
| ribbonHighlight | `#FFFFFF` | `#659E93` | 0.75–1dp ribbon edge, low opacity |
| irisTeal | `#008B88` | `#169E96` | Brand/art, not a clinical data encoding |
| irisGreen | `#83CF58` | `#77BC63` | Brand/art, not a clinical data encoding |
| vfPaper | `#FFFFFF` | `#FFFFFF` | Locked clinical map paper if actual source map uses it |
| vfInk | `#171717` | `#171717` | Locked map axes, never invert medical map automatically |

### 2.3 Desktop semantic extensions

| CSS token | Light | Dark | Use |
|---|---|---|---|
| `--sidebar` | #F8FBFC | #10272D | Solid/frosted nav backing |
| `--topbar` | #F8FBFC | #142C32 | Global bar |
| `--table-head` | #EAF3F5 | #18343A | Sticky table headings |
| `--row-hover` | #EAF3F5 | #1B373D | Hover, not selected |
| `--row-selected` | #D1EFEC | #194B42 | Selected, checked plus outline |
| `--row-alternate` | #F1F7FA | #11292F | Optional subtle zebra for dense tables |
| `--viewer-canvas` | #090D12 | #090D12 | Theme-invariant diagnostic viewport |
| `--viewer-chrome` | #17232C | #17232C | Neutral viewer toolbar |
| `--viewer-text` | #E8EEF1 | #E8EEF1 | Viewer labels |
| `--viewer-border` | #53636E | #53636E | Viewport separators |
| `--viewer-focus` | #83E8D6 | #83E8D6 | Selected viewport outline, not anatomical overlay |
| `--chart-od` | #006C66 | #77E0CE | OD comparison series, solid + circle |
| `--chart-os` | #2468B6 | #8CC4FF | OS comparison series, dashed + diamond (reference blue; text/shape still required) |
| `--chart-reference` | #805200 | #FFD387 | Target/reference, dashed |
| `--chart-rejected` | #A72D35 | #FFB3B5 | Excluded observations, x marker |
| `--chart-baseline` | #40565D | #B8D0D1 | Reference series, dotted |
| `--chart-band-neutral` | #E1F0FA | #1C364B | Uncertainty band, never interpreted as normal |
| `--link-visited` | #5654A6 | #BEBBFF | Noncritical visited links |
| `--code-bg` | #EAF2F3 | #263D42 | Technical metadata only |
| `--nav-deep-start` | #0E4144 | #0D3438 | Optional deep-teal sidebar top |
| `--nav-deep-end` | #0A3339 | #09272D | Optional deep-teal sidebar bottom |
| `--nav-deep-ink` | #F1F8F7 | #F1F8F7 | Deep sidebar text |
| `--nav-deep-muted` | #C1DEDF | #B8D0D1 | Deep sidebar group label |
| `--nav-deep-selected` | #006C66 | #194B42 | Deep sidebar active background |
| `--nav-deep-selected-ink` | #FFFFFF | #9BF1D2 | Deep sidebar active text |
| `--chart-operational-blue` | #2468B6 | #8CC4FF | Secondary operational series |
| `--chart-operational-teal` | #007F78 | #68D9D1 | Primary operational series |
| `--chart-operational-purple` | #6655B8 | #BEBBFF | Third operational series |
| `--chart-operational-amber` | #A56B00 | #FFD387 | Fourth operational series |
| `--panel-divider` | #D5E5E8 | #35535A | Internal separators |
| `--selected-outline` | #007F78 | #77E0CE | Visible selected row outline |
| `--icon-well` | #E5F5F8 | #17343D | Ordinary icon backing |

Use the inherited `primary` as solid primary button background with `onPrimary`; gradient buttons only for the high-visibility login and occasional dashboard primary CTA, **not** every clinical action. White on the inherited bright `secondary`/gradient starts may fail normal-text contrast; use `--primary`/`--on-primary` or darken the text-bearing gradient to Light `#006C66 → #005C57`, Dark `#086B64 → #07554F` with white. Reserve `primaryShine` and `successVivid` for nontext decoration. Border `outlineVariant` is decorative; essential input and selected-state boundaries use `outline` or focus. Error and warning use text + icon + container, never color alone. UI status aliases: urgent=error, scheduled=warning, routine=info/neutral unless confirmed clinical context supports success; QC pass=success, reject=error, pending=neutral/info, unknown=neutral, unsigned=warning, signed=success, stale=warning. Signed means signed, not healthy.

### 2.4 Surfaces, geometry and lighting

| Recipe | Light | Dark | Use |
|---|---|---|---|
| Canvas | `linear-gradient(150deg, canvasTop 0%, canvas 40%, canvasBottom 100%)` | same mapped tokens | Root shell only |
| Standard card | surface, 1px outlineVariant | surface, same stroke | Tables, forms, charts |
| Frosted hero | surfaceRaised 96% → surfaceMint 94% → surfaceAqua 92% | surfaceRaised 98% → surfaceMint 96% → surfaceAqua 96% | Login/overview hero only; opaque backing before text |
| Nav | sidebar solid, 1px separator | same | Sticky sidebar and topbar |
| Primary gradient | #006C66 → #005C57 | #086B64 → #07554F | Rare nonclinical CTA, white label |
| Chart | surfaceRaised/surface, no gradient | surface/surfaceRaised | Clinical plot/background |
| Viewer | viewer-canvas | viewer-canvas | Theme-invariant image canvas |
| Urgent strip | errorBg, error text/icon and 3px inline-start border | same mapped | Critical, non-dismissible where required |

Shadows as named CSS tokens: `--shadow-1`: Light `0 2px 6px #2D777C0D`, Dark `0 2px 6px #00090C40`; `--shadow-2`: Light `0 6px 20px #2D777C15, 0 1px 3px #2D777C0D`, Dark `0 6px 20px #00090C59`; `--shadow-overlay`: Light `0 16px 48px #10292D26`, Dark `0 16px 48px #00090C99`. Border first, shadow second. Avoid shadows on every table row. No per-card backdrop-filter; optional single clipped login art glass layer after performance verification. Use `--scrim` at .45 Light/.60 Dark. All borders 1px except focus 2px, urgent strip 3px, clinical canvas selection 2px.

Spacing (px, CSS rem equivalents using default 16px root): 0, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64. Use 4/8 base; 6 and 2 for compact details. Radii: 4 small data chips, 6 dense inputs, 8 buttons/fields, 10 small cards, 12 tables/chart panels, 12 standard cards, 16 hero/login, 999 pill only for status/segments/avatar. Viewer 4–8px. Default card padding 12–14, compact 10–12, spacious editor 16, page margin 12–16. Do not hardcode a fixed pixel height for content text, truncate only with an accessible way to expand. Use CSS logical margin/padding/inset/border/inline-size. Directional shadows/gradients can mirror decorative elements only; never data.

### 2.5 Typography

Self-host Vazirmatn WOFF2 with verified license. Use actual available weights 400/500/600/700; font-synthesis none; `font-display:swap`; pre-load the primary face only. Font stack `Vazirmatn, Tahoma, Arial, sans-serif`. Do not bundle font files from this document. Brand uses approved wordmark artwork rather than recreating with a guessed font. Technical monospaced identifiers may use local system mono with bidi isolation. Set `font-variant-numeric:tabular-nums` for metrics, counters, timestamps and table numeric columns if supported by font; preserve shaping. No artificial letter spacing in Persian.

| Role | Size/line height px | Weight | Usage |
|---|---|---|---|
| Display | 24/36 | 700 | Login only; no oversized hero |
| Page h1 | 22/32 | 700 | One h1 per route |
| Section h2 | 17/26 | 600–700 | Major panels |
| Card h3 | 15/24 | 600 | Card names |
| Body | 14/24 | 400 | Ordinary reading |
| Body emphasis | 14/24 | 600 | Primary row labels |
| Compact table | 13/20 | 400–500 | Default dense desktop data |
| Label | 13/22 | 500–600 | Form label, navigation |
| Caption | 12/20 | 400 | Secondary timestamp, source |
| KPI | 26/34 | 700 | Compact numeric headline |
| Metric | 20/28 | 600 | Clinical summary |
| Chart tick | 12/18 | 400–500 | Axis, legend |
| Report body | 15/28 | 400 | Long-form Persian report |

Root UI 16px (1rem); size tokens in rem to support browser zoom. Numeric units visually adjacent, lower emphasis but not tiny; keep values and units in one semantic label. Minimum 12px noncritical labels, 13px clinical labels, 14px critical content. No text rendered as image except brand or immutable clinical evidence. Line wrapping and native select controls tested in RTL.

### 2.6 Iconography

Prefer one self-hosted, tree-shaken outline icon set already in repo (Lucide-style if no existing set), 1.75–2px stroke, round caps, consistent optical sizes 16/18/20/24. Nav 18, primary actions 16–18, table icons 16, large empty 40. Use icons with text for urgent, destructive, eye, upload, sign-off and status. Arrow/back follows logical navigation in RTL; play, download, check, plus, clock, chart axes, anatomy and laterality do not mirror. Teal well for diagnostics, blue for report/calendar, purple for education, gold for medication, mint for user. Standard icon well 30×30 radius 8; avoid multi-colored icons in dense tables. Icon-only controls require accessible label, tooltip and hit area.

## 3. Application shell, layout and navigation

### 3.1 Desktop shell specification

At 1600×1000 CSS px: right sidebar 196px expanded, content 1404px, topbar 56px, body padding 16px, usable 1372px; grid 12 columns gap12. At 1440×900: sidebar 184px, main 1256px, padding12px, usable1232px; gap10. Sidebar sticky full height, brand block 60px, group headings 11–12px, nav scroll independently, bottom account/settings block 52px. Main body scrolls vertically, global bar sticky; do not nest general scroll containers except data table/viewer. Topbar: search 320–440px; clinic scope, date where useful, notifications, theme switch and clinician profile/avatar (32px). Search and scope may wrap into two rows at smaller widths. Page header title at right, compact subtitle, left controls. Urgent banner between bar and content. Use the R07 right-side layout; artwork restricted to header and bottom of nav. No browser chrome or Mac window dots. Deep-teal sidebar variant is optional global preference only (see §2.0 and tokens), not a route-specific skin.

Sidebar: grouped and collapsible, item 36px height, 10px horizontal padding, radius 8, icon at inline-start, label, count only if real. Active row primaryContainer, onPrimaryContainer and 3px inline-start indicator; keyboard focus visible, `aria-current=page`. Group labels 12px, no decorative icons per heading. Collapsed rail 60px: logo mark, icons, tooltips, accessible names. Keep selected module and submenu open; nested route keeps parent active. No role-unavailable module links. Gated module either hidden or a permitted explanatory page, not a dead action. Primary destinations:

| Group | Persian | English/route prefix | Icon |
|---|---|---|---|
| Work | داشبورد | Overview `/overview` | layout-dashboard |
| Work | بیماران | Patients `/patients` | users |
| Work | میز کار تشخیصی | Diagnostics `/diagnostics` | scan-eye |
| Work | پایش خانگی | Remote Monitoring `/monitoring` | activity |
| Care | مراقبت و درمان | Care Operations `/care` | heart-pulse |
| Care | تریاژ و هشدارها | Triage `/triage` | bell-ring |
| Care | پیگیری‌ها و ارجاعات | Follow-ups `/follow-ups` | calendar-check |
| Records | گزارش‌های پزشکی | Reports `/reports` | file-text |
| Records | آمار و عملکرد | Analytics `/analytics` | chart-no-axes-combined |
| Admin | مدیریت کلینیک | Clinic Admin `/admin` | building-2 |
| Admin | دستگاه‌ها و اتصالات | Integrations `/integrations` | plug |
| Admin | عملیات سیستم | Internal Ops `/ops` | server |
| Account | تنظیمات | Settings `/settings` | settings |

A separate public login shell and full-bleed clinical review shell share tokens. Fullscreen viewer collapses sidebar to rail or hides it on explicit action; retains patient/eye/study identity, exit, urgency and keyboard escape. Split workspace: 148–168px study rail + flexible viewer (min 480px) + 296–320px inspector, 10–12px gaps. At narrow desktop inspector becomes tab/drawer, never overlays the image without explicit action. Optional split resize handles 6px visual/24px target; clamp panes, keyboard resize, reset layout; persist only nonclinical preference. Use sticky patient context bar height min 60px and footer action tray min 56px for sign-off/editing. Reserve bottom padding so last field is not obscured. Never leave a stale patient's details in header while another's loading.

### 3.2 Responsive and density rules

| Viewport CSS px | Layout |
|---|---|
| ≥1920 | Sidebar 208–216, content max 1920 for reading dashboards; clinical viewer may use all width; 5–6 KPI columns; 3 pane review |
| 1440–1919 | Sidebar 184 at 1440 / 196 at ≥1600, 12–16px padding, 12 cols; 4–5 KPIs, 3 pane review when fits |
| 1280–1439 | Sidebar 176 or rail on viewer; 12px padding; 12 cols; optional inspector tab |
| 1024–1279 | Rail 60 default; 12px padding; 8 cols; two panels; inspector drawer; 2–3 KPIs |
| 768–1023 | Sidebar overlay, 16px padding, 6 cols; single/two column; tables local horizontal scroll; read/triage tasks possible |
| <768 | Narrow fallback, one column, no forced desktop zoom; allow authorized review/contact/read tasks; advanced calibrated image review must show explicit larger-display requirement if clinical owner requires; never silently sign from inadequate view |

At zoom 200% and 400% use responsive stacking and reflow; data grids and clinical spatial maps may require scoped horizontal scroll, not global body overflow. Browser native zoom works. Compact default table density 38px rows, comfortable 44px, accessible 56px; header 36px. Actions min 36×36 desktop (32×32 compact icon target with safe spacing), 44–48 touch/accessible; dense noninteractive metadata can be smaller. Layout presets store only preference. No data lost on reflow; preserve list sort/scroll/filter and selected tab within authorized context.

### 3.3 Page archetypes

- **P-DASH:** header + 4–5 KPI cards (84–96px tall), second row asymmetric mosaic 3/5/4 or 8/4, third row table or agenda; typical chart panel 228–280px; optional header artwork behind 48–56px heading, never pushes urgent queue below fold. Cards drill into filtered real lists.
- **P-LIST:** title/action, concise count, filter bar, active chips, table with sticky header, pagination and selection summary. Side detail drawer 340–420px optional. Main table is visible above fold; no huge hero.
- **P-PATIENT:** sticky patient identity, alerts and eye status; scoped tabs; 8+4 columns for main overview and next actions; 12-col clinical charts; both eyes explicit. Breadcrumb links to list; context persists across tabs.
- **P-EDITOR:** page context, stepper for multi-stage creation only; main form 8 cols + contextual read-only preview 4 cols; sticky footer with cancel/save/submit; validation summary and per-field hints; version conflict drawer.
- **P-VIEWER:** neutral dark viewport, technical toolbar, study asset rail, inspector; no brand waves. Patient context and urgent flags outside pixel area. Compare view 2-up/4-up with source orientation preserved.
- **P-REVIEW:** evidence rail 200–220px + editable structured report flexible + validation/urgency inspector 288–320px; sticky version/action bar. On smaller width use mutually exclusive evidence/report tabs; preserve context and edits.
- **P-DETAIL:** header with identity/status/source, summary cards, sub-tabs, two-column sections and related timeline; action tray when needed.
- **P-ADMIN:** settings groups in card surfaces, list/detail, inline validation; sensitive actions in separated section, not mixed with clinical work.
- **P-AUTH:** split 55/45 at ≥1024; right form max 380px, left artwork panel with A01/A03, centered logo, quiet text; below 1024 collapse artwork. No clinical data on unauthenticated route.
- **P-SYSTEM:** centered max 480px error/permission/maintenance, clear recovery and support path, no PHI. Offline banner for authenticated shell rather than replacing safe in-progress content.

### 3.4 Navigation behavior and context

Use route segments for primary destinations and meaningful patient/study/episode context; tabs with deep links for clinical subviews. Proposed IDs in §8 are UI routes, not API endpoints. Query params only for allowed non-PHI filters (range, status, view, page; do not serialize names, MRNs, notes, tokens). Server-side authorization on every load. Global search is permission-scoped and debounced (250ms), with patient/study/report types and no sensitive suggestions before authorized query. Do not persist search text containing PHI. Use `Ctrl/Cmd+K` only if safe to intercept and provide visible entry; Esc closes. Search within patient opens results without changing eye automatically. Route change focuses heading, restores prior list scroll on back; unsaved form guard offers save/discard/stay with conflict policy. No navigation away on background job completion; toast + queue link. Breadcrumb should not expose patient data outside scope. Use accessible native links for navigation, buttons for actions. Deep link stale/forbidden routes fail closed, not fallback to another patient.

## 4. Component library and exact behavior

Every reusable component has typed props, localized copy, tokens, keyboard semantics, responsive variants, state fixtures and tests. Prefer native semantics first, headless accessible primitives where needed. No custom div-buttons. Components below are proposed names, not an instruction to install packages. The `PatientContext` is mandatory on clinical mutations; clinical components receive explicit `eye`, source and version, never infer them from layout.

| Component | Anatomy and default dimensions | Behavior and variants |
|---|---|---|
| `AppShell`, `Sidebar`, `Topbar` | §3 dimensions, sticky shell | Expanded/rail/overlay; scoped groups, current route, no hidden focusable children |
| `BrandLockup`, `BrandArtwork` | A02, A01/A03/A04 per §2 | Theme source, static mask, graceful text fallback, decorative noninteractive |
| `PageHeader`, `Breadcrumbs` | 22px title, 2–4px gap to subtitle, actions inline-end | Wrap on narrow; breadcrumb links, last item current; no PHI outside authorized context |
| `PatientContextBar` | min60px, avatar/initials 36–44, ID, clinic, source, full eye labels, alert indicator | Sticky, read-only identity; explicit switch/compare; clear before context loads; no decorative verified badge |
| `Button` | 36px min height, horizontal padding 12, radius 8, 16–18px icon + 6 gap | Primary solid, secondary outlined, subtle/ghost, destructive, gradient limited; submit loading retains width, prevents double submit; focus/disabled variants |
| `IconButton` | 36×36, icon 16–18 (compact table 32×32) | Accessible name and tooltip, no unlabeled kebab; hover and selected use surfaceSoft/primaryContainer |
| `SplitButton` | main 36px + 36px menu | Optional authorized export variants only; primary action named; dangerous actions separate |
| `TextLink` | 14/24, primary, underline hover/focus (persistent for inline prose) | Native navigation; external destination indicator; no imperative click on plain text |
| `Card`, `Panel`, `SectionHeader` | 12px radius, 12–14px padding, header 15/24 | Standard/compact/hero/clinical; header action and description; no nested card chrome unless distinct grouping |
| `MetricCard` | 84–96px height minimum by content, 12px padding, 26px number, 12px source | Label, value+unit, time window, denominator/source, delta if meaningful, optional sparkline with label; unavailable not zero; clickable only if drilldown real |
| `EyeSelector`, `EyeLabel` | 36px segmented, full Persian names + OD/OS; optional both comparison | No default guessed from image, bilateral filter never bilateral Rx write; data scope and URL update atomically; eye color optional but text always |
| `StatusBadge`, `UrgencyBadge` | 22–24px, radius 999, 7px pad, 12–14px icon | semantic tokens; urgent distinct from process, QC, signed, connectivity; announce status change without every tick |
| `AlertBanner`, `InlineNotice` | min40px, 10–12 padding, icon, title, explanation, action | Info/warning/error/urgent; persistent for blockers, optional close only noncritical; no alert-only color |
| `Tabs`, `SegmentedControl` | 36px tabs, 34–36px segment track, 2px selected underline or mint pill | Native buttons with appropriate tab semantics; arrows roving focus, manual activation for expensive lazy panels; preserve per-tab filters |
| `FilterBar`, `FilterChip`, `FilterDrawer` | 36px inputs, 6–8 gap, chips 24–28px | Search, multi-select, ranges, apply/reset, number applied, close chip only if removable; server pagination resets on filter changes |
| `SearchBox`, `CommandPalette` | 36px field, 640px max dialog | Loading/none/denied; debounce, abort superseded query; results grouped, keyboard, scope visible; no PHI persistence |
| `DataTable` | §3 row heights; header 36; 8–10px cell padding; 1px separators; radius12 wrapper | Sort, server pagination, optional sticky identity/actions, resize if safe, column chooser, density; selection by stable opaque ID, clear on scope change, accessible caption/headers; bulk actions only when contract supports |
| `Pagination` | 36px controls, count/range | Default 25, choices 25/50/100 if API permits; previous/next/cursor; no invented total; page reset and focus restore |
| `TextField`, `NumberField`, `Textarea` | 36px min input (40 in long forms), radius8; labels above, helper/error below; textarea min96px | Required marker + text, valid/invalid/read-only/disabled; locale digits parsed safely; raw exact value retained; no auto rounding; unit suffix not part of editable string |
| `Select`, `Combobox`, `MultiSelect` | min36px, menu max320px with search as needed | Native/select or accessible popover; explicit no selection; async options scoped; clear if allowed; no default eye |
| `Checkbox`, `RadioGroup`, `Switch` | visual 18–20 / switch 40×24, target36+ (44+ touch) | Labels clickable; mixed selection supported; clinical flags not toggle shortcuts; switch only immediate preference or explicit save behavior, server receipt required |
| `DatePicker`, `DateRangePicker`, `TimeField` | 36px field, 300–320px Jalali popup, 32px cells/36px hit target | Jalali display/parse, UTC or offset-aware canonical transport, explicit timezone; keyboard/manual entry; ranges 7/30/90 days only when relevant; no invented conversion |
| `Stepper`, `FormSection`, `ValidationSummary` | step bar min40, groups gap16 | Only multi-step forms; error summary links to field, preserve on back; final review before critical mutation; do not allow skipping required QC/eye |
| `Dialog`, `ConfirmDialog` | width480 default, 640 complex, max90vw/90vh | focus trap, title/description, return focus, Esc except active irreversible request; confirm summary and reason/step-up if mandated; no nested modals |
| `Drawer`, `Popover`, `Menu`, `Tooltip` | drawer340–420/520px, popover min200px, tooltip max320px | Logical inline-end drawer, click/keyboard, focus management; no essential info hover-only; avoid placing clinical decision in fleeting tooltip |
| `Toast`, `ReceiptBanner` | max360px, stack ≤3 | success after server acknowledgment only; noncritical toast 4–6s, pause on hover/focus; errors persistent inline; receipt includes ID/time where safe |
| `Skeleton`, `Spinner`, `ProgressBar` | geometry matches final layout, 16–24px spinner | skeleton after brief delay, determinate only with real bytes/steps; no fake percentage; loading role and retry |
| `EmptyState`, `ErrorState`, `PermissionState` | icon 40, title 18, explanation 14, action | differentiate no results, no data, no capability, access denied, server error; no default green clinical status |
| `Timeline`, `AuditTimeline` | vertical spine, 16px marker, 12px time, cards gap12 | timestamp, actor/source, action, eye, version; chronological sorting controls; immutable audit read only |
| `UploadDropzone`, `UploadQueue` | 160px drop zone, dashed outline, file rows48–64 | browse and drop, MIME/size hints from server, per-file eye and modality, byte progress, retry/cancel where supported; no bulk blind eye assignment |
| `QCResultPanel`, `RejectionReason` | summary banner and rows | source declared vs detected, pass/reject/pending; recapture action; rejected asset remains history; cannot run specialist on rejected asset |
| `JobStepper`, `JobStatus` | horizontal on wide, vertical on compact | stage from server, queued/running/failed/finished; distinguish pipeline infrastructure Layer 6 from sequential stages; update nonintrusively |
| `ClinicalChart`, `ChartLegend`, `ChartTooltip` | mini 120–180px, dashboard 228–280px, detailed 260–340px panel; legend wrap, plot margins 44/16/16/32 | chronological LTR axes, accessible table, data/units/source/eye/time/quality; no smoothing across missing points; see §6 |
| `EvidenceViewer`, `ViewportToolbar`, `AssetRail` | §3 P-VIEWER; toolbar36, thumbnail88×64 | keyboard zoom/pan/reset, explicit source image, multi-view compare only compatible, independent overlay toggles and opacity; no artificial data |
| `OverlayLegend`, `MaskControls` | rows36, slider 0–100 with visible value | separate segmentation vs auxiliary attention; labels and measurement units; preserve transforms; no auto clinical annotation generation |
| `DifferentialTable`, `ModalityMatrix`, `DiscordancePanel` | panel radius12, rows40–44, matrix compact | rank, confidence/uncertainty/severity/evidence; missing/rejected/unavailable distinct; click evidence source; no forced sum-to-100 |
| `ReportEditor`, `CitationChip`, `ValidationPanel` | structured fields, report font15/28, chips 24 | evidence citation jumps to exact authorized source, invalid citations block sign; draft diff/version conflict; no rich HTML injection |
| `ActionTray`, `VersionDiff`, `SignoffDialog` | sticky footer56, paired diff columns, review modal640 | old/new version, eye/actor/date, reason/step-up, server validation; draft save vs publish/sign clearly distinct |
| `SLATimer`, `OwnerChip`, `ContactLog` | 14px tabular time, owner label, action rows | server-clock correction, staffed-hours rules, stale marker; no invented countdown; claim conflict and handoff receipt |
| `ReferralTracker`, `ScheduleGrid` | stage list/agenda, list alternative | delivery, attendance, missed reason; same queue denominators; no drag-and-drop only scheduling |
| `PDFPreview`, `ExportDialog` | neutral paper viewport, zoom, metadata | server-generated version/hash, role/step-up, safe print; no unsigned patient release |
| `ThemeSwitch`, `DensitySelector`, `HelpPanel` | 36px segment/field | Light/Dark/System, persist only preference; help is clinic-approved and versioned; no unapproved clinical advice |

### 4.0.1 Compact composition and exact surface recipes (desktop reference additions)

| Pattern | Geometry | Styling / composition | Dark counterpart |
|---|---|---|---|
| `KpiStrip` | 4–5 equal cells, 84–96 high, gap10–12 | 12px padding, 26/34 value, 13/20 label, 30 icon well, 20 delta chip | Same sizes; surface background and semantic foreground, no luminous white tint |
| `DashboardMosaic` | 12 columns, 3/5/4 or 8/4 | Aligned top edges, independently stacked panels, no forced equal row heights causing blank space | Same columns; opaque dark surfaces |
| `MiniTrend` | 70–100 wide × 26–40 high | Label/data separate; only valid real points, no fake sparkline | Same data, theme chart tokens |
| `DonutSummary` | 108–120 diameter, stroke14–18, value22 | Side legend with real counts and text; not standalone decorative chart; accessible table | Same shape, lower saturation where appropriate |
| `CompactLegend` | 12px labels, 8×8 marker, row20–24 | Shape/color/line style mapping, counts align opposite label | Theme text and data series; contrast check |
| `AgendaPanel` | month/week navigation36, dates32, rows38–44 | Current day outlined, selected day primary; calendar marker includes text alternative | Same; avoid low-contrast date text |
| `AvatarRow` | avatar26–32, 6–8 gap | Initials fallback; identity label 13/20, ID12/18 | Same geometry; no theme filter on actual photo |
| `ListDetailSplit` | list 60–70%, context 30–40%; gap10 | Selected row mint + outline; drawer or panel; no duplicate identity card | Deep selection background with clear border |
| `ClinicalFilmstrip` | 64–76 high, thumb88×54, gap6 | Selected 2px viewer-focus border, native aspect, eye/slice label | Theme-invariant dark/neutral viewport |
| `EvidenceInspector` | width296–320; row36–44 | tabs36; panel title15; metric key and value; 1px divider; fixed identity at top | Dark panels, same status semantics |
| `CompactSlaChip` | 22–24 high, 12px text | icon14, due label/actual countdown; no animation, stale state visible | warning/error mapped tokens |
| `QuickActionGrid` | 2×2 or 3×2; tile58–68 high | subtle surfaceAqua, 20px icon, text13, label max two lines | surfaceSoft and primary icon |
| `ClinicalContextStrip` | min60, horizontally grouped, gaps12 | avatar36–44, name20–22, ID/eye/source/version/status; group separators | same; no gradient behind clinical text |
| `PanelHeader` | min28–32, title15, action32–36 | one title, optional icon/info tooltip, scope/date; no huge h2 | same |
| `StatusRow` | min36, 8px inline gap | small status icon, main text, trailing value/time, optional divider | same semantic colors |
| `SideNavigation` | 184–196 wide, row36, horizontal inset8–10 | light surface, mint selected, 3px active bar, small logo; optional deep-teal variant | dark canvas/sidebar; brighter readable active text |

Default panels should have a very subtle blue-gray shadow only where needed, mostly 1px outlineVariant. Use solid or near-opaque cards (`surface`); subtle mint-to-white gradient on the single selected accent card or header only. On Dark, prefer surface over translucent glass and keep depth from 1px borders. Clinical image area remains neutral; shadow never changes image pixels. No animated background waves. For thin clinical split lines use `panel-divider`; for selected table row use `selected-outline`. Native aspect ratios and actual dataset scales always override decorative composition.

### 4.1 Universal interactive state styling

Default: stable geometry, body/label on surface; primary button `primary/onPrimary`; secondary outline `outline/primary`; ghost transparent. Hover: `row-hover` for neutral, 6% foreground overlay on solid; pressed: 10% overlay, optional 1px translate only on nonclinical button; selected: `primaryContainer/onPrimaryContainer` plus explicit selected state. Focus: 2px focus ring with 2px offset, contrast against adjacent surface; no `outline:none` without replacement. Disabled: `disabledBg/disabledFg`, no hover, accessible reason nearby; do not use disabled to hide security issues. Loading: width unchanged, text remains meaningful, aria-busy, double submit locked. Invalid: error stroke and helper text; focus remains visible. Read-only: surfaceSoft, selectable text, no edit affordance. Drag active: primary dashed stroke and testWell, keyboard alternative. Do not rely on cursor or opacity alone. All states tested in both themes and high-contrast forced colors.

### 4.2 Screen-level state contract (applies to every screen in §8)

| State | Required presentation and behavior |
|---|---|
| Initial load | Scoped skeleton preserving headings and major regions; no previous patient's data; no false zero KPI |
| Empty dataset | Explain why if known; CTA only if authorized; e.g., `هنوز مطالعه‌ای ثبت نشده است` |
| Filter yields none | Keep active filters, clear/reset action; not same as no patient data |
| Partial/missing data | Explicit `داده در دسترس نیست`, modality/field-specific reason; retain valid portions; never impute healthy |
| Stale | Last verified timestamp and stale label; refresh; block critical actions if contract requires current version |
| Network failure | Persistent `ارتباط با سامانه برقرار نیست`; retry; no fabricated receipt; safe existing screen only while allowed |
| Offline staff | Read cached content only if security policy permits; default no durable PHI offline; mutation blocked or clearly unsubmitted; no claim of patient-like offline outbox |
| 401/expired | Hide PHI, clear scoped caches, reauth; unsaved draft recovery only approved secure mechanism |
| 403/revoked | Clear data and preview immediately, generic denied page; no retry loop or disclosure of record existence |
| 404/not found | Generic unavailable scoped record, return to list; no fallback to another patient |
| 409/conflict | Show current version and your unsaved changes if authorized, reload/diff; never overwrite silently |
| 422/validation | Map exact server field errors to localized messages + summary; keep input; focus first invalid |
| 429/rate limit | Retry after authoritative delay, no auto hammering |
| 5xx/async failure | Sanitized message, correlation ID if approved, retry when safe, operational status distinct from clinical outcome |
| Success | Real server acknowledgment, updated version/time and next action; no celebratory animation in clinical work |
| Gated/unsupported | Feature not activated or unavailable, no false fixtures in live; route guard and safe return |
| Concurrent update | Quiet update indicator; preserve user selection/scroll; critical stale review invalidated; never auto replace active evidence |

## 5. Motion and interaction specification

Motion must make cause and effect clearer, not entertain. The independent screenshots are static; all timing below is an explicit design decision, not an extracted animation. Desktop compact interactions use 100–180ms feedback; panel movement 200–240ms. No decorative breathing eye, floating waves, bouncy cards or hover enlargement. All transitions use opacity/transform where possible; avoid layout animation on dense tables/clinical canvas. Use CSS transitions and native dialog behavior or an existing small motion library only if necessary. Token durations: `instant=0ms`, `micro=100ms`, `fast=150ms`, `standard=200ms`, `panel=240ms`, `route=180ms`, `long=320ms` maximum for ordinary UI. Easing: `standard=cubic-bezier(.2,0,0,1)`, `enter=cubic-bezier(.16,1,.3,1)`, `exit=cubic-bezier(.4,0,1,1)`, `linear` only determinate progress/rotation. No bounce/overshoot. Under `prefers-reduced-motion:reduce`, use 0–50ms fade or immediate transition, no slide, scale, shimmer, animated chart, pulsing or scroll effects. Never delay urgent notice for animation. Focus placement follows actual rendered content, not duration.

| Interaction | Exact motion | Where / prohibitions |
|---|---|---|
| Button hover/press | 100ms color; optional translateY(1px) on press | ordinary buttons only; no layout shift, critical action no scaling |
| Sidebar collapse | 240ms width/opacity; final layout once if performance suffers | shell only; preserve active nav/focus; immediate on reduced |
| Page change | 150–180ms opacity, optional 4px translate for nonclinical page | no crossfade between patient/eye identities or images; clear first |
| Tabs/segmented selection | 150ms indicator/color, 120ms panel fade only same context | no sweeping clinical map transition; eye changes atomic |
| Dialog/popover | 180ms opacity + scale .98→1; exit100ms | no bounce; immediate urgent/confirmation text |
| Drawer | 240ms logical slide + scrim fade; exit150ms | reduced: no slide; focus trap if modal |
| Expand accordion | 180ms disclosure; no motion for large clinical table | preserve anchor and keyboard focus |
| Tooltip | 350ms hover delay, 100ms opacity, keyboard immediately | important labels always visible |
| Form validation | immediate text/border, 100ms color | never shake or move input |
| Toast | 180ms fade + 6px translate; exit120ms | no toast-only critical confirmation |
| Skeleton | static base, optional subtle 1.6s shimmer on nonclinical content only | stop when hidden/reduced; no shimmer over raw evidence |
| Progress | 150ms width on real incremental byte progress; spinner 900ms cycle | unknown uses indeterminate + label; no fake timer |
| KPI update | immediate text replacement + optional 100ms background tint | no count-up, no flashing, no clinical metric tween |
| Chart | immediate data redraw, optional 150ms opacity on same nonclinical series | no data-point interpolation or animated axes in clinical charts |
| Viewer zoom/pan | direct input, no inertia by default | no interpolation between patient images, no animated masks; frame switch immediate |
| Mask opacity | direct slider, requestAnimationFrame batching if needed | no independent mask drift; transform aligned to image |
| Urgent alert | immediate persistent banner, polite/appropriate live region | no pulse, blink, sound by default, no animation delaying queue |
| Theme change | 120ms surface color optional; image and canvas instant | disable transition for first paint, reduced motion and clinical viewports |
| PDF/print | no animation | stable rendering, print media styles |

## 6. Clinical data visualization and evidence rules

### 6.1 Shared chart contract

Charts are evidence, not illustrations. Use SVG/canvas library already installed if adequate; lazy-load visualization routes. Each chart header states metric, unit, eye (full Persian + OD/OS), period, source/device, last received time, quality status and valid/total observations when available. X-axis chronological left-to-right even in RTL shell; use localized labels but isolate numeric strings; y-axis orientation follows measurement convention and explicit units, not mirroring. For logMAR, lower values generally represent better acuity; do not imply improvement from line direction alone. Use raw points, straight segments, no smoothing or connecting across invalid/missing intervals. Missing values null with gaps; rejected points optionally show separately with X marker and reason, excluded from qualified aggregates. Never show unknown as zero. Label source-provided target/reference/baseline and date/version; no fixed normal IOP range for all patients. Multi-device/protocol comparability is contract-driven; do not pool incompatible VF grids, test distances, modalities or eyes. No hidden unit conversion; show formula/version only if supplied and approved.

Plot padding 44 start of numeric axis / 16 end / 16 top / 32 bottom; mini plot height 120–180, dashboard chart panel 228–280, detailed clinical trend panel 260–340. Expand if labels or native clinical geometry demand more space. Grid 1px chartGrid, axis chartAxis; 2px series strokes, 4px markers (selected 6), color + shape/dash distinct. Hover/focus tooltip anchored within plot with actual timestamp and exact value, unit, source, quality and eye; keyboard previous/next point; `View data table` and downloadable data only if authorized. Legend with textual mapping, optional toggles that cannot hide urgent alerts or clinically mandated context. Zero baseline for bar counts; line domain clinically meaningful with explicit ticks, never manipulate to exaggerate change. Confidence/uncertainty bands neutral, no false certainty. Chart accessible summary generated from real validated data, not free-text LLM interpretation. Virtualize long raw table and paginate; preserve raw values and precise timestamps. Do not expose PHI in chart analytics or filename.

| Visualization | Required information | Display specifics / guardrails |
|---|---|---|
| Clinical IOP (routine) | eye, time, mmHg, source/device, posture/method if provided, target by physician if present | point series, target dashed line or supplied band; summary latest, min/max/mean only defined sample; no arbitrary color thresholds |
| Home IOP [G] | above plus schedule/coverage, receipt time, qualified count, time-of-day, source provenance | time series + daily distribution + 24h time-of-day scatter if coverage adequate; no inferred nocturnal values, no interpolated peaks, separate clinic/home |
| VF progression | protocol/grid (24-2/10-2), MD/PSD/VFI, date, dB/year and uncertainty if present | separate time plots; HFA maps source geometry; no cross-grid regression or unqualified rates; QC/reliability when provided |
| VF spatial | sensitivity/TD/PD values and masks, blind spot/not tested cells, laterality, orientation, stimulus protocol | preserve native coordinates and grayscale/probability legend; no decorative dot map; no mirror, no fabricated points; distinguish raw vs derived |
| Home logMAR | qualified sessions, protocol version, baseline, distance/sensor quality if provided | point series, baseline reference, reliable change flag only from server; no universal threshold |
| Amsler | raw/derived distortion geometry, test eye, orientation, baseline and follow-up | same-scale grids side-by-side, label coordinates and missing region; no interpolated medical result or mirroring |
| OCT | B-scan/volume, layer boundaries, RNFL/GCIPL/RPE-BM, fluid IRF/SRF/PED, thickness/volume units | neutral viewer + source scale and slice index, masks toggle; report absent segmentation as unavailable, not no fluid |
| OCT-A | scan region, device/scale, supported density biomarkers and vascular maps | native map/color bar; no inference from decorative color; explicit missing source |
| Fundus | original image, laterality, ONH/cup/disc and C/D if supported, model findings | image + mask legend + measurement table; Grad-CAM separate auxiliary hint |
| Corneal topography | axial/elevation/pachymetry and available fourth map, Kmax, astigmatism, thinnest pachymetry | 2×2 source maps, native legends/units/scales, common scale only if validated comparable; no invented fourth map |
| Lab/clinical risk | input values/units, dates, missingness, calibrated risk and SHAP values | structured evidence table + signed contribution horizontal bars with zero axis; explain association not causal; no fake waterfall |
| Modality fusion | per-eye differential, calibrated confidence/interval, severity, modality attribution, missing data and discordance | ranked table + availability matrix; use explicit score definition, not mutually exclusive unless contract says so; no radar chart pretending comparable scales |
| Medication adherence | scheduled denominator and four distinct states, access channel, eye, Rx version | stacked bars or donut with table, no-response not missed; do not merge OD/OS; Print+Phone included |
| SLA/operations | due/overdue/assigned/contact states, staffed-hours definition, denominators | queue table + age distribution; no client-only SLA truth; display current snapshot and definition |

### 6.2 Diagnostic viewer fidelity and tool behavior

P-VIEWER displays raw evidence unaltered by theme. CSS color filters, inversion, decorative gradients, image-generation placeholders and AI art are forbidden in clinical viewport. Image contrast/window-level controls only if supported by validated viewer and metadata; reset returns original default. Keep original pixel coordinates and transforms; overlay alignment must share image transform, resolution and slice/frame. If missing calibration, disable measurement tools and state why; never derive mm/µm from CSS pixels. DICOM parsing, rendering, transfer syntax and metadata are handled by approved implementation; do not build a pretend DICOM viewer using a generic image tag for unsupported data. Preserve clinical orientation, full laterality, scale marker and study date in every viewport, comparison and export. If source image itself contains text/PHI, follow policy and do not cache it outside authorized scope.

Toolbar order: fit/reset, zoom in/out, pan mode, compare layout, fullscreen, source metadata, masks, auxiliary attention, optional calibrated measurement. Tooltips state shortcuts; keyboard alternatives for drag and slider. Asset rail groups by modality and eye, shows QC status, frame count and date. Selection uses immutable asset ID, never array index; if source changes, clear dependent masks before render. Mask control includes per-class label, color legend, visibility, opacity (default 35%, adjustable 0–100), quantitative value/source when available. Default raw view available with one action; no opacity on raw image as part of overlay. Grad-CAM default off and label exactly `راهنمای توجه مدل — غیرقابل استفاده به‌جای سگمنتیشن دقیق`; do not present as lesion boundary or evidence of causality. Preserve mask class palette from source if clinically meaningful; distinguish with patterns/labels as feasible. Display loading separately for raw and overlay. Broken/missing mask does not block raw view but cannot be treated as absence of disease. Fullscreen retains urgent/eye/patient context, exit button and Esc, restores focus. Viewer edits, if supported, create adjudicated derived versions and feedback, not raw mutation.

## 7. Cross-cutting clinical workflows, privacy and state machines

### 7.1 State and authority

State names below are UX mappings; canonical enums/allowed transitions come from backend. `Study`: local draft → uploaded/received → QC pending → rejected (recapture separate asset) or qualified → queued → analyzing → pending clinician review → approved / edited & approved / rejected. An async `202 Accepted` and job ID is receipt of submission, not clinical result. Job failure, partial results and retry are explicitly separate; no retry of non-idempotent mutation unless authorized. A new asset/result version invalidates dependent draft/sign-off readiness; review exact version. Layer 6 is infrastructure, not an extra clinical step. `Report`: AI draft → clinician edited → validation pass → sign-off → authorized release; immutable signed version; amendments create new version. `Rx`: versioned draft → validation → compare vN/vN+1 → ophthalmologist publish → receipt; never edit active version directly. No UI policy defines dosing or diagnosis.

`Triage`: `New → OwnerAssigned → ContactAttempted → ContactEstablished → Escalated → Referred → Closed` is PRD sequence vocabulary; actual permitted branching, retry and closure use server state machine. Display urgency independently of workflow status. Claim uses server lock/optimistic version, on conflict show owner and refresh, no double claim. SLA clocks derive from server timestamps and clinic policy, not local browser guess; distinguish paused/out-of-hours only when supplied. Handoff records from/to owner, shift, open tasks, reason and receipt. Referral tracks delivery, attendance, missed reason and outcome, not only sent. `AlertEpisode` deduped by backend; show count of linked signals and last occurrence, not duplicate notifications. Never allow generic close/dismiss to suppress unresolved urgent-floor finding.

### 7.2 Clinical mutation review and safeguards

Before publishing Rx, signing diagnostic report, changing owner/urgency, closing referral or exporting: display patient ID/name in authorized context, full eye, clinic, current version, selected action and consequences; require reason when mandated; run server preconditions and step-up; submit once; show receipt or failure. For urgency classification display exact three PRD tiers: `عادی`, `پیگیری ۳ تا ۶ ماه`, `ارجاع فوری`; separate from QC/processing. Deterministic urgent floor for infectious keratitis, papilledema, retinal detachment, active CNV, high-risk ROP, severe post-op signs is non-suppressible per PRD/ADR; do not invent threshold logic in UI. If model and floor differ, show both plus authoritative floor and reason; block downgrade even through keyboard, direct API or stale UI. Other urgency changes require authorized reason and audit. All clinician edits stored immutably through feedback contract. Signed patient-safe summary contains approved next action and follow-up, not raw AI scores (ADR T-B19). No automatic publication on model success.

### 7.3 Authentication, privacy, audit and data lifecycle

OIDC/SAML, MFA and step-up follow configured provider; never collect OTP in a custom flow if identity provider owns it. Show clinic/role and session expiration without exposing tokens. Tenant/clinic switching aborts in-flight requests, clears caches, resets selection and reconnects scoped subscriptions. Clear PHI on logout, revocation, expired session, 403 and tab context switch where required. Keep access tokens/session cookies under approved backend architecture; avoid localStorage tokens and PHI. Only persist nonclinical preferences (theme, density, sidebar) scoped as appropriate. Never place patient names, national IDs, phone, clinical free text, PHI in telemetry, browser query strings, export filenames or notifications. Audit actor, action, target, time, reason, version per server; audit log append-only and access-limited. Export dialog requires scope/format, reason if policy, step-up and server-generated receipt; no bulk data access from frontend caches. Break-glass requires explicit reason, duration/scope if policy, step-up, prominent active banner, revoke/end action and audit; no frontend-only bypass. External LLM receives validated structured PHI-scrubbed data only via server; no frontend model calls; DICOM de-identification is backend workflow, not CSS redaction. No autonomous raw-image diagnosis by LLM. No raw face video storage; device sensor evidence only per approved schema.

### 7.4 Connectivity, worklist updates and notifications

Use existing contract-backed polling/subscription transport; no assumption of WebSocket/SSE endpoint. Pause nonessential background polls on hidden tabs; recover on focus/network reconnect with backoff and jitter; preserve scroll/focus, mark rows updated instead of moving a selected row unexpectedly. Urgent newly received signal gets persistent queue count/banner and accessible live announcement, not audio unless approved. Notifications distinguish clinical urgency, operational failure and reminders; mark read only on acknowledged server action where supported. SMS/push previews are PHI-free; no clinical condition/drug details in external notifications. Display staffed hours and approved hotline/ER route, never promise 24/7 monitoring. For patient-originated offline submissions show event received time vs captured time and pending only if actual status known; staff has no visibility into unsynced data by default. Offline staff does not fake patient outbox support. No unauthorized clipboard copies, print or downloads; provide sanitized support identifiers.

## 8. Full page, subview and flow inventory

### 8.0 Reference-driven anchor screen blueprints (20 visual targets)

These blueprints replace earlier V1 visual proportions. Every screen in §8.1–8.13 inherits the exact shared components, states, permissions and density described here; they retain their individual functionality. Routes and identifiers below refer to §8 inventory (do not create duplicate URLs solely for design). All geometry is CSS px at nominal zoom; use minmax/flex/grid and allow text growth. Define right/start → left/end placement in RTL. `sN` means N of 12 columns, gap 12px (10px at 1440 and below). For 1440×900 usable 1232px, a single grid unit is ~93.5px; 3-span ≈300.5px, 4-span ≈404px, 6-span ≈611px, 8-span ≈818px. At 1600×1000 usable 1372px with 12px gaps, grid unit ≈103.33px. Prioritize visible clinical work; never hide mandatory warning or evidence to maintain a pixel height.

#### 01. Authentication — M01 (BOARD tile 01, A01–A04 brand assets)

- No staff sidebar before authentication. Full-screen clean split: right 44% form region, left 56% artwork. At 1440, form width 344–380, generous but bounded, logo lockup 150×40, page title 24/36, intro 14/24, fields 40 high, 12 gap, primary button 40. Art panel uses the supplied eye illustration in a 340–440px region, soft mint waves and canvas fade; no additional building illustration copied from board. Header language/theme/help only if available, footer privacy/support. No fake password flow if OIDC provider handles credentials; form area shows authorized SSO entry and MFA/step-up stages, loading/error/expired states. No protected data on public page. Dark uses same split, dark art derivative, high-contrast wordmark.

#### 02. Main dashboard — A01 (R07 primary; R05 supplementary)

- Header y=56–116: h1 right, one-line subtitle, left date/filter/clinic scope. A04 is a faint cropped wave on header only, not a separate hero. 5 compact KPI cards in equal columns: active patients, new patients, urgent actionable, pending sign-off, adherence; role and availability gate all. Default card height 88, label 13, value 26, icon well 30, delta chip 20 only when meaningful. At 1440, widths ~238px each.
- Main mosaic right s3: AI study status ring (diameter 108–120; side legend, real counts) 220–244 high; below care category bars 146–168; then agenda 160–190. Center s5: trend chart 236–256 (plot 150–175), below recent activity table 280–320 with 5–7 rows. Left s4: urgent/review list 236–256, quick actions 144–168 (2×2 tiles, 58–64 high), permitted system status 76–94. Alternative R05 adds clinic KPI and recent patient chart modules as role-scoped variants, not a second default dashboard. On urgent queue, direct link carries filter and server source.
- Keep no top giant greeting, no duplicated 5-color rings for same metric. No animated count-up. Date filters requery all affected cards consistently; show local loading placeholders, stale marker and source time. At 1280, combine agenda with quick actions under last column. Sidebar bottom subtle wave (not bright turquoise full block).

#### 03. Patients list — B01 (BOARD tile 03, list portion R02/R12)

- Header 50: title, count, `ثبت بیمار` 36px primary. Filter row 40: search 280–340, role-authorized clinic/doctor/status/protocol, filter button; second chip row only when filters active. Table 100%: 36px header, 38px default rows; patient identity 190–220, eye/episode 116, physician 140, recent/next event 128 each, access/status 112 each, actions 44. Use ellipsis with accessible expand only for noncritical long cells. Patient initials/avatar 26–28; badge 22; checkbox target 32. Pagination footer 40; default 25 records if supported; display actual counts.
- Selection opens B03 or 336–380 inspector as permitted; table width shrinks and less essential columns move to details, not smaller text. Search debounce ~250ms; clear selection after scope change. Empty/permission distinction. No mass clinical action just because checkboxes are drawn in mockups.

#### 04. Patient 360 — B03 (R02 primary, R12 alternative)

- At 1600 wide: right persistent app nav, then patient identity and workspace; optional patient directory 260px on right within main (or left when consciously using physical order with logical keyboard order). Expanded directory shows 9–12 rows 44px including identity and status; collapsed by default when 3-pane density does not fit. Clinical content central flexible ≥680px; optional left context inspector 268–292px; at 1440 use collapsed 60px nav or close optional directory/inspector; never shrink text to pack three panels. Identity 64px high, avatar 44, title 22, ID/age/access/context 12–13, CTAs 36. Top KPI strip 4 tiles 70–80 high (IOP, VA, care adherence where defined, latest clinician review). Tabs 36–40 high with clear selected indicator.
- Main overview: paired OD/OS explicit cards (right OD, left OS), 104–124 high, latest valid measures/time/source, mini source thumbnail only when authorized; never infer stable from one value. Adjacent trends IOP and VA in two 170–204 panels or stacked plots on compact viewport. Recent studies strip 4–5 thumbnails 88×64; events timeline 5–7 entries, 44–52 high; current medication compact list; care plan/next due, risk factors and demographic panel. R02 three-pane feel is the target, R12 alternative demonstrates patient list-detail. Normalize duplicate/reversed metrics and labels from screenshot via real DTO; no copying personal IDs. Eye switch clears old charts/notes atomically; preserve authorized context and tabs.

#### 05. Diagnostic worklist — C01 (BOARD tile 05, R04/R11 worklist patterns)

- List-first page: 48px title and create-study button, 4 queue status chips 28, filter row 36–40. Table with sticky header 36 and default rows 38–42; visible status, QC, modality, full eye label, patient/study IDs, processing time, owner, urgency, review state and actions. Put 3–4 compact counter tiles 68–76 high only if enough space; never replace the queue. Optional left preview 340px with metadata, small source thumbnail and open-study action, no final sign from list. Filter/paging/selected row and urgency indicator remain visible; preserve sort order as jobs update.

#### 06. Study upload & QC — C02/C03/C04 (BOARD tile 06)

- Title/stepper 40–48; patient identity summary 56–64. Main s8: compact dropzone 140–160 high, file list with 40–48px thumbnails/rows, per-file eye and modality 36px selects, capture info, byte progress and retry. Side s4: QC checklist rows 36–44, declared/detected modality and laterality, rejection reasons, summary file counts and job receipt. Below: error details/recapture history; sticky footer 52–56 with cancel/review/submit as permitted. Status changes immediate; no fake progress or automatic analysis for rejected asset. Clear keyboard browse alternative; critical QC banner not clipped. Processing view reuses same two-column layout with server stage list and timings.

#### 07. Fundus analysis — C06/C12/C15 (R13)

- Patient/study strip 60–64 high, view tabs 36, persistent QC and draft status; three-pane evidence workspace. Expanded right nav 184–196; asset rail 148–168, central viewer flex ≥480, inspector 296–320. At 1440 use nav rail if necessary. Neutral canvas ~400–460 high at 900px viewport, toolbar 36, thumbnail filmstrip 64–76 high, source labels/scale and exact orientation. No stretching image to fill, use contained viewport.
- Modality rows 52–60 with 66×44 thumbnail + label/status; absent data muted placeholder not fake exam. Main Fundus image raw with independent disc/cup/vessel mask legend, optional Grad-CAM separate, opacity control. Inspector ranked differential 3–6 compact rows with uncertainty and model context, key findings and urgency banner/action buttons 36–40. Below viewer three compact panels: biomarker table, longitudinal RNFL (if actual OCT), VF overview (if available). Keep missing evidence explicit. R13 draft AI percentages are illustrative only; approved urgency tiers use backend floor. Clinician sign opens review path, not one-click finalization directly on image.

#### 08. OCT / OCT-A — C07 (R01 primary, R08 alternative)

- Same shell/identity and tab geometry as 07; central 55–60% working width, neutral B-scan canvas 380–450 high at 900–1000px screen, toolbar 36 and filmstrip 64–72. R01 places differential on left (logical end) and quantitative/evidence panel on right (logical start); on wide display use split 272–300 / flex / 296–320. If width insufficient, modality rail collapsed or inspector tabs rather than tiny scan. R08 alternative demonstrates vertical modality list and lower overlay control/measurement strip; keep both capabilities accessible in one standard C07 layout.
- Controls: slice index/prev-next, zoom, pan, fit/reset, brightness/contrast only if approved, calibration scale, independent layer masks and IRF/SRF/PED toggles/opacity, separate auxiliary attention. Metrics table CMT/RNFL/GCIPL/fluid etc from source, exact units, prior comparison only compatible. Map or OCT-A vascular preview 160–200 high with native legend and scale; findings thumbnails 80–96 wide. Draft preview compact below image, open editor. Urgent active CNV must use deterministic urgent floor, never the mock two-week follow-up. No raw image filtering by theme. No invented measurements or masks. On zoom, all overlays follow same transform.

#### 09. Anterior segment and topography — C08 (BOARD tile 09)

- Shared diagnostic shell and modality tabs, two main viewer modes. Slit-lamp: neutral image area 55–60% with 36 toolbar, inspector 300 with findings, lesion masks if available, QC and provenance. Topography: true 2×2 map grid with each tile independently labeled, approx 230×175 minimum at desktop, native color bar 16–20 wide per map and unit, no invented fourth map; expand individual tile. Under map: compact measurement row Kmax, K1/K2, astigmatism, thinnest pachymetry when provided, source units. Side findings and severity/uncertainty; urgent keratitis floor. Comparison requires matching device/protocol/eye; no mirroring.

#### 10. Visual field — C09 (BOARD tile 10; R13 lower VF card as mini reference)

- Context strip and eye/protocol/date tabs; main s8 2×2 grid of available sensitivity/gray/TD/PD maps, each min 220×190, labels/legends/axis and not-tested markers. If only one source map exists, use one and explicit missing state; not a fake grid. Side s4: compact MD/PSD/VFI table/tiles 64–72 high, reliability indices (FL/FP/FN, tracking etc only if supported), test source and quality banner, draft progression/urgency. Lower row longitudinal MD dB vs time (240–280), PSD/VFI series in separate unit-compatible charts, trend slope and uncertainty if validated; data table. Compare same eye and compatible grid. Do not mirror clinical maps under RTL, recolor native grayscale or animate change. Eye/protocol switch clears prior incompatible result.

#### 11. Clinical and lab risk — C10 (BOARD tile 11)

- Compact patient context, risk-model/eye selector and inputs completeness row. Right s7: structured lab/history table (36–40 rows) with value, unit, date/source, missing indicator; left s5: calibrated risk panel with number 24–28, label and uncertainty, horizontal bars with zero line for SHAP contributions; small risk gauge optional only if validated interpretation/bins exist; never use arbitrary green/red thresholds. Below: input timelines (one unit per plot), missing data notice, model/version and source links. No causal inference or auto-prescription. Add/update observations only authorized, validate units.

#### 12. Multimodal fusion — C11 (BOARD tile 12, R13 cross-modal evidence)

- Context and explicit eye filter 36–40. Right s8: six-modality availability grid, thumbnails 120×86 max with date/QC/status and source link; at 1440 3×2 if needed. Left s4: ranked differential rows 44–56 with confidence, uncertainty, severity and evidence; nonexclusive scores never forced to 100. Lower row s7 attribution matrix (rows 40–44), s5 discordance/missing evidence panel; urgent floor persistent, report CTA. Keep missing, rejected, pending and unassessed distinct; no green global stable badge. Evidence chips jump to exact eye/version. Modalities available only by phase and contract. Do not turn example probability from board into diagnosis.

#### 13. AI report editor and sign-off — C13/C14 (BOARD tile 13, R01/R08 draft/actions)

- Patient/eye/study/version strip 64, draft badge and validation summary; 3-pane report workspace: evidence rail 220, structured editor flex min 460, validation/urgency inspector 288–320; collapse rail when needed. Section headings 15/24, report body 15/28 for reading (do not apply compact 13 to long report). Evidence cards 70–90, citation chips 24, editor controls 36, status and source provenance. Separate findings, metrics, differential, cross-modal correlation, follow-up, urgency and evidence IDs. Validation failures inline and linked; compare versions on stale save. Bottom sticky tray 56 with save draft, preview, authorized review/sign or reject. Confirm sign with exact eye, version, floor/reason, step-up as required. No AI auto-finalization, no unsigned patient release, no misleading fake report. Do not animate clinical text changes or replace edits mid-review.

#### 14. Remote monitoring overview — D01/D02 (R06 primary population; R10 patient detail)

- 48–56 header, 5 KPI tiles 84–88: monitored cohort, active alerts, overdue tests, adherence/qualified completion if defined. Filters row search, patient/doctor/protocol/alert state/time, 36 height. Main population table s8 or flex 65–72%, rows 38–42, explicit eye/source/last qualified measurement/quality and next due; selected inspector left 320–360 with patient identity 56, small tabs 34, two eye summaries 80, one selected trend 160–180, alerts and plan. Below table: device status list, cohort trend and adherence ring in 3 equal panels 180–220. R10 variant for D02: directory 260px + central patient workspace; two distinct trend cards, separate recent tests, device quality, alert history and care plan. Never aggregate unlike eye measurements or claim a missing home device is normal. Home IOP cards gated; no default home VR VF. Use source/time and valid count on all trends.

#### 15. Home IOP detail — D03 [G] (BOARD tile 15, R06/R10 IOP references)

- Compact patient/eye/date/source strip, range controls 7/30/90 only where applicable, 4–5 metric tiles 74–84 (latest, average, min/max, valid count/coverage as appropriate). Main trend s8, height 260–310, raw observations with target line only if prescribed, no smoothing or gaps filled. Side s4: target/source/date, distribution by time of day if sufficient data, quality/coverage and active alert. Lower row actual time-of-day scatter/daily range, raw observation table and treatment markers if supplied. Keep clinic/home separate. Missing night values not guessed. Device connection gated on actual partner contract; no fake readings or thresholds. In Dark, same geometry and data colors with high contrast.

#### 16. Home vision, Amsler and trends — D04/D05 (BOARD tile 16, R10 VA/Amsler references)

- Patient/eye/quality/time controls; three tabs qualified VA, Amsler, sessions. Summary cards 76–84 for latest qualified logMAR, baseline, valid count, last test date. Main grid s7 trend 240–280 and s5 Amsler compare (two native square maps 150–200 each or stacked, no medical-map interpolation). Session/quality panel includes device, distance, lux, stability and rejection only when supplied. Lower raw trial/session table, baseline comparison/reliable-change state and trend method from backend. Keep VA and Amsler units separate; don't treat normal-looking empty grid as successful test. No decoration inside clinical grid.

#### 17. Care plan / prescription builder — E05 (BOARD tile 17, R03/R09/R14 shared care styles)

- Identity/eye strip 64, current version/status and 36px action controls; main form s8 and contextual preview s4. Header steps 40 if multi-stage. Medication rows 48–56 with generic/brand/strength, eye, dose, schedule/taper, start/end and status, only contract fields. Add/remove draft rows explicit; published Rx immutable. Right/start form, left/end live preview of eye-specific schedule and patient/Print+Phone PDF; validation summary and version diff. Bottom 56px tray cancel/save draft/review publish; only ophthalmologist authorized for publication. Do not copy mock drug/dose content; no automated medical suggestions. Care dashboard E01 uses R03/R14 below: five 84px KPIs, wide 8-span episode queue and 4-span agenda/calendar, lower three panels adherence/alerts/referrals. E02/E04 use same queue and identity/plan pattern. R09 adds care tasks, team owner and recent event timeline only when supported.

#### 18. Triage & alerts — F01/F02 (R04 and R11)

- Right-side app sidebar (translate English mocks), page title 22, compact urgent/SLA counter strip 68–84; no large decoration. Filter bar 36, status tabs 28–32, explicit server urgency tiers in Persian. Main table ~65% width, left detail inspector ~35% (min 340, default 380–420). At 1440 compact queue 6–10 rows 40–44, urgency, SLA, patient ID, explicit eye, reason/source, owner/status, timestamps. Selected row mint backing + outline, urgent tint limited to severity badge/edge. R04 additional urgent preview and aggregate chart fit on wide view only; collapse under table at narrower desktop. R11 prioritizes selected patient context and action area.
- Inspector header 64 identity/urgency, tabs 36, urgent banner immediate, 2-column compact eye measures/one trend, evidence thumbnails with source, draft findings, next permitted action group, server state timeline and audit. Primary claim/assign/contact only when supported; close/refer separate and confirm. Do not adopt English mock `High` as a fourth clinical tier or fake thresholds; operational priority distinct from clinical urgency. Stale and unassigned ownership explicit. No bulk sign/close. SLA based on server and actual staffed hours.

#### 19. Clinic analytics — I01/I02/I03 (BOARD tile 19, R05/R07 dashboard chart style)

- Header date/clinic/access filter row, 4–5 KPI tiles 80–88, actual scope/time. Main two or three columns with line/bar charts (220–260), donut 112 with legend, breakdown by modality/access/status only when meaningful. Lower scorecard table rows 40: target, actual, numerator/denominator, time, source, status, baseline comparison. PRD targets separate from observed outcomes. Validation/model performance separate from operational usage. Admin cannot gain raw PHI via chart drilldown. No decorative gauges that imply clinical accuracy, no fake percentages.

#### 20. Clinic administration / settings / integrations — J01 hub, J02–J10, K01–K07 (BOARD tile 20)

- Header 52, scoped clinic selector and tabs (clinic, staff, access, protocols, integrations) 36. Landing: compact 3-column settings tiles 96–112 high, icon 20 in 32px well, title 14–15, short description and chevron; only authorized destinations. At 1440 use 3 columns; details page main 8-span form and 4-span contextual summary/activity or a 240px section menu plus flexible form. Tables 38–42 rows and 36px fields, validated save footer. Separate staff/MFA, operating hours, template versions, feature policy, DICOM/HIS and logs. Integration test feedback server-derived; secrets masked, no credentials in screenshots. Dangerous changes separate confirmation and audit; admin not implicit clinician.

#### 8.0.1 Additional subviews (all 119 inventory entries)

The remaining views are not new decorative dashboards. Reuse matching anchor's shell, density and patterns. A02–A05 use R07 list/drawer/mosaic; B02/B04–B12 use R02/R12 patient context and B01 tables/editor; C03–C05/C12/C15–C17 use R01/R08/R13 viewer and metadata/feedback overlays; D06–D12 use R06/R10 tables and context (gated capabilities remain gated); E02–E12 use R03/R09/R14 and builder 17; F03–F08 use R04/R11 inspector and dialogs; G01–G06 use R09 agenda/timeline and R11 queue; H01–H07 use report editor and deterministic PDF paper preview; I02–I04 use dashboard analytics; J02–J10 and K01–K07 use 20; L01–L08 use compact operational tables without decorative brand overlays and strict access; M02–M11 use authentication and system form/dialog patterns. For each, the corresponding inventory row in §8 defines exact fields, actions and edge cases. Keep header, card, row, chart and action sizes consistent; never make a minor feature a full-screen hero. Add a dedicated screenshot/golden for each applicable route/state during implementation, not a fake claim that every reference image already exists.

All route paths, presentation types, Persian headings and named components below are [D] unless the underlying capability is tagged [R]. Route count is not backend endpoint count; tabs, drawers, dialogs and embedded panels share routes where appropriate. Each entry defines layout, data, actions and a specific gate; **all** inherit §4.2 states, §5 motion, §6 evidence rules, §7 safety, §11 accessibility and both themes. Every page includes contextual heading, applicable timestamp/source, accessible actions and no dead controls. For layouts refer to P-* recipes in §3.3. IDs remain stable as test identifiers even if repository route names differ. `:patient`, `:study`, etc. are opaque identifiers; no patient names in path. Authorized user scope is implicit for all screens. Clinical mutations are conditional on server permission; gated screens are fixture-only until approved.

### 8.1 A — Overview (T-B09/T-B12; W1, diagnostic cards progressively W2–W4)

**A01 desktop visual target:** §8.0 anchor 02 (R07 and R05) is authoritative. Role-specific dashboards vary data and tasks, not visual dimensions. Urgent banner always wins over decorative header.

| ID / destination (Persian heading) | Type / scope | Composition and data | Actions, edge cases and acceptance |
|---|---|---|---|
| A01 `/overview` — داشبورد | P-DASH [D; R underlying worklists] | Role-scoped urgent work, pending reviews, active episodes, due follow-ups, qualified tests, adherence only if defined, clinic and time filters, last refresh | Drilldowns carry exact filter scope; missing denominator shows unavailable; urgent rows stay discoverable under filters; count reconciles list snapshot |
| A02 `/overview/my-work` — کارهای من | P-LIST [D] | Assigned studies, open alerts, due calls, drafts, due timestamp, owner, eye, type | Open correct destination, claim only if backend allows; concurrent updates preserve selected row; no cross-clinic tasks |
| A03 `/overview/notifications` — اعلان‌ها | Drawer/list [D] | Clinical vs operational category, date, unread, source, authorized linked target | Mark read where supported; urgent not resolved by read; stale link generic unavailable; external notifications PHI-free |
| A04 global search — جست‌وجوی سراسری | Dialog [D] | Search authorized patients, studies, reports; grouped results, eye/source labels where relevant | Debounced server query; keyboard arrows/Enter/Esc; clear query on close/scope change; no results from other tenants |
| A05 `/overview/activity` — فعالیت‌های اخیر | P-LIST [D] | Timestamp, event type, authorized subject, actor, result, source | Filter type/time; open authorized record; separate audit log with stricter permission; no raw PHI log |

### 8.2 B — Patient management and Patient 360 (T-B09/10, T-A08/11; W1 onward)

**B01 list:** header `بیماران`, primary `ثبت بیمار` when authorized. FilterBar: search by supported patient identifier/name, clinic, treating clinician, protocol/status, access mode, last activity range; active chips and reset. Table column order RTL: patient name + opaque ID (sticky), access mode, episode/eye indicators, assigned clinician, last event, next follow-up, urgency, actions. No permanent “healthy” label. At 1440 content table min 980px, default 38px; action menu and row link. No bulk patient export without approved permissions. Empty state uses text and add action, no fake patients.

**B03 Patient 360:** persistent identity bar with name, opaque ID, clinic, age/date only if authorized, care mode, physician; full eye labels with separate cards, not mirrored by CSS. Right card OD, left OS when side-by-side by convention; on stacked layout OD then OS; explicit labels matter more than position. Two equal eye cards contain latest verified clinical measurements, timestamps, quality/source, active episode, alerts and missingness; no global stable inference. Below, scoped tabs: overview, clinical history, studies, care/Rx, monitoring, symptoms/triage, reports, timeline. Overview 8+4 grid: recent evidence and longitudinal chart on main, actionable tasks/plan on side. Context bar never changes while old measurements remain visible. Comparison mode read-only; any write opens one-eye form. At narrow view tabs horizontally scroll with keyboard access; sticky eye bar persists when appropriate.

| ID / destination | Type / scope | Composition and data | Actions and acceptance |
|---|---|---|---|
| B01 `/patients` — فهرست بیماران | P-LIST [D; R enrollment identity] | Above; name/id, episode, clinician, access mode, last event, alert and next due if supplied | Search/filter/paginate, open patient, create if permitted; no unauthorized search suggestions |
| B02 `/patients/new` — ثبت و پذیرش بیمار | P-EDITOR [R] | 3 steps identity/contact, clinic/access mode, consent/review; +98 number, locale, consent version, app/caregiver/print_phone; only contract-required demographics | Validate duplicate/identity via server, enroll/send approved OTP or print workflow, confirm receipt; consent not assumed; no patient merge without contract |
| B03 `/patients/:patient` — پرونده بیمار | P-PATIENT [D] | Above; OD/OS summaries, active episode, recent study, signed result, care and alerts | Eye-specific deep links, compare read-only; no silent switching; missing latest data not normal |
| B04 `/patients/:patient/history` — سابقه بالینی | Tab/P-DETAIL [D; R structured history] | Structured history, diseases, surgeries, medications, labs/risk factors, author/date/source, missing fields | Add/update only supported clinical fields; source/history version; no unstructured overwrite of immutable evidence |
| B05 `/patients/:patient/caregivers` — همراهان بیمار | Tab/P-LIST [R] | Grants, scope, status, consent, issue/expiry/revocation time | Invite/grant/revoke via server; confirm target scope; revoke immediately and clear affected UI; no caregiver access by phone match alone |
| B06 `/patients/:patient/timeline` — خط زمانی بیمار | Tab/P-DETAIL [D] | Timeline of surgery, Rx versions, study, tests, reports, alerts, contact/referral; eye and source; filter event type/date | Open exact version; preserve ordering and timestamps; avoid joining unrelated eyes into one clinical series |
| B07 `/patients/:patient/studies` — مطالعات تشخیصی | Tab/P-LIST [R] | Modality, study date, eye, quality, job/review status, device and report link | New study with explicit eye; open C05; no patient-wide auto laterality |
| B08 `/patients/:patient/care` — برنامه مراقبت | Tab/P-DETAIL [R] | Active per-eye episodes, Rx version, next tasks, adherence status, clinician | Link E04/E05/E07; if none show eligible enrollment CTA; no manual patient Rx import masquerading as active |
| B09 `/patients/:patient/monitoring` — پایش خانگی بیمار | Tab/P-DETAIL [R W4/G IOP] | Scoped D02 overview, qualified count, trend, last receipt, data missingness | Link D modules; display gated/unsupported protocols honestly |
| B10 `/patients/:patient/alerts` — هشدارهای بیمار | Tab/P-LIST [R] | Open and closed AlertEpisode, urgency, source, eye, owner, SLA, history | Open F02; no dismiss via patient summary; dedup and source linking |
| B11 `/patients/:patient/reports` — گزارش‌های بیمار | Tab/P-LIST [R] | Report type/version, laterality, clinician, sign date, draft/signed/rejected | Authorized staff draft view vs signed published; no unsigned patient share |
| B12 `/patients/:patient/consent` — رضایت‌نامه و شیوه دسترسی | Tab/P-DETAIL [R] | Consent versions, acceptance source/date, care access mode, revocable grants, research consent separate | Record approved consent, change access mode only by workflow; preserve audit, Print+Phone denominator |

### 8.3 C — Diagnostic workstation (T-B15–18/20, T-A13/18–25; W2–W3)

**C01 worklist:** compact high-density list with top segmented queue views `در انتظار بررسی`, `در حال پردازش`, `نیازمند تصویربرداری مجدد`, `تأییدشده` only if matching backend statuses. Columns: urgency, patient ID/name, study, eye, modality group, QC, job status, age/received, owner, review status, action. Default sort server-defined urgent-first/age; sort override visible; refresh non-disruptively. Detail preview drawer shows metadata and primary CTA `باز کردن مطالعه`, not a miniature diagnostic viewer. Filter by modality/eye/date/clinic/owner/QC/urgency. Technicians see capture tasks, not clinical sign-off controls.

**C02 acquisition visual target:** P-EDITOR, 3-step patient/study context → files and labels → review/submit. Context right main; 4-col sticky summary on left with patient, eye per asset, capture date, device, file count and blockers. Dropzone surfaceMint, dashed outline; below, each row thumbnail/file name, type, size, modality, full eye selector (required), QC/upload status, remove/retry if legal. For mixed eyes use separate scoped groups only if API permits; never blanket copy from first asset. Validate metadata on server; show detected mismatch and block. Submit shows per-file receipt and study/job ID; no inference before QC pass. DICOM direct device import is a server adapter flow, not a browser C-STORE connection.

**C03/C04 QC and processing:** QC detail 8+4: original preview and field table, quality banner and next action on side. Hard reject shows exact reason, recapture link, immutable failed artifact history. No override button that launches specialist with failed asset. Progress card shows five clinical stages with server statuses and timings, infrastructure separately; queued duration not prediction; partial/failed states link to evidence available and retry when safe.

**C05 clinical workspace:** P-VIEWER at 1440 with sidebar collapsed; patient strip top; logical-start asset rail 148–168px (right), central neutral canvas flexible, logical-end inspector 296–320px (left). Toolbar above canvas, asset/frame labels on every tile, urgency above tool area. Inspector tabs `یافته‌ها`, `لایه‌ها`, `مشخصات`; raw image button always visible. Bottom compact frame scrubber if multi-frame; keyboard alternative. Metadata inspector includes device, capture date, source, QC, model/version and units only if supplied. Overlay toggle is independent for segmentation and Grad-CAM. No A01–A04 in viewer. Use source-safe synthetic fixtures in demo. At narrow width inspector collapses to a tab; no viewport squeeze below safe minimum. When leaving viewer restore list scroll.

**C06–C10 modality pages:** same chrome, no separate visual language. Fundus uses 1–2 viewport layout plus findings; OCT uses B-scan with slice rail, optional en face reference and quantitative layer/fluid table; anterior uses 4-map grid with legends; VF uses source grids with longitudinal chart below; tabular uses form/table and SHAP side panel. Different assets/protocols never silently synchronize transformations.

**C11 Fusion target:** sticky eye+study context, header draft state, modality availability matrix across six clinical input groups (Fundus/OCT/OCT-A/Anterior/VF/Tabular), separate labs/history details where supported. Matrix states available, missing, rejected, pending, unsupported; icon+text. Main 8-col differential table with rank, condition, confidence and uncertainty, severity, evidence weights and links. Side 4-col discordance and missing confirmatory evidence panels; urgent floor banner above all. Below correlation details, evidence list and report action. Do not depict a single all-modality confidence as a diagnosis; do not normalize scores to 100. Model availability and clinical readiness separate.

**C13/C14 report and sign-off target:** P-REVIEW, context at top, evidence rail right, editable structured Persian report center, validation/urgency left. Status `پیش‌نویس هوش مصنوعی` persistent until clinician sign. Sections as PRD (findings per modality, quantitative biomarkers, ranked differential, correlation, follow-up/urgency, citations). Every citation navigates to exact source and highlights evidence; validation panel lists schema/citation/laterality/negation failures from backend. Draft autosave only if existing approved API; explicit save with version. Sticky footer `ذخیره پیش‌نویس`, `پیش‌نمایش`, `بررسی و تأیید` (authorized). Sign modal patient/eye, report/source version, urgency and floor, reason when needed, step-up. Choices approve, edit & approve, reject as backend supports; no auto-sign, no generic “Accept AI” without review. If data changed, block and reload/diff. On receipt show finalized version and release status, urgent queue routing separately.

| ID / destination | Type / scope | Composition and fields | Actions and acceptance |
|---|---|---|---|
| C01 `/diagnostics` — میز کار تشخیصی | P-LIST [R W2] | Worklist above; urgency/status filters, source/time, owner | Open case, create, authorized claim; urgent filter and counts reconcile; distinguish rejected QC from rejected report |
| C02 `/diagnostics/new` — ثبت مطالعه تشخیصی | P-EDITOR [R W2] | Upload fields per above, CFP/OCT/OCT-A/slit-lamp/topography/VF/labs/history, provenance | Per-asset laterality and modality required; validate size/type from contract; failed upload can resume/retry only if supported |
| C03 `/diagnostics/:study/qc` — کنترل کیفیت | P-DETAIL [R] | Declared/detected modality and eye, blur, light/glare/motion, QC pass/reject, reason, time and version | Hard-block Layer 2 if rejected; recapture as new immutable asset; QC status not clinical assessment |
| C04 `/diagnostics/:study/processing` — وضعیت پردازش | P-DETAIL [R] | Job ID, five stages, timestamps, available modalities, processing failure, model version, actual receipts | Poll authorized job; retry only approved; don't mark progress complete based on elapsed time |
| C05 `/diagnostics/:study/viewer` — مشاهده شواهد تصویری | P-VIEWER [R] | Raw canvas, rail, toolbar, findings, mask controls, metadata | Fit/zoom/pan/compare/fullscreen; raw/overlay aligned; eye always visible; calibration required for measurements |
| C06 `/diagnostics/:study/fundus` — تحلیل تصاویر شبکیه | P-VIEWER [R W2] | CFP, disc/cup/C-D, DR grade, glaucoma/AMD/papilledema/ROP findings where supported, masks, source | Toggle classes, inspect biomarkers, open citations; not all diseases assessed by every image; no model-negative inference from absent output |
| C07 `/diagnostics/:study/oct` — تحلیل OCT و OCT-A | P-VIEWER [R W2/W3] | B-scan volume/slice, RNFL/GCIPL/RPE-BM, IRF/SRF/PED, thickness/volume, AMD/DME/CNV, OCT-A biomarkers when enabled | Navigate frames; separate OCT-A tab if available; native scale/units, masks aligned; missing data explicit |
| C08 `/diagnostics/:study/anterior` — بخش قدامی و توپوگرافی | P-VIEWER [R W3] | Slit-lamp, 4 source maps, Kmax, astigmatism, thinnest pachymetry; KC stages/cataract/keratitis/pterygium | 2×2 maps with native legends, expand individual map; urgent floor for applicable findings; no fabricated fourth map |
| C09 `/diagnostics/:study/vf` — تحلیل میدان بینایی | P-DETAIL/P-VIEWER [R W3] | Protocol 24-2/10-2, sensitivity/TD/PD grids, MD/PSD/VFI, reliability if supplied, historical dB/year and uncertainty | Compare same compatible protocol/eye; show rejected or unreliable separately; don't mirror map, fabricate rate or mix home VR with HFA |
| C10 `/diagnostics/:study/risk` — داده‌های بالینی و آزمایشگاهی | P-DETAIL [R W2] | IOP/CCT, HbA1c/FBS, creatinine/lipids/BP, age/history, dates/units, risk scores, SHAP | Validate units/source; add observations if authorized; missing inputs explicit; no causal claims or invented probability |
| C11 `/diagnostics/:study/fusion` — ترکیب شواهد | P-DETAIL [R W3] | Availability matrix, ranked differential, confidence %, uncertainty, severity, attribution, discordance | Eye selector; open exact evidence; handle 1/3/6 modality cases; urgent floor retained with partial inputs |
| C12 viewer explainability tab — تفسیرپذیری مدل | Tab [R W2] | Segmentation controls, quantitative measurements, auxiliary Grad-CAM, SHAP where applicable, model/version, provenance | Independent toggles and sliders; preserve alignment; auxiliary label exact; edit mask only if contract supports adjudication |
| C13 `/diagnostics/:study/report-draft` — ویرایش گزارش تشخیصی | P-REVIEW [R W2] | Structured draft, citations, source evidence, validation and version, model metadata | Edit/save/diff; server generation retry/fallback; block invalid grounding, negation, eye; no PHI to external model |
| C14 sign-off dialog — تأیید نهایی چشم‌پزشک | Dialog [R] | Patient/eye, exact version, three urgency tiers, floor, reason, validation, approver | Approve/edit & approve/reject only authorized ophthalmologist; step-up as configured; no floor downgrade; persist feedback and receipt |
| C15 `/diagnostics/:study/compare` — مقایسه مطالعات | P-VIEWER [D] | Two/four source panels, dates/devices/eyes, compatible protocol/scale label | Select prior study within scope; synchronized zoom only if validated compatible; no pixel registration assumption |
| C16 study metadata drawer — مشخصات مطالعه | Drawer [D; R provenance] | StudyInstanceUID, modality, ImageLaterality, device, capture and receipt, QC, source/version | Read/copy only permitted identifiers; corrections through versioned workflow; don't expose raw DICOM PHI unnecessarily |
| C17 study feedback drawer — بازخورد پزشک | Drawer [R] | Model vs clinician findings, reason, affected evidence/mask/urgency, version | Save adjudicated label via backend; never mutate raw artifact; scope feedback to local training policy/consent |

### 8.4 D — Remote monitoring (T-A26–28/T-B22; W4; IOP optional)

**D01/D02 target:** Population overview P-DASH with active monitored patients, qualified sessions, overdue tests, actionable alert episodes, not “stable %” without clinical definition. Table per patient/eye/protocol and last qualified value/time, coverage, device, next due, alert. Patient detail P-PATIENT with scoped eye selector, period controls, separate modality panels; top recent valid data, baseline status, pending/rejected counts, coverage. For combined dashboard, no one green status derived from unlike measures. Charts full-width in row 8+4 with reliability/plan on side. Raw observations accessible from point and table. Home vs clinic results separate. In core W4 show Landolt C and Amsler; Home IOP conditional; home VF is not current scope.

| ID / destination | Type / scope | Composition and fields | Actions and acceptance |
|---|---|---|---|
| D01 `/monitoring` — پایش خانگی | P-DASH [D/R W4] | Population overview above; overdue, alerts, qualified tests, filters eye/protocol/clinician/time | Drill to D02; missing measurement not clinical stability; real denominators |
| D02 `/patients/:patient/monitoring/overview` — نمای کلی پایش | P-PATIENT [R W4] | Eye, qualified/latest, baseline, coverage, device, separate VA/Amsler/IOP if active, alerts/plan | Range, eye, source filters; link session/evidence; no aggregate health score |
| D03 `/patients/:patient/monitoring/iop` — فشار داخل چشم | P-DETAIL [G HOME2 T-A28] | Latest/min/max/mean, target version, day/time scatter, 7/30/90 ranges, valid/total, schedule adherence, device and raw table | Separate home/clinic and OD/OS; no inferred night peaks or universal target; disabled when partner contract absent |
| D04 `/patients/:patient/monitoring/acuity` — حدت بینایی | P-DETAIL [R W4] | Landolt C logMAR, qualified trials, baseline, protocol/version, time-series, sensor/preflight quality | Open session; compare compatible baseline; rejected sessions excluded; do not rescore Best-PEST in UI |
| D05 `/patients/:patient/monitoring/amsler` — آزمون آمسلر | P-DETAIL [R W4] | Source grid/geometry, baseline/current, distortion metrics, laterality, date, QC | Same-scale compare, session navigation, explicit missing/invalid; no grid mirroring |
| D06 `/monitoring/sessions/:session` — جزئیات جلسه | P-DETAIL [R] | Captured vs received time, eye, protocol/device, raw trials and score, qualification, source version | Evidence table, retry navigation only where approved; immutable raw trials; no raw face video |
| D07 `/monitoring/sessions/:session/quality` — کیفیت و قابلیت اعتماد | Tab [R] | Device qualification, preflight distance/lux/stability, sensor availability, test-specific reasons, raw evidence refs | Pass/reject/pending and explain reasons; no arbitrary threshold; link registry; never override QC by UI |
| D08 `/patients/:patient/monitoring/trends` — خط پایه و روند تغییرات | P-DETAIL [R] | Multi-session baseline, statistical evaluator/version, reliable change, 2-of-N, EWMA/CUSUM, qualified count, AlertEpisode links | Show computed flags only; explain limitations/insufficient baseline; no client inference or duplicate alerts |
| D09 `/patients/:patient/monitoring/plan` — برنامه پایش | P-EDITOR [D; contract-dependent] | Approved protocol, eye, schedule, eligible device, start/end, clinician, review | Publish only authorized plan contract; explicit missing eligibility; no arbitrary calibration settings or patient-controlled Rx |
| D10 `/monitoring/devices` — صلاحیت دستگاه‌های خانگی | P-LIST/admin [R W4] | Registry, model/OS/version, test supported, status, qualification evidence, kill-switch | Authorized inspect/disable via server; affected protocols explained; no unqualified test active |
| D11 `/patients/:patient/monitoring/home-vf` — میدان بینایی خانگی | P-DETAIL [G proposed extension] | Fixture-only concept: device/protocol, per-eye VF maps, reliability, MD/PSD/VFI only if validated equivalent, longitudinal trend | Do not activate from mobile mockup; require PRD/ADR amendment, headset/device qualification, comparability and validated API; never present home map as HFA |
| D12 `/monitoring/alerts` — هشدارهای پایش | P-LIST [R] | AlertEpisode, triggering qualified evidence, trend rule, eye, time, owner | Links F02 unified queue; dedup by ID; no separate competing triage state |

### 8.5 E — Care operations (T-B10/11, T-A08–12/14; W1)

**E05 Rx builder target:** two-column P-EDITOR. Patient and explicit eye context fixed top. Main form rows for Iranian generic/brand, dose, route, schedule, taper steps, start/end and instructions (from schema); inline date validation and approved missed-dose guidance. Right/left contextual preview (logical-end) shows patient Today plan in Persian with full eye, drug/bottle cue and schedule; preview is read-only and marked draft. Below version comparison side-by-side old/new, changed fields highlighted with labels (not just red/green). Sticky footer save draft, preview print, review/publish (authorized ophthalmologist). Confirm specific eye and version. If OS v2, OD v1 schedule and reminders unchanged. No manual prescription recommendation, free-text parsing into active plan or automatic dosage normalization. Conflict shows current version and unsaved draft, no silent overwrite.

| ID / destination | Type / scope | Composition and fields | Actions and acceptance |
|---|---|---|---|
| E01 `/care` — مدیریت مراقبت | P-DASH [D/R] | Active episodes, postoperative phase, adherence, due calls, open alerts, Print+Phone count | Drill into scoped list; separate care progress from health status |
| E02 `/care/episodes` — دوره‌های مراقبت | P-LIST [R] | Patient, explicit eye, protocol type/version, surgeon, anchor date, status, active Rx and next follow-up | Filter/create/open; no bilateral single episode if unsupported |
| E03 `/care/episodes/new` — ثبت جراحی و مراقبت | P-EDITOR [R] | Patient, eye, surgery/anchor time, surgeon, approved template, access mode, consent, preview | Validate laterality and duplicate/conflicting episode; create receipt; Print+Phone PDF/outreach path |
| E04 `/care/episodes/:episode` — جزئیات مراقبت پس از عمل | P-DETAIL [R] | Eye, procedure, T0 timeline, active Rx, dose tasks, education schedule, symptoms, follow-up and alerts | Open Rx/contacts/referrals; track status; no patient-specific guidance beyond approved plan |
| E05 `/care/episodes/:episode/prescription/edit` — تنظیم نسخه دارویی | P-EDITOR [R] | Builder above, active version, schedule/taper, approved guidance, preview | Draft/publish with ophthalmologist permission, version check, eye review; no cross-eye mutation |
| E06 `/care/episodes/:episode/prescriptions` — تاریخچه نسخه‌ها | P-LIST/detail [R] | v1..vN, publish actor/time, eye, status, version diff | Compare exact versions, new draft from version only if supported; signed versions read-only |
| E07 `/care/episodes/:episode/adherence` — پایبندی به درمان | P-DETAIL [R] | 4-state stacked chart, scheduled doses/denominator, date, drug, eye, Rx version, actor/channel and missed reason | Filter by dose/day; coordinator record phone report via approved flow; `پاسخی دریافت نشد` not missed; late receipt remains provenance |
| E08 `/care/episodes/:episode/symptoms` — علائم بیمار | P-LIST/detail [R] | Structured checklist, free text if authorized, red flags, eye, capture/receipt, source, NLP suggestion W4 | Review and route to triage; deterministic red flags non-suppressible; no LLM diagnosis |
| E09 `/care/education` — آموزش بیمار | P-LIST/detail [R] | Approved Persian content, version, optional audio, release timing relative T0, protocol/eye eligibility | Assign approved content if supported; preview patient view, no external CDN; no unsafe edits by unauthorized staff |
| E10 `/care/print-phone` — مراقبت چاپی و تلفنی | P-LIST/detail [R] | Access mode, large-print schedule PDF, call due, outcome, interpreter/caregiver if authorized | Generate server PDF, record call, link F/G; same triage/KPI denominators; no smartphone exclusion |
| E11 dose event dialog — ثبت وضعیت مصرف | Dialog [R] | Exact scheduled dose, Rx version, eye, four states, reason if not taken, actor/channel | Server idempotency; duplicate retry not duplicate event; no-response derived per policy, not manually inferred as missed |
| E12 episode closure review — پایان دوره مراقبت | P-DETAIL/dialog [R] | Completion status, unresolved alerts/referrals, adherence and closure summary version/hash | Close only permitted after required review; generate deterministic Persian report; no hidden unresolved urgent cases |

### 8.6 F — Triage and alerts (T-B11, T-A12; W1–W3)

**F01 target:** no large decorative hero. Full-width urgent banner (when present) + four compact counters: unassigned, due soon, overdue, open urgent; all defined by backend. Top filter bar urgency, owner, shift/clinic, workflow status, source, eye, due time. Worklist table urgency icon+Persian tier, due time/SLA, patient/eye, reason/source, owner, status, last contact and action. Sticky urgency column, server sorting, no reordering selected row while working. Detail inspector 380–420px or full P-DETAIL. Header shows eye, source event and authoritative urgency; reason and evidence linked. Contact log timeline center; action tray claim/contact/escalate/refer/close as allowed. Staffed-hours banner and fallback contacts visible. Claim conflict surfaces assigned owner and refresh. No automated close on “read”.

| ID / destination | Type / scope | Composition and fields | Actions and acceptance |
|---|---|---|---|
| F01 `/triage` — صف تریاژ | P-LIST [R] | Above, source care/AI/home, dedup episode, server SLA, owner, status | Claim/open; server urgent ordering; filters don't suppress global urgent indicator |
| F02 `/triage/:alert` — جزئیات هشدار | P-DETAIL [R] | Patient, eye, urgency/floor, linked evidence, signals, first/last occurrence, owner, SLA, staffed hours, state history | Open exact evidence, acknowledge/contact/escalate/refer/close per contract; reason and receipt; no generic dismiss |
| F03 contact/escalation dialog — ثبت تماس و اقدام | Dialog [R] | Attempt time, channel, outcome, next action, responsible staff, reason, notes | Validate state transition, distinguish attempt vs established; retry safe; no auto diagnosis or floor downgrade |
| F04 `/triage/handoff` — تحویل شیفت | P-LIST/editor [R] | Active shift, current/next owner, open cases, urgent/SLA, handoff notes | Assign permitted next owner, review unresolved, submit receipt; no silent ownership loss |
| F05 `/triage/outages` — ثبت اختلال | P-LIST/editor [R] | Outage window, service/channel, affected work, status, mitigation, owner | Record/update approved outage log; operational status not clinical; preserve audit and SLA policy |
| F06 `/triage/history` — سوابق تریاژ | P-LIST [R] | Closed/referred history, source, urgency, actor, timings, outcomes | Filter/open read-only; reopening only authorized transition; no destructive delete |
| F07 ownership dialog — تعیین مسئول | Dialog [R] | Current owner, eligible staff/shift, reason, version | Atomic claim/reassign; 409 shows actual owner; not client-only lock |
| F08 urgency review — بازبینی فوریت | Dialog [R] | Model suggestion, rule floor, authoritative urgency, evidence, reason | Authorized change only; prohibit floor downgrade; audit; separate status from urgency |

### 8.7 G — Follow-ups and referrals (T-B10/11; W1)

| ID / destination | Type / scope | Composition and fields | Actions and acceptance |
|---|---|---|---|
| G01 `/follow-ups` — تقویم پیگیری‌ها | P-DETAIL [D/R] | Jalali week/month/agenda, scheduled calls/visits, episode/eye, owner, due, status, clinic hours | List alternative, keyboard date navigation; create/reschedule only supported; no full hospital booking implied |
| G02 `/follow-ups/referrals` — فهرست ارجاعات | P-LIST [R] | Patient/eye, urgency, destination, delivery/attendance, owner, due, status | Filter/open/create; distinguish referred vs attended/closed |
| G03 `/follow-ups/referrals/new` — ایجاد ارجاع | P-EDITOR [R] | Patient/eye, linked alert/report, destination, reason, urgency, contact details, permitted attachments | Confirm delivery route, server receipt; no downgrade; step-up for export if needed |
| G04 `/follow-ups/referrals/:referral` — پیگیری ارجاع | P-DETAIL [R] | Delivery receipt, appointment/attendance outcome, miss reason, attempts, timeline and source | Record delivery/attendance/miss outcome; closed-loop closure with required reason; no assumed attendance |
| G05 `/follow-ups/overdue` — پیگیری‌های عقب‌افتاده | P-LIST [R] | Due date, owner, attempts, access mode, reason, alert link | Contact/reschedule via policy; maintain denominators including Print+Phone; no automatic deletion |
| G06 follow-up detail dialog — جزئیات پیگیری | Dialog [D/R] | Episode/eye, scheduled time, channel, outcome, next due, owner, clinic hours | Record outcome and receipt; preserve time zone; no claim of emergency coverage |

### 8.8 H — Reports (T-A14/T-B12/17; W1–W3)

**H02/H05 target:** neutral A4 preview centered on surfaceSoft, toolbar zoom/print/download with version and signed status. Sidebar inspector (320px) shows patient/eye, author, timestamps, report version, source hash and evidence links. PDF generated by backend using Vazirmatn/RTL; browser print only approved content with actual server PDF. Draft preview watermarked in Persian and never shareable as signed report. PDF preview not an editor; go to C13 for draft. Do not apply theme inversion to signed PDF.

| ID / destination | Type / scope | Composition and fields | Actions and acceptance |
|---|---|---|---|
| H01 `/reports` — مرکز گزارش‌ها | P-LIST [R] | Patient, type (closure/diagnostic/longitudinal if available), eye, version, date, approver, draft/signed/rejected | Filter/open; export only permitted; do not expose draft to patient |
| H02 `/reports/:report` — مشاهده گزارش | P-DETAIL [R] | Structured report, findings/measurements, evidence links, sign-off, urgency, provenance | View exact version, open evidence and PDF, authorized release status; no mutation of signed report |
| H03 `/care/episodes/:episode/closure-report` — گزارش پایان مراقبت | P-DETAIL [R] | Episode, eye, adherence, follow-up, unresolved items, outcome, `source_sha256` | Generate server deterministic PDF, review and export with permissions; no fake hash |
| H04 `/patients/:patient/longitudinal-report` — گزارش طولی | P-DETAIL [R W4/D format] | Approved longitudinal evidence, baseline/current, device, quality, timeline and interpretation if signed | Filter range/eye, export only if contract supports; never turn raw charts into autonomous diagnosis |
| H05 `/reports/:report/pdf` — پیش‌نمایش PDF | P-DETAIL [R] | Actual server version, neutral paper, pagination, zoom, report state, hash | Authorized download/print with step-up if required; draft watermark; error if PDF unavailable |
| H06 `/reports/:report/versions` — تاریخچه گزارش | P-LIST/diff [R] | Immutable versions, actor/date, changes, evidence source/version, status | Compare changes, open signed version; new amendment only supported workflow |
| H07 export dialog — دریافت خروجی | Dialog [R] | Scope, format, exact version, reason if required, step-up | Server export receipt, expiration, failure handling; no bulk client cache export |

### 8.9 I — Analytics (T-B12; W1 onward)

**I01 target:** four or five compact metrics across; row below operational trend and breakdown by access mode/clinic; pilot scorecard table with target/current/numerator/denominator/time range and data freshness. Use semantic target status only when comparable actual value exists. No faux precision. Filters keep data scoped and charts link to permitted drilldown. Admin sees aggregate operations, not automatic patient PHI. Export optional and audited.

| ID / destination | Type / scope | Composition and fields | Actions and acceptance |
|---|---|---|---|
| I01 `/analytics` — عملکرد کلینیک | P-DASH [D/R] | Active episodes, activation, completed follow-ups, SLA, call volume/staff time, access mode | Filter period/clinic; compare like denominators; show missing baseline; no unapproved PHI drilldown |
| I02 `/analytics/pilot` — شاخص‌های پایلوت | P-DASH [R] | PRD §8.1 targets, actual/numerator/denominator, time, source, sample size | Compare to target only valid metric; Print+Phone included; link metric definition; no fabricated values |
| I03 `/analytics/ai-quality` — کیفیت مدل‌های هوش مصنوعی | P-DASH [D/R metrics; gated access] | QC rejection, override/feedback rate, editing time, held-out sensitivity, Brier/ECE, model/site/device/split | Separate online operational data from labelled validation; show evaluation version; no claim of sensitivity from workload counts |
| I04 `/analytics/workload` — بار کاری و زمان پاسخ | P-DASH [D] | Queue age, assignments, contacted/closed, staffed-hours-aware SLA, staff role/shift where allowed | Aggregate filter, authorized drilldown; no staff ranking by clinical harm; no fabricated productivity |

### 8.10 J — Clinic administration (T-B12/T-A07/08; W1)

| ID / destination | Type / scope | Composition and fields | Actions and acceptance |
|---|---|---|---|
| J01 `/admin/clinic` — اطلاعات کلینیک | P-ADMIN [R] | Name, clinic scope, timezone, locale, contact, approved emergency phone | Save authorized fields with audit; Iran residency/locale defaults locked by policy |
| J02 `/admin/staff` — کارکنان کلینیک | P-LIST [R] | Staff identity, role, clinic membership, invitation/status, MFA state if supplied | Invite/change/deactivate only authorized; no raw credential exposure; revoke invalidates access |
| J03 `/admin/access` — نقش‌ها و دسترسی‌ها | P-ADMIN [R] | Role/grant matrix, ABAC scope, clinic membership, allowed capabilities | Review/change grant with step-up if required; backend enforcement; admin not implicit clinician |
| J04 `/admin/hours` — ساعات کاری و شیفت‌ها | P-EDITOR [R] | Week schedule, timezone, holidays if supported, staffed hours, emergency contact/out-of-hours ER instructions | Validate intervals, preview patient-facing text, publish approved changes; never imply 24/7 monitoring |
| J05 `/admin/protocols` — پروتکل‌های بالینی | P-LIST/editor [R] | Protocol type, version, config, approval, applicable clinic/eye/device | Draft/version/approve via policy; no unreviewed live protocol edits; no dosing algorithm in UI |
| J06 `/admin/report-templates` — قالب گزارش‌ها | P-ADMIN [R/D editor] | Versioned Persian templates, section schema, preview, approval | Preview deterministic output; template edits gated by API; clinical validators retained |
| J07 `/admin/message-templates` — قالب پیام‌ها | P-ADMIN [R] | Channel, Persian text, allowed placeholders, version, PHI guard | Preview/test via approved adapter; reject clinical PHI in SMS; no unrestricted send |
| J08 `/admin/features` — قابلیت‌های فعال | P-ADMIN [R] | Tenant/protocol/AI/device capability flags, status, dependencies, effective time | Authorized changes only, impact confirmation; clinical qualification cannot be bypassed with flag |
| J09 `/admin/consents` — رضایت‌نامه‌ها | P-ADMIN [R] | Versioned consent text, effective dates, scope, acceptance statistics if allowed | Publish approved version; existing acceptance preserved; research consent separate |
| J10 template version review — بازبینی نسخه قالب | Dialog/diff [R] | Old/new content, affected protocol/clinic, author, approval | Validate/publish if authorized; no retroactive active Rx mutation |

### 8.11 K — Devices and integrations (T-A24/28, T-B12/18; W3/G W4)

| ID / destination | Type / scope | Composition and fields | Actions and acceptance |
|---|---|---|---|
| K01 `/integrations/devices` — دستگاه‌ها | P-LIST [R] | Device ID/model/manufacturer, modality, clinic, last connection, supported status, qualification separate | Add/edit approved config, test connection, inspect history; no inference from connectivity to clinical quality |
| K02 `/integrations/dicom` — اتصال DICOM | P-ADMIN [R W3] | AE Title, endpoint, transport (DICOMweb/C-STORE), status, last test, masked credentials | Save/test via backend adapter; no browser direct PACS secret; wrong-eye metadata blocks ingestion |
| K03 `/integrations/his` — اتصال HIS و FHIR | P-ADMIN [R W3] | Adapter/version, FHIR resources, endpoint and status, allowed export mapping | Test mapping, inspect errors/receipts, secret never exposed; no assumed unsupported HIS format |
| K04 `/integrations/history` — سوابق دریافت و ارسال | P-LIST [R] | Job/receipt, source/destination, time, type, status, error category and retry eligibility | Retry idempotent approved operations; distinguish transport failure from clinical result; sanitized IDs |
| K05 `/integrations/home-iop` — اتصال فشارسنج خانگی | P-ADMIN [G T-A28] | Partner/device capability, ingestion mapping, eye/time/unit/source, consent, last sync | Configure only approved HOME2 partner contract; no device agnostic claim beyond validation |
| K06 `/integrations/de-identification` — هویت‌زدایی | P-DETAIL [R workflow/G staff access] | Export job, tag scrub status, burned-in review, pseudonymization, manifest/hash, approval | Block unverified export; no browser-only blur or raw PHI research download |
| K07 integration failure detail — جزئیات خطای اتصال | Drawer [D] | Sanitized status, adapter, correlation ID, timestamps, affected workflow | Test/retry only authorized; don't display secrets, raw payloads or PHI logs |

### 8.12 L — Internal operations (T-B12/T-A06/07/28; restricted)

| ID / destination | Type / scope | Composition and fields | Actions and acceptance |
|---|---|---|---|
| L01 `/ops` — وضعیت سامانه | P-DASH [D/R ops] | Redacted health of backend/AI/queue/storage, freshness, degraded status, current environment | Refresh, link incident; no admin controls for clinicians; no claim of health from stale data |
| L02 `/ops/jobs` — صف پردازش | P-LIST [R] | Job ID, type, age, status, attempts, sanitized failure, scope | Inspect/retry only safe backend operation; not raw patient data; cpu_stub unmistakably demo |
| L03 `/ops/audit` — سوابق ممیزی | P-LIST/detail [R] | Actor/action/time/scope/target/version/reason/outcome, redacted by policy | Search/filter/export with role + step-up; append-only; no delete/edit |
| L04 `/ops/break-glass` — دسترسی اضطراری | P-EDITOR [R] | Explicit reason, allowed scope/duration, warning, step-up, receipt and active session | Default deny, no frontend bypass; end/revoke; banner, audit, clear cache after expiry |
| L05 `/ops/tenants` — مدیریت مراکز | P-LIST/admin [D/R tenancy] | Tenant/clinic status, region, operational metadata | Authorized tenant lifecycle only via existing policy; no cross-tenant clinical preview |
| L06 `/ops/models` — وضعیت مدل‌ها | P-LIST/detail [D/R ADR-032] | Version, capability, environment, validation/model card, deployment status | Read authorized info; no frontend promotion unless governed workflow; distinguish research-only models |
| L07 `/ops/research` — حاکمیت پژوهش | P-ADMIN [G T-A28] | Consent eligibility, dataset scope, pseudonymized manifest, approval/export audit | Separate research grant; no PHI export; consent, de-ID and leakage gates; no training launch from clinical UI |
| L08 `/ops/billing-evidence` — شواهد فعالیت مالی | P-LIST [G T-A28] | Optional ledger records, activity evidence, clinic/period, status, approved IRR/Toman unit | Read/export per contract, explicit currency/unit; no full billing/accounting product |

### 8.13 M — Authentication, settings and system routes (T-B09; W1)

**M01 target:** split login screen with right clean form, A02 logo 200px, Persian heading, one primary `ورود کارکنان` action using configured IdP, support link and locale/theme only if safe. Left panel A01 400px centered, A03 low footer, subtle mint background, short product descriptor. Dark version uses prepared derivatives and same layout. Do not mock a password field if configured OIDC owns credentials. No clinical metrics or patient photos. MFA/step-up pages quiet, no unnecessary illustration; clear purpose and retry path. Session/403 pages do not reveal patient existence.

| ID / destination | Type / scope | Composition and fields | Actions and acceptance |
|---|---|---|---|
| M01 `/login` — ورود کارکنان | P-AUTH [R] | Brand, configured OIDC/SAML entry, support, theme | Redirect to IdP, handle failure safely; no local auth bypass or exposed tokens |
| M02 `/auth/mfa` — تأیید دومرحله‌ای | P-AUTH [R] | Provider-owned challenge or approved handoff, status, recovery | No invented OTP policy; clear expired/fail, no PHI shown |
| M03 `/auth/step-up` — احراز هویت مجدد | Dialog/page [R] | Action purpose, provider challenge, expiry, return target | Resume only exact authorized action; revalidate version and scope; cancel safely |
| M04 `/select-clinic` — انتخاب کلینیک | P-AUTH [R/D] | Authorized memberships, role, clinic name, availability | Select approved context; abort/clear previous queries; no global clinic impersonation |
| M05 `/settings/profile` — حساب کاربری | P-ADMIN [D] | Staff name, role/clinic, contact if authorized, provider identity | Edit only contract-supported fields; no self-role elevation |
| M06 `/settings/appearance` — ظاهر و دسترس‌پذیری | P-ADMIN [D] | Light/Dark/System, density, sidebar, reduced-motion system behavior, example components | Persist nonclinical prefs; theme instant on clinical pixels; preview and reset |
| M07 `/settings/notifications` — تنظیمات اعلان‌ها | P-ADMIN [D] | Allowed channel/category preferences and mandatory urgent notices | Save preferences if supported; cannot silence mandated queue/urgent floor |
| M08 `/settings/security` — امنیت و نشست‌ها | P-ADMIN [R/D] | Current session, MFA status where provided, logout, session actions if supported | Logout clears scoped data; revoke only supported; no raw credentials |
| M09 `/403`, `/404`, `/error` — دسترسی و خطا | P-SYSTEM [R/D] | Generic error, recovery, support ID if safe | Return to authorized route, clear denied data, no patient existence leakage |
| M10 session expired / offline / maintenance — وضعیت ارتباط | Banner/dialog/page [R/D] | Connection status, last verified update, retry/reauth, approved support/hotline | Block unsafe mutations, no fabricated receipt, no 24/7 claim; hide PHI when auth invalid |
| M11 `/settings/help` — راهنما و پشتیبانی | P-DETAIL [D] | Approved workflow help, shortcut list, support contacts, version | No raw PHI in support requests; clinical advice only approved content |

### 8.14 Coverage and route implementation policy

The inventory is a full proposed design surface for the requested desktop app, including embedded subviews, dialogs and cross-cutting states, rather than one router path per row. Do not expose all pages in sidebar; module roots plus patient/study context are primary. A/B patient overview, C clinical workspace, D monitoring, E care, F triage, G referrals, H reports, I analytics, J admin, K integrations, L ops, M system are all covered. Clinical worklist, episode management, triage, reporting and authorization are mandatory per PRD/ADR; optional admin UI controls depend on actual schemas. Some proposed views can be combined into existing routes; preserve IDs in tests. No unsupported general appointment marketplace, pharmacy inventory, insurance, full hospital billing or marketing pages. The original mobile reference design remains separate.

## 9. Metrics, analytics and operational truth

### 9.1 PRD pilot scorecard (authoritative targets, not observed values)

| Metric | PRD §8.1 target | Display and proposed definition requirements |
|---|---|---|
| 48h discharge activation | ≥70% | Actual numerator / eligible discharged patients; include App, Caregiver, Print+Phone; define anchor, window, exclusions and channel with product owner |
| Scheduled follow-up completion | ≥75% | Completed eligible scheduled follow-ups / due eligible follow-ups; define cancellations/reschedules and cutoff |
| In-SLA actionable triage | ≥95% | Actionable episodes handled within SLA / eligible actionable episodes, server SLA policy; avoid counting duplicate signals |
| Repeat calls or staff time reduction | ≥20% reduction in one without >10% rise in other | Compare baseline and pilot with same denominator/window; show both metrics, sample counts, baseline and formula; don't infer if baseline missing |
| System-attributed critical safety incidents | 0 | Audited incident count; zero means verified observation period, not no risk |
| Paid continuation commitment | ≥1 of 2 centers | Pilot center outcome, authorized aggregate, not a medical quality metric |

Pilot scope 12 weeks, 2 Iranian centers, 60–120 patients (PRD target, not actual enrollment). Use target markers as dashed lines; actual and target clearly differentiated. Data contract supplies metric definitions, numerator, denominator, timestamp, time zone, access mode, eligible count/exclusions, source and version. If denominator=0/missing, show `قابل محاسبه نیست`, not 0% or 100%. For comparisons show sample/window and difference in percentage points when appropriate; do not infer trend from one snapshot. Never silently redefine PRD formulas to match available data. The definitions above are proposed UI interpretation pending exact backend metrics.

### 9.2 AI evaluation and operational quality

PRD §8.2 targets: bad-image rejection recall ≥95%, router macro-F1 ≥99%, laterality mismatch catch rate ≥99%, held-out urgent-condition sensitivity ≥95% (D5), calibrated Brier/ECE and measurable fusion uplift over unimodal on GRAPE+D5; report schema/citation validity 100%, eye swap and dropped negation 0% (D4); track clinician editing time and HITL overrides. Display these as evaluation targets only, with dataset/model/version/split/sample size/date, confidence intervals if measured, metric definition and scope. No claims of actual performance until supplied. Separate online operational QC rejection fraction (not recall), job latency/failures, report editing duration and clinician feedback from labeled test metrics. Clinical outcome comparisons require verified evidence and patient/site/time/device holdout policy. Show model limitations, missing data and research-only status. Do not rank clinicians or models on unadjusted proxies. Never use a green “AI safe” badge just because a service is up.

## 10. React implementation blueprint for coding agents

### 10.1 Technology and dependency policy

Accepted stack from ADR-004: React 19 + React Router v8 framework mode, container-first Staff Web; use the actual pinned repository versions, not a guessed release number. TypeScript, typed generated OpenAPI 3.1 DTOs, MSW mock harness, local `packages/i18n-catalog`, `packages/clinical-fixtures`. Vite/container build as ADR T-B03. No mandatory new UI library; inspect existing design system first. Recommended if absent and approved: native HTML/CSS + headless accessible primitives, small tree-shaken icon library, server pagination/table helper and one chart library, a separately lazy-loaded validated DICOM/image renderer. Candidates such as Radix primitives, TanStack Table, React Aria, Apache ECharts or Cornerstone are **options only**, not verified compatible, licensed or installed in repo. Choose one suitable approach per concern after checking actual peer dependencies, RTL support, accessibility, licensing, bundle measurement, self-hosting and clinical fidelity. No dependency sprawl, no entire chart/viewer imported in shell. Use CSS custom properties and logical properties, CSS modules or existing Tailwind convention; if Tailwind exists map semantic tokens to theme, not utility colors. No browser-hosted external ML/LLM.

### 10.2 Suggested directory ownership (adapt to existing repo)

```text
apps/staff-web/
├── Dockerfile
├── src/
│   ├── app/                     # framework routes, root, shell, route guards
│   ├── core/
│   │   ├── api/                 # generated DTO adapters, scoped query keys, MSW
│   │   ├── auth/                # provider session, capabilities, step-up, guard
│   │   ├── i18n/                # fa-IR catalog, bidi, Jalali and number helpers
│   │   ├── errors/              # sanitized transport/domain error mapping
│   │   ├── theme/               # mode and density preferences, token CSS
│   │   └── observability/       # redacted telemetry only
│   ├── design-system/
│   │   ├── tokens/              # base, semantic and desktop extensions
│   │   ├── primitives/          # buttons, forms, dialog, tabs, menu, icons
│   │   ├── composites/          # shell, table, patient context, state surfaces
│   │   ├── charts/              # lazy chart wrappers + accessible table
│   │   └── fixtures/            # visual fixtures (synthetic only)
│   ├── assets/design/source/    # reference sources; exclude from runtime build
│   ├── assets/design/runtime/   # theme-aware optimized local brand assets
│   └── features/
│       ├── overview/            # A
│       ├── patients/            # B; scope adapter, not duplicate clinical data
│       ├── diagnostics/         # C; lazy viewers, evidence, report HITL
│       ├── monitoring/          # D; home vision timeline and optional HOME2
│       ├── episodes/            # E; surgical enrollment, care, Rx, Print+Phone
│       ├── triage/              # F; shared queue, shift, outage
│       ├── referrals/           # G; closed-loop and follow-ups
│       ├── reporting/           # H/I; PDFs and metrics
│       ├── admin/               # J; clinic templates/RBAC/hours
│       ├── integrations/        # K; device/HIS presentation only
│       ├── ops_console/         # L; restricted support/audit
│       └── settings/            # M; preferences and account
packages/contracts-openapi/      # canonical API (Track A/shared contract)
packages/event-schemas/          # domain events (canonical)
packages/i18n-catalog/           # fa-IR strings
packages/clinical-fixtures/       # approved test evidence, synthetic images/masks
tests/e2e/                      # single-worker cross-surface E2E
```

Root UI reads capabilities and feature policy from authorized session; route loaders enforce scope and data freshness before display, actions use typed adapters, domain logic remains in backend. Presentation components cannot import vendor SDKs or network directly. Shared primitives know no patient domain; clinical composites receive typed immutable evidence references. Local React state for disclosure/filter/interaction, existing server-state strategy for data, route state for context; do not duplicate clinical truth into persistent client store. Query keys include tenant, clinic, user/capability epoch and all resource IDs, eye, version and filters as applicable. Never cross-patient stale-while-revalidate in visible clinical panels. Abort on unmount/context switch; validate response identity before setting state. Errors map to structured localized domain messages; untrusted server strings rendered as text, not HTML. No custom front-end diagnosis rules.

### 10.3 Theme implementation contract

The full copy-ready CSS color variables are in Appendix A (generated from §2). Use `data-theme="light"|"dark"` on root, `color-scheme` accordingly, system mode resolves to OS preference; persist only preference (not PHI). Apply before first paint via safe existing bootstrap mechanism compatible with CSP; on SSR avoid hydration mismatch. Support system changes only in System mode. Add a no-transition initial class. Browser forced colors mode uses system foreground/background/borders and visible focus; do not `forced-color-adjust:none` on ordinary controls. For source medical image canvas preserve pixels while all surrounding labels remain accessible.

```css
:root {
  font-family: Vazirmatn, Tahoma, Arial, sans-serif;
  font-size: 100%;
  font-synthesis: none;
  --space-1: .25rem; --space-2: .5rem; --space-3: .75rem;
  --space-4: 1rem; --space-5: 1.25rem; --space-6: 1.5rem;
  --space-8: 2rem; --space-10: 2.5rem; --space-12: 3rem;
  --radius-input: .5rem; --radius-table: .75rem; --radius-card: .75rem;
  --radius-hero: 1rem; --radius-pill: 999px;
  --sidebar-width: 184px; --topbar-height: 56px;
  --page-gutter: 12px; --grid-gap: 10px; --panel-padding: 12px;
  --control-height: 36px; --table-row-height: 38px; --table-head-height: 36px;
  --kpi-min-height: 88px; --nav-row-height: 36px; --context-min-height: 60px;
  --duration-micro: 100ms; --duration-fast: 150ms;
  --duration-standard: 200ms; --duration-panel: 240ms;
  --ease-standard: cubic-bezier(.2,0,0,1);
  --ease-enter: cubic-bezier(.16,1,.3,1);
  --ease-exit: cubic-bezier(.4,0,1,1);
}
html { color: var(--on-surface); background: var(--canvas); }
body { margin: 0; }
*, *::before, *::after { box-sizing: border-box; }
:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.bina-shell { display: grid; grid-template-columns: var(--sidebar-width) minmax(0,1fr); min-block-size: 100dvh; }
.bina-shell[data-collapsed='true'] { grid-template-columns: 60px minmax(0,1fr); }
.bina-sidebar { grid-column: 1; position: sticky; inset-block-start: 0; block-size: 100dvh; background: var(--sidebar); border-inline-end: 1px solid var(--outline-variant); }
.bina-main { min-inline-size: 0; grid-column: 2; background: linear-gradient(150deg,var(--canvas-top),var(--canvas),var(--canvas-bottom)); }
.bina-panel { border: 1px solid var(--outline-variant); border-radius: var(--radius-card); background: var(--surface); padding: var(--panel-padding); box-shadow: var(--shadow-1); }
.bina-button { min-block-size: var(--control-height); padding-inline: var(--space-3); border: 1px solid transparent; border-radius: var(--radius-input); font: inherit; font-weight: 600; }
.bina-button[data-variant='primary'] { background: var(--primary); color: var(--on-primary); }
.bina-button:disabled { background: var(--disabled-bg); color: var(--disabled-fg); }
.bina-viewport { background: var(--viewer-canvas); color: var(--viewer-text); }
.bina-number { font-variant-numeric: tabular-nums; unicode-bidi: isolate; }
.bina-brand-art { pointer-events: none; user-select: none; }
@media (min-width: 1600px) {
  :root { --sidebar-width: 196px; --page-gutter: 16px; --grid-gap: 12px; --panel-padding: 14px; }
}
@media (min-width: 1920px) { :root { --sidebar-width: 216px; } }
@media (min-width: 1024px) and (max-width: 1279px) { :root { --sidebar-width: 60px; } }
@media (min-width: 1280px) and (max-width: 1439px) { :root { --sidebar-width: 176px; } }
.bina-topbar { min-block-size: var(--topbar-height); }
.bina-page { padding: var(--page-gutter); min-inline-size: 0; }
.bina-grid { display: grid; grid-template-columns: repeat(12,minmax(0,1fr)); gap: var(--grid-gap); }
.bina-kpis { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: var(--grid-gap); }
.bina-kpi { min-block-size: var(--kpi-min-height); }
.bina-nav-item { min-block-size: var(--nav-row-height); }
.bina-table thead th { height: var(--table-head-height); }
.bina-table tbody td { height: var(--table-row-height); padding: 6px 10px; }
.bina-shell[data-density='comfortable'] { --control-height: 40px; --table-row-height: 44px; --nav-row-height: 40px; }
.bina-shell[data-density='accessible'] { --control-height: 44px; --table-row-height: 56px; --nav-row-height: 44px; }
.bina-sidebar[data-variant='deep'] { background: linear-gradient(160deg,var(--nav-deep-start),var(--nav-deep-end)); color: var(--nav-deep-ink); }
.bina-sidebar[data-variant='deep'] [aria-current='page'] { background: var(--nav-deep-selected); color: var(--nav-deep-selected-ink); }
@media (max-width: 1023px) {
  .bina-shell, .bina-shell[data-collapsed='true'] { grid-template-columns: minmax(0,1fr); }
  .bina-main { grid-column: 1; }
  /* render sidebar as accessible modal overlay, not an offscreen focusable rail */
}
@media (prefers-reduced-motion: reduce) {
  .bina-shell { --duration-micro: 0ms; --duration-fast: 0ms; --duration-standard: 0ms; --duration-panel: 0ms; }
  .bina-motion-decorative { animation: none !important; transform: none !important; }
}
@media (forced-colors: active) {
  :focus-visible { outline: 2px solid Highlight; }
  .bina-panel, .bina-button { border: 1px solid ButtonText; box-shadow: none; }
}
```

Illustrative only; align with actual framework route rendering, CSS architecture and accessibility testing. The RTL grid starts at inline-start (right) with document `dir=rtl`; do not reorder DOM with CSS to create a different keyboard order. Do not use global CSS filters on `<img>`/canvas. Clinical labels should not be hidden by high-contrast mode.

### 10.4 Component boundaries and synthetic examples

```ts
// Illustrative presentation interface; not API schema or clinical logic.
type Eye = 'OD' | 'OS';
type EvidenceContext = Readonly<{
  patientId: string; clinicId: string; eye: Eye;
  sourceId: string; sourceVersion: string;
}>;
type DisplayValue<T> =
  | { kind: 'available'; value: T; source: EvidenceContext; capturedAt: string }
  | { kind: 'missing'; reasonKey: string }
  | { kind: 'rejected'; reasonKey: string; source: EvidenceContext }
  | { kind: 'pending'; reasonKey: string };
// Map from canonical generated DTO at boundary. No use of these placeholders
// to synthesize missing server values or reinterpret clinical status.
```

A clinical chart adapter accepts validated observations, explicit eye, unit and compatible protocol; sorting is chronological and gaps remain null. `EvidenceViewer` accepts `assetRef` and approved transforms; separate image loading and overlay loading. `ReportEditor` uses typed structured sections and citation IDs, not arbitrary unsafe HTML. `useCapabilities` derives UI visibility from backend policy, but all requests still checked. `useMutationReceipt` must distinguish accepted/submitted/completed; prevent duplicate in-flight submission and respect idempotency contract. For sign-off and Rx always review server source version; on stale response show diff. Use `aria-live=polite` for noncritical progress; urgent alert immediate visible and appropriate announcement. Stable test selectors `data-testid="C03-qc-rejection"` for critical assertions; prefer accessible role/name for interaction tests, not CSS selectors.

### 10.5 Performance, deployment and reliability budget

PRD §7: Staff Web container <100 MB; p75 LCP <2.2s, INP <180ms, CLS <0.05, initial JS <200 kB; read API p95 <300ms (backend target), AI processing <30s/study GPU and <5s stub/ONNX dev (targets, not guaranteed). Verify exact size measurement convention (compressed/uncompressed) with repo owner; report both initial compressed and raw transfer and route-specific chunks. Lazy-load diagnostic viewers, PDF, heavy chart pages, admin/research. Avoid loading large brand PNGs in every route; use cropped optimized derivatives, reserved image dimensions, `srcset` if applicable, no remote assets. Local font subset only if Persian coverage verified. Paginate server-side, virtualize only when accessible and necessary, keep first visible rows stable. Decode large images off main thread where supported by existing renderer; release image/worker/object URLs and GPU resources when switching patients/closing viewer. Abort abandoned requests. Do not cache clinical images in public service worker. Memoize pure expensive transforms by immutable evidence version, not patient-name key. Avoid per-row backdrop blur/shadow and unbounded animation. Avoid prefetching PHI routes outside authorized user intent. Report Lighthouse/Web Vitals in controlled synthetic env and real pilot measurement when available, clearly distinct.

Respect ADR-045/049/050: resource preflight `infra/scripts/check-resources.sh`, `free -m`, `df -h /`, `docker system df`; no destructive global prune or local GPU training, CPU stub/lightweight ONNX development. Multi-stage Alpine container, profiles, memory caps, log rotation 10m×2. Build/test using actual repository commands; do not run parallel heavy suites on constrained host. E2E Playwright `--workers=1`. All external network calls to fonts/CDNs absent, except approved configured infrastructure. No real PHI in screenshot or CI artifacts.

## 11. Localization, accessibility and interaction detail

### 11.1 Persian-first rules (ADR-035, PRD §7)

Root `<html lang="fa-IR" dir="rtl">`. All production UI labels, validation, errors, menus, help and accessible names are Persian; use catalog keys and parameters, no concatenated sentences. Latin medical abbreviations, units, DICOM UIDs, identifiers and drug strings use `bdi dir="ltr"` or appropriate bidi isolation; full Persian laterality `چشم راست (OD)` / `چشم چپ (OS)` not letter alone or icon. Preserve original code/identifier for clipboard/export when authorized. Display Persian digits for ordinary UI, Jalali date default, 24-hour time, clinic timezone clearly labelled, store canonical UTC/offset-aware instants. Jalali date range input supports Persian/Arabic/Latin digits, validated leap years and date boundaries; display same event across app/Staff Web/PDF; do not assume locale converter for input parsing. Do not silently use user browser timezone for clinic schedule/SLA. Use locale number formatting with explicit precision from contract; never round away clinical threshold crossing. Numeric input normalizes digits and decimal separators safely, rejects invalid mixed strings; show unit. Decimal clinical identifiers and signs isolated LTR (`−3.2 dB`), not reversed by RTL. Medical maps and chronological axes explicitly LTR/native orientation where appropriate. Strings translated with clinician-approved terminology; no unreviewed machine translation of clinical content. Arabic/English extensibility is architectural, not a reason to ship partial Persian.

Suggested UI lexicon (use existing catalog if authoritative):

| Key meaning | Persian default |
|---|---|
| Right eye / left eye | چشم راست / چشم چپ |
| Pending clinician review | در انتظار بررسی پزشک |
| AI draft | پیش‌نویس هوش مصنوعی |
| Signed / rejected | تأییدشده توسط پزشک / ردشده |
| Routine / scheduled / urgent | عادی / پیگیری ۳ تا ۶ ماه / ارجاع فوری |
| Missing / insufficient / unavailable | داده موجود نیست / داده کافی نیست / در دسترس نیست |
| QC failure | تصویر یا داده در کنترل کیفیت رد شده است |
| Recapture | تصویربرداری مجدد |
| Wrong eye | عدم تطابق چشم راست و چپ |
| Blur / light | تار بودن تصویر / نور نامناسب |
| Auxiliary attention | راهنمای توجه مدل — غیرقابل استفاده به‌جای سگمنتیشن دقیق |
| Unknown clinical status | وضعیت بالینی مشخص نیست |
| Taken / not taken + reason | مصرف شد / مصرف نشد + دلیل |
| Unavailable drug / no response | دارو در دسترس نبود / پاسخی دریافت نشد |
| Pending upload (patient) | در انتظار ارسال |
| No connection / retry | ارتباط با سامانه برقرار نیست / تلاش مجدد |
| Save draft / publish Rx | ذخیره پیش‌نویس / انتشار نسخه |
| Review and sign / version conflict | بررسی و تأیید / تداخل نسخه |
| Staffed hours | ساعات پاسخ‌گویی کلینیک |
| Permission denied | دسترسی به این بخش مجاز نیست |
| Demo | محیط نمایشی — داده آزمایشی |

### 11.2 Accessibility acceptance (WCAG 2.2 AA baseline)

- All normal text including clinical chart ticks and form labels at least 4.5:1 on actual composited backgrounds; large text at least 3:1 per WCAG; essential nontext UI boundaries and focus indicators 3:1 against adjacent colors. PRD calls for 4.5:1 contrast; prefer it even for large body metrics. Test Light/Dark, hover, selected, disabled (disabled controls exempt from WCAG contrast but remain legible), gradients and artwork. Do not color-code urgency/laterality alone.
- Landmark header/nav/main/aside, skip link `رفتن به محتوای اصلی`, one h1, logical h2/h3; label fields with `<label>` and describedby/error; `aria-invalid` and validation summary. Use `<table>` caption, headers/scope, `aria-sort`; only use interactive ARIA grid if full keyboard model implemented. Chart accessible data table and meaningful caption; canvas controls keyboard accessible with textual summary; not all diagnostic image interpretation can be conveyed by alt text, so retain approved findings and metadata.
- Every control keyboard accessible; Tab order follows semantic order in RTL; no positive tabindex, no focus trap outside modal; modal focus initial appropriate non-destructive action, return to invoker, Esc where safe. No drag-only controls, hover-only information or hidden keyboard actions. Focus must not be obscured by sticky headers/action bars (`scroll-margin-block`). Keyboard shortcut map proposed: Ctrl/Cmd+K search, Esc close/exit, viewer +/− zoom when focused, 0 fit/reset only scoped viewer, arrow keys per tab/grid; never global shortcut for sign/publish/delete. Avoid single character global shortcuts; configurable if added.
- Desktop targets 40×40 default; touch/coarse pointer 44–48, min 24×24 WCAG 2.2 target rule with applicable exceptions; do not conflate Flutter's mandatory ≥48dp with desktop. Support browser zoom 200% and 400%/320px reflow with scoped table/map exception; no clipped critical text/labels. System reduced motion and forced colors; no flashing/pulsing.
- Async states announce loading/progress and completion without flooding screen reader; errors persistent with recovery. Do not repeatedly announce SLA seconds; announce meaningful status/overdue transitions. Urgent flags visible without interaction. Preserve focus and reading position on refresh; after mutation focus receipt/next task. Do not auto-dismiss errors or critical alerts.
- Test real Persian text expansion and bidirectional sequences: patient/ID, date/time, negative values, `OD/OS`, DICOM UID, drug dose, phone `+98`. Validate Persian screen-reader labels, Chrome/Firefox/Edge and supported Safari if in target; keyboard-only and high-zoom manual review. axe-core automated zero critical violations is required by ADR; full AA needs manual review too, not just automated report.

## 12. Verification, visual regression and release gates

### 12.1 Required fixtures and visual states

Use deterministic synthetic patient/study/episode IDs, time frozen with clinic timezone, no real PHI. Each major route screenshot both themes and at 1440×900, 1280×800, 1920×1080; narrower 1024×768 and 768×1024 reflow, 200% zoom, 400% reflow audit. For all §8 screens, cover baseline/loading/empty/failed/permission/partial applicable states with component or route tests. Golden baseline at stable viewport/fonts; dynamic timestamps frozen, no screenshot masking of safety labels. For 20 design-anchor surfaces (M01,A01,B01,B03,C01,C02/C03,C06,C07,C08,C09,C10,C11,C13/C14,D01/D02,D03,D04/D05,E05,F01,I01,J01) capture complete default states in both themes; D03 fixture only until enabled, others by phase. Capture focused, selected and urgent/error cases as appropriate. Verify A02 brand crop and A04 header fade, no artwork over evidence. Compare side-by-side to matching R01–R14 desktop references (or BOARD for uncovered anchors) and mobile brand family. Do not compare unnormalized source raster to browser pixel-by-pixel; compare geometry, semantic token colors, information hierarchy and density. The independent raster references R01–R14 and BOARD are design targets, not executable goldens; establish approved desktop goldens after product review. Add 1600×1000 and 1600×900 reference viewport checks. At 1440×900 verify compact geometry, table visibility and that dashboard cards do not consume the whole viewport. Screenshots are acceptance evidence only after actual execution.

### 12.2 Functional and clinical safety acceptance matrix

| Test ID | Journey / assertion | Source / linked hazard |
|---|---|---|
| Q01 | Login via configured provider, MFA, denied role, session expiry, reauth return; unauthorized deep links reveal no PHI | ADR-019/020, T-B09 |
| Q02 | Switch tenant/clinic while request pending; no previous clinic result, image, chart, cache or notifications appear | HAZ-009, ADR-007 |
| Q03 | Enroll app, caregiver and Print+Phone; consent version and activation channel correct; print PDF and phone outreach tracked | REQ-CORE/CAT, T-B10 |
| Q04 | Dual-eye surgery, change OS Rx v1→v2, OD v1 plan and notifications untouched; ambiguous eye blocked | HAZ-001, ADR-043 |
| Q05 | Non-ophthalmologist attempts direct UI/API Rx publish and sign-off; denied server-side; stale permission revoked | REQ-AI-L5-003, T-A07 |
| Q06 | Four adherence states distinct, phone/app channel counted, no-response not missed, duplicate idempotent retry dedup | REQ-CAT, ADR-044 |
| Q07 | Offline patient event retries, captured vs received time visible, no false delivery; staff offline no fabricated receipt | HAZ-010, ADR-044 |
| Q08 | Caregiver grant/revoke; immediately 403 and clear cache per contract; stale tab cannot read | REQ-CORE, ADR-019 |
| Q09 | Bad blur/light and wrong-eye upload reject, no Layer 2 job; recapture valid as new artifact, rejected audit retained | HAZ-001/003, T-B15 |
| Q10 | DICOM multi-frame and unsupported modality/transfer errors safe; source laterality conflict blocked, no invented viewer | REQ-AI-L1/L6, ADR-053 |
| Q11 | Job accepted, queued, processing, failed/retry and partial result; no fake percentage or health status | REQ-AI-L6-001 |
| Q12 | Raw image and masks pixel-aligned at zoom/pan/frame change; missing masks explicit; Grad-CAM off by default and auxiliary label | HAZ-004, T-B16 |
| Q13 | Topography 4-map legends, source units; VF 24-2 vs 10-2 comparison blocked unless supported, no mirrored map | T-B18, ADR-043 |
| Q14 | Fusion with 1,3,6 modality inputs, missing/rejected explicit, discordance and uncertainty visible; no fake score | HAZ-006, ADR-052 |
| Q15 | LLM draft invalid citation, eye swap, dropped negation; validation errors block sign; deterministic fallback, no PHI exposure | HAZ-007/008, T-A20 |
| Q16 | Urgent-floor overrides model routine; attempted downgrade via UI/API rejected; reason persists; urgent visible in triage | HAZ-002, ADR-011/052 |
| Q17 | Approve/edit & approve/reject paths; immutable feedback/version, conflict blocked; only signed patient summary appears | REQ-AI-L5-003, T-B17/19/20 |
| Q18 | Triage concurrent claim lock, SLA crossing, shift handoff, staffed-hours rules, outage record, no duplicate episodes | T-B11, ADR-031/034 |
| Q19 | Referral delivery then attendance/miss reason, outcome/closure; Print+Phone included in denominator | REQ-CAT, T-B11 |
| Q20 | Closure report and signed diagnostic PDF generated with correct Persian shaping, eye, version/hash, export step-up | ADR-029, T-A14 |
| Q21 | Audit and break-glass require reason, scope/time/step-up; expiry ends access; no PHI in telemetry/SMS | ADR-020/023, HAZ-008/009 |
| Q22 | Home vision device rejected/kill-switch, sensor failure, raw trials immutable; qualified baseline/trend and dedup alert | REQ-RET, T-A26/T-B22 |
| Q23 | Gated HOME2 or home VR route unavailable without capability, no data invented; clinic VF remains distinct | REQ-EXP, scope extension |
| Q24 | KPI denominator=0/missing, baseline absent, true zero, target vs actual; counts reconcile including Print+Phone | PRD §8, T-B12 |
| Q25 | Export pseudonymized dataset only when approved; no raw PHI; unverified DICOM scrub blocks | HAZ-008/011, ADR-053 |
| Q26 | Theme persistence, system change, no flash, all controls/tables/dialogs and chart contrast; no clinical image inversion | V2.1 visual parity, ADR-035 |
| Q27 | Keyboard/focus/modal/RTL/Jalali/zoom/reflow, no hidden focused controls, accessible chart table, reduced motion | WCAG 2.2 AA, T-B14 |
| Q28 | Slow/disconnected network, 401/403/409/422/429/5xx, retries and stale flags; no PHI in URL/log/cache | §4.2, ADR-007/015 |
| Q29 | No external CDN, route chunk budgets, LCP/INP/CLS, container size, single-worker E2E and resource guard | PRD §7, HAZ-012, ADR-045/049 |
| Q30 | Mock and live mode explicit; no silent fixture fallback; AI stub never presented as validated patient assessment | ADR-050 |

Required integration paths: T-B14 Pillar 1 cross-surface E2E, T-B20 bad scan → QC reject → valid Fundus+OCT+VF+Labs → masks/Grad-CAM → Fusion → Persian report → ophthalmologist urgent sign-off → triage queue + signed patient summary; T-B22 home vision timeline. Use actual containerized backend/AI/patient Flutter Web with single worker as required, in addition to mock unit/component tests. Test backend security/process separately with Track A; frontend tests cannot prove RLS or clinical validation. No real patient records in fixtures. Document unsupported device/clinic adapters and do not claim tests were passed if not run.

### 12.3 Manual design review checklist

Review with ophthalmologist, technician, coordinator, clinic admin and accessibility reviewer using synthetic cases: time to find urgent patient; identify correct eye at every action; distinguish QC failure from normal; compare raw vs mask; understand uncertainty/missing modality; edit and sign exact report; find phone fallback and handoff; avoid wrong eye Rx; recover conflict and denied access. Observe misclicks, focus issues, label ambiguity, information needed outside system, reading at 200% and dense table navigation. Product/clinical owners approve thresholds, labels, viewer scales, compatibility and workflows; this spec alone does not establish safety/efficacy. Track issues with severity, affected route, reproduction, screenshot, correction, regression result. Never compensate for unsafe behavior with prettier graphics.

## 13. Delivery sequence and open decisions

### 13.1 Agent execution order (ADR §5)

| Milestone | Track B implementation | Exit evidence |
|---|---|---|
| W0 T-B01/B03 | Audit repository, fa-IR catalog/fixtures, React shell/scaffold, MSW, tokens and design primitives | SYNC-0 contracts frozen; Vite/container mock build, no external CDN |
| W1 T-B09 | Auth/shell/role-aware nav, theme, A overview, B patient context, M | OIDC/MFA/guard, RTL/Jalali and keyboard tests |
| W1 T-B10 | B enrollment, E episodes/Rx/adherence/Print+Phone | Dual-eye/version tests, authorized publish, PDF/outreach |
| W1 T-B11 | F triage/shift/outage, G referrals | SLA/claim/handoff/outcome tests |
| W1 T-B12/13 | H closure/report, I pilot, J admin, L break-glass, build gate | KPI formulas, audited access, containers; SYNC-1 live integration |
| W2 T-B14 | Pillar 1 full E2E + accessibility | Real stack single worker, no skipped assertions |
| W2 T-B15/16 | C upload/QC/processing, lazy evidence viewer, Fundus/OCT/Tabular | Rejected block, mask alignment, separate Grad-CAM, budget |
| W2 T-B17 | C differential/editor/HITL, H signed PDF | Role gates, evidence citations, validated Persian draft, sign feedback; SYNC-2 |
| W3 T-B18 | C anterior/topography, VF, full fusion/discordance, K DICOM/FHIR | Missing modalities, four maps, VF trends, integration contracts |
| W3 T-B19/20 | Cross-surface signed summary (Flutter owner) and diagnostic E2E | Signed-only release, urgent triage; SYNC-3 |
| W4 T-B21/22 | D calibrated home-vision timeline/quality/trends, device registry; T-B21 Flutter renderer dependency | Qualified sessions, baseline/trend E2E; SYNC-4 |
| Optional T-A28/UI | Home IOP, research, billing evidence only gated | Partner/API/clinical/privacy approval and dedicated tests |

PRD overview describes calibrated home monitoring in Wave 3; detailed ADR implementation places it in Wave 4. This document follows detailed ADR task schedule pending reconciliation, without changing scope. T-B23 marketing site excluded. UI work should not silently add backend tasks; raise contract gaps at sync. For every PR attach route IDs, PRD/ADR mapping, actual diff, theme captures, state coverage, test logs, build/bundle size, unresolved issues and owner. No fake production readiness claim.

### 13.2 Open decisions and blockers (not silently resolved)

| Decision | Required confirmation |
|---|---|
| Raster desktop mockups available; no Figma/CSS source or repository supplied | R01–R14 plus BOARD are inspected; normalized size/color tokens are proposals. Establish actual goldens with owner review; no claim of pixel-perfect or code compliance. |
| Existing React dependencies and exact Router version | ADR specifies stack; inspect package/lock and compatibility. Do not upgrade blindly. |
| Role and capability details | Source defines roles and sensitive gates; exact per-action ABAC scope, clinic access and export rules from backend/security owner. |
| Data schemas and available fields | Generated contracts needed for route actions, pagination, status names, model confidence/uncertainty, source versions, QC and validation errors. No made-up endpoint. |
| Clinical viewer and medical monitor requirements | Device formats, calibration, DICOM transfer syntax, source color legends, spatial alignment, mask classes and clinical display requirements must be verified by owner. |
| Clinical interpretation/quality thresholds | No fixed universal IOP target, VF reliability cutoff, trend threshold, treatment rule or urgency policy from UI; use validated backend protocol. |
| HOME2 and device-agnostic IOP | Partner transport/capabilities and patient/eye/quality contracts; optional, not default live feature. |
| Home VR VF | Not specified as mandatory by current PRD/ADR. Add formal protocol/qualification/API/clinical validation before activation; no conflation with HFA clinic VF. |
| Patient PDF/share and extra profile actions | Staff PDF required; patient-safe summary signed only. Broader patient access is separate contract/approval. |
| Dark artwork | Four original Light PNGs are available; dark/cropped/transparent derivatives are implementation tasks, not supplied ready-to-use files. |
| Clinical metrics and KPI formulas | PRD targets known, actual data/definitions and baseline periods need backend + clinic owner. |
| Staffed hours/hotline/ER, templates | Approved per clinic, no invented numbers/coverage. |
| Browser persistence and export policy | Security review required; default no persistent staff PHI, no offline write illusion. |
| Optional admin research/billing | Behind flags and grants; no comprehensive HIS/accounting scope. |
| Accessibility and performance | Proposed design, no real browser/clinical test executed here; measure and approve before release. |

## 14. Source register and final acceptance checklist

### 14.1 Project sources inspected for this specification

- **P1** — `PRD (2).md`, Bina AI PRD v3.0, 23 Nov 2026: §1 two pillars and safety; §2 Iran; §3 staff roles and surfaces; §4 REQ-AI-L1..L6; §5 REQ-CORE/CAT/RET/EXP; §6 models/datasets; §7 performance/a11y/security; §8 KPIs; §9 HAZ-001..012. Repository canonical `docs/PRD.md`.
- **P2** — `ADR (2).md`, ADR-001..053, 23 Nov 2026: §1 monorepo/staff-web modules; §3 decisions including 004/007/008/011/013/019/020/023/028/029/031/032/034/035/043/044/045/046/048–053; §4 data model; §5 tasks T-B01..B23 and SYNC-0..4; §6 DoD. Repository canonical `docs/ADR.md`.
- **V1** — `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md`: §4 color tokens and artwork; §5 typography; §6 accessibility; §8 motion; visual references §9.0A. Brand palette family is inherited; desktop palette refinements, dimensions/layout, route IDs, component names, CSS and motion are normalized design decisions informed by R01–R14.
- **V2** — Nine previously approved mobile screenshots (`Bina-AI-UI-Designs.zip`), visual family; four original raster artworks (`Bina-AI-Visual-Assets.zip`). Desktop references R01–R14 and BOARD are inspected and enumerated in §2.0; this is a visual reconstruction, not an exact layer extraction.
- **Pending repository authorities:** `AGENTS.md`, canonical OpenAPI/event schemas, actual package lock, real backend policy, fixtures, clinical model cards, device qualification and approved clinic texts were not inspected as repository code in this task. Agents must read them first.

No new external literature search or dependency-version verification was performed for this source-based UI specification. Official implementation references for agent verification (not evidence of conformance): WCAG 2.2 https://www.w3.org/TR/WCAG22/ ; ARIA APG https://www.w3.org/WAI/ARIA/apg/ ; React https://react.dev/ ; React Router https://reactrouter.com/ ; Playwright https://playwright.dev/ ; MDN logical properties https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values ; DICOM standard https://www.dicomstandard.org/ ; FHIR https://hl7.org/fhir/ . Verify dependency compatibility/licensing and applicable standards at implementation time.

### 14.2 Final release checklist — attach evidence, not promises

- [ ] Every applicable A–M view implemented or explicitly mapped to an existing view, with gated routes hidden/disabled and blockers logged.
- [ ] Shared CSS semantic tokens, same brand assets, local Vazirmatn and consistent Light/Dark/System; dark artwork and contrast approved.
- [ ] All table, form, chart, viewer, dialog, nav, responsive and interaction states covered; no dead controls, placeholder numbers or fake clinical imagery in live mode.
- [ ] Persian RTL/Jalali/bidi, accessibility manual and automated checks, browser zoom and reduced motion verified.
- [ ] Patient/eye/tenant/source/version scope proven; no wrong-eye mixing, stale cross-patient pixels, invalid QC progression, unauthorized sign/publish, or urgency downgrade.
- [ ] AI draft, validation, immutable evidence and sign-off receipts correctly distinguished; only approved patient-safe summary published.
- [ ] Print+Phone, consent/caregiver, staffed hours, triage/referral loop, audit/break-glass and PHI protections verified.
- [ ] Clinical charts and overlays reviewed for source fidelity, calibration, missing data and comparability; clinician sign-off on workflow design.
- [ ] Mock/live separation and real stack single-worker E2E executed; no skipped assertions; Track A security/process tests linked.
- [ ] Performance/container/resource guards passed after final edit; initial JS and route chunks, local assets, Web Vitals measured.
- [ ] Both theme screenshots and visual regression evidence attached, including urgent/error/empty states and responsive sizes.
- [ ] Open decisions, test blockers, known limitations and unsupported capabilities documented; no unverified compliance/clinical performance claim.

## Appendix A — Copy-ready color variable mapping

The following CSS variables are generated from the semantic tables in §2. Use a single canonical file, not duplicated copies in feature CSS. `--primary-grad-start/end` preserve mobile palette; the separate `--action-grad-start/end` are the contrast-adjusted desktop text-bearing gradient. The additional shadow tokens implement §2.4. Review actual composited contrast in browser.

```css
:root, :root[data-theme="light"] {
  color-scheme: light;
  --canvas: #EDF5F7;
  --canvas-top: #F4F8FA;
  --canvas-bottom: #E5F0F3;
  --surface: #F8FBFC;
  --surface-raised: #FFFFFF;
  --surface-soft: #EAF3F5;
  --surface-mint: #E5F8F2;
  --surface-aqua: #E5F5F8;
  --surface-cream: #F5F9E8;
  --on-surface: #102126;
  --on-surface-variant: #40565D;
  --muted: #50676D;
  --primary: #006C66;
  --on-primary: #FFFFFF;
  --primary-container: #D1EFEC;
  --on-primary-container: #005D48;
  --primary-grad-start: #007D77;
  --primary-grad-end: #005C57;
  --on-primary-gradient: #FFFFFF;
  --primary-shine: #06A99E;
  --secondary: #007F78;
  --on-secondary: #FFFFFF;
  --tertiary: #5654A6;
  --on-tertiary: #FFFFFF;
  --tertiary-container: #E7E8FC;
  --on-tertiary-container: #41418E;
  --outline: #55747A;
  --outline-variant: #D5E5E8;
  --glass-edge: #FFFFFF;
  --focus: #006C66;
  --shadow: #2D777C;
  --scrim: #10292D;
  --disabled-bg: #E1EBED;
  --disabled-fg: #52686D;
  --success: #216F1C;
  --success-bg: #DDF6D5;
  --success-icon: #237A19;
  --success-vivid: #20B600;
  --warning: #805200;
  --warning-bg: #FFF2D3;
  --error: #A72D35;
  --error-bg: #FDE8E8;
  --urgent-action: #A72D35;
  --on-urgent-action: #FFFFFF;
  --info: #195B89;
  --info-bg: #E1F0FA;
  --neutral: #40565D;
  --neutral-bg: #EAF2F3;
  --medication-well: #FFF3D8;
  --medication-ink: #8A5800;
  --plan-well: #E3EEFF;
  --plan-ink: #2255A4;
  --test-well: #DCF5EF;
  --test-ink: #006C66;
  --profile-well: #E0F4D9;
  --profile-ink: #296B2B;
  --chart1: #287A19;
  --chart2: #006E7A;
  --chart-axis: #40565D;
  --chart-grid: #D2E3E6;
  --chart-band: #DDF6D5;
  --chart-band-edge: #447B37;
  --ribbon-aqua: #A6EAE9;
  --ribbon-teal: #7BDCCB;
  --ribbon-mint: #BDEED8;
  --ribbon-lime: #D9F3AE;
  --ribbon-highlight: #FFFFFF;
  --iris-teal: #008B88;
  --iris-green: #83CF58;
  --vf-paper: #FFFFFF;
  --vf-ink: #171717;
  --sidebar: #F8FBFC;
  --topbar: #F8FBFC;
  --table-head: #EAF3F5;
  --row-hover: #EAF3F5;
  --row-selected: #D1EFEC;
  --row-alternate: #F1F7FA;
  --viewer-canvas: #090D12;
  --viewer-chrome: #17232C;
  --viewer-text: #E8EEF1;
  --viewer-border: #53636E;
  --viewer-focus: #83E8D6;
  --chart-od: #006C66;
  --chart-os: #2468B6;
  --chart-reference: #805200;
  --chart-rejected: #A72D35;
  --chart-baseline: #40565D;
  --chart-band-neutral: #E1F0FA;
  --link-visited: #5654A6;
  --code-bg: #EAF2F3;
  --nav-deep-start: #0E4144;
  --nav-deep-end: #0A3339;
  --nav-deep-ink: #F1F8F7;
  --nav-deep-muted: #C1DEDF;
  --nav-deep-selected: #006C66;
  --nav-deep-selected-ink: #FFFFFF;
  --chart-operational-blue: #2468B6;
  --chart-operational-teal: #007F78;
  --chart-operational-purple: #6655B8;
  --chart-operational-amber: #A56B00;
  --panel-divider: #D5E5E8;
  --selected-outline: #007F78;
  --icon-well: #E5F5F8;
  --action-grad-start: #006C66;
  --action-grad-end: #005C57;
  --shadow-1: 0 2px 6px #2D777C0D;
  --shadow-2: 0 6px 20px #2D777C15, 0 1px 3px #2D777C0D;
  --shadow-overlay: 0 16px 48px #10292D26;
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --canvas: #091B20;
  --canvas-top: #10272D;
  --canvas-bottom: #0C2228;
  --surface: #142C32;
  --surface-raised: #1B373D;
  --surface-soft: #18343A;
  --surface-mint: #173F3A;
  --surface-aqua: #17343D;
  --surface-cream: #293C30;
  --on-surface: #F1F8F7;
  --on-surface-variant: #B8D0D1;
  --muted: #A7C2C4;
  --primary: #77E0CE;
  --on-primary: #062823;
  --primary-container: #194B42;
  --on-primary-container: #9BF1D2;
  --primary-grad-start: #097D74;
  --primary-grad-end: #07554F;
  --on-primary-gradient: #FFFFFF;
  --primary-shine: #29B7A6;
  --secondary: #68D9D1;
  --on-secondary: #082E2B;
  --tertiary: #BEBBFF;
  --on-tertiary: #222052;
  --tertiary-container: #302D58;
  --on-tertiary-container: #D4D1FF;
  --outline: #7FA1A6;
  --outline-variant: #35535A;
  --glass-edge: #3D6267;
  --focus: #80E7D5;
  --shadow: #00090C;
  --scrim: #000000;
  --disabled-bg: #243B40;
  --disabled-fg: #A1B8BB;
  --success: #9AE78F;
  --success-bg: #203E29;
  --success-icon: #287A3A;
  --success-vivid: #6AD950;
  --warning: #FFD387;
  --warning-bg: #44351D;
  --error: #FFB3B5;
  --error-bg: #49262D;
  --urgent-action: #AA303A;
  --on-urgent-action: #FFFFFF;
  --info: #A8D6FF;
  --info-bg: #1C364B;
  --neutral: #C3D4D5;
  --neutral-bg: #263D42;
  --medication-well: #44351D;
  --medication-ink: #FFD387;
  --plan-well: #203A55;
  --plan-ink: #A8CAFF;
  --test-well: #1D463F;
  --test-ink: #8FE3D6;
  --profile-well: #273E30;
  --profile-ink: #B1E8A6;
  --chart1: #9AE78F;
  --chart2: #72DBEE;
  --chart-axis: #B8D0D1;
  --chart-grid: #36545A;
  --chart-band: #28482D;
  --chart-band-edge: #9AD58E;
  --ribbon-aqua: #16484E;
  --ribbon-teal: #176052;
  --ribbon-mint: #1D513F;
  --ribbon-lime: #40572E;
  --ribbon-highlight: #659E93;
  --iris-teal: #169E96;
  --iris-green: #77BC63;
  --vf-paper: #FFFFFF;
  --vf-ink: #171717;
  --sidebar: #10272D;
  --topbar: #142C32;
  --table-head: #18343A;
  --row-hover: #1B373D;
  --row-selected: #194B42;
  --row-alternate: #11292F;
  --viewer-canvas: #090D12;
  --viewer-chrome: #17232C;
  --viewer-text: #E8EEF1;
  --viewer-border: #53636E;
  --viewer-focus: #83E8D6;
  --chart-od: #77E0CE;
  --chart-os: #8CC4FF;
  --chart-reference: #FFD387;
  --chart-rejected: #FFB3B5;
  --chart-baseline: #B8D0D1;
  --chart-band-neutral: #1C364B;
  --link-visited: #BEBBFF;
  --code-bg: #263D42;
  --nav-deep-start: #0D3438;
  --nav-deep-end: #09272D;
  --nav-deep-ink: #F1F8F7;
  --nav-deep-muted: #B8D0D1;
  --nav-deep-selected: #194B42;
  --nav-deep-selected-ink: #9BF1D2;
  --chart-operational-blue: #8CC4FF;
  --chart-operational-teal: #68D9D1;
  --chart-operational-purple: #BEBBFF;
  --chart-operational-amber: #FFD387;
  --panel-divider: #35535A;
  --selected-outline: #77E0CE;
  --icon-well: #17343D;
  --action-grad-start: #086B64;
  --action-grad-end: #07554F;
  --shadow-1: 0 2px 6px #00090C40;
  --shadow-2: 0 6px 20px #00090C59;
  --shadow-overlay: 0 16px 48px #00090C99;
}
```

### Appendix A.1 — Static contrast sanity check

Calculated WCAG relative-luminance ratios for the following solid token pairs (not browser tests; compositing, hover, artwork and focus against adjacent surfaces still require QA). Text pairs target ≥4.5:1; outline/focus pairs target ≥3:1.

| Foreground | Background | Light | Dark |
|---|---|---:|---:|
| `on-surface` | `surface` | 15.93:1 | 13.59:1 |
| `on-surface-variant` | `surface` | 7.46:1 | 9.04:1 |
| `muted` | `surface` | 5.77:1 | 7.77:1 |
| `on-primary` | `primary` | 6.29:1 | 9.99:1 |
| `on-primary-container` | `primary-container` | 6.49:1 | 7.48:1 |
| `error` | `error-bg` | 5.83:1 | 7.74:1 |
| `warning` | `warning-bg` | 6.05:1 | 8.42:1 |
| `success` | `success-bg` | 5.43:1 | 7.97:1 |
| `info` | `info-bg` | 6.22:1 | 8.18:1 |
| `on-primary-gradient` | `action-grad-start` | 6.29:1 | 6.37:1 |
| `on-primary-gradient` | `action-grad-end` | 7.87:1 | 8.67:1 |
| `chart-axis` | `surface` | 7.46:1 | 9.04:1 |
| `outline` | `surface` | 4.85:1 | 5.26:1 |
| `focus` | `surface` | 6.05:1 | 9.96:1 |
| `nav-deep-ink` | `nav-deep-start` | 10.50:1 | 12.46:1 |
| `nav-deep-ink` | `nav-deep-end` | 12.62:1 | 14.56:1 |
| `nav-deep-muted` | `nav-deep-start` | 7.95:1 | 8.29:1 |
| `nav-deep-selected-ink` | `nav-deep-selected` | 6.29:1 | 7.48:1 |
| `chart-od` | `surface` | 6.05:1 | 9.29:1 |
| `chart-os` | `surface` | 5.41:1 | 7.98:1 |
| `selected-outline` | `row-selected` | 4.01:1 | 6.27:1 |

## Appendix B — Inventory summary

- Module A: 5 views/flows.
- Module B: 12 views/flows.
- Module C: 17 views/flows.
- Module D: 12 views/flows.
- Module E: 12 views/flows.
- Module F: 8 views/flows.
- Module G: 6 views/flows.
- Module H: 7 views/flows.
- Module I: 4 views/flows.
- Module J: 10 views/flows.
- Module K: 7 views/flows.
- Module L: 8 views/flows.
- Module M: 11 views/flows.

Total: 119 uniquely identified views/flows across 13 modules; not 119 separate backend endpoints or necessarily separate URLs.
