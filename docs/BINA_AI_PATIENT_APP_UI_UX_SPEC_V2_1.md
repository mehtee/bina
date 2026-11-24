# Bina AI — Patient App UI/UX & Flutter Design System Specification

**Version:** 2.1 — reference-locked Light redesign + matched Dark theme + four supplied visual assets (implementation baseline)  
**Revision date:** 24 November 2026  
**Visual authority:** `Bina-AI-UI-Designs.zip` — nine approved Light-mode renders, 1122 × 1402 PNG each; see §9.0A.  
**Visual assets:** `Bina-AI-Visual-Assets.zip` — four original RGB PNGs, A01–A04; see §4.4.1–4.4.4 and Appendix C.  
**Previous baseline:** `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2.md` (v2.0). This is its full successor, not an addendum; all existing screen, behavior, token and safety specifications remain in force except explicitly updated asset instructions.  
**Audience:** Codex, Antigravity, Flutter engineers, designers, QA, clinical/product reviewers  
**Product:** `apps/patient-app` — Android, iOS, self-hosted Flutter Web verification target  
**Language:** this specification and source code are English; all patient-facing product copy is Persian (`fa-IR`).  
**Companion authority:** `docs/PRD.md` (v3.0, 23 Nov 2026) and `docs/ADR.md` (ADR-001–053, 23 Nov 2026). Read repository `AGENTS.md` before implementation.  
**Status:** design specification; not evidence of implementation, clinical validation, regulatory clearance, or completed user research.

## 0. Agent operating contract — READ FIRST

**Source precedence:** PRD/ADR, repository contracts and clinical protocols govern safety, scope and data; the nine approved PNGs govern visual appearance; this v2.1 defines precise implementation tokens and extends the same design to unpictured states and Dark. Section 9.0A is the authoritative composition for the nine pictured screens; remaining route inventory specifies domain behavior and unpictured flows. If a contradiction remains, do not choose a different aesthetic or implement unapproved clinical capabilities: record the conflict and follow these priorities. The numeric dimensions and Dark theme are designed here, not extracted from a vector source. Keep this document, the nine-screen reference ZIP and the four-asset ZIP together (recommended `docs/design/reference/` for original archives). The four supplied standalone raster assets are now the visual source of truth for the eye illustration, full logo/wordmark, broad wave and compact header wave. Use those originals and their documented derivatives instead of redrawing them. Original editable layers, transparent masters and an official vector logo are still not supplied. See §4.4.1–4.4.4 for exact asset usage and Dark adaptation. The final visual match must be verified against both the PNGs and the product safety/a11y gates.


1. MUST follow the PRD, ADR, AGENTS.md and actual OpenAPI/event schemas. This document defines the UI layer, not new clinical or API semantics. If a proposed route or field is unsupported, implement its safe empty/disabled state or defer it; report the missing contract. Never silently invent a backend endpoint, clinical threshold, prescription, signed report, or fake receipt.
2. MUST inspect the existing repository, SDK, lockfiles, design tokens, generated DTOs, feature flags, test fixtures and screen implementations before modifying anything. Reuse sound components; migrate incrementally; do not rebuild working clinical flows for cosmetic reasons. Keep Track B changes in its owned paths; coordinate shared contracts with Track A.
3. MUST implement all enabled features in both light and dark themes, RTL, with native accessibility, keyboard support on Web, and explicit offline/loading/error/permission states. A polished screenshot without these behaviors is NOT done.
4. MUST never change OD/OS identity, prescription version, medication timing, urgent routing, clinical test geometry, quality criteria, or sign-off rules while styling. UI state is not a clinical source of truth. Never imply an unsigned AI result is a diagnosis, an offline submission was received, or a clinic provides 24/7 surveillance.
5. MUST use a shared component library and centralized semantic tokens. No raw color, radius, spacing, duration, font size, or patient-facing string in feature widgets except documented clinical stimulus parameters, test fixtures, and named system constants. No gradients outside the named Bina Clinical Glass recipes in §4, copied template layouts, gratuitous animation, English placeholder copy, nonfunctional controls, or unnecessary dependencies.
6. MUST treat this as a staged design: **[V]** = visually observed in reference images; **[R]** = capability required by original PRD/ADR; **[D]** = implementation/UI decision proposed by this specification; **[G]** = gated/optional or contract/clinical approval required; **[X]** = expressly out of current scope. A route labeled [D] can implement an [R] capability; route names, component shapes and exact tokens are not locked by original documents. All numerical UX targets in this file are local acceptance proposals unless expressly attributed to a source.
7. Before each feature, enumerate expected scenarios, choose shared widgets, use deterministic mock fixtures, implement, then run relevant checks after the last edit. Never bypass tests with skipped assertions. Provide evidence of actual runs or say what was blocked. Do not claim real devices or clinical usability studies were performed when they were not.

### Contents

- 1. Research and version decisions
- 2. Product boundaries, personas and workflows
- 3. Information architecture and navigation
- 4. Visual identity and color system
- 5. Typography, geometry, spacing and iconography
- 6. Adaptive layouts and accessibility
- 7. Component library and state recipes
- 8. Motion, feedback and sound
- 9. Screen inventory and implementation specifications
- 10. Clinical test UX and safety boundaries
- 11. Data visualization, localization, notifications and offline UX
- 12. Flutter implementation, QA and rollout
- 13. Open decisions and references
- 14. Implementation execution plan
- Appendices A–C: token contrast, screen reference integrity and standalone asset integrity

---

## 1. Technology baseline and inherited evidence

### 1.1 Repository-first technology selection

- Flutter is locked by ADR-002. Use the repository's pinned SDK, Dart, Material widget package, routing, state management and localization tools. Use Material 3 building blocks with explicit Bina overrides, not stock visual defaults. Do not change SDK/package versions just to reproduce gradients or cards.
- Prior v1.0 research recommended a Flutter 3.50 / standalone `material_ui` migration. That recommendation is inherited historical context, not a freshly verified package/version claim in this revision. If the repo uses SDK Material, keep its compatible import/API; if it uses the standalone package, keep that. Consult official installed-version docs and lockfile; migration requires separate approval and regression tests. Do not mix independent Material widget trees or manually edit generated localizations.
- Flutter Android/iOS native + self-hosted Web verification are project requirements. Local fonts, icons, assets and renderer; no runtime remote fonts/CDN. The source image is not an implementation, and no repository was available for compiling this specification.
- The earlier research evidence-to-design notes and links below are retained as background, not newly re-verified for this revision. The current revision prioritizes visual fidelity to the approved PNGs and explicit project requirements. Verify external references before using them to justify new medical or engineering claims.

### 1.2 Inherited evidence-to-design decisions (v1.0; not re-verified)

| Evidence / reference | Bina application | Verification |
|---|---|---|
| Flutter adaptive layout guidance [F8] | Adapt to available constraints; mobile navigation, tablet rail, bounded reading width. | Resize, rotate, keyboard and split-screen tests. |
| Flutter accessibility and TextScaler [F9–F13] | Respect OS scaling, semantics, focus, and assistive technologies. | Guidelines API plus real TalkBack/VoiceOver and Web checks. |
| WCAG 2.2 AA [W1–W2] | Contrast, keyboard access, reflow, accessible authentication, error recovery, visible focus, alternatives to dragging. Native equivalents wherever applicable. | Automated + manual audit; WCAG is primarily a Web standard, not by itself native certification. |
| Android and Apple accessibility [A1–A3] | Consistent 48dp minimum from ADR; larger frequent controls; support reduced motion and system appearance. | Touch target inspection and platform testing. |
| Older-adult app usability review, 40 studies [R1] | Reduce cognitive load; keep important actions visible; larger separated controls; predictable navigation and help. | Representative Persian-speaking patients attempt realistic tasks without coaching. |
| Older-adult mHealth review [R2], 2025 age-friendly review [R3] | Plain language, helpful feedback, low text-entry burden and assistance. | Patient/caregiver walkthroughs and error rates. |
| 2026 low-vision mHealth review [R4] | Screen-reader completeness, clear navigation and interaction are core requirements, not optional add-ons. | Test users with different visual impairments; do not extrapolate one impairment to everyone. |
| NHS and CMS healthcare design systems [H1–H3] | Restrained clinical palette, meaningful status roles, measured contrast, not color-only meaning. | Audit exact foreground/background pairs. |
| Flutter offline-first and architecture guidance [F14–F15] | UI derives from repository and durable outbox state; show local versus server-confirmed state. | Restart/network loss/conflict tests. |
| Flutter motion/performance [F16–F17] | Small purposeful transitions and no continuous decoration. | Profile low-end hardware; respect system motion settings. |

These are targeted desk-research findings, not an exhaustive systematic review or direct head-to-head usability trial of Bina. There is no universally best hue, shape or motion for ophthalmic patients. The approved reference palette and exact implementation sizing are design decisions to be validated with Iranian patients. Do not claim that teal improves recovery or is scientifically proven superior.

## 2. Product boundaries, personas and critical journeys

### 2.1 Scope traceability

| Capability | Original authority | Delivery |
|---|---|---|
| Persian design system / Web verification | ADR-023/035/045; T-B01/02/04 | W0–W1 |
| Patient OTP, consent, accessibility, scoped caregiver | REQ-CORE-001..005; ADR-019/020; T-B06/08 | W1 |
| Eye-specific care plan, adherence, education, offline SOS | REQ-CAT-001..011; ADR-011/034/043/044; T-B07/08 | W1 |
| Offline encrypted store, outbox and sensor ports | ADR-044; T-B05 | W1 |
| Pilot E2E and a11y | T-B14; PRD §7–9 | W2 |
| Patient-safe signed diagnostic summary/follow-up | REQ-AI-L5-003; ADR-013/029; T-B19/20 | W3 |
| Qualified Landolt C/Amsler, preflight, baseline | REQ-RET-001..008; ADR-012/016/017/018; T-B21/22 | W4 |
| HOME2 and DR referral expansion | REQ-EXP-001..005; T-A28; no dedicated patient IOP task in ADR | Gated W4+ |

PRD high-level Wave 3 includes R2 home monitoring, while ADR's detailed task plan schedules it in Wave 4. Use ADR's detailed implementation schedule as a working assumption, flag discrepancy to product owner; do not silently revise either document. P1 R1 is post-cataract shared care; R2 adds qualified home testing for relevant assigned protocols, not general self-diagnosis. The app is not the clinician workstation. Home VF perimetry, contrast sensitivity/color vision (ADR-038 deferred), autonomous image diagnosis, raw AI scores, prescriptions created by patients, chat-based medical advice, commerce, appointment booking, and general medical records are [X] unless separately approved.

### 2.2 Users and jobs-to-be-done

| Persona | Primary job | Design implication |
|---|---|---|
| Older post-cataract patient, possibly blurred vision | Know which drop, which eye, and when; get help if concerned. | One next task, full eye words, large text, bottle cue plus text, reliable offline SOS. |
| Chronic retina patient | Complete a clinic-assigned home vision task correctly. | Guided steps, quality gate, pause/exit, no misleading result. |
| Glaucoma patient | Follow drop plan; if enabled, transfer assigned HOME2 readings. | No phone-only IOP claims; device source and laterality. |
| Caregiver | Carry out delegated tasks for the correct patient. | Persistent patient/context banner, per-scope action controls, instant revocation on server. |
| Low-literacy or low-vision user | Use audio, screen reader or accessible text to complete everyday care. | Plain Persian, no icons alone, OS scaling, direct help. |
| No smartphone | Receive equivalent instructions and follow-up by print/phone. | Staff-side parity, not forced digital enrollment; offer clinic contact. |

### 2.3 Core jobs and safety outcomes

- **First use:** clinic invitation / phone → OTP → approved Persian consent → optional accessibility setup → active clinic-issued plan. No forced tutorial carousel or unrelated permission prompts.
- **Daily care:** Today → explicitly labeled eye and due dose → record actual status → distinguish locally saved from server confirmed. No adherence points, guilt, celebratory treatment claims or streak pressure.
- **Urgent help:** visible SOS → immediate clinic/out-of-hours guidance even offline → optional structured symptoms → urgent action independent of server receipt. Never delay contact while a model or network call runs.
- **Results:** signed report only → clear patient-safe summary → next action or clinic contact. Do not expose raw specialist outputs, heatmaps, likelihoods, unsigned report existence/details or triage worklist.
- **Home test:** assigned test → supported-device check → eye confirmation → instruction/practice → protocol-defined preflight → clinical trials → quality verdict → receipt. Invalid/incomplete is not normal; no self-treatment.

## 3. Information architecture (IA) and navigation

### 3.1 Proposed stable shell [D]

Use the exact five logical destinations from the approved reference images at full scope. The isolated reference preview always shows all five tabs. Production follows actual release/entitlement gates. R1 has only Today, Care, Account; add Results at W3 and Tests at W4 when available to the account/protocol. Never show a destination that dead-ends solely because a wave has not shipped. If capability is available but no data exists, show the genuine empty state. Changes in destinations after an entitlement change must return focus safely to Today and announce it; no shifting during an active clinical task.

| Logical order (RTL starts on right) | Persian | Icon (Material family) | Root route |
|---|---|---|---|
| 1 Today | امروز | home / home_outlined | `/today` |
| 2 Care | مراقبت | favorite_rounded / favorite_border_rounded | `/care` |
| 3 Tests (gated) | آزمون‌ها | assignment_turned_in / assignment_turned_in_outlined | `/tests` |
| 4 Results (gated) | نتایج | insert_chart / insert_chart_outlined | `/results` |
| 5 Account | حساب من | person / person_outline | `/account` |

SOS (`/help/urgent`) is a **separate, persistent labeled action** in the shell header, not a destination hidden inside Account. A prominent Today action repeats it. In cramped layout use a full-width help row immediately below header, not icon-only. On subpages show an accessible SOS link when clinically safe; on test trials place a clearly labeled exit/help action that ends/invalidates the trial before opening SOS. Before auth show cached hotline only where policy permits, otherwise neutral offline emergency guidance approved by product/clinical team. No invented emergency phone number.

`BinaFloatingDock` (§5.3, §7.3), built using `NavigationBar` or an accessible Material row, on compact widths, `NavigationRail` on expanded widths; use a responsive vertical navigation list if labels cannot fit at large text scale. Preserve label visibility; do not clip or substitute icons. Maintain branch history/scroll position by stable destination ID. Re-selecting a tab returns to its root only if documented, never abandons unsaved forms silently. Use platform back and browser back consistently, restore focus and scroll on return. Deep links must resolve auth, consent, tenant/patient identity, feature access and signed status before content. A forbidden or stale deep link goes to a plain explanation with a safe destination.

### 3.2 Full route map (illustrative proposed routes, no API meaning)

```text
/bootstrap
/auth/welcome → /auth/phone → /auth/otp → /auth/consent → /auth/accessibility
/auth/invitation, /auth/help, /auth/session-expired
/today → /care/dose/:doseId, /care/education/:lessonId, /help/urgent
/care → /care/episode/:episodeId → /care/medication/:medicationId
      → /care/history, /care/education, /care/instructions
/care/dose/:doseId → /care/dose/:doseId/record → /care/receipt/:eventId
/help/urgent → /help/symptoms → /help/symptoms/eye → /help/symptoms/questions
             → /help/symptoms/review → /help/symptoms/receipt
/tests → /tests/:assignmentId/eligibility → /eye → /instructions → /practice
       → /preflight → /session → /quality → /receipt
/tests/history [G], /tests/baseline [G], /tests/home-iop [G]
/results → /results/:signedReportId → /results/:signedReportId/follow-up
         → /results/:signedReportId/vf [G], /results/iop [G]
/account → /account/profile, /account/appearance, /account/accessibility
         → /account/notifications, /account/consents, /account/sync
         → /account/clinic, /account/help, /account/caregivers
/account/caregivers → /invite → /scope → /grant/:grantId → /revoke
/caregiver/accept → /caregiver/patients → /today (explicit delegated context)
```

Use typed route arguments from authorized DTOs; opaque IDs only. No patient name, diagnosis, phone or token in ordinary browser URLs, analytics or crash breadcrumbs. Remove invitation secrets from history once exchanged; avoid referrer leakage. Route table can change with existing router conventions; semantics and gates cannot.

## 4. Reference-locked visual identity — Bina Clinical Glass

### 4.1 Art direction and visual authority

The nine approved Light-mode renders in `Bina-AI-UI-Designs.zip` are the visual baseline, not a loose mood board. Reproduce their luminous pale ice-aqua canvas, layered mint/teal/lime ribbons, realistic emerald iris artwork, soft frosted white cards, deep teal gradient buttons, high-contrast black Persian headings, generous rounded geometry, and floating five-item navigation. The identity is **Bina Clinical Glass**: calm, warm, recognizable ophthalmology branding with controlled soft depth. Do not replace this style with generic flat white Material, generic blue hospital branding, purple SaaS cards, black glass, a monochrome dashboard, oversized typography unrelated to the reference, or a design system sampled from another application.

- **[V] Visible:** colors, artwork positions, information hierarchy, card arrangement, labels, icons and navigation observed in the nine PNGs. Their exact filenames are in §9.0A.
- **[D] Defined:** all numerical tokens, typography weights, asset construction, responsive behavior, transition timings and interaction states are engineering decisions inferred from raster images. They are normative for implementation but are not original Figma properties.
- **[G] Gated:** illustrative clinical content in the images is not a grant of clinical functionality. Real data, clinical interpretation, tests, reports and prescriptions remain constrained by the PRD/ADR and contracts. Reference mockups may be reproduced in a clearly isolated synthetic preview; production may differ only as required for safety, feature entitlement, accessibility, responsive fit and OS conventions.
- **[D] Dark:** no Dark reference was supplied; the paired Dark theme below is a deliberate visual translation, not an inversion or an extracted source design. Identical composition, icon shapes, elevation hierarchy, artwork silhouette and semantic statuses.

Do not embed any full screenshot as the app background; construct real Flutter layouts and accessible controls. The device frame, white exterior, physical camera cutout and printed Android time in the reference are presentation only; no phone bezel or hardcoded status bar in production. Use platform safe areas and actual OS chrome. For reference review, crop out the phone frame before comparing; do not stretch the UI to the 1122×1402 PNG aspect ratio.

### 4.2 Color provenance and brand intent

All colors are sRGB. PNG samples contain compositing, lighting, shadows and antialiasing, not clean design tokens. Illustrative sampled pixels from the actual 1122×1402 PNGs (coordinates from top-left): Today (340,120) `#ECF8F9`, (600,120) `#F7FBFC`, (400,800) `#E4F6F8`, (400,1200) `#F8FBFC`, (822,1210) `#D2EFE1`, (800,1040) `#E4E9FC`; Medication Detail (350,1115) `#03A39A`, (350,1150) `#01827C`, (350,1180) `#016B66`, (350,330) `#A6EDD9`; Tests (690,272) `#01706A`. These are evidence of the ice/mint and teal-gradient direction. Actual implementation tokens below intentionally regularize those colors, with darker text/foreground treatments where required for legibility. Never claim exact extraction from an unavailable vector design file.

### 4.3 Canonical semantic color tokens

These are the only permitted color definitions for ordinary UI. Names are stable across themes. Colors with `on` prefixes are foregrounds intended for the paired background; do not use raw bright green for body text. The production accessibility variant must achieve the contrast gate on actual composited backgrounds, including gradients.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| canvas | `#ECF8F9` | `#091B20` | Main ice-aqua / midnight teal scaffold |
| canvasTop | `#F7FBFC` | `#10272D` | Top luminous background |
| canvasBottom | `#E4F4F7` | `#0C2228` | Bottom background |
| surface | `#F8FBFC` | `#142C32` | Opaque fallback card, nav surface |
| surfaceRaised | `#FFFFFF` | `#1B373D` | Dialog, menu, focused input |
| surfaceSoft | `#EAF6F7` | `#18343A` | Secondary surface, segmented track |
| surfaceMint | `#E5F8F2` | `#173F3A` | Tests/hero soft mint base |
| surfaceAqua | `#E5F5F8` | `#17343D` | Cool card or subpanel |
| surfaceCream | `#F5F9E8` | `#293C30` | Pale warm metric cards |
| onSurface | `#102126` | `#F1F8F7` | Headings, default text |
| onSurfaceVariant | `#40565D` | `#B8D0D1` | Secondary copy, dates |
| muted | `#50676D` | `#A7C2C4` | Noncritical metadata |
| primary | `#006C66` | `#77E0CE` | Primary text/links, focus accents |
| onPrimary | `#FFFFFF` | `#062823` | Foreground on solid Material primary |
| primaryContainer | `#D2F3E3` | `#194B42` | Selected navigation capsule |
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
| outlineVariant | `#D4E7E9` | `#35535A` | Decorative divider/card stroke |
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

Map standard Material roles explicitly (no dynamic wallpaper colors and no `ColorScheme.fromSeed` output overriding these values): `surface=surface`, `surfaceContainerLowest=canvasTop`, `surfaceContainerLow=surface`, `surfaceContainer=surfaceSoft`, `surfaceContainerHigh=surfaceRaised`, `surfaceContainerHighest=surfaceAqua`, `surfaceTint=transparent`, `onSurface`, `onSurfaceVariant`, `primary/onPrimary`, `primaryContainer/onPrimaryContainer`, `secondary/onSecondary`, `secondaryContainer=testWell/onSecondaryContainer=testInk`, `tertiary/onTertiary`, `tertiaryContainer/onTertiaryContainer`, `error/onError=urgentAction/onUrgentAction` for filled controls and semantic `error/errorBg` extension for text; `errorContainer=errorBg/onErrorContainer=error`, `outline/outlineVariant`, `shadow/scrim`, `inverseSurface/onInverseSurface/inversePrimary` use the opposite brightness surface/foreground/primary for rare inverse toasts. Implement other required roles in the installed API consistently; do not rely on unspecified default generated colors. The standalone custom gradient button uses `onPrimaryGradient`, not `onPrimary` in Dark.

### 4.4 Gradients, frosting, shadows, artwork and high-contrast mode

| Recipe | Light | Dark | Geometry / usage |
|---|---|---|---|
| G01 Canvas | canvasTop → canvas → canvasBottom, 0/0.35/1 | same token order | top-start → bottom-end; fills viewport, not independent card |
| G02 Frosted surface | surfaceRaised at 95% → surface at 94% → surfaceAqua at 88% | surfaceRaised at 98% → surface at 96% → surfaceAqua at 94% | vertical; use only named surface types; stroke glassEdge 1dp (Light 90%, Dark 65%) |
| G03 Mint hero | surfaceCream → surfaceMint → surfaceAqua | same tokens, less luminous | top-start → bottom-end; retain opaque readability backing where text overlaps art |
| G04 Primary button | primaryGradStart → primaryGradEnd | same token mapping | top → bottom, 0/1; top 1–2dp primaryShine at 40% as decorative accent only |
| G05 Active segment | primaryGradStart → primaryGradEnd | same | vertical; no white text over shine |
| G06 Metric tint | surfaceRaised → surfaceCream (or surfaceMint) | surfaceRaised → surfaceCream (or surfaceMint) | 0/1; not all metrics imply success |
| G07 Nav dock | surfaceRaised at 97% → surface at 94% | same | fixed floating shape, stroke glassEdge, no live blur requirement |
| G08 Chart callout | successBg → surfaceMint, only if approved status; otherwise surfaceSoft | same | solid fallback, number contrast on both stops |

Background ribbons: use the supplied A04 compact header and A03 broad footer raster artwork by default, with static clipping, gradient masking and named alignment per §4.4.1–4.4.4. A01 already contains its own surrounding ribbons; do not stack additional waves over its iris. Use a static `CustomPainter` only for a documented missing-asset fallback or a purely decorative report grid. No substitute stock waves, per-frame repaint, scrolling parallax, or artwork through text. Dark uses a theme-adapted derivative of the same composition. All artwork is `IgnorePointer` + `ExcludeSemantics` unless it is the only accessible brand identification. Never mirror clinical plots or anatomy.

Shadows (`BoxShadow` values in dp; `spreadRadius=0` unless noted): `shadowNone` none; `shadowCard` Light `shadow@12% (0,6), blur 16` plus `shadow@5% (0,1), blur 3`; Dark `shadow@35% (0,6), blur 16` plus `shadow@16% (0,1), blur 3`; `shadowHero` Light `shadow@13% (0,8), blur 22`, Dark `shadow@38% (0,8), blur 22`; `shadowDock` Light `shadow@14% (0,8), blur 22`, Dark `shadow@42% (0,8), blur 22`; `shadowAction` Light `shadow@18% (0,5), blur 12`, Dark `shadow@28% (0,5), blur 12`; `shadowOverlay` Light `shadow@24% (0,12), blur 32`, Dark `shadow@50% (0,12), blur 32`. No Material default elevation/tint on top of these shadows. Set elevation 0 on wrapped Material; use a separate outside decoration for shadow and inner Material for ink. No expensive full-screen BackdropFilter, no per-card live blur in lists. If a profiled optional blur is added, limit to one clipped dock on capable hardware and keep opaque fallback equivalent.

#### 4.4.1 Canonical standalone artwork package (new in v2.1)

The owner requested these four generated standalone assets for use with the approved nine-screen design. They are the canonical **raster visual references** for this revision, not photographs of patients or diagnostic evidence. They were redrawn to match the mockups, not extracted from editable original layers. All four PNGs are opaque RGB with baked pale backgrounds (no alpha). Do not treat the logo as a transparent SVG or mistake the pale margins for actual logo clear space. The broad and compact wave have the same aspect ratio but different compositions and MUST NOT be interchanged. The archive contains exactly the four original PNGs, unmodified; the build derivatives below are implementation requirements, not additional supplied files.

| ID | Archive filename (case-sensitive) | Original pixels | Meaning / source composition |
|---|---|---|---|
| A01 | `teal_emerald_eye_in_flowing_waves.png` | 1254 × 1254 | Teal/emerald iris, lashes, surrounding glass-like ribbons; shared across all eye heroes. |
| A02 | `bina_ai_glossy_eye_logo.png` | 1536 × 1024 | Full horizontal eye emblem + exact `Bina AI` wordmark, dark teal text; generous baked margins. |
| A03 | `serene_mint_wave_layers.png` | 2172 × 724 | Broad flowing aqua, green and lime ribbons, used for bottom/footer decoration and wide accents. |
| A04 | `minimal_mint_teal_wave_banner.png` | 2172 × 724 | Compact ribbon cluster in upper-left, fading right and down; used behind page headings, not the large footer. |

**Import contract** (paths relative to `apps/patient-app/`; adapt only if the existing design-system package owns assets, then document the actual `package:` asset resolution):

```text
apps/patient-app/
  assets/
    design/
      source/                        # exact originals, keep out of runtime bundle
        teal_emerald_eye_in_flowing_waves.png
        bina_ai_glossy_eye_logo.png
        serene_mint_wave_layers.png
        minimal_mint_teal_wave_banner.png
      runtime/
        iris_light.webp
        iris_dark.webp
        logo_full_light.png
        logo_full_dark.png
        logo_mark_light.png
        logo_mark_dark.png
        wave_footer_light.webp
        wave_footer_dark.webp
        wave_header_light.webp
        wave_header_dark.webp
```

Unzip the four originals into `assets/design/source/` (or the documented repository design-source location if binary assets are kept outside application folders). Verify exact filenames, sizes and SHA-256 in Appendix C before generating derivatives. Retain originals unmodified. Runtime files above are proposed derivative names; generate them before registering paths. The archive does NOT contain the runtime derivatives, transparent versions, SVGs or dark masters. Do not write placeholders with misleading filenames, use screenshots as widgets, fetch remote stock art, regenerate brand geometry, or require a vector trace for first implementation. If asset conversion tooling is unavailable, use originals locally in a temporary Light preview, with the crop/masks below, and use the solid fallback for Dark until approved derivatives are ready. Keep the source files and build script versioned according to repository policy.

Register only `assets/design/runtime/` (plus existing font/icon assets) under `flutter: assets:` in the app pubspec; if using package-owned assets, register in the package and pass the package identifier to `Image.asset`. Use a typed `BinaArtId` (`iris`, `logoFull`, `logoMark`, `waveFooter`, `waveHeader`) and a `BinaArtResolver` selecting the appropriate filename for effective brightness. Do not concatenate arbitrary asset paths from server data. Add manifest/asset-load tests. For decorative art, `Image.asset` with explicit fit, alignment, sized constraints, `excludeFromSemantics: true`, `filterQuality: FilterQuality.medium`, an appropriate `cacheWidth` based on rendered dp × DPR, and an error fallback with no layout shift. Use `RepaintBoundary` for costly static compositions only after profiling.

#### 4.4.2 Image preparation, Light and Dark recipes

All numeric crop/opacity values here are implementation defaults to reproduce the reference, not original vector specifications. Keep original aspect ratios; use crop/clip rather than stretching.

| Asset | Light derivative | Dark derivative |
|---|---|---|
| A01 iris | Preserve iris/lashes and surrounding waves; retain full square master, resize to max 900 px, WebP quality 85–90. Use edge masks at render time to merge pale background with G01/G03. No global recolor in Light. | Prepare from the SAME A01, keeping iris/pupil geometry and relative greens/teals. Reduce bright surrounding matte and wave glare, feather outer edges into dark surface; keep pupil/lashes readable. Starting deterministic transform described below; tune after reviewing on G01/G03. |
| A02 logo | Crop baked whitespace; preliminary source rectangle `(190,340,1350,680)` (left, top, right-exclusive, bottom-exclusive, in original pixels); confirm bounding box includes all antialiased emblem and glyphs, then leave ~4% transparent padding. Remove pale matte without deleting white iris highlight. Preserve full mark+wordmark geometry and casing. Use lossless PNG with alpha. | Same crop, alpha mask, emblem geometry and wordmark letter outlines. Change only the dark teal wordmark foreground to a readable pale mint (`#DDF7F1` starting color); retain emblem gradients and highlights, moderating glare if needed. Do not invert the entire logo or retype text with Vazirmatn. |
| A03 footer | Preserve 3:1 canvas; resize to max 1440×480; WebP quality 85–90; smooth top fade and outer edge blending. Keep broad multi-ribbon composition. | Same wave shapes; map pale matte to dark canvas/surface, reduce lime brightness, keep deep petrol/emerald/aqua accents; no white rectangle. |
| A04 header | Preserve 3:1 canvas; max 1440×480; WebP quality 85–90. Keep wave cluster physical left and pale empty right. Use gentle bottom/right fade. | Same compact geometry, low-luminance petrol/mint accents confined to physical left; fade into dark surface on right/bottom. Never use the broad footer as substitute. |

Logo preparation: the logo's source art has a pale gradient matte, not a uniform white background. For production alpha extraction, use a reviewed edge-aware matte removal (estimate local background from empty margins, use a manual/semantic emblem and wordmark mask, retain interior highlights and recover antialiased edges). Do not use a blanket white-pixel deletion or a simple color key that erases highlights or leaves halos. Inspect at 1×/3× on both themes and high contrast. For mark-only derivative, crop the emblem from A02's left component (initial source bounds x=200–635, y=350–670; verify), maintain same aspect ratio and add transparent clear space. No font file or vector logo is supplied; `brandWordmark` typography token is not permission to reconstruct the mark. If alpha extraction is not acceptable, use a clean branded solid Light tile as a temporary preview or text app name as accessible fallback; do not ship a glaring white rectangular raster on Dark.

Suggested deterministic starting Dark transform for A01/A03/A04 (offline asset script, not a runtime full-screen filter): convert source RGB to normalized sRGB; let `v=max(r,g,b)`, `sat=(v-min(r,g,b))/max(v,1e-6)`, `w=smoothstep(0.55,0.95,v)*(1-smoothstep(0.06,0.38,sat))`. Map near-white low-saturation matte toward `canvas` or `surfaceMint` Dark token using `w`; reduce bright colored source RGB using a 0.68 multiplier for the iris and 0.48 for waves as an initial value, blending transformed color toward the selected dark base via `w`. Use an artist-reviewed iris protection mask to keep specular highlights/pupil definition; feather the outer boundary to alpha or to dark surface. `smoothstep(a,b,x)` is `t*t*(3-2*t)` for `t=clamp((x-a)/(b-a),0,1)`. These are starting parameters, not a validated color grade. Review actual exported image against both canvas and hero surfaces, adjust masks/grade if needed, and record approved parameters. No applying this transform to clinical images, maps, stimuli, charts or patient photos. For Dark text contrast, use the existing semantic tokens, not color-picked pixels from the artwork.

Target runtime budget: each raster derivative preferably ≤300 KB, and record actual compressed size and decode footprint; prioritize visible fidelity over arbitrary quality reductions. Keep original PNGs outside release bundle. Use lossless alpha PNG for logo; retain WebP alpha for artwork derivatives when useful. No animated GIF, Lottie, network/CDN, per-frame filters or large live blur needed. No actual conversion/Flutter implementation has been performed in this document revision.

#### 4.4.3 Placement, clipping, layering and responsive contract

All bounds are in logical dp at 412dp reference width; scale with parent constraints, not physical pixels. Layer order: G01/G03 background → decorative art clipped/masked within assigned region → optional surface-colored gradient scrim → actual UI content → focus/ink/overlays. Decorative images are never content or touch targets. For fixed physical placement use `Alignment.centerLeft` / `centerRight` (not automatically mirrored `AlignmentDirectional`). Functional RTL text, back controls and layout retain existing direction rules. Use `Stack`, `Positioned`, `ClipRect` / `ClipRRect` and a static `ShaderMask` (`BlendMode.dstIn`) or pre-feathered derivative; do not clip shadows of unrelated cards. Avoid a noticeable seam between raster background and app canvas.

- **Compact header (A04)**: default `BinaHeaderWave`, physical left/top, span available screen width, 120–136dp art area including optional safe-area extension; root title row 64dp remains independent. Detail header with secondary date or long title can grow, art stays max 144dp. Use `BoxFit.fitWidth` (3:1 gives ~137dp at 412 width); align top-left; fade bottom over last 35–45% and right over last 25–35%, leaving right-aligned Persian titles readable. Starting opacity Light 0.72, Dark 0.45, adjustable only to improve seam/contrast. It is a background behind the header, not a separate banner/card and must not add scroll height. Clip away from inputs, segmentation controls and body when necessary.
- **Broad footer (A03)**: `BinaFooterWave` anchored physical bottom of decorative region, span width, 110–148dp maximum, fitWidth, bottom-center; top fade over first 30–40%, Light opacity 0.80, Dark 0.48. Below content or in otherwise unused space; not behind CTA text, system gesture bar or bottom dock labels. Never force footer visible on short screens, with keyboard, or when large text needs room. No fixed overlay trapping scrolling.
- **Eye art (A01)**: `BinaIrisArtwork` sized by hero constraints; default fit `BoxFit.cover` with center focus around source iris, preserve iris and lashes, clip to hero corner radius when bounded. For half-width art at 412dp screen, typical box 168–196dp wide × 150–192dp high. Footer use compact 140–190dp wide box with crop. Fade the edge adjacent to text over last 25–35% of art width (reverse fade when art is physically right); optionally fade top/bottom ~15–25%. Keep true text on a solid/opaque text zone if needed. Starting opacity 1.0 for eye center, outer feather only; Dark derivative may lower wave brightness but do not make iris invisible. No eye blink, pupil motion or data-driven color change.
- **Full logo (A02)**: use cropped derivative, `BoxFit.contain`, fit within 122×34dp on Today and ~180–216×56dp on auth/about when layout allows. Intrinsic artwork ratio after cropping determines final visible height; never force both dimensions. Keep at least 8dp clear space around logo, no pill backdrop by default, no mirrored mark/wordmark in RTL. Mark-only uses 32–48dp box where explicitly called for. Accessibility: a single `Semantics(label: 'بینا ای‌آی', image: true)` on the logo only if name is not otherwise announced; exclude redundant decorative instances.
- **Responsive/high-contrast**: at widths below 360dp, or text scale ≥1.5, reduce/hide decorative art first; increase text area and allow natural wrapping. At 200% prioritize full text, touch targets, and actual data. High-contrast, SOS, active clinical renderer and constrained layouts may suppress decoration entirely. No decorative loading placeholder that resembles clinical imagery. No art animation; existing route/theme transition tokens apply to the page, not an independent looping artwork effect.

#### 4.4.4 Shared widget API and per-screen asset matrix

Extend existing `BinaCanvas` and `BinaHero`; do not create another navigation or theme layer. Proposed reusable Flutter wrappers: `BinaHeaderWave`, `BinaFooterWave`, `BinaIrisArtwork(side, crop, edgeFade)`, `BinaBrandMark(full)`, and `BinaArtResolver`. The feature widget chooses a semantic placement, never a raw filename or color. Resolve effective brightness from `Theme.of(context).brightness`; the existing high-contrast and reduced-motion preferences control decoration and transitions. `BinaCanvas` defaults to no art for clinical/SOS routes; other routes opt in explicitly. These APIs are pseudocode contracts; adapt to the installed SDK, preserve all existing semantics.

| Screen | Header art | Main art and placement | Footer / notes |
|---|---|---|---|
| V01 Today | A04 subtle behind greeting if needed; A02 full logo physical left below greeting | A01 physical left of 170–192dp hero, live status text on right | No additional large eye or broad wave by default; use A01 surrounding ribbons; A03 only a very restrained accent if needed for original look. |
| V02 Care | A04 physical top-left behind title | A01 physical left inside 168–184dp G03 education banner, text right | No A03 footer by default; keep menu cards/dock clear. |
| V03 Tests | A04 behind title | No eye art in shortcut tiles (keep actual symbolic gauge/dot icons) | A01 physical left in ≤104dp footer, crop to eye and ribbons; optional low-opacity A03 behind unused space only if seam-free, hide first. |
| V04 Results | A04 behind title | None in metric/report cards; data charts are real widgets | No A01, A03 by default; preserve calm blank canvas. |
| V05 Combined Report | A04 faint behind header/date | A01 physical right within 200–216dp status hero, text left; optional thin static decorative concentric grid clipped to art, not diagnostic | A03 subtle below primary action if unused space; never beneath readable button label. |
| V06 Medication Detail | A04 subtle behind title | Generic teal dropper artwork is a DIFFERENT asset, not supplied; neutral local icon fallback until separately approved | A03 bottom accent; A01 not used. |
| V07 VF Detail | A04 behind title | No decorative eye in chart; true approved clinical map only | A03 subtle bottom ribbon; hide if chart/table needs space. |
| V08 IOP Detail | A04 behind title | No decorative eye or waves inside data chart | A01 physical right in 130–156dp footer region, A03 only if needed to extend waves into blank area; hide first. |
| V09 My Account | A04 behind header | A01 physical left in profile hero, avatar/name right; never replace avatar with eye | No additional A01/A03 below rows; keep dock clear. |
| Auth / About | A04 restrained header; A02 full logo | A01 optional only if layout and text clarity permit; no large mandatory hero | No footer if keyboard/consent content occupies space. |
| SOS / active test | None | None | None; protocol and urgent access override decoration. |
| Other routes | A04 on normal root/detail titles where consistent with V10 | A01 only where specifically useful in a permitted education/status hero | A03 only on decorative footers with spare space. |

Remaining non-supplied assets: `illustrations/dropper_generic.webp` (neutral teal bottle, not drug identity), `icons/*` (local vectors/rounded Material symbols for pills, calendar, graduation cap, eye drop, VR, perimetry dots, gauge, report, chart) and `avatars/placeholder.svg` (generic person outline, not the synthetic mockup portrait). Use approved local assets or native icon fallback; actual patient photo only via authorized consent/cache policy. Do not create a fake avatar, medicine package or clinical map from these four decorative assets. Verify asset rights and official brand approval before production publication; four user-selected raster sources solve the missing visual-reference issue but do not establish trademark clearance or a vector master.

High contrast preference/system: solid surface for all text-bearing cards, remove decorative ribbons behind copy, suppress soft glow, use 2dp essential outlines, same color semantic meanings, show written statuses. Do not introduce a third unrelated brand palette. Use darkest/lightest text pair if composited contrast fails. In Dark, all top/bottom OS system bar icons use correct brightness and maintain contrast; native system bar backgrounds match adjacent canvas; keyboard appearance follows system/theme. Do not apply theme overlay to clinical maps/stimuli.

### 4.5 Contrast and visual comparison protocol

Minimum PRD text contrast is 4.5:1; apply to all ordinary UI text, including large headings for simplicity. Necessary icons, chart strokes, selected indicators and control boundaries target at least 3:1 against adjacent color. Disabled components have WCAG exceptions but remain legible under the chosen tokens. Verify actual composited color at the least favorable point of every gradient; avoid transparency over unpredictable image. Use text contrast backing when needed. Chart band itself may be decorative, but its border and legend must be perceivable. Bright green in the mockup is an aesthetic accent: use `success` for readable text and `successIcon` for white tick, not `successVivid` behind white. In Dark do not use pastel colors as full-screen fills or simply set opacity of Light components; map by token. See Appendix A for calculated opaque-pair checks (not a runtime audit). Reference comparison: same crop, viewport, font scale, fixture and brightness; compare hierarchy, relative spacing, card shapes, backgrounds, artwork and navigation, then record purposeful safety/a11y deviations. No screenshot pixel-perfect guarantee without layered artwork/font source.

## 5. Typography, geometry, spacing, iconography

### 5.1 Persian typography

Use locally bundled `Vazirmatn` 400/500/600/700; no runtime Google Fonts. Use actual font weights, not artificial bold. The PNGs have a heavier Persian headline and bold numbers; match with 700, not an alternate Arabic font. Body 400–500; headings black/dark graphite in Light, pale cool white in Dark. Text direction RTL except isolated Latin identifiers/units and numeric axes. Use zero tracking on Persian connected script; never uppercase drug/metric text; no italic Persian for essential text. Line height is multiplier, not fixed box. Persian digits and proper ZWNJ in labels; text remains selectable where appropriate. Validate local fallback for Latin `mmHg`, `dB`, `VF`, `IOP`, `OD`, `OS`, minus sign and percentages; use `FontFeature.tabularFigures()` only if glyphs support it.

| Design token / Material mapping | Size sp | Weight | Height | Usage |
|---|---:|---:|---:|---|
| displayLarge / healthStatus | 40 | 700 | 1.30 | `پایدار` hero, single large status |
| displayMedium / metricHero | 34 | 700 | 1.30 | Large single measurement |
| displaySmall / metricValue | 28 | 700 | 1.35 | Primary metric in detail |
| headlineLarge | 28 | 700 | 1.40 | Large title at expanded layout |
| headlineMedium / screenTitle | 24 | 700 | 1.45 | Top-level page title |
| headlineSmall / sectionTitle | 22 | 700 | 1.45 | `برنامه امروز`, scheduled/report section |
| titleLarge / cardTitle | 20 | 700 | 1.45 | Feature hero or medication title |
| titleMedium / rowTitle | 18 | 600 | 1.50 | Primary list/metric labels |
| titleSmall / smallTitle | 16 | 600 | 1.55 | Compact metric titles, status labels |
| bodyLarge | 18 | 400 | 1.60 | Essential instructions/dose/urgent |
| bodyMedium | 16 | 400 | 1.60 | Normal descriptions, settings |
| bodySmall | 14 | 400 | 1.55 | Supporting info/date only |
| labelLarge / actionLabel | 18 | 600 | 1.45 | Filled and outline buttons |
| labelMedium / segmentLabel | 15 | 600 | 1.45 | Eye/range controls, chips |
| labelSmall / navLabel | 13 | 500 | 1.50 | Five labeled nav items; selected 600 |
| chartTick | 13 | 500 | 1.40 | Chart labels with table alternative |
| metricCompact | 22 | 700 | 1.35 | Today/Results metric number |
| timeLabel | 16 | 600 | 1.40 | Task time chip; 18 for critical dose time |
| brandWordmark | 22 | 700 | 1.25 | Reference logo wordmark, not general English text |

At standard scale the nav label/ticks may use 13sp; never use that size for medication, safety, instructions or actionable content. Clinical dose, eye, time and urgent instruction 18sp minimum where shown in an action/confirmation. Important numeric value is not ellipsized. Allow OS nonlinear TextScaler, system display size and 200%+ scaling; no global font override, no `FittedBox` shrink for text, no fixed card height that clips. Move chips under title or stack metrics at large size. Scientific identifiers and units remain together in a bidi-isolated span; use Unicode minus and tested Persian decimal/percent formatting, preserving actual numeric precision and unit. Keep the clinical renderer outside font scaling for calibrated stimuli only.

### 5.2 Layout and geometry tokens

Baseline comparison viewport: **412 × 824 logical dp** including system safe areas, representative compact Android phone. This is a chosen normalization of the reference inner-screen ratio, not its raster resolution or an exact Pixel model. Also test 360×800, 390×844, 320dp wide, large text, landscape, tablet and Web. The original mockups use approximately 12–16dp equivalent edge inset, rounded cards, two equal metric columns and generous group separation. Heights below are default/minimum content sizes; card expands to fit content. At normal width 412, screen content width = 380dp (16+16 margin). No device frame in Flutter.

| Token | dp | Usage |
|---|---:|---|
| space0/1/2/3/4/5/6/8/10/12/16 | 0/4/8/12/16/20/24/32/40/48/64 | Base rhythm |
| marginCompact | 16 (12 below 340) | Horizontal content margin |
| marginMedium / Expanded | 24 / 32 | Larger widths |
| gapSection | 20–24 (default 24) | Distinct content groups |
| gapCard / gapField | 12 / 16 | Between sibling cards / form fields |
| gapMetric | 10–12 | Adjacent metric cards |
| cardPadding | 16 compact, 20 expanded | Standard inset |
| radiusSmall | 8 | Tiny internal accents only |
| radiusMedium | 12 | Icon wells, fields |
| radiusLarge | 16 | Metric tile, compact row |
| radiusXL | 20 | Normal list card and pill-like button |
| radiusHero | 24 | Large hero, chart/report cards |
| radiusDock | 24 | Floating nav outer container |
| radiusPill | 999 | Status, selection track, time chip |
| borderNormal / focusRing | 1 / 3 | Stroke/focus; ring offset 2 |
| touchMin / touchComfort | 48 / 56–64 | All actions / frequent actions |
| rowMin / rowRich | 60 / 76 | Compact settings / icon+subtitle row |
| fieldMin / buttonMin | 60 / 56 | Input / main CTA, grows with text |
| topBarMin | 64 | Excluding OS inset; no fixed clipping |
| navBarMin | 76 | Floating dock content height, excludes margin/inset |
| iconWellSmall / iconWell | 40 / 48 | Compact row / rich row icon well |
| iconWellLarge | 56 | Hero shortcut well |
| iconStandard / iconNav | 24 / 24 | Single-line icon sizes |
| avatarHeader / avatarProfile | 48 / 76 | Today / Account |
| readingMax / workspaceMax | 640 / 1120 | Bounded reading / two-pane area |

Use `EdgeInsetsDirectional` and `AlignmentDirectional` by default. For card with one tap action use `Material` + `InkWell` inside rounded clipping, with outside shadow. A shared `BinaSurface` wraps this to avoid repeated geometry. Avoid nested clip/saveLayer. For rich row, leading icon well at logical start (right in fa-IR), 12dp gap, flexible text start-aligned, trailing chevron at logical end (left). For Today time row, place time pill before chevron at logical end. Divider only inside related sections; separate cards as reference. Icon family rounded/outlined with approximately 2dp strokes, round caps and optical alignment. Selected tab uses filled or heavier version. Use line icons for nav and settings; limited dimensional/pastel icon art for Care, Tests and medication hero, not emoji. No mixed random icon packs. Back arrow is mirrored to point right in RTL and is placed on leading/right for detail screens (intentional correction to several source images that show it on left); row chevrons point left in RTL. Root tabs have no unnecessary back arrow. Scientific map orientation never mirrors with RTL.

### 5.3 Shell sizing and layout grid

At 412dp: 16dp side margins; row of two cards `(380-12)/2=184dp`; row of three `(380-2×10)/3=120dp`; card widths are constraints, not fixed numbers. Default section heading-to-content gap 10–12dp. Top status bar managed by OS (approx 24dp in fixture); shell header min64; top section gap 8–12. Scroll content has bottom padding equal to dock overlay + safe inset + 16 if overlay implementation is used; prefer Scaffold bottomNavigationBar with separately padded dock to avoid obscured focus. Dock: 16dp horizontal inset, 8dp gap above bottom safe area, 76dp content height, 6dp inner inset. Each item equal flex, selected indicator 56–68dp wide × 56–64dp high depending labels, radius18–20; icon centered above visible label with 3–4dp gap. No icon-only navigation. At narrow/large font use wrapping labels, grow dock height, or accessible list/rail fallback, not shrink touch targets. Detail pages use sticky bottom CTA only when necessary; otherwise CTA follows scroll content like PNG, with safe-area footer. No decorative art occupies space needed for essential content.


## 6. Adaptive layout and accessibility

### 6.1 Layout behavior

Use `LayoutBuilder`/available logical width, not phone model or orientation. Breakpoints are [D], informed by adaptive guidance: compact <600dp; medium 600–839dp; expanded >=840dp; at >=1200dp center bounded content. At compact widths use single vertical scroll, no horizontally swiped required cards, fixed bottom navigation only when it does not obscure focus. At medium use navigation rail if labels fit, otherwise shell navigation; at expanded list/detail for Care/Results/Account, shared 1120dp max width, 24dp pane gap, primary reading pane max640dp. No tablet-stretched forms. At 200% text or very narrow viewport collapse multi-column areas, even above breakpoints. Keep layout logical order in RTL; no side-by-side eye cards if ambiguity or clipping occurs. Respect `SafeArea`, IME insets, `Sliver` or scrollable layout; sticky CTA must yield to keyboard and long text. Avoid nested scroll traps, hidden form actions, horizontal page overflow at 320 CSS px equivalent. On landscape test mode requires explicit qualification; orientation change invalidates/requalifies clinical trials per protocol, not blanket app lock.

### 6.2 Accessibility acceptance [R+D]

| Concern | Required behavior |
|---|---|
| Touch targets | All actionable areas >=48x48dp; preferred 56–64dp frequent actions; >=8dp visual gap where possible. Never adjacent tiny dose buttons. |
| Screen reader | `Semantics`, `MergeSemantics` only when no nested conflicting actions, meaningful roles/labels/value/hint; `ExcludeSemantics` for duplicate decoration. Announce eye, dose time, state and context. Test TalkBack Persian and VoiceOver; Web semantic DOM/keyboard/NVDA where available. |
| Focus | Logical RTL traversal using reading order, `FocusTraversalGroup`, visible focus ring; restore focus after dialog/back; errors focus first invalid input after submit; never steal focus on background sync. |
| Color / low vision | Label plus icon/pattern; contrast audit in both themes; no reliance on bottle color, red/green, or chart color alone. |
| Scale / reflow | No clipped text, overlap, unreachable buttons, horizontal scrolling of ordinary text, or inaccessible nav at 200% and actual maximum device settings. |
| Gestures | Tap/keyboard alternative for swipe, drag, pinch or long press; no hidden gestures as required workflow. Clinical gesture alternatives must be validated before offering them. |
| Motor / cognition | Large separated actions, predictable back, one decision per step; no timed non-clinical tasks except actual server expiry; prevent double writes; clear recovery. |
| Audio / hearing | Text equivalent, captions/transcript, no sound-only alerts. User-controlled playback, no autoplay. |
| Motion | Respect system `MediaQuery.disableAnimationsOf`/accessible navigation and explicit preference, no flashing or continuous animation. |
| Auth | OTP supports paste, autofill and assisted entry; no cognitive puzzle or forced memorization; consent review remains accessible; session expiry explains recovery. |
| WCAG 2.2 | Test 1.4.1/3/4/10/11/12, 2.1.1/2, 2.2.2, 2.4.3/7/11, 2.5.1/2/7/8, 3.2.6, 3.3.1/2/3/7/8 and 4.1.2/3 as applicable; full AA audit includes all applicable criteria, not just this list. |

Use a persistent, non-judgmental Help entry at a consistent location. Do not hide emergency access behind inaccessible modals. An inability to perform a visual clinical measurement is not inability to use the app; offer clinic contact/validated alternatives, never fabricate a measurement. Screen-reader speech must not reveal PHI on a locked device. If a particular measurement requires sound off or specific visual interaction, the clinical protocol governs eligibility and explain the restriction before start.

## 7. Component system and state recipes

Implement in `apps/patient-app/packages/design_system/`. Component APIs accept localized text, typed state and callbacks, not repository calls. All components have a documented semantics contract, interactive states, light/dark golden, text-scale fixture and stable keys. Prefer Material built-ins over bespoke gesture recognizers. Named wrappers below are proposed, not claims about existing code.

| Component | Flutter building blocks | Design/behavior |
|---|---|---|
| `BinaScaffold` / `BinaAppBar` | Scaffold, SafeArea, AppBar, LayoutBuilder | Title, accessible back, labeled Help, persistent context; body scroll; appropriate status/nav bar contrast. No unsafe bottom inset overlap. |
| `BinaNavigation` | NavigationBar, NavigationRail, list fallback | Floating G07 dock, radius24, shadowDock, selected capsule primaryContainer/onPrimaryContainer; all labels visible; §5.3. |
| `BinaPrimaryButton` | FilledButton | G04 gradient via BinaGradientButton, white onPrimaryGradient, min56dp, radius20, 16dp inline padding; one primary action; loading same label + spinner and semantics, no size jump. |
| `BinaSecondaryButton` | OutlinedButton | outline border, primary text, same geometry; no colored background needed. |
| `BinaTextAction` | TextButton | Underline inline links, primary; adequate target; action label describes destination. |
| `BinaUrgentButton` | FilledButton | urgentAction/onUrgentAction + phone/alert icon + clear text; 64dp preferred; no pulsing. |
| `BinaIconButton` | IconButton, Tooltip | 48dp target, 24dp glyph, localized tooltip and semantics; only familiar non-critical utility actions. |
| `BinaCard`, `BinaListRow` | Card/Material, ListTile, InkWell | G02 frosted surface with shadowCard, radius20 for row, radius16 for compact metric, radius24 for chart/hero; optional divider, full row click if single action. No nested duplicate tap target. Wrap long text; leading/trailing directional alignment. |
| `BinaField` | TextFormField, InputDecoration | Persistent label, helper, min60dp, radius12, error text + icon, `outline` default border, focus2–3dp. Never placeholder-only. Correct keyboard/autofill; inline validation after touched/submit. |
| `BinaOtpField` | One TextFormField visually grouped if desired | Whole code paste, autofill, single focus/semantics; length from API; digits normalized; resend countdown from server, not guessed. |
| `BinaChoiceRow` | Radio/RadioListTile, CheckboxListTile | Entire labeled row selectable; allow unknown/not sure if schema supports it; no auto-submit on selection. |
| `BinaSwitchRow` | SwitchListTile | Label + explanation, explicit on/off; consent not prechecked. |
| `BinaEyeLabel`, `EyeSelection` | Text, RadioListTile or segmented control | Full `چشم راست` / `چشم چپ` everywhere; right/left anatomy not visual screen position. Icon optional; no OD/OS only or color-only. Explicit eye confirmation for safety-critical operations; no default inferred from last use. |
| `BinaStatusLabel` | DecoratedBox, Text, Icon | Semantic pair; non-interactive chip; text status always present. Use static label for informational statuses. |
| `BinaBanner` / `UrgentActionCard` | Material, Column, Semantics | Persistent status with title, plain action and optional details; urgent not dismissible if action still applicable. No timeout. |
| `BinaDoseCard` | BinaCard, text/time, image, status, button | Eye + drug + dose + time + action; no reliance on color/photo, no swipe completion. |
| `BinaCareProgress` | LinearProgressIndicator + Text | Counts from plan; e.g. recorded vs due, no clinical interpretation; progress announced when changed. |
| `BinaStepHeader` | Text, LinearProgressIndicator | Step name and current/total count only if known; no fake completion percentages. |
| `BinaPermissionPanel` | BinaCard, FilledButton | Explain why, data handling and alternative; request native permission only after user action. |
| `BinaDialog` / `BinaSheet` | AlertDialog / modal bottom sheet | Clear title, plain consequences, labeled cancel/confirm, focus trap, scroll if needed; full page at large text; no drag-only dismissal. |
| `BinaNotice` | SnackBar + persistent inline receipt | SnackBar for non-critical transient confirmation only (4–6s); never sole copy of status, error, or urgent instruction. |
| `BinaLoading` | CircularProgressIndicator, linear progress, static placeholders | Retain known context; no fake percentage; explain prolonged delay and permit retry/back. No infinite shimmer. |
| `BinaEmpty`, `BinaError`, `BinaOffline` | Column, icon, text, action | Reason + next action; no whimsical error illustrations; offline emergency access never blocked. |
| `BinaSyncBanner`, `BinaReceipt` | Inline status, button | Local save vs confirmed delivery; timestamp if known; persistent state and retry details. |
| `BinaAudioPlayer` | Play/pause, time labels, optional accessible slider | User-controlled; text equivalent; pause on navigation; no PHI in media metadata. |
| `BinaTimeline`, `BinaMeasurementCard` | ListView, text, optional approved chart | Eye, timestamp, source, unit, quality; chronological order stated; no inferred trends. |
| `BinaReportCard` | BinaCard, Text, status | Signed-only DTO, signer/date if contract provides, eye, next action; no confidence scores. |
| `BinaContextBanner` | Container + text + switch action | Caregiver acting for whom; stays visible throughout delegated workflows, not just on home. |

### 7.1 Interactive state matrix

Default → hovered (Web, 4% state layer) → focused (ring plus optional 8% state layer) → pressed (8–12% state layer) → disabled (disabledBg/disabledFg) → busy (state label + spinner; block duplicate submit) → succeeded/failed (persistent domain receipt). Opacity percentages are proposed local interaction values; verify actual composited contrast, use solid alternate if needed. For irreversible clinical mutations, UI disables repeated press while local write is being committed, then displays true outbox state. Do not disable SOS while unrelated work is loading. Keep control size stable; no press-scale on medication/SOS actions. Disabled controls never the sole way to convey missing prerequisite.

### 7.2 Screen-level state matrix (apply to every route)

| State | UI rule |
|---|---|
| Initial | Render known shell and title; short loading indication, no blank white/black page. |
| Loading with cached data | Keep content, mark last updated; never make stale prescription look current. |
| Empty | State exactly what is absent; next step e.g. clinic contact, not fake metrics or sample data. |
| Offline no cache | Plain message, retry, cached emergency guidance if available; no fake online actions. |
| Pending local write | “در انتظار ارسال” plus clock and local timestamp, no received claim. |
| Server confirmed | “ارسال شد” only on authoritative receipt; not reviewed/seen unless contract supports it. |
| Failed recoverable | Plain reason and retry; preserve safe draft; retry original idempotency key. |
| Conflict/expired/revoked | Stop stale action; explain, refresh or reauthenticate; no blind resend or optimistic success. |
| Permission denied | Explain why, settings link only if supported; alternative path; no repeated forced prompts. |
| Not eligible/feature disabled | Hide entry if unavailable; direct link explains unavailability and clinic next step. |
| Partial data | Mark unavailable, not zero/normal; don't infer missing eye or medication details. |
| Destructive action | Confirm consequence, protect against wrong patient/context; cancel remains visible. |
| Accessibility / reduced motion | Same information and actions, reflow and static alternatives; no degraded clinical geometry. |

### 7.3 Reference-specific component API and visual recipes

Use the shared wrappers below in addition to the base components in §7. The names and API sketches describe contracts for agents; adapt to actual Dart conventions and avoid duplicate wrappers for existing equivalent components. Each component must render both themes via inherited semantic tokens, support text scaling, test key, semantics, disabled/busy state where applicable, and nullable data with explicit empty behavior. No component accepts a raw RGB or arbitrary styling from a feature module. Use composition rather than giant screen widgets.

| Component / proposed inputs | Flutter composition | Exact visual recipe / interaction |
|---|---|---|
| `BinaCanvas({child, artVariant})` | DecoratedBox, Stack, CustomPaint, IgnorePointer | G01 + A04 header / A03 footer / A01 hero art via `BinaArtResolver`; variants none/header/footer/hero, see §4.4.4. Art not in focus tree. Content remains scrollable and never under OS insets. |
| `BinaSurface({variant, child, onTap, semanticLabel})` | DecoratedBox shadow, Material/Ink/InkWell | Variants frosted=G02/r20/shadowCard, hero=G03/r24/shadowHero, metric=G06/r16/shadowCard, solid=surface/r20, chart=G02/r24; 1dp glass edge, default padding16, inner ink clipped. Noninteractive card has no ripple or button semantics. |
| `BinaHero({art, artSide, title, status, subtitle, action?})` | Stack + adaptive Row/Column | 48–52% art, text backing, radius24 if bounded; min height per screen; text wraps and art shrinks before text. At narrow/large text stack art below or hide decorative art. |
| `BinaBrandMark({full})` | Local SVG/image | Use A02 cropped theme derivative; contain in 122×34dp in Today; mark 32–48dp elsewhere; preserve glyph geometry and aspect ratio, accessibility label only if not repeated. |
| `BinaAvatar({photo?, initials?, size, verified?})` | CircleAvatar or clipped Image | 48/76dp, 2dp surface edge, optional 20dp status overlay only if authentic; placeholder if absent or load fails. |
| `BinaIconWell({kind, icon})` | DecoratedBox, Icon/SVG | 40/48/56dp; r12–16, named well/ink pair, mild vertical surface gradient optional, no separate tap if part of row. Use symbolic gauge and dot-grid local vectors, not fake measurements. |
| `BinaRichRow({title, subtitle?, iconKind, trailing?, onTap?})` | BinaSurface + Row/Expanded | r20, 12–16dp padding, 12dp icon/text gap, min76dp; 24dp chevron at end; expanded multiline text; full row target. |
| `BinaTaskRow({task, eye, time, state, onOpen})` | BinaRichRow + status/time pill | time pill r999, 8–10dp horiz/4dp vert, clock16dp; warm pill for drops, mint for tests; transport status separate. Real medication identity and dose prominent; no one-tap logging. |
| `BinaMetricTile({label, value?, unit?, eye?, measuredAt?, quality?, trend?, onOpen?})` | BinaSurface metric + Text/RichText | r16, padding12–16, default 92dp mini / 120dp summary; unit inline 14–16; optional static sparkline only for actual permitted values. Missing value no fake zeros. |
| `BinaStatusChip({kind, text, icon?})` | DecoratedBox + Row | r999, padding 10×6, text 15/600, icon18, success/warning/error/info/neutral pair; hero check circle 28–32 with white tick. Status is text+symbol, not CTA. |
| `BinaSegments<T>({choices, selected, onChange, isEye})` | SegmentedButton or custom Material radio group | G02 track min48, r999, 3–4dp inner pad, equal flex, 1dp dividers optional; selected pill G05 r999, white label15/600, unselected onSurface; accessible selection; arrow key support; 140ms selection; wrap/stack for large text. No tab-dependent data mutation. |
| `BinaGradientButton({label, icon?, onPressed, busy})` | FilledButton/Material Ink gradient + Semantics | G04, r20, min56, padding16×12, icon22–24 and label18/600, shadowAction; state layer on top, disabled solid disabledBg/disabledFg, no gradient during disabled. Keep label width stable with spinner24, focus ring outside. Secondary button same geometry with solid surface and outline. |
| `BinaFloatingDock({destinations, selected, onSelect})` | NavigationBar theme or custom Material navigation row | G07 + shadowDock/r24, inset16, min76, 6dp inner; equal flex, selected r18–20 primaryContainer pill and onPrimaryContainer, all labels visible. No tab ripple outside shape. Branch content not disposed on ordinary switch unless policy requires it. |
| `BinaSparkline({samples, range, label})` | CustomPainter or existing chart lib | 2.5–3dp line, 6dp markers only if needed; draw actual data only; static; no axis if clearly summary with period and accessible description. Not independent interactive plot. |
| `BinaIOPChart({series, target?, selectedSample?, onSelect})` [G] | Existing audited chart lib/CustomPainter + semantic table | §9.0A V08, one-eye actual timestamps, line/markers/target legend, responsive plot, semantic selection and accessible table. No inferred target or interpolation. |
| `BinaVFMap({map, protocol, eye, legend})` [G] | Source image or deterministic map renderer | §9.0A V07, white locked paper, source geometry/aspect ratio, no flip/inversion, text alternative; refuse unsupported/ambiguous maps. Not the clinical stimulus renderer. |
| `BinaReportSummary({approvedSummary, comparison?, actions})` | BinaHero + metric row + action group | G03 with report iris, actual signed report context and approved status; gated comparison; PDF action only authorized. |
| `BinaExpandableRow({title, content, expanded})` | ExpansionTile/AnimatedSize | G02 r20, info icon and directional chevron; expand 180ms, semantics expanded/collapsed; content remains selectable and scrollable. |
| `BinaSwitchRow` | SwitchListTile or Row + Switch | Full row toggles only if one action; explicit label, on/off semantics; teal active track and white thumb in Light, accessible Dark track; permission failure persistent helper text. |
| `BinaAppearancePicker` | RadioListTile + two preview mini cards | System/Light/Dark, actual preview uses token roles; persist local preference; no network. Use only current locale. |
| `BinaChartLegend`, `BinaStatTile` | Wrap, Row, Text, shape glyph | Chart band swatch with border, line/dot with label; tile r16 G02, min96, number24/700, unit and label, no red/green arrow unless semantics actually approved. |

For forms not depicted: `InputDecoration` uses surfaceRaised, outline1dp, focus ring2–3dp, r12, min60dp, persistent label 16/600, input18/400, helper/error14–16; error text + icon and accessible validation. Native date picker is Jalali-capable or explicitly local equivalent; never show Gregorian by mistake. Search/filter controls only if data contract supports; use G02 pill/outline with labeled clear button. Switch visual track approximately 52×30dp inside 48dp hit target; checkbox/radio glyph24 inside >=48dp row. Progress bar height6–8, radius999; use label/count; no invented percentage. Dialog max width 480dp, radius24, padding24; sheet top radius24, explicit close and safe inset; no swipe-only dismissal. SnackBar min48, dark/Light inverse surface or standard surface, action labeled, 4–6s only for noncritical feedback; receipt persists in screen. Tooltips appear on keyboard/long press for secondary icons, never sole label. Loading placeholder matches card footprint and uses static surfaceSoft; use progress only while work in flight. Empty/error panels use simple symbolic icon, title, reason, primary retry/contact; don't use eye art as a medical warning. High-risk controls use urgentAction, no decorative gradients.

### 7.4 Agent-facing composition pattern (illustrative Dart, not compiled)

```dart
// Adapt imports to the installed Material library. All constants below live
// in the design_system package, not in the feature screen.
// The actual wrappers and typed DTO adapters must be implemented in the repo.
Widget buildReferenceToday(TodayUiState s) => BinaScaffold(
  destination: BinaDestination.today,
  child: BinaCanvas(
    artVariant: BinaArtVariant.today,
    child: CustomScrollView(slivers: [
      SliverToBoxAdapter(child: TodayGreeting(state: s)),
      // Insert context/urgent/offline notices immediately when applicable.
      SliverToBoxAdapter(child: TodaySafetyNotices(state: s)),
      SliverToBoxAdapter(child: TodayBrandAndHero(state: s)),
      SliverToBoxAdapter(child: TodayAuthorizedMetricRow(state: s)),
      SliverToBoxAdapter(child: TodayPlanHeading(state: s)),
      SliverList.builder(
        itemCount: s.visibleTasks.length,
        itemBuilder: (context, i) => TodayTaskRow(task: s.visibleTasks[i]),
      ),
    ]),
  ),
);
```

Do not copy this pseudocode if existing wrapper APIs differ. The intent is widget boundaries and state ownership, not generated class signatures. `TodaySafetyNotices` has priority over routine content and can promote actionable emergency help. Use dedicated test fixtures to render visual-only reference states and separate production-safe states. Store `BinaPalette` with one explicit Light and Dark constant instance; use the role table as source and generate typed fields/tests if useful. Avoid theme rebuild loops. Use `ThemeExtension` for ribbon/gradient/well/status/chart tokens and `ColorScheme` for standard Material defaults. Set `Scaffold` background to canvas and draw G01 only once. Set `themeAnimationDuration` 180ms (zero under reduced motion/active clinical test), keep system UI overlay style in sync. Treat dark theme as first-class, not runtime opacity filters.

### 7.5 Iconography and semantics mapping

| Reference item | Suggested rounded/outlined icon or local vector |
|---|---|
| Today | `home_outlined` / `home_rounded` |
| Care | `favorite_border_rounded` / `favorite_rounded` |
| Tests | `assignment_turned_in_outlined` / filled equivalent |
| Results | `insert_chart_outlined_rounded` / filled equivalent |
| Account | `person_outline_rounded` / `person_rounded` |
| Bell / reminder | `notifications_none_rounded` |
| Calendar / plan | `calendar_today_outlined` or local calendar vector |
| Drug / eye drop | local golden droplet / capsule SVG (decorative); `medication_outlined` fallback |
| VR / VF / IOP | local goggles / dot-matrix / semicircle gauge SVG, not emoji |
| Education | `school_outlined`, pastel icon art optional |
| Report / download / share | `description_outlined`, `download_rounded`, `share_outlined` |
| Security / info / settings | `verified_user_outlined`, `info_outline_rounded`, `settings_outlined` |
| Status / time / trend | `check_circle`, `schedule_rounded`, `trending_flat` (actual meaning only) |
| Navigation / expand | directional `chevron_left` for RTL forward, directional back right, `expand_more` for disclosure |

Verify exact icon constant availability on the pinned SDK/package; the icon shapes are specified even if the constant name differs. Unavailable local SVG has equivalent built-in fallback. Each interactive icon requires localized semantic label and tooltip. Status icon may be excluded from semantics when adjacent text already communicates status. Physical/anatomical indicators and clinical coordinate orientation must never mirror automatically.


## 8. Motion, microinteractions and feedback

Motion must explain state or spatial relationship, not advertise the app. All timing values below are project tokens [D], not medical timing or official mandatory Material timings. Use `AnimationDuration`/`Curve` constants, `AnimatedContainer`, `AnimatedSwitcher`, `AnimatedSize` sparingly; native `PageTransitionsTheme` where suitable. Avoid heavyweight animation packages unless a validated need exists. If reduce motion is requested, replace nonessential transitions with instant changes; show static progress or text rather than shimmer/pulse. Never delay action availability or clinical stimulus timing to finish an animation.

| Token / event | Normal motion | Reduced motion | Notes |
|---|---|---|---|
| Press feedback | 100ms color/ink, `easeOut` | Immediate | No scale/bounce or haptics on urgent action. |
| Toggle/selection | 140ms state-color | Immediate | Text/semantics update at state commit. |
| Tab switch | 120ms fade or direct switch | Immediate | Preserve scroll; no sweeping page slide. |
| Forward detail route | native transition or 220ms fade + <=8dp translation, easeOutCubic | Immediate | Preserve RTL/back conventions; no custom competing gesture. |
| Back | native reverse or 180ms | Immediate | Restore focus; no duplicate animation. |
| Dialog | 160ms opacity, no zoom | Immediate | Focus on meaningful header/cancel based on risk. |
| Sheet | 220ms vertical easeOut, close 180ms | Immediate | Scrollable and explicit close button. |
| Expand non-critical education details | 180ms size + fade | Immediate | Not for urgency or eye selection. |
| Dose receipt | 160ms inline crossfade after durable save | Immediate | Pending is pending; success check only for matching state. |
| Care progress | 180ms value interpolation, labels immediate | Immediate | No celebratory effects; no chart motion for clinical outcomes. |
| Loading | static placeholders or progress indicator after ~200ms | Static text/progress | At ~8s show still working; cancel where safe. These are UX wait thresholds, not clinical SLAs. |
| Theme change | 180ms max non-critical theme fade | Immediate | No transition on live test canvas. |
| Error, urgent, revoked, wrong-eye, QC fail | Immediate, static | Immediate | Never shake form, flash, pulse or delay. |
| Clinical stimulus / trial response | Protocol-controlled timing ONLY | Same clinical timing | No app animation, opacity, hero, haptic cue, or animation-dependent response. |

Define centralized tokens: instant=0, press=100, tab=120, select=140, feedback=160, expand=180, route=220, sheet=220 (ms); curveStandard=easeOutCubic, curvePress=easeOut, curveExpand=easeInOutCubic; no spring overshoot. Use AnimatedContainer for selection/state, AnimatedSwitcher for nonclinical content, AnimatedSize for disclosures, TweenAnimationBuilder only for nonclinical progress. Never animate real clinical numeric values, sample axes or maps; decorative assets stay static. Screen-specific motion is in §9.0A. Cancel controllers when hidden; `TickerMode` for retained inactive branches. Respect actual state commit even if fade is still running.

No parallax, auto-advancing slides, confetti, skeleton shimmer loops, blinking emergency indicators, bouncing icon badges, perpetual breathing effects, auto-scroll without user request, or motion that suggests clinical success. Avoid Hero animations entirely for medication photos or clinical test graphics. Haptics optional for ordinary control selection using platform APIs, respect device preferences; not sole cue, no custom vibration patterns, no trial feedback unless validated. Audio only on explicit play; if phone call/test begins stop media safely. No urgent audio alarm without clinical/notification policy.

---

## 9. Complete screen inventory and page-level specifications

### 9.0 How to interpret and implement the inventory

The inventory below covers all seven official feature modules and cross-cutting surfaces derived from PRD §3, §5, §7–9 and ADR §1.1/§5. These are **proposed UI routes/states**, not a claim that every route was prescribed in the original documents. A single screen may implement multiple rows as local states rather than separate routes; preserve the behavior and test IDs. `R1` means W1 implementation / W2 pilot gate; `R2` means W4; `G` means conditional scope. Section 7.2 state matrix applies to every row, in addition to the screen-specific cases. Unless otherwise stated, root pages use shell, child pages use header + back + safe help, and forms use bottom CTA in scroll-safe layout. The patient-facing Persian labels below are draft UX copy for clinical/product review, not final approved medical wording. All displayed samples must use synthetic data in mock mode and no PHI in source.

### 9.0A Approved reference screens — visual composition and build contracts

The following nine images are the primary UI reference set, in original ZIP order. All sizes are dp at default text scaling on the 412dp baseline, expressed as minimums or preferred sizes rather than clipping constraints. `gap` refers to vertical distance between blocks unless otherwise specified. The visible labels quoted below are Persian UI examples; use localization keys, approved patient-facing terminology and real data at runtime. All images are Light-mode synthetic mockups; the same component tree and layout MUST render in Dark using §4. For production, context, urgent help, stale/offline states and eye-specific details outrank decorative artwork. The rest of §9 defines required flows not depicted in the references and domain acceptance details; this subsection overrides its visual composition for these nine routes, not clinical rules.

#### Reference index and feature status

| Image in `Bina-AI-UI-Designs.zip` | Route (illustrative) | Production status |
|---|---|---|
| `01-Today.png` | `/today` | R1 care; monitoring tiles gated |
| `02-Care.png` | `/care` | R1 |
| `03-Tests.png` | `/tests` | Qualified VA/Amsler W4; IOP optional; VR VF preview only until approved |
| `04-Results.png` | `/results` | W3 signed summaries; numeric trend tiles gated |
| `05-Combined-Report.png` | `/results/:signedReportId` | Signed patient-safe summary; raw metrics and export gated |
| `06-Medication-Detail.png` | `/care/medication/:medicationId` or `/care/dose/:doseId` | R1; actual prescription/recording context required |
| `07-VF-Detail.png` | `/results/:signedReportId/vf` [G] | Visual reference; raw VF metrics/maps not currently a patient requirement |
| `08-IOP-Detail.png` | `/results/iop` [G] | Visual reference; partner data and approved chart required |
| `09-My-Account.png` | `/account` | R1 with authorized capabilities |

Keep a synthetic reference-preview fixture for all nine screens in developer/test builds. This allows exact visual regression even where production access is gated. Preview must be isolated from real API writes, alarms, share/export and patient data. Never show the demonstration `پایدار` status, invented medication or mock values to real patients. All quoted demo values are illustrative, not normal ranges, recommendations, or clinical findings. The screenshot dates and numbers are not internally consistent: do not copy them into a clinical fixture without reconciliation. Fixture suggestions below are for visual tests only.

#### V01 — Today (`01-Today.png`)

**Design goal:** reproduce the welcoming patient dashboard with a strong eye-health hero and obvious next actions; clinical alerts and eye-specific care remain higher priority than aesthetics.

**Layout, top to bottom (standard reference preview):**

| Region | Build instruction |
|---|---|
| Status bar | Real system safe area; sample preview time 12:30 only in test harness. |
| Greeting | 64dp min, avatar 48dp on right, 12dp gap, `سلام، مهدی عزیز` 20/700 and `امروز ۳ آذر ۱۴۰۵` 14/400; bell icon in 44dp frosted well with >=48dp tap area on left; notification dot 8dp and accessible unread state if known. |
| Brand | A02 full Bina AI wordmark, contain in approx 122×34dp aligned physical left, 8dp separation from greeting; logo is decorative when app name already announced. |
| Health hero | Full width, 170–192dp min, no hard rectangular border; left half iris illustration bleeding toward canvas edge, right half text `وضعیت امروز` 20/700, `پایدار` 40/700 with 32dp check, explanatory sentence 16/400. G03 ribbon behind, no text on eyelashes or iris. |
| Mini metrics | Two equal G02 cards, min 92dp, radius16, 12dp gap. Right: `فشار چشم (IOP)` + `۱۸٫۰ mmHg` and check; left: `میدان بینایی (VF)` + sparkline. On active production monitoring show eye, timestamp/source and authorized interpretation, no unqualified stable status. |
| Daily plan | 24dp gap, section heading `برنامه امروز` right, 22/700. Optional actual count on left in subtle pill, not a fake progress percentage. |
| Task row 1 | `مصرف قطره`, subordinate `طبق برنامه درمان`, golden drop art on right, time chip `۱۴:۰۰`, left chevron. Preferred 70–76dp, G02, radius20. In real care show exact drug, dose, eye and time; may expand height. |
| Task row 2 | `آزمون میدان بینایی (VR)` + `ارزیابی دوره‌ای میدان دید`, lavender goggles well, time chip `۱۷:۰۰`, chevron. Preview only unless VF is approved; actual assigned test uses appropriate localized title. |
| Dock | G07 floating dock, Today selected on right; other four items follow §3. |

**Interaction:** greeting/avatar opens account; notification bell opens authorized reminders or notification settings, not an invented inbox. Hero is not a diagnostic button unless an approved destination exists. Tapping metric cards opens the corresponding authorized detail, with eye context. Task row opens exact dose or assignment; no row tap records consumption. `ثبت مصرف` appears only at the explicit dose action. Sort tasks by contract and scheduled time, preserve distinct OD/OS groups when present; do not merge two eyes for compactness. No task due → show real completion/next action text; no measurements → neutral unavailable tiles or replace with care-only layout. If urgent instruction, show `BinaUrgentActionCard` immediately above routine hero; if caregiver, show explicit context; persistent `کمک فوری` remains available (use labeled compact row below greeting when header cannot fit). Reference preview may show these only in dedicated state goldens to preserve the visual reference. Swipe refresh optional only with equivalent explicit retry and safe scroll state. Motion: greeting/brand/hero static; tab switch 120ms crossfade; task row ink 100ms; status updates 160ms fade without delaying urgent content; no animated eye, sparkline drawing or live pulse.

#### V02 — Care (`02-Care.png`)

**Layout:** title `مراقبت` right aligned in 64dp root header, top-left mint/aqua sweep, no back on root. At default width use three stacked G02 navigation cards with 16dp internal padding, 12–16dp vertical gap, 84–96dp minimum. Each has 56dp tinted well on right, title 20/700, subtitle 16/400, left chevron. Rows in exact order: `داروها` / `مدیریت داروها و یادآوری مصرف` (warm orange/gold capsule art); `برنامه درمان` / `طرح درمان و توصیه‌های پزشک` (blue calendar); `آموزش و راهنما` / `مطالب آموزشی متناسب با شما` (lavender graduation cap). Below 20dp gap, 168–184dp G03 rounded hero card, iris left within ribbons, `مراقبت بهتر از چشم‌ها` heading and supportive text on right, optional localized `با رعایت برنامه درمان، از سلامت چشم‌های خود مراقبت کنید.` (avoid promises of preserved vision). Remaining space remains luminous canvas, dock with Care selected (heart). On smaller height, hero may scroll; don't force all into one viewport.

**Behavior:** Medication opens eye-specific medication list, care plan opens active episode/approved care plan, education opens approved content. If multiple eyes, choose or group explicitly in destination; do not treat a category tile as an eye selector. Education banner is informational (no chevron or ripple) unless linked to an actual education route; no dead CTA. Empty categories explain why and next clinic contact. Card hover/focus/ink only; detail transition 220ms, no parallax. In Dark keep the golden/blue/lavender icon contrast and deep teal banner, same iris placement and typography.

#### V03 — Tests (`03-Tests.png`)

**Layout:** title `آزمون‌ها` in root header; top decorative wave. Eye selector full width 48dp min, rounded track G02, equal right `چشم راست (OD)` and left `چشم چپ (OS)`; active deep teal G05 white text. Preview right selected. In real test start do not infer eye, explicit confirmation required. 12–16dp gap to two equal shortcut tiles, G03 mint, radius20, min 176–190dp; right IOP tile semicircle gauge icon approx 76×48dp, title `فشار چشم (IOP)`, subtitle `اندازه‌گیری خانگی`; left VF dot-matrix icon approx 76×76dp, title `میدان بینایی (VF)`, subtitle `آزمون خانگی`. Both illustrations symbolic, not measurement gauges. Section `آزمون‌های برنامه‌ریزی‌شده` 22/700; two G02 76dp rows with calendar/teal and VR/lavender wells, date/time and chevron. Preview `اندازه‌گیری IOP خانگی` / `امروز • ۱۸:۰۰`, `آزمون میدان بینایی (VR)` / `فردا • ۱۴:۰۰`. Footer iris left with waves behind blank remaining space, maximum 104dp decorative height; bottom dock Tests selected (clipboard check).

**Production substitution:** use same shortcut card geometry for assigned Landolt C and Amsler where enabled; labels and icons accurately identify test. Home IOP only if HOME2 integration and patient access approved. Home VR VF is not in current PRD/ADR patient scope; keep its reference tile only in isolated preview or after approved change. Do not start a test from a selector change. Eye change filters list and clears incompatible selections; in-flight fetches must be keyed to eye/assignment; protect against stale response overwrite. Tests are `ready`, `scheduled`, `ineligible`, `in progress`, `quality failed`, `saved pending`, `received`, `unavailable` as supported, not inferred. Tap scheduled row opens assignment/preflight/instructions; no automatic session on shortcut. If no assigned tests show neutral message; eligibility details available without false promise. Segment animates 140ms color/position; list data changes 120ms crossfade after correct-eye state, no shimmer on urgent or clinical renderer.

#### V04 — Results (`04-Results.png`)

**Layout:** root title `نتایج`; full width 48dp three-segment track, visual RTL right `همه` active, center `IOP`, left `VF`. Prefer full Persian `فشار چشم` / `میدان بینایی` if labels fit; abbreviations always receive expanded semantics. Below 16dp, G02 outer summary card radius24, padding12–16, heading `خلاصه وضعیت (۳۰ روز اخیر)` 20/700. Two nested equal mini cards G06, min 128–140dp; right `فشار چشم (IOP)` with small green sparkline and `میانگین: ۱۸٫۰ mmHg`, left `میدان بینایی (VF)` with sparkline and authorized `پایدار`. Use line 2.5–3dp, no fake trend, little/no filled area, accessible text summary. 20–24dp gap, `آخرین گزارش‌ها` section. Report row 1 `گزارش ترکیبی` / `IOP + VF` / Jalali date, blue document well; row 2 `گزارش میدان بینایی (VF)` / date, teal dot-matrix well. Min 84–96dp based on 2–3 text lines, left chevron. Dock Results selected (chart icon), blank luminous area below report rows.

**Behavior:** filter applies to authorized records, retains branch scroll where safe, has explicit selected label and no results state; no raw AI confidence or unsigned result. Real summary may instead show approved follow-up and signed report status on same G02 card; optional metrics and sparklines only under explicit patient chart contract. Summary cards link only if actual details exist; report opens signed immutable version. Dates distinguish measured time and sign-off as needed. When no reports, show `هنوز گزارش تأییدشده‌ای در دسترس نیست` and contact/refresh; no false zero data. Urgent signed follow-up replaces or precedes monitoring tiles. Segment 140ms, list fade 120ms, no numeric animation.

#### V05 — Combined Report (`05-Combined-Report.png`)

**Layout:** detail screen, no bottom navigation. RTL header leading back arrow (right, corrected from mockup), centered/leading title `گزارش ترکیبی` with date beneath, trailing share/download icons on left only if authorized; wells 44dp visual, hit area 48dp. If header width insufficient, move actions below title. Three-segment G05/G02 `خلاصه` (right active), `فشار چشم`, `میدان بینایی` min48dp. Large G03 hero radius24, min200–216dp: decorative iris on physical right with concentric grid, left text `وضعیت کلی`, `پایدار` and check, short approved explanation. Deliberate physical art layout matches reference unlike Today. 24dp gap `مقایسه با دوره قبل`; two equal G02 metric cards 116–128dp min: right `VF (MD)` `−3.2 dB` `±0.1` neutral arrow; left `IOP` `18.0 mmHg` `−0.5` downward arrow. These numbers/deltas are reference-only; do not imply direction=clinical benefit. Show only clinically authorized comparable values and period labels. Full-width gradient primary button `دانلود گزارش (PDF)` with download icon, min56dp, radius20, gap24–32dp. Subtle waves at footer; no giant iris covering action.

**Behavior:** approved signed patient summary/next action is primary; status/metric comparison only if explicitly released and meaningful; absent data → plain text, not fake normal. Tabs filter within same report version, not unrelated data. Accessible text always available before PDF. Share/export gated by patient-safe PDF authorization, scope, destination confirmation and privacy policy. If gated off remove both icons and download button rather than make a fake link; show approved next action or return. Download uses actual authorized file, progress/cancel/retry and honest success only after bytes saved/opened; offline only cached authorized document. No duplicate download action if header/footer share same functionality unless both support same state and clear semantics; primary bottom action retained for reference, header icon shortcut optional. Motion: tab 140ms, detail content 120ms fade, PDF state spinner, no chart morph. Keep signed urgent banner immediately visible.

#### V06 — Medication Detail (`06-Medication-Detail.png`)

**Layout:** detail title `جزئیات دارو`, RTL back leading, no dock. G03 full width hero radius24, min176–192dp; generic teal dropper with white cap/blank label physical left (approx 96×140dp), right medication name `لاتانوپروست` 24/700, `قطره چشمی ۰٫۰۰۵٪` 16–18, green `داروی فعال` status chip only if current. Add explicit eye text, prescribed version and context near identity for real care. Below 12dp: `روش مصرف` rich row with clock, exact authorized dose/frequency/time, e.g. fixture `روزی ۱ بار، شب (۲۲:۰۰)`; `یادآوری مصرف` 60dp switch row (label and bell right, switch left); `دستور پزشک` multiline G02 row with document icon and approved prescription text; `اطلاعات بیشتر` expandable row with info icon and down chevron. CTA full width G04 `ثبت مصرف` + check icon, 56dp min, 20–24dp gap; then decorative ribbon footer, no other actions mixed with primary.

**Behavior:** read-only medication details; photo never used to decide drug identity. Show exact eye and dose, never derive from fixture or merge eyes. If a medication has several eligible doses, CTA leads to explicit scheduled dose selection first. The button opens recording confirmation (eye, drug, dose, scheduled time, outcome), not implicit irreversible record. Switch changes reminder preference only, not prescription; OS permission denial is explained, not shown enabled. Additional info expands approved instructions, no unsourced dosing advice; 180ms size/fade. Expired/stale/updated prescription, already recorded dose, offline pending and failed sync states have persistent status near CTA; receipt is authoritative. Durable local write → pending, server receipt → sent; no premature green success. Press ink, toggle 140ms, receipt 160ms; no bouncy scale or celebratory animation. Dark uses same bottle art or adapted shadow, text contrast on hero, vivid mint label only as secondary accent.

#### V07 — Visual Field Detail (`07-VF-Detail.png`) [G]

**Layout:** detail title `جزئیات میدان بینایی (VF)` RTL back, 48dp two-segment `نقشه میدان` (right active) and `روند تغییرات`. G02 outer map panel radius24, padding16, min260–290dp; physical left approx 52–58% panel width grayscale map on white paper with crosshair, source-provided orientation and legend; right metric column `مدل: 24-2`, soft pills for `MD −3.2 dB`, `PSD 2.1 dB`, `VFI 92%`, authorized status chip `پایدار`; info icon bottom-left with 48dp target. If labels don't fit or large scale, map full width above metrics. Add explicit eye, acquisition date, source/protocol, quality and approved interpretation; avoid clinical map mirrored by RTL. Lower G02 interpretation card with teal chart icon, short approved message. Footer ribbon, no dock. Preview can use a clearly synthetic perimetry map but production must use actual approved source data or omit panel. Do not fabricate grids from random dots or present as Humphrey-equivalent.

**Behavior:** map/trend tab shows same-eye comparable test data only; reject incompatible protocols/grid/orientation/units. `MD`, `PSD`, `VFI` definitions can appear in approved info dialog; no unsupported calculations or invented interpretations. Map info includes source/legend; non-color, accessible patient-safe summary alternative. No patient-facing raw maps/scores until approved (current ADR assigns advanced VF to Staff Web); if denied direct link renders safe explanation. In Dark preserve original grayscale paper/ink and legend (do not invert map), surround with dark frosted panel; no theme-dependent changes to medical evidence. Tab transition 140ms, no animated map, no morph/heatmap effects. `پایدار` only if authorized and clinically supported, otherwise neutral.

#### V08 — IOP Detail (`08-IOP-Detail.png`) [G]

**Layout:** detail title `جزئیات فشار چشم (IOP)` RTL back; 48dp segmented right `۷ روز`, middle `۳۰ روز` active, left `۹۰ روز`. In production show eye selection or full eye label above chart plus last valid measurement time/source. G02 rounded chart card radius24, padding16, plot preferred height 190–216dp; thin neutral grid, y labels left, chronological x axis oldest left/newest right with 4–6 nonoverlapping labels, `mmHg` axis/title. Use 3dp chart1 line with 8–10dp hollow markers; latest selected point highlighted, anchored callout `۱۸٫۰ mmHg` with actual date/eye and accessible table. Reference has green area and band; in production optional soft chart fill only when it does not imply missing samples or target; show `chartBand` only for an actual clinician-approved patient/eye-specific target and applicable dates. Legend below chart: dot/line + eye full words, band swatch + actual target. Three equally sized G02 statistic tiles min96–108dp, right `میانگین`, center `بیشترین`, left `کمترین`, numeric values 24/700, unit 14–16; icon cues neutral (min/max aren't inherently good/bad). Bottom right decorative iris/waves approx 130–156dp, shrink/remove before plot labels or stats are squeezed. No dock.

**Chart contract:** reference's range 15–21 and values 16.5/20/18 are illustrative, never hardcode them. Plot actual valid timestamps, not equally spaced by index unless sampling equally spaced; use chronological sorting with stable timezone/Jalali display. No curve smoothing that invents peaks, no interpolation across missing periods, no zeros for unknown, no fake target. Y bounds from actual valid data and approved presentation rules; never clip peaks. Stat tiles use exactly the eligible same-eye same-period data represented, calculation/rounding agreed with backend; missing = `—` + explanation. Distinguish latest value from mean; target is not population normal. If comparing multiple periods/sources, mark incompatible, don't silently merge. Tooltip tap/focus target 48dp via chart gesture + keyboard/table fallback, no hover-only access. If no samples or pending upload, show neutral state with timestamp and action; no stable diagnosis. Dark chart uses pale green line, visible muted grid, dark green band with outline and light tooltip text. Do not animate values, axes, or target line; range switch 140ms, previous chart retained only with old range label until correctly keyed new data ready; static replacement, no morph. Feature gated pending HOME2 integration and patient chart approval.

#### V09 — My Account (`09-My-Account.png`)

**Layout:** root header `حساب من`, no back on root, static top wave. Profile hero approx 140–156dp: physical right circular avatar 76dp with optional 20dp status badge only for a real verification state, name `مهدی احمدی` 22/700, `شناسه بیمار: PT-1042` 14–16, physical left iris within header ribbons. If caregiver, display actor and selected patient distinctly, no fake verified badge. Six G02 compact rows, radius20, min60–64dp, gaps8–10: `اطلاعات شخصی` (green person); `همراه (مراقب)` (mint group); `تنظیمات` (teal gear); `اعلان‌ها و یادآورها` (gold bell); `امنیت و حریم خصوصی` (mint shield); `درباره برنامه` (blue/lavender info). Icons in 40–44dp wells right, labels 18/600, chevron left. Dock Account selected, blank/scroll space for support and sign-out where required. Dark uses deep mint profile artwork, same icon order, contrast labels.

**Behavior:** personal info read-only unless API allows edit; caregiver route authorized grant/scope/revoke; Settings groups appearance (`مطابق دستگاه`, `روشن`, `تیره`), accessibility, sync and supported preferences; notifications show permission and privacy; security/privacy contains consent and account policy; about has app version, approved legal/help information. Provide accessible clinic/help and sign out after main rows or inside clearly labeled group; do not hide urgent help exclusively here. Sign out requires policy-aware confirmation for pending data. System theme preference persisted locally, reflects OS immediately, no network needed, no app restart, no theme change during active qualified trial unless protocol requalifies. Row ink 100ms, navigation transition 220ms, switch 140ms, theme crossfade 180ms only outside clinical tasks. No avatar photo upload, fake verification or account deletion unless authorized.

#### V10 — Visual parity for additional routes (not pictured)

Use these explicit composition templates for the full screen inventory below; do not invent a second style. All are [D] extensions, not visual claims about the nine references.

| Route family | Composition |
|---|---|
| Bootstrap/auth | G01 canvas, restrained top ribbon, Bina logo, single frosted form card; one title, short Persian help, fields and G04 CTA; no nav; keyboard-aware scroll. Splash static logo, never artificial delay. |
| Consent / accessibility setup | Header + step indicator if steps known, G02 readable content sections, native checkbox/radio rows, primary and secondary actions; no hero that displaces text. |
| Care medication list / episode / history | Eye context then G02 rich rows by eye, date or phase; active status, G03 small header only if useful; exact dosing details; sticky action only in recording screen. |
| Dose recording / receipt | Focused G02 eye+drug+scheduled-time summary; large selectable outcome rows; optional reason field; G04 explicit confirm; receipt card with true transport status. No decorative animation. |
| Education library / detail | G02 category rows with pastel icon wells; article detail single-column, section headings and local image/audio controls; use G03 header illustration sparingly, no moving background. |
| SOS / symptom flow | G01 solid fallback, large labeled urgent action and contact in `errorBg`; plain high contrast steps, 64dp urgent call, no decoration, delays, or modal trapping. |
| Caregiver invite / consent / switch | Frosted profile/context card, scoped permission rows, plain revoke confirmation; context banner persists; privacy first. |
| Vision eligibility / instructions / preflight | G02 instruction cards, visible eye and step, qualified device/permission/quality info, G04 action; only outside clinical renderer. |
| Active clinical test | Dedicated isolated surface with validated luminance/geometry, no Bina gradients, dock, illustrations, animation, or automatic theme transform; renderer protocol overrides all UI style. Accessible controls outside stimulus. |
| Quality/receipt | Eye, test, actual quality state and next action; G02 receipt, explicit retry/help; not a medical diagnosis. |
| Signed summary/follow-up | V05 visual frame adapted to authorized patient-safe text and action; no raw metrics unless approved; clear signer/date and next step. |
| Settings / privacy / sync / help | V09-style G02 rows, persistent labels, local theme radio preview; compact hero only if useful; dark and large-scale parity. |
| Dialog / bottom sheet | Solid G02 fallback, radius24 top corners, short title/consequence, cancel/confirm, 48dp+ controls; no blur dependency; full-screen fallback for long text. |


### 9.1 Bootstrap, authentication and consent — `auth_onboarding` (T-B02, T-B06; R1)

| ID / proposed route | Contents, layout and components | Interaction / state and acceptance |
|---|---|---|
| AUTH-01 `/bootstrap` | Native launch screen with local mark, plain surface, then real app shell; no onboarding splash carousel. | Resolve secure session, tenant, consent/version and authorized cached access. Return to safe default on invalid session. No PHI before unlock; no mandatory delay. Offline emergency path remains available under policy. |
| AUTH-02 `/auth/welcome` | Brand wordmark, heading `به بینا خوش آمدید`, one sentence on clinic-issued care, primary `ورود`, secondary `راهنمای ورود`. | No marketing cards or sign-up promise; support entry via clinic-issued invite. SOS/help link visible. |
| AUTH-03 `/auth/invitation` | Verified clinic identity, masked phone if returned, short invitation explanation, continue. | Expired/replayed/wrong-tenant links show clear recovery. Exchange token securely; no patient details before authorization. Never let the link select OD/OS. |
| AUTH-04 `/auth/phone` | Label `شماره موبایل`, visible `+98`, one large LTR number field inside RTL, example format, `دریافت کد ورود`. | Normalize Persian/Arabic/ASCII digits to canonical +98 format; use server validation. Do not expose account existence. Error text and retry with rate-limit guidance. Offline login cannot be simulated. |
| AUTH-05 `/auth/otp` | Masked destination, single OTP field, editable phone link, resend state, continue button. | Paste/autofill; don't force six separate focus boxes; server-defined length, expiry and retry window. Expiry does not erase phone. No fake countdown or auto-submit on paste unless existing verified UX explicitly supports it. |
| AUTH-06 `/auth/consent` | Scrollable versioned Persian consent, readable sections, data handling and clinical limits, explicit affirmative action, optional research consent separate if offered. | No preselected consent; don't require inaccessible scroll-to-bottom trick. Version/date recorded from server; refusal explains access consequences and clinic contact, not coercive copy. |
| AUTH-07 `/auth/accessibility` | Appearance (system/light/dark), optional high contrast, text-size guidance, audio preference, preview with real text. Primary `ادامه`, optional `بعداً`. | Respect OS sizing; preview is not clinical calibration. No permissions needed. Settings available later. |
| AUTH-08 `/auth/help` | Login help, contact with verified clinic info, invitation/OTP help, accessible phone action. | No public sharing of identifiers; no invented support channel. |
| AUTH-09 `/auth/session-expired` | Plain explanation `برای ادامه دوباره وارد شوید`, re-authenticate and help. | Protected data hidden on session invalidation. Keep durable pending records securely scoped if policy allows; do not discard silently or send under new identity. |
| AUTH-10 enrollment unavailable state | Clinic-linked no active plan; clearly show contact and safe home. | No self-created episode, self-registration workflow or demo data masquerading as a plan. |

Layout: top-level back except welcome; form heading and instruction first; place inputs in natural keyboard order, full-width button below. OTP is a security action; never emit phone/code in logs or analytics. On Web, protect the route after reload and avoid persisting OTP. On deep-link auth success, only resume an authorized destination; else Today.

### 9.2 Today, care plan and medications — `care_plan` (T-B07; R1)

The composition for the approved Today and Care renders is V01/V02 in §9.0A. The following diagram is the care-only / high-priority safety variant and behavioral requirements, not a competing visual baseline.

Today is the product's highest-value screen. It must answer: **What should I do now? Which eye? What if I need help?** Avoid analytics-heavy dashboard design. Display clinic identity and current local day, a single prioritized next action, then tasks grouped by eye, education and contact. Do not show clinical urgency inferred from missed doses. If a verified urgent instruction is active, place it immediately after context, before routine tasks; SOS remains directly reachable. If no current task, show next known task or clinic-issued completion state rather than a fabricated schedule.

```text
[Today title]                             [Urgent help — text + icon]
[Caregiver context, if active]
[Offline / stale / urgent banner only when applicable]
[Today • localized date]
[Next action card: eye in full words, time, drug + exact dose, action]
[Daily recorded count — explicit denominator; optional progress bar]
[Right eye heading]
  [Dose card] [Dose card ...]
[Left eye heading]
  [Dose card] [Dose card ...]
[Relevant education / clinic-issued follow-up]
[Shell navigation]
```

The diagram is logical structure, not LTR positioning. Use stacked full-width eye sections; never show two visually identical unlabeled medication cards. A patient may have one active eye or different surgeries/prescription versions; don't add a second eye without data. Both groups retain their own state, reminders and stable identity. Within each group use chronological order and visibly mark next/overdue only as defined by contract. “Overdue” is a timing state, not a diagnosis or instruction to take an extra dose. No completion via swipe, drag, or tap on whole card without explicit action.

| ID / proposed route | Contents, components and hierarchy | Interaction / state and acceptance |
|---|---|---|
| CARE-01 `/today` | Next action, due groups, recorded count, relevant education, help. BinaDoseCard, EyeLabel, SyncBanner. | Show cached plan freshness; urgent card first if authorized. When no doses due show plain text and upcoming if known. Refresh must not reorder the card under a finger during recording. |
| CARE-02 `/care` | Active care episodes grouped by eye, current plans, education and history entry. | Include closed episodes only if contract supports history; no patient editing. Distinguish active vs completed episode, not normal vs abnormal eye. |
| CARE-03 `/care/episode/:episodeId` | Eye, surgery/protocol and clinic-issued instructions, active version/effective date, scheduled actions, follow-up. | Confirm episode identity from authorized data; stale/replaced version banner. Never combine eyes or infer surgery date. |
| CARE-04 `/care/dose/:doseId` | Eye, exact medication name, bottle cue, dosage, route, time, approved instruction and current state. | No substitution, dose calculator, free-text medication editing or default inferred eye. Photo is illustrative only if authoritative; missing image uses text. |
| CARE-05 `/care/medication/:medicationId` | Eye-specific medication detail, current version's schedule/taper phases, approved handling instructions. | A read-only timeline/list; distinguish active vs future phase; preserve original units, do not compute regimen from UI. |
| CARE-06 `/care/dose/:doseId/record` | Repeat eye, medication, scheduled time; selectable outcomes with label/icon, reason when relevant, explicit confirm. | Four domain states below. No irreversible action by selecting an option. If already recorded show receipt instead of creating a duplicate. |
| CARE-07 missed-dose reason state | For not taken: reason options from API, accessible text entry only when supported, clinic-approved instruction. | If guidance missing, direct to clinic; never generic “take now”, double-dose, or schedule override. Required reasons validated and normalized by contract. |
| CARE-08 unavailable-medication state | Record `دارو در دسترس نبود`, optional approved contact/help instructions. | Do not offer pharmacy, substitution or dose advice unless separately specified. Record and receipt per contract. |
| CARE-09 `/care/receipt/:eventId` | Eye, drug, time, recorded status, durable save/receipt indicator, return to Today. | Pending vs sent explicit; correction only if a versioned amendment API exists [G], otherwise contact clinic; no silent deletion or undo of committed clinical evidence. |
| CARE-10 `/care/history` [D/G] | Date/eye filters, chronologically grouped actual adherence entries and status, no raw audit IDs. | Depends on authorized history contract; no synthetic adherence or conflating no response with not taken. Accessible summary text. |
| CARE-11 `/care/instructions` [D] | Active clinic-approved care instructions, labeled eye if specific, version/date. | Prefer text, optionally local accessible PDF only if provided. If missing/stale, state that rather than improvising. |
| CARE-12 prescription updated state | Inline announcement and dedicated review panel showing actual changed eye, effective time, revised plan. | Update only affected eye. Invalidate conflicting queued operations per server policy; don't reinterpret old records under new prescription. Keep other eye card/reminders unchanged. |
| CARE-13 local reminder entry state | Open exact dose from notification after auth; present safe plan. | Notification body generic and PHI-free by default; re-resolve current prescription, ignore superseded notification. If too late/no longer valid show clinic-approved guidance. |

Four original adherence states are **consumed** (`مصرف شد`), **not consumed + reason** (`مصرف نشد`), **unavailable** (`دارو در دسترس نبود`), **no response** (`پاسخی دریافت نشد`). Present the first three as user-recordable if schema permits. No response is ordinarily a system-derived absence of a response, not a patient statement; do not invent an API option for it. Confirm exact behavior against DTO and clinical owner. Keep scheduled/pending/failed transport states separate from adherence outcome. Never label no response as refusal or noncompliance. Show `ثبت شد؛ در انتظار ارسال` for durable local save, `ارسال شد` for server acknowledgement, not “پزشک بررسی کرد” unless review receipt exists. Never display a green check that implies server receipt while offline.

**Dose card anatomy:** eye heading (18/600) → drug name (20/600) with exact generic/brand if provided → dose and instructions (18/400) → scheduled time (20/600, tabular where supported) → status label → single action `ثبت مصرف`. If bottle asset exists, optional 48–64dp thumbnail with textual cap/bottle cue; avoid using a photograph as sole identifier. Card's secondary details link distinct from primary action; don't put an InkWell over both. For a long drug name wrap naturally. No fake pill illustrations for actual eye drops. If there are multiple doses at same time, display separate cards and separate records, not “take all” batch action.

### 9.3 Education — `education` (T-B08; R1)

| ID / route | Contents and layout | Interaction / states |
|---|---|---|
| EDU-01 `/care/education` | Clinic-issued time-released lessons grouped by stage (before/after procedure), available lessons first; concise cards. | Only authorized released content, no fake future release. Mark read only if tracking contract supports it; avoid gamification. |
| EDU-02 `/care/education/:lessonId` | Title, stage/eye if relevant, short sections, bullets, helpful local illustration and text. | Preserve approved content verbatim where necessary; don't let LLM rewrite medical instructions. Cache authorized released lessons; show freshness. |
| EDU-03 optional audio state | Play/pause, elapsed/total when known, text equivalent, user control. | No autoplay; no network-only dependency for emergency instructions. Audio unavailable fallback text. If TTS used, verify Persian pronunciation and approval before release. |
| EDU-04 unavailable content state | Plain reason (not released, not assigned, unavailable offline), return to care/help. | Never expose future clinical content or generic substitutes as clinician guidance. |

Use 18sp reading text, short paragraphs, generous line height, accessible illustrations. A section may expand with 180ms animation; core instructions must not be hidden behind collapsed accordions. Links descriptive, no ambiguous “click here”.

### 9.4 Symptoms, urgent help and clinic communication — `symptoms_sos` (T-B08; R1; optional NLP W4)

| ID / route | Contents and layout | Interaction / states |
|---|---|---|
| SOS-01 `/help/urgent` | Immediate page: red-accented heading `کمک فوری`, clear clinic phone button and visible number, clinic staffed hours, approved out-of-hours emergency instruction/card; `ثبت علائم` secondary. | **Zero network wait** for cached authorized hotline. No mandatory login/permission/form before available emergency guidance. No fake phone number. Dialer action, not automatic call. If Web call unavailable show selectable number. |
| SOS-02 `/help/symptoms` | Short explanation of report vs emergency call, direct help action, start structured report. | If offline, explain submission not immediate; patient can still call. Do not gate urgent help on reporting. |
| SOS-03 `/help/symptoms/eye` | Large explicit eye radio rows, options only supported by contract, continue. | No default guessed laterality; if uncertain allow policy-defined uncertain handling/help without assigning wrong eye. |
| SOS-04 `/help/symptoms/questions` | Approved structured questions, one decision per screen or readable short group, yes/no/unknown if allowed, progress labels. | Render deterministic protocol fields, not a generated medical questionnaire. Red-flag rule triggers immediate action guidance, even before network response. Never delay urgent action until questionnaire completion. |
| SOS-05 free-text state [G] | Optional Persian description field with example-neutral help, keyboard and paste support. | NLP expansion W4 only. NLP cannot suppress structured flags; don't display predicted probabilities or ask user to rely on model. Avoid voice recording unless approved. |
| SOS-06 `/help/symptoms/review` | Summary of eye and answers, edit links, explicit `ارسال گزارش علائم`, visible contact action. | Preserve exact answers; if red flag, foreground urgent call/action; no requirement to submit before calling. |
| SOS-07 `/help/symptoms/receipt` | Local/confirmed transport status, next action from approved guidance, clinic contact. | Pending label and warning remain visible; sent != reviewed. No promise of response time unless approved and accurately sourced. |
| SOS-08 urgent action state | Static full-width urgent panel with clear action and approved language; contact + outside-hours options. | No countdown, no pulsing, no dismiss to routine state, no false reassurance. Urgent floor cannot be downgraded by UI/NLP or stale cached response. |
| SOS-09 out-of-hours state | Explicit clinic availability and approved alternative. | Use clinic time zone and verified staffed hours; uncertainty shows “hours unavailable” rather than “open”. No implication of 24/7 monitoring. |

Example operational copy (not clinical advice): `گزارش روی این دستگاه ثبت شده و هنوز به کلینیک ارسال نشده است.` / `ارسال گزارش به معنی بررسی فوری توسط پزشک نیست.` / `برای تماس از شماره ثبت‌شده کلینیک استفاده کنید.` Clinical red-flag content, emergency referral instructions and exact after-hours wording must be supplied and reviewed by clinic partners. Do not add generative chatbot, direct medical messaging, or automated patient diagnosis. If clinic contact is missing or expired, show preapproved fallback guidance, not a fabricated hotline; treat missing configuration as a release blocker for active care.

### 9.5 Caregiver companion — `caregiver` (T-A08, T-B08; R1)

A caregiver uses the same app, not a separate product. Caregiver actions are actor-attributed; never masquerade as the patient. Persistent context header e.g. `در حال مراقبت از: …` (authorized display name only) and `تغییر بیمار` if multiple grants allowed. Patient's clinical data and offline queues partitioned by tenant, patient and acting identity. Never show a global merged medication schedule across people.

| ID / route | Contents and layout | Interaction / states |
|---|---|---|
| CG-01 `/account/caregivers` | Active/expired grants if API returns, scope summary, add action. | Patient-only grant management where authorized. No unverified contacts or implied access. |
| CG-02 `/account/caregivers/invite` | Phone or invitation method supported by API, clear purpose, continue. | No access on invitation creation alone. Expired/replayed invite safe recovery; no address-book permission required. |
| CG-03 `/account/caregivers/scope` | Human-readable exact scopes from server, consequences, confirm. | No “all access” default; least privilege; no invented scope toggles. Explicit consent for actual grant. |
| CG-04 `/account/caregivers/grant/:grantId` | Identity, permissions, state, expiry if supplied, revoke action. | Show only authorized fields. No silent expansion of scope. |
| CG-05 `/account/caregivers/revoke` | Confirm person and consequences, cancel and revoke. | Online acknowledgement required to claim server revocation. On offline request, say not yet revoked, offer connectivity/help; don't claim instant remote revocation without server receipt. |
| CG-06 `/caregiver/accept` | Accept scoped invite after auth and relevant consent, identity confirmation. | Validate token/tenant/scope, no patient data before grant active. |
| CG-07 `/caregiver/patients` | Authorized patient list, large rows, current context marked. | Switch explicitly; clear stale views and route, never retain previous patient's selected eye/dose. Scope-dependent destinations. |
| CG-08 delegated Today/Care/SOS/Results | Same page designs with persistent caregiver context; only allowed actions. | Record actual actor; recheck grant on every API request. Disallowed controls replaced by clear explanation if useful. |
| CG-09 revoked/expired access state | Stop interaction, purge protected cached views/data per policy, explain access ended. | Server revocation must immediately deny calls (ADR/PRD target); UI responds to 403/revocation event. Offline device cannot know an unseen server revocation: fail closed for delegated access unless explicit secure offline policy is approved. Never replay queued delegated writes after revocation without authorization. |

Use no shame copy such as “you lost access.” Notification for revocation is generic. Do not store patient/caregiver names in analytics. The underlying backend enforces access and audit; UI is defense-in-depth, not the enforcement boundary.

### 9.6 Home vision monitoring — `vision_testing` (T-B21/22; R2; see §10)

| ID / route | Contents and layout | Interaction / states |
|---|---|---|
| TEST-01 `/tests` | Assigned/eligible tests with name, purpose in plain Persian, due info if contract supplies, eye and next action. | Gated by tenant/protocol/device; no self-diagnosis menu. Explain no assigned tests and clinic contact. |
| TEST-02 `/tests/:assignmentId/eligibility` | Device support result, requirement explanations, test version/eligibility as appropriate. | Check qualification registry and kill-switch, physical calibration capability, platform. If unsupported never offer clinical start. Web verification adapter is lab/test only, not assumed clinically equivalent. |
| TEST-03 `/tests/:assignmentId/eye` | Full eye words, explicit select/confirm or fixed assigned eye display with confirmation. | No auto-selected eye inferred from chart position; match assignment; discrepancy blocks start. |
| TEST-04 `/tests/:assignmentId/instructions` | Approved posture, device placement, covering other eye, glasses/lighting requirements from protocol; optional illustration/audio. | Do not hardcode clinical instruction from generic UX. Help/exit always visible; no timing pressure. |
| TEST-05 calibration state | Approved calibration workflow, local measurement instructions and progress. | Only protocol-approved calibration; no assumption dp = physical mm. If not supported, stop and offer contact. |
| TEST-06 `/tests/:assignmentId/practice` | Clearly labeled practice, examples, response control training. | Practice isolated from actual measurements; no fake success data. Rehearse accessibility/gesture alternatives only if validated. |
| TEST-07 permission state | Camera/sensor purpose, privacy statement, native permission request. | Denial alternative only if supported; no raw face video persisted/uploaded. Camera indicator and lifecycle handled honestly. |
| TEST-08 `/tests/:assignmentId/preflight` | Distance, light, stability, head pose/device requirements with label + icon; guidance and `شروع آزمون` when qualified. | All statuses from actual quality port; missing sensor is unknown/not eligible, not passed. No hardcoded 30–60cm threshold (D2 dataset range is not clinical rule). No fake checkmarks. |
| TEST-09 Landolt C session state | Calibrated isolated stimulus and protocol-defined 8-direction response controls; minimal chrome, exit. | No responsive/theme scaling of canvas; exact timing/geometry; no hints or correctness feedback during clinical trials unless approved. No auto-advance beyond protocol. |
| TEST-10 Amsler session state | Calibrated grid and fixation/instructions; approved response geometry and editing/confirmation controls. | Preserve raw coordinates and transformations; alternate input only if clinically validated. No zoom/pan of stimulus unless protocol permits. |
| TEST-11 interrupted session state | Clear pause/exit reason, resume or restart only if permitted, contact. | Invalidate/requalify after backgrounding/orientation/display changes as defined by protocol; no silent continuation. |
| TEST-12 `/tests/:assignmentId/quality` | Quality assessment status and explanation; retry or exit where allowed. | Invalid/incomplete never labeled normal. Do not score if quality policy disallows. If evaluation pending, distinguish from valid. |
| TEST-13 `/tests/:assignmentId/receipt` | Eye, test name/date, valid/invalid/pending quality, submission state, next approved instruction. | No raw probability, self-treatment advice or diagnosis. Show actual measurement to patient only if approved and authorized; otherwise “completed/awaiting review”. |
| TEST-14 `/tests/baseline` [G] | Required session count and completed count if exposed by backend; next assigned session. | No derived thresholds, no fabricated count. Baseline pending != stable disease. |
| TEST-15 `/tests/history` [G] | Authorized history in chronological list, eye/test/date/quality and approved patient-safe values if allowed. | Staff Web longitudinal trends are explicit scope; patient graph is an optional UI extension requiring contract and clinical review (§11). |
| TEST-16 `/tests/home-iop` [G] | Partner device information, assigned eye, import/transfer status, instructions from approved integration. | `iCare HOME2` partner integration in ADR T-A28, not a dedicated Flutter deliverable. Implement only if authorized device/API and patient workflow confirmed. No manual arbitrary IOP or camera-based IOP. |
| TEST-17 HOME2 connection/import state [G] | Available connection method, consent/permission if necessary, authentic transfer status. | Do not invent Bluetooth pairing if integration is server-side; use official partner adapter. Duplicate/wrong-eye/missing provenance blocked or quarantined per contract. |
| TEST-18 HOME2 receipt [G] | Actual eye, measurement timestamp/source, value/unit if approved, transfer status and next action. | Pending != received; never infer danger/normal thresholds or advise medicine changes. If data unavailable show unavailable, not 0 mmHg. |

### 9.7 Signed diagnostic summaries and follow-up — `diagnostic_results` (T-B19/20; W3)

| ID / route | Contents and layout | Interaction / states |
|---|---|---|
| RES-01 `/results` | Signed report list with eye, date, short title, authorized follow-up indicator. | Signed-only API boundary; no unsigned draft metadata, inference progress, or AI score. Empty `هنوز گزارش تأییدشده‌ای در دسترس نیست` with clinic contact. |
| RES-02 `/results/:signedReportId` | Action-first: approved follow-up/urgent guidance, eye and report date, patient-safe Persian summary, clinician/clinic if provided. | No raw differential, probability, severity score, segmentation, Grad-CAM or diagnostic technical workspace. Render immutable approved text. Signed-version updates clear stale display according to policy. |
| RES-03 `/results/:signedReportId/follow-up` | Confirmed appointment date/time or follow-up interval, clear instruction, clinic contact. | No booking, rescheduling, calendar claim, or attendance acknowledgement unless API explicitly supports it. Exact date vs interval distinct; no fake date. |
| RES-04 urgent signed summary state | Non-dismissible visible action card, clinic and after-hours contact as approved. | Immediate display; no animation or downgraded styling. Report approval and urgency come from authorized server data, not UI interpretation. |
| RES-05 report unavailable/replaced state | Reason where safe, refresh and clinic link. | Offline authorized signed snapshot only; show freshness. Revoked/forbidden cannot be displayed, including stale cache. |
| RES-06 document view [G] | Accessible patient-safe text first; optional signed patient-safe PDF if explicitly authorized. | Do not expose clinician PDF containing raw results merely because reporting service generates it. No default share/export of PHI; if enabled, explicit confirmation and approved secure channel. |

The patient UI does not perform diagnostic classification. Signed Persian instructions can be read offline only under the approved cache/access policy. If a caregiver lacks report scope, the report route denies access. If there is an urgent signed instruction, a notification can be generic and route to auth; never leak diagnosis in SMS or lock-screen notification. No clinician's report editor, image uploader or modality navigation in Patient App.

### 9.8 Account, support and system surfaces — cross-cutting [D] (R1 unless gated)

These routes organize existing required capabilities; not independent ADR feature modules. Avoid expanding scope beyond contract. Profile editing, data export, deletion, push inbox, chat, and account creation are not implicitly supported.

| ID / route | Contents and layout | Interaction / states |
|---|---|---|
| ACC-01 `/account` | Current account/context, clinic, appearance, accessibility, notifications, consent, caregivers (if patient), sync, help, sign out. | Use the six frosted rows and profile hero from V09, with support/sign-out accessible below or grouped; no dense settings dashboard. |
| ACC-02 `/account/profile` | Read-only authorized display name/phone (masked where appropriate) and clinic identity. | Correct wrong identity via approved clinic process; no unsupported profile edit. |
| ACC-03 `/account/appearance` | System/Light/Dark radio, live preview with sample text, optional high contrast. | Instant persisted setting, no network. No clinical stimulus change. |
| ACC-04 `/account/accessibility` | OS text size guidance, high contrast if implemented, reduced-motion preference, audio options. | App may strengthen but never weaken OS accessibility. Clinical canvas exception explained in test flow only. |
| ACC-05 `/account/notifications` | Local reminder permission/status and generic privacy preference; system settings link when available. | Opt-in contextual permission; no unsupported notification time editing or false enabled state. Clinic-issued schedule cannot be modified. |
| ACC-06 `/account/consents` | Version and date of consent if exposed, approved text, optional ML research consent if enabled. | Withdrawal or update only via approved API; explain policy and clinical care independence; no fictitious delete/export. |
| ACC-07 `/account/sync` | Pending local submissions, counts, last sync timestamp, retry, errors, clear status text. | Don't show raw queue payload, secrets, or transport log. Failed/conflicting actions separate; retry idempotent. No “delete all pending” button. |
| ACC-08 `/account/clinic` | Verified clinic identity, phone, hours, contact and out-of-hours guidance. | Cached emergency data available offline; if stale mark it. Do not invent address/location or contact links. |
| ACC-09 `/account/help` | Plain-language how-to for app tasks, accessibility, login, caregiver, offline. | Non-clinical guidance; clinic medical help separate. No AI medical chat. |
| ACC-10 sign-out dialog | Explain session and pending data consequences, cancel/sign out. | Protect cache and keys. Do not erase unsent evidence silently; approved policy controls secure retention/re-auth. If caregiver grant invalid, fail closed. |
| SYS-01 offline/no connection | Inline banner with status and last update; no full-screen blocker when local work possible. | SOS available. Connectivity indication is not proof API works. |
| SYS-02 no authorized data | Plain empty screen, clinic link. | No demo records or zero values substituted. |
| SYS-03 retryable server error | Context preserved, reason if safe, retry/back. | No raw exception/error stack. Retry only safe operations. |
| SYS-04 forbidden/expired | Neutral explanation, auth/help, clear protected context. | Route/cache checks; no leaked details of inaccessible patient. |
| SYS-05 required update / incompatible contract [G] | Explain supported action, contact, only authoritative update instructions. | No fake store links; preserve SOS and protected pending data per policy. |
| SYS-06 permission denied | Context-specific explanation and alternative if available. | Native system settings navigation only where supported. |
| SYS-07 safe confirmation dialog | Action-specific target and consequence, cancel and explicit submit. | Focus and keyboard accessibility; no generic “Are you sure?” for clinical identity. |
| SYS-08 not-found deep link | Safe message and home/help. | No arbitrary route fallback that shows a previous patient's record. |

### 9.9 Full-flow acceptance examples (cross-screen)

1. **Dual surgery:** launch with synthetic OD and OS plans. Record OS dose; pending card clearly OS. Server replaces OS Rx v1 with v2; OS reminder changes, OD cards, reminder IDs, history and next dose remain unchanged. Large text does not truncate eye or dose.
2. **Offline daily care:** authenticated patient with authorized cache loses network, records one dose, force-closes and restarts, sees one pending record. On reconnect same idempotency key yields one receipt. No duplicate adherence event. If old Rx invalid, show conflict and safe next action; no implicit rewrite.
3. **Emergency:** airplane mode from Today, open SOS immediately, dial cached clinic number if available; out-of-hours card remains readable. Report marked pending. No modal, auth refresh spinner or network blocks contact.
4. **Caregiver:** actor accepts scoped invite, switches patient, records permitted action. Revocation causes server 403 and cache clear; old routes and pending writes blocked. Offline access restriction honestly explained.
5. **Diagnostic:** unsigned result is absent even by deep link/cache; clinician signs report; signed patient-safe summary and exact next action become visible. No raw scores in UI, state, logs or notification.
6. **Home test:** unsupported device cannot start; qualified device preflight fails, sees precise approved correction; passes, confirms eye, practices, records trials; interruption invalidates per protocol; valid receipt uses actual quality state. No theme/text scaling changes stimulus geometry. Zero raw face frames saved/uploaded.

## 10. Clinical rendering and quality UX — HARD SAFETY BOUNDARY

### 10.1 Separate renderer and shell

`packages/clinical_renderer` is isolated from presentation theming. The renderer takes a versioned protocol, calibrated device parameters, stimulus dimensions and deterministic raw input; it does not read `Theme.of`, text scale, dark/light palette, responsive card size, or animation tokens for stimulus rendering. Use `CustomPainter`/appropriate canvas with explicit physical/angular calculations from validated protocol. No arbitrary SVG scaling or screenshot-based tests alone. `device_sensors` adapters expose qualification and quality state; clinical backend remains authoritative for scoring. The rest of the page uses normal accessible design. Clinical stimulus colors/contrast/geometry are defined by protocol, not this document. Do not assume white/black or 40cm if not specified. A validated test surface can remain protocol-defined in Dark Mode; explain this before start and avoid transition flash. During a test, appearance or orientation changes either leave the protocol-approved canvas invariant or trigger safe interruption/requalification. Never hide OS accessibility globally.

### 10.2 Test session state machine (conceptual, map to real contract)

```text
assigned -> eligibility -> eye_confirmed -> instructions -> practice
         -> calibrated/preflight_pass -> active_trials -> submitted_evidence
         -> quality_pending -> valid | invalid | incomplete
         -> durable_local_save -> pending_upload -> confirmed
```

Permission, calibration, device registry, environment and feature kill-switch are prerequisites, not user dismissible warnings. Any unsupported condition, revoked protocol, lifecycle interruption or stale calibration enters a safe blocked/interrupted state according to protocol. UI must never silently skip a quality gate. No numeric thresholds or Best-PEST implementation details in UI layer; obtain versioned algorithm and stop conditions from clinical scoring contract. Captured trial times, direction identifiers, response and raw geometry are immutable once committed. Practice not mixed with clinical trials. Render clinical results only from authorized scoring/quality output; missing/invalid measurements are not zero. Display “در حال بررسی کیفیت آزمون” only if actual state is pending. Do not overpromise real-time review.

### 10.3 Landolt C design specifics

- Stimulus physical angular size and gap/orientation driven by clinical renderer. Preserve the 8 orientation identifiers in protocol coordinates; RTL must not mirror anatomical/physical directions. Device pixel ratio, OS display zoom, panel geometry and calibration matter; logical Flutter dp is insufficient for physical accuracy.
- Put response controls outside the calibrated stimulus region. Large labeled directional choices with adequate separation and explicit “not sure” only if supported. Response layout cannot overlap stimulus; if screen cannot accommodate both, fail qualification or use approved alternative, not shrink stimulus to fit.
- Practice shows how to respond without storing scored evidence. In clinical mode no hints from animation, sound, semantics descriptions of actual orientation, or response correctness. Screen reader can explain instructions and navigation but must not reveal answer; if a user cannot complete visual task, offer clinic alternative.
- Do not display logMAR “normal/worse” labels unless clinician-approved patient-safe outcome exists. Do not infer baseline from first trial or convert to Snellen independently. Store raw trial data and versioned measurement in authorized pipeline.

### 10.4 Amsler design specifics

- Use protocol-calibrated grid/fixation marker; capture distortions in exact coordinate space with transformation metadata; do not add rounded corners, decorative colors, grid gradients or animation to clinical stimulus.
- Provide explicit instructions, optional practice on separate practice grid, clear/correct markings only while evidence is uncommitted, confirm before commit. Exact response tools (touch, region drawing, alternative accessible inputs) require clinical approval. WCAG alternatives for ordinary drag UI do not authorize changing a measurement method.
- Never use a stylized decorative Amsler illustration as an actual test. Any zoom/pan, font scaling, rotation, window resizing, sensor loss, or focus loss must follow protocol. Qualify native targets; Web adapter is verification only until validated. No severity/AMD diagnosis from marked regions in patient UI.

### 10.5 Sensor and privacy requirements

Request just-in-time camera/IMU/etc permission with precise local explanation and actual privacy behavior. Do not record raw face video; process sensor signals locally where designed; do not persist or upload frames in default care. Stop camera on pause/exit/background and dispose resources. Send only approved quality observations and trial evidence. Show live distance/lighting/stability guidance only when data is available, no raw camera preview unless protocol/privacy requires it. If sensor unavailable, show actual limitation and clinic alternative; never approximate with unvalidated heuristics. Quality labels: checking, passed, needs correction, unavailable (not measured), not eligible. Do not color alone. Implement tests for denied/revoked permission, unsupported device, registry kill-switch, app background, screen resize, rotation, loss of sensors and reduced motion.

## 11. Data presentation, localization, notifications and offline UX

### 11.1 Patient data and chart policy

The PRD/ADR explicitly defines professional longitudinal chart views in Staff Web, not a fully specified patient chart. In launch UI prioritize medication schedule, signed summary and receipts. If patient history/graphs are approved [G], design for comprehension and non-diagnosis:

| Data type | Default patient presentation | Conditional visualization |
|---|---|---|
| Daily adherence | Recorded count + exact denominator + status list | One horizontal progress bar, not a donut with unlabeled slices. Separate pending/confirmed and distinguish no response. |
| Medication taper | Versioned schedule grouped by phase/date and eye | Simple textual timeline; no interpolated treatment changes. |
| Home VA / Amsler | Test completion, quality and next action | Approved measured values/history only; units/quality/source/eye in every row; no medical verdict. |
| Home IOP | Device transfer receipt | If approved, same-eye time series with mmHg and source; no generic normal band/threshold, no interpolated missing data. |
| Signed diagnostic result | Action and approved Persian text | No AI graphs, risk score, differential, segmentation or heatmap. |

Chart rules if enabled: one eye per plot by default, right/left explicit selector not color identity; avoid dual y-axes, 3D, pie charts for clinical progression, smoothed/extrapolated lines and auto-scaling that exaggerates change. Use actual units, clear range and chronological labels; document time-axis convention (proposed oldest left/newest right for scientific plots with explicit endpoint labels; do not mirror data order accidentally). Test Persian/bidi axis labels and locale. Chart points distinguish measured/pending/invalid, missing values gap not zero. Line >=3dp, marker >=6dp visual and accessible focus/select target >=48dp if interactive; use `chart1`, `chart2`, solid/dashed and different symbols, legend plus direct labels; interactive data also available via table. No animation of clinical values. Tap/keyboard selection, no hover-only tooltip, accessible textual summary of actual data without inferred trends. Gridlines decorative, axes and marks with necessary contrast >=3:1. No threshold line unless source and interpretation clinically approved. Chart library optional; audit maintained version, license, Web support, semantics and build weight before pinning. A plain `ListView`/table is preferred over inaccessible visualization.

### 11.2 Persian-first localization specification [R]

- Source language English; UI locale `fa-IR` and semantic RTL, no hardcoded English visible text, screen-reader labels, validation errors, dialogs, notifications or accessibility hints. Use ARB/localization generation or existing `packages/i18n-catalog` adapter as canonical source; resolve translation coverage in CI. English/Arabic extensibility, not launch language selector by default. Use plural/select where needed, do not concatenate fragments that break grammar.
- Bundle fonts, icon assets, illustration/audio and Flutter Web CanvasKit locally. Build and inspect network requests in Iran-like blocked-CDN environment. No `google_fonts` runtime fetch, external map, CDN or analytics dependency for core tasks.
- Use `EdgeInsetsDirectional`, `AlignmentDirectional`, `BorderRadiusDirectional`, `TextAlign.start`, directional row/order and localization-provided directionality. Wrap Latin drug codes, dosage units, phone, OTP, timestamps, medical abbreviations in appropriate bidi isolation or local LTR run; preserve exact canonical values. No reversing strings or manually swapping whole layouts. Anatomical right/left (`OD`/`OS`) always `چشم راست`/`چشم چپ`. Physical response direction and chart coordinate system are separate from RTL.
- Display Jalali dates and Persian digits, localized weekday and 24-hour time where appropriate; store/API use canonical timestamp and timezone from contract; do not use local calendar arithmetic for clinical scheduling. Verify leap-year, midnight, device vs clinic timezone, month rollover and sorting. Distinguish actual appointment date from relative follow-up interval. Display date/time on each critical record where provided; “today” derived from authoritative clinic plan and time policy.
- Accept ASCII, Persian `۰۱۲۳۴۵۶۷۸۹` and Arabic-Indic digits, normalize phone/OTP/numeric input without altering semantic content. Keep input cursor and paste behavior tested. Use Persian decimal separator where approved; show units separately so `mmHg`, `logMAR`, dose, quantity remain unambiguous. Phone may be LTR ASCII canonical for dialing, accessible localized reading. No automatic unit conversion of clinical data.
- Use respectful simple Persian; avoid acronyms, transliterated developer text, infantilizing language or blame. Explain an action in one short sentence; use exact user-visible terminology for repeated tasks. Professional medical terms may be accompanied by a clinic-approved plain-language definition, not replaced with inaccurate simplification. Support screen reader reading of numeric units and eye words.

Suggested lexicon (all operational copy subject to review; clinical instructions from approved source):

| Meaning | Persian label |
|---|---|
| Today / Care / Tests / Results / Account | امروز / مراقبت / آزمون‌ها / نتایج / حساب من |
| Right eye / Left eye | چشم راست / چشم چپ |
| Record adherence | ثبت مصرف |
| Consumed / Not consumed / Unavailable / No response | مصرف شد / مصرف نشد / دارو در دسترس نبود / پاسخی دریافت نشد |
| Saved locally, not sent | روی دستگاه ثبت شد؛ در انتظار ارسال |
| Acknowledged by server | ارسال شد |
| Not reviewed | هنوز بررسی نشده است (only if actual review state is known) |
| Offline / Retry | اتصال اینترنت برقرار نیست / تلاش دوباره |
| Urgent help / Contact clinic | کمک فوری / تماس با کلینیک |
| No assigned tests | در حال حاضر آزمونی برای شما تعیین نشده است |
| Test quality not accepted | کیفیت آزمون تأیید نشد |
| Device unsupported | این دستگاه برای انجام این آزمون تأیید نشده است |
| Signed summary / Follow-up | خلاصه تأییدشده پزشک / پیگیری بعدی |
| System appearance / Light / Dark | مطابق تنظیم دستگاه / روشن / تیره |
| Caregiver context | در حال مراقبت از: … |
| Cancel / Continue / Back | انصراف / ادامه / بازگشت |

### 11.3 Notification and reminder UX

- Local notifications for clinician-issued dose schedule only, based on actual current prescription version and eye identity. Schedule/cancel per stable tenant/patient/episode/eye/version/dose key; OS changes only affect notifications, not prescription. Update OS plan must not cancel OD reminders. Account context changes, sign-out and revocation reconcile/cancel unauthorized reminders.
- Use generic PHI-free SMS (ADR domestic adapter) and generic lock-screen push/local copy by default e.g. `زمان بررسی برنامه مراقبت شماست`. If detailed local notification is ever approved, require privacy policy and opt-in and preserve eye clarity; no diagnosis/medicine info in external SMS or analytics. Tap opens current authorized dose context; never record consumption from a lock-screen tap.
- Ask permission after explaining reminder purpose, not on splash. If denied, care plan still works and settings shows state; do not imply alerts will arrive. Platform limits/background restrictions and permission changes require truthful state. No medical urgency represented by OS priority without approved policy. Avoid duplicate notifications and quiet-hours changes that override prescribed dose timing; use approved schedule policy.
- No generic inbox of fabricated notifications. A notification center [G] only if the actual contract provides durable records. No marketing nudges or adherence guilt; reminders are not evidence of taking a dose.

### 11.4 Offline-first and synchronization contract [R]

UI derives from local repository, durable encrypted outbox and server receipts; not a global bool `isOnline`. A connection can exist without API access. The following conceptual transport states must map to actual DTOs:

| State | Patient display | Safe behavior |
|---|---|---|
| Local draft | `پیش‌نویس` if drafts supported | No clinical receipt; discard only with explicit safe confirmation. |
| Durable local commit | `در انتظار ارسال` | Idempotency key assigned once, persists across restart, include version/eye/actor; no duplicate. |
| Sending | `در حال ارسال` | Keep local record visible, disable duplicate write. |
| Server acknowledgement | `ارسال شد` | Show authoritative timestamp if returned; not clinician-reviewed. |
| Retryable failure | `ارسال نشد؛ تلاش دوباره` | Preserve same record/key; bounded backoff via outbox; manual retry not duplicate. |
| Conflict or rejected | `نیاز به بررسی` + actionable reason | Don't mutate evidence or merge eye/version automatically; re-resolve authorized plan or contact. |
| Unauthorized/revoked | `دسترسی پایان یافته است` | Protect/purge cache as policy dictates; never send under different actor. |

Cache minimum authorized care plan, released education, hotline, approved signed summary (when allowed), freshness/version. Never cache unsigned report, specialist outputs or unrelated tenant data. Encrypt offline storage per ADR; platform secure key management, especially Web where browser storage does not guarantee equivalent security: obtain a reviewed policy for persistence and key lifecycle; verification environment uses synthetic fixtures, not actual patient data. No blanket `localStorage` PHI. Do not leak PHI in debug UI, network screenshots, console logs, crash reports or test artifacts. Cache key includes tenant/patient/actor and scope. On session expiry, sign-out, revoked grant or wrong-context change, protect cached content immediately and securely handle pending data per approved policy. Offline caregiver revocation cannot be known immediately without connectivity; conservative fail-closed default unless reviewed policy allows otherwise. Never promise instant remote cache deletion on disconnected device.

**Offline UX hierarchy:** inline connection banner (not blocking), explicit receipt states near each action, Sync page for details, last-updated indicator for cached instructions. Stale plan risk is clinical: do not show stale as current; permit local actions only under protocol/backend-approved policy. SOS uses cached hotline instantly; if no verified cache, approved fallback guidance. Do not display an empty red error screen that blocks help. No fake “sent” toast, simulated latency receipt or hidden auto-correction. Explain retry outcome and preserve user-entered data where secure. Print+Phone parity is operational/staff workflow: no requirement to install app to receive follow-up; no app-only KPI exclusion, no patient-side PDF generation of medical regimen unless authorized.

---

## 12. Flutter implementation guide and verification contract

### 12.1 Proposed structure (preserve ADR paths; adapt existing code)

```text
apps/patient-app/
  lib/
    app/                 # composition, router, theme/locale/session coordination
    core/                # typed API client, repository adapters, outbox orchestration
    features/
      auth_onboarding/   # presentation/, view_models/, data/ as needed
      care_plan/
      education/
      symptoms_sos/
      caregiver/
      vision_testing/
      diagnostic_results/
    shared/              # account and shell compositions, no duplicated design tokens
  packages/
    design_system/
      lib/src/tokens/    # color, typography, spacing, shape, motion, breakpoints
      lib/src/theme/     # audited light/dark/high-contrast ThemeData
      lib/src/widgets/   # components from §7
      test/              # widget/semantics/golden/contrast tests
    offline_store/       # encrypted durable storage, no UI
    device_sensors/      # native ports and Web test adapter, no UI
    clinical_renderer/   # isolated clinical geometry, no design_system import
  assets/design/         # canonical source and derived runtime assets per §4.4.1
  test/                  # feature widget, view model, routing, integration fixtures
```

Follow existing architectural choices and ADR's SOLID/OCP boundaries. Use unidirectional flow: UI/view → view model/controller commands → domain/repository → typed API/local storage; UI maps immutable state → render. No HTTP in widget builds, no clinical rules inside themes/components, no global mutable selectedEye affecting multiple patients, no silent event retries with new key. Keep visual state (tab, scroll, selection) separate from clinical evidence and transport state. Use typed state (sealed classes/enums as appropriate), stable keys by opaque IDs and patient/eye/version, cancellation/disposal, `mounted` checks after await, and narrowly scoped rebuilds. Prefer existing state-management/routing solution; if none exists propose one via ADR review (e.g. built-in ChangeNotifier or existing Riverpod pattern, declarative Router/go_router only after dependency verification). Don't introduce two state libraries or routing stacks. Contract generated DTOs and mock/live toggle from OpenAPI. Never modify generated source by hand. Maintain platform sensor abstractions and permission adapters.

### 12.2 Theme implementation guidance (illustrative, not a compiled drop-in)

The token table in §4 is authoritative; implement all roles in a single audited builder. Prefer typed immutable `BinaPalette`, `BinaSemanticColors extends ThemeExtension`, `BinaSpacing`, `BinaMotion`, and component theme configuration. `ThemeData` provides `ColorScheme`, `TextTheme`, `FilledButtonTheme`, `OutlinedButtonTheme`, `TextButtonTheme`, `InputDecorationTheme`, `NavigationBarTheme`, `NavigationRailTheme`, `CardTheme`, `DialogTheme`, `SnackBarTheme`, `ProgressIndicatorTheme`, `TooltipTheme`, etc. Exact data-class signatures differ by package release; check the pinned API instead of guessing old class names. Use `WidgetStateProperty` for interactive styles, `MaterialTapTargetSize.padded`, standard visual density; explicit wrappers enforce 48dp even if component default is smaller. Set component background/tint explicitly where M3 defaults change audited pairs. Use `ThemeData.extensions` for semantic roles; `copyWith` and `lerp` must support both themes and reduced motion policy. Do not independently generate a dark palette from light or invert every color.

```dart
// Illustrative only: use the installed, compatible Material import.
import 'package:flutter/material.dart'; // or installed standalone equivalent

ThemeData buildBinaTheme(Brightness brightness) {
  final p = BinaPalette.forBrightness(brightness); // values from §4, local class
  final scheme = p.toColorScheme();                // all explicit role pairs
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: p.canvas,
    fontFamily: 'Vazirmatn',
    visualDensity: VisualDensity.standard,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    textTheme: buildBinaTextTheme(p),              // exact table in §5
    extensions: [p.toSemanticColors()],
    filledButtonTheme: buildFilledButtonTheme(p),
    // Implement the remaining shared component themes in design_system.
  );
}
```

This snippet intentionally references local classes to be implemented; it is not a ready-to-paste complete theme. Build `MaterialApp.router` from the selected Material package with the correct generated localization delegates and `theme`/`darkTheme`/`themeMode`. Follow migration docs for locale delegate compatibility. System text scaling uses `MediaQuery.textScalerOf(context)`; do not override root `MediaQuery` to lock text size. Respect system reduced motion with `MediaQuery.disableAnimationsOf(context)` and accessibility flags plus preference. Use platform back support and `PopScope` as appropriate; preserve safe unsaved-state prompts and predictive back compatibility. For Flutter Web, verify actual semantics tree and browser keyboard navigation; use official semantics enabling guidance where necessary. Do not equate a clean axe report with accessible canvas.

### 12.3 Performance and engineering constraints

- ADR dev environment approximately 3 GiB available RAM, 12 GiB disk, no GPU. Run repository resource preflight before builds/tests; follow AGENTS.md exact thresholds. No destructive global Docker prunes or large assets; no unnecessary GPU dependencies; one test worker. Do not run parallel heavy builds. Check actual resource availability rather than assuming old figures.
- Use `const` widgets, small components, `ListView.builder`/slivers for long history, `RepaintBoundary` for isolated expensive canvas when measured useful. Avoid repeated image decode, large unbounded images, clip/saveLayer/opacity stacks, excessive shadow, layout-intrinsic passes, nested scroll and rebuild whole app on sensor updates. Cancel animations/subscriptions when offscreen; bound sampling for UI feedback separately from clinical sampling (do not drop clinical evidence).
- Prefer local compact vector/bitmap assets at appropriate density; test Persian font size and font fallback, do not subset away Arabic shaping glyphs. No unnecessary illustration animation package. Cache safe static education assets; not entire clinical dataset. Self-host Web assets including CanvasKit. No external network request needed for fonts/engine/icons in Web smoke/E2E. Build with normal repository Flutter Web renderer; don't switch to Wasm/renderer solely for aesthetics without supported browsers and contract verification.
- Proposed performance goals: 60Hz baseline frame budget ~16.7ms on representative low-end supported hardware for normal scrolling and task feedback, ~8.3ms on 120Hz where feasible; profile mode DevTools, record p95 frame times and jank. Keep initial bundle/assets measured against baseline; no invented size SLA for patient app (ADR staff-web limits are not patient-app limits). Warm cached Today should show known content promptly; measure time-to-first-action, not just splash. No clinical trial timing derived from UI animation frame duration.
- Release builds/test artifacts must not expose synthetic test switches to real patients; clearly distinguish mock mode in dev environments only. No real PHI in demo screenshots, bug reports or goldens.

### 12.4 Testing matrix and implementation quality gates

**Every component:** both themes; default, focused, pressed, disabled, loading, error, pending and selected where applicable; 1.0/1.3/1.5/2.0 text scale and actual nonlinear device scaling; RTL; keyboard; semantics labels; target size; contrast composite; no overflow. Golden tests at deterministic font/DPR, include long Persian strings and mixed digits/Latin. Goldens supplement functional tests, not replace them.

| Layer | Required coverage / evidence |
|---|---|
| Token unit | WCAG luminance formula for all permitted pairs; actual alpha compositing and status palettes; text style mapping; motion reductions. |
| Widget accessibility | Flutter Accessibility Guideline API: Android/iOS tap targets, labeled targets, text contrast; semantics roles/value; focus traversal, no duplicate announcements. Exact API names from pinned SDK. |
| Layout | 320/360/390/430/600/768/840/1024/1280 logical widths, portrait/landscape, split-screen, 200% text, keyboard, safe areas; no clipping or unreachable action. |
| Locale | All fa-IR strings, bidi drug and phone, Persian digits, Jalali date/time boundary, physical directions unaffected by RTL. |
| Theme | System changes while open, light/dark/high contrast, focus, pressed states, system bar icons, clinical canvas unchanged. |
| Offline | Airplane mode, network flaps, app restart, expired auth, duplicate retry, stale Rx conflict, tenant/actor isolation, encrypted store failure, cached SOS. |
| Caregiver | Scoped grant/accept, switch, revoked 403 and cache clear, offline restriction, no prior patient's content on back/deep link. |
| Clinical renderer | Golden pixel geometry across OS scaling, theme, DPR, RTL; calibrated physical validation on qualified devices; simulated observer; no frame upload; fail quality/kill-switch/interrupt paths. |
| Signed reports | Unauthorized/unsigned absence at API and UI, cache invalidation, signed urgent action, generic notification. |
| Web | Playwright single worker against containerized backend/staff-web/AI and Flutter Web; real semantic tree, keyboard, axe-core and manual audit; no external CDN. |
| Native | Real Android low-end device, iOS device, TalkBack/VoiceOver, font/display scaling, reduced motion, permission denial, dialer, local reminder, backgrounding and sensor behavior. Web E2E does not validate native hardware. |
| Security/privacy | No PHI leakage in logs/screenshots/URLs/SMS, no wrong tenant/eye data; server authorization not UI-only; secure offline lifecycle review. |

Example verification order (use repo scripts and actual available toolchain, not blindly copy; `flutter analyze` and tests must run after final edit):

```bash
# At repository root, inspect AGENTS.md and resource constraints first.
./infra/scripts/check-resources.sh
cd apps/patient-app
flutter --version
flutter pub get
flutter analyze
flutter test --concurrency=1
flutter build web
# From root, use actual documented Playwright scripts with --workers=1.
# Run relevant contract/security/business-process checks at each SYNC gate.
```

No command above was executed against the actual Bina repository in preparing this design document. Pin dependency versions, record SDK/package version, and commit lockfiles per repository convention. Run architecture/RLS checks where applicable and container verification per ADR. Do not skip assertions or claim unrun checks. Track B uses fixtures and mock API in early stages, real contract integration at sync checkpoints.

### 12.5 Human usability and clinical review (proposed release protocol)

Recruit Persian-speaking users across older adults, low vision types/severity, varying digital literacy, caregiver roles and supported device tiers. Obtain appropriate consent and use synthetic tasks where possible. Conduct iterative formative rounds (proposed 5–8 participants per round across roles, not a statistically powered clinical study; expand for coverage). Observe unassisted core task completion, time, wrong-eye near misses, mistaken sync status, help discoverability, errors, recovery, perceived effort and screen-reader use. Include both themes and high font scaling; compare approved Bina Clinical Glass against its high-contrast fallback if useful. Do not assume one tester represents all vision impairments. Clinical team reviews medical wording, test eligibility, instructions, threshold/quality semantics, reports and emergency workflow. Formal clearance is deferred in PRD, but patient safety review is not.

Proposed UX release targets (not PRD clinical KPI replacements): zero observed critical wrong-eye/false receipt/missed SOS/unsigned disclosure incidents in formative validation; all identified critical usability hazards corrected and re-tested; >=90% unassisted success for routine core tasks in representative formative evaluation (report denominator and uncertainty); SOS discoverable from Today in one obvious activation; no critical accessibility defects. These are design gates, not proof of clinical effectiveness. Original PRD pilot goals remain: 48h activation >=70%, follow-up completion >=75%, in-SLA actionable triage >=95%, >=20% reduction in repeat calls or staff time within defined constraints, zero system-attributed critical incidents, >=1 paid continuation out of 2 centers. Include Print+Phone in denominators per PRD. No inventing measured outcomes.

### 12.6 Delivery order / Codex and Antigravity task decomposition

| Milestone | Deliverables | Exit evidence |
|---|---|---|
| W0 — contracts/scaffold | Audit repository, pin compatible stable SDK/design library, local fonts/assets, i18n, mock fixtures, design system foundations | Compile, localization coverage, no CDN, resource checks; SYNC-0 |
| W1a — shared UI and auth | §4–8 tokens/components, shell, AUTH routes, a11y setup, offline store interfaces | Both theme goldens, focus/touch/locale tests, auth mock/live contracts |
| W1b — care and education | CARE and EDU flows, eye isolation, reminders, receipts | dual-eye and offline retry tests, approved content |
| W1c — SOS and caregiver | SOS and CG, Account minimum, offline hotline, revocation | urgent/offline E2E, 403/cache tests; SYNC-1 |
| W2 — pilot quality | All enabled R1 UI; accessibility audit, real-device checks, Playwright, formative usability | SYNC-2, no critical defects, report blockers |
| W3 — signed results | RES screens, signed-only data, patient-safe offline summary | unsigned-negative E2E, urgent signed path; SYNC-3 |
| W4 — R2 vision | Qualified renderer, preflight, Landolt C/Amsler, receipt, quality handling | calibrated device validation and regression; SYNC-4 |
| Gated expansions | HOME2, optional patient history/charts, research consent, optional patient PDF only if approved | separate contract, clinical, accessibility and privacy sign-off |

For every PR, include route IDs, PRD/ADR requirements, screenshots both themes and representative scale, state coverage, tests and exact results, manual device checks done/not done, known issues, any proposed contract changes. Keep code changes scoped; never add a feature simply to make screenshot look full. All placeholders removed before release. Verify Figma/design artifact if later supplied against this baseline, not vice versa.

## 13. Open decisions, exclusions and source register

### 13.1 Decisions needing product/clinical/engineering confirmation

| Decision | Default / blocker |
|---|---|
| Actual SDK and existing design-package migration | Use actual pinned SDK and Material library; prior v1.0 recommendation is not a new dependency pin. No unapproved broad migration. |
| Palette, typography, navigation, route names, motion | This document proposes exact defaults; validate with Iranian patients. Not existing ADR decisions. |
| Care plan response options and missed-dose instructions | Server schema and clinician-approved content authoritative; no-response likely derived; confirm before implementation. |
| Emergency contact/hours and offline fallback | Clinic partners must supply approved current details; blocker for active care if absent. |
| Caregiver offline grant freshness, secure cache and revocation | Fail closed by default when unable to verify delegated access; reconcile with ADR offline requirements and clinical workflow. |
| Stale prescription action and conflict resolution | Need authoritative policy; display stale and don't invent behavior. |
| Native clinical test parameters, calibration and eligibility | Clinical/ML owner must provide versioned validated protocols, sensor thresholds and device list. No hardcoded thresholds from research datasets. |
| Home IOP patient-facing integration | Partner API/transport, source, eye, consent, clinical feedback rules; gated. Home VF not current scope. |
| Patient history, numerical measurements and charts | Optional UI extension; clinical and API approval required; Staff Web explicitly owns advanced trend views. |
| Patient-safe PDF/share, profile edit, inbox, account deletion | Not defined as patient features by PRD/ADR; do not add unsupported actions. |
| PRD vs ADR wave discrepancy | Use detailed ADR W4 for home vision implementation pending owner confirmation. |
| Privacy policy for local notification and Web persistence | Security/clinical approval required; generic notifications and synthetic Web verification until approved. |
| Font/audio asset licensing and Persian medical pronunciation | Bundle verified licensed assets, approve clinical audio. |

### 13.2 Project sources (provided by user)

- **V0:** `Bina-AI-UI-Designs.zip`, nine approved PNG renders (see §9.0A). All nine inspected as the visual basis of v2.0; PNGs are flat concept images, not production artwork or native screen screenshots. Dark is newly specified, not an observed source.
- **A01–A04:** `Bina-AI-Visual-Assets.zip`, four user-selected standalone Light raster artworks; exact archive entry hashes in Appendix C. They are newly supplied visual sources, not editable original layers or Dark assets.
- **V2:** `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2.md` — complete v2.0 baseline, retained here with asset-related revisions only.
- **V1:** `BINA_AI_PATIENT_APP_UI_UX_SPEC(2).md` — previous detailed v1.0 specification; nonvisual flow inventory, product constraints, prior research reference register, and QA guidance reused and adapted. The old palette, shapes, flat-card visual rules, and version recommendations do not override v2.1.


- **P1:** `PRD (2).md` — Bina AI PRD v3.0, 23 Nov 2026. §1 (pillars/safety), §2 (Iran), §3 (surfaces/personas), §4 (HITL), §5 (care and home vision), §6 (datasets), §7 (NFR), §8 (KPIs), §9 (hazards). Repository canonical name `docs/PRD.md`.
- **P2:** `ADR (2).md` — ADR-001 through ADR-053, 23 Nov 2026. §1 (monorepo/feature folders), §2 (SOLID), §3 (decisions), §4 (data model), §5 (Track B tasks/waves), §6 (DoD). Repository canonical name `docs/ADR.md`.
- `AGENTS.md`, actual OpenAPI/event schemas, clinical fixtures and actual repository code were referenced by those documents but were not provided for inspection here; agents must read them before implementing. This file does not override them.

### 13.3 External research references (inherited v1.0 register; not re-verified for v2.1)

Primary/official documentation unless stated otherwise, as listed in the prior specification. Links are included for agent re-verification; do not assume future package versions are unchanged or historical research claims freshly confirmed. The document uses evidence-informed synthesis and Bina-specific design choices rather than reproducing source text.

**Flutter / Dart**

- [F1] Flutter SDK archive: https://docs.flutter.dev/install/archive
- [F2] Flutter 3.50 release announcement and official docs: https://flutter.dev/blog/whats-new-in-flutter-3-50 ; https://docs.flutter.dev/release/whats-new
- [F3] Flutter official changelog (3.50.1 entry): https://github.com/flutter/flutter/blob/master/CHANGELOG.md ; Dart 3.14: https://dart.dev/resources/whats-new
- [F4] Third-party patch release index for date/Dart corroboration (not authority over official archive): https://flutterreleases.com/release/3.50.1/
- [F5] Standalone Material/Cupertino migration: https://docs.flutter.dev/release/breaking-changes/material-ui-and-cupertino-ui
- [F6] Official Material package version/API: https://pub.dev/packages/material_ui ; https://pub.dev/documentation/material_ui/latest/
- [F7] Flutter UI and Material widgets: https://docs.flutter.dev/ui ; https://docs.flutter.dev/ui/widgets/material
- [F8] Adaptive and responsive design: https://docs.flutter.dev/ui/adaptive-responsive ; https://docs.flutter.dev/ui/adaptive-responsive/best-practices
- [F9] Accessibility overview and styling: https://docs.flutter.dev/ui/accessibility ; https://docs.flutter.dev/ui/accessibility/ui-design-and-styling
- [F10] Accessibility testing: https://docs.flutter.dev/ui/accessibility/accessibility-testing
- [F11] Assistive technologies and Web accessibility: https://docs.flutter.dev/ui/accessibility/assistive-technologies ; https://docs.flutter.dev/ui/accessibility/web-accessibility
- [F12] Internationalization: https://docs.flutter.dev/ui/internationalization
- [F13] TextScaler migration: https://docs.flutter.dev/release/breaking-changes/deprecate-textscalefactor ; https://docs.flutter.dev/release/breaking-changes/android-14-nonlinear-text-scaling-migration
- [F14] Offline-first architecture: https://docs.flutter.dev/app-architecture/design-patterns/offline-first
- [F15] App architecture guide and recommendations: https://docs.flutter.dev/app-architecture/guide ; https://docs.flutter.dev/app-architecture/recommendations
- [F16] Flutter animations: https://docs.flutter.dev/ui/animations
- [F17] Performance: https://docs.flutter.dev/perf/best-practices ; https://docs.flutter.dev/tools/devtools/performance

**Design systems and standards**

- [M1] Google Material 3 design system: https://m3.material.io/ ; official accessible theming codelab: https://developer.android.com/codelabs/m3-design-theming
- [W1] W3C WCAG 2.2 Recommendation: https://www.w3.org/TR/WCAG22/
- [W2] W3C Understanding WCAG 2.2 and new criteria: https://www.w3.org/WAI/WCAG22/Understanding/ ; https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- [A1] Android mobile accessibility: https://developer.android.com/design/ui/mobile/guides/foundations/accessibility
- [A2] Apple Human Interface Guidelines accessibility and typography: https://developer.apple.com/design/human-interface-guidelines/accessibility ; https://developer.apple.com/design/human-interface-guidelines/typography
- [A3] Apple HIG Dark Mode: https://developer.apple.com/design/human-interface-guidelines/dark-mode
- [H1] NHS App Design System colour: https://design-system.nhsapp.service.nhs.uk/styles/colour/
- [H2] NHS accessibility and colour: https://service-manual.nhs.uk/accessibility/design ; https://service-manual.nhs.uk/design-system/styles/colour
- [H3] CMS healthcare design system theme colors: https://design.cms.gov/foundation/theme-colors/?theme=healthcare

**Research literature**

- [R1] Gómez-Hernández et al. *Design Guidelines of Mobile Apps for Older Adults: Systematic Review and Thematic Analysis*. JMIR mHealth and uHealth 2023;11:e43186. https://doi.org/10.2196/43186 ; https://mhealth.jmir.org/2023/1/e43186
- [R2] *Mobile health applications for older adults: a systematic review of interface and persuasive feature design*. JAMIA 2021;28(11):2483–2501. https://doi.org/10.1093/jamia/ocab151
- [R3] *Optimizing mobile app design for older adults: systematic review of age-friendly design*. 2025. https://pubmed.ncbi.nlm.nih.gov/40804492/
- [R4] *Mobile Health Apps for Individuals Who Are Blind or Have Low Vision: Systematic Review of Evidence, Accessibility, and App Quality*. 2026. https://pubmed.ncbi.nlm.nih.gov/43019534/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC13759188/

### 13.4 Final acceptance checklist (agent must attach evidence)

- [ ] Original PRD/ADR scope and actual contracts respected; all deviations explicitly listed.
- [ ] All enabled routes and their loading/empty/error/offline/permission/revoked states implemented.
- [ ] Consistent light/dark/system themes, semantic audited tokens, local fonts, no random hardcoded styles.
- [ ] All nine reference-preview screens match original composition; side-by-side Light review, corresponding Dark review, source-art approval and intentional differences logged.
- [ ] Synthetic preview cannot access live write APIs, export patient reports, or appear in production builds.
- [ ] Decorative assets separated from real interactive UI; no screenshot embedding, no hardcoded status bar, no fake charts.
- [ ] A01–A04 originals match Appendix C hashes; runtime derivatives traceable to originals; all paths resolve offline, no invented assets.
- [ ] A04 compact header behind titles, A03 broad footer only in intended regions; no stretching, opaque rectangle, visible seam, mirrored logo or text overlap.
- [ ] A02 crop/alpha and Dark wordmark approved; A01 Dark iris and both wave derivatives reviewed on actual surfaces; high-contrast and missing-asset fallback tested.
- [ ] Asset-specific goldens for V01–V09, both brightness modes, 360/412dp and 200% scale; test no decorative semantics, no blocked taps, no assets in active test/SOS, no runtime network fetch, and measured bundle/decode size.
- [ ] Gradient/button text tested at all stops; actual composited surfaces and contrast verified; high-contrast solid fallback works.
- [ ] RTL, Jalali, Persian copy/digits and mixed-script values verified; no wrong-eye ambiguity.
- [ ] 48dp minimum touch, OS text scaling, screen readers, focus, keyboard and contrast tested.
- [ ] Emergency access immediately available offline under approved policy; no misleading monitoring claim.
- [ ] Durable encrypted outbox, exact idempotency and receipt status; no false acknowledgement.
- [ ] Caregiver scope enforced, revoked data protected; no cross-context cache or notifications.
- [ ] No unsigned diagnostic data or raw scores in patient UI or cache.
- [ ] Clinical renderer independent of theme/font scale/RTL; eligibility and quality gates cannot be bypassed.
- [ ] Native testing and patient usability review done or explicitly recorded as outstanding.
- [ ] Resource guard, static analysis, tests, Web build, single-worker E2E and relevant security/process checks run after final edit; actual evidence attached, no skipped assertions.

## 14. Implementation execution plan for coding agents

1. Audit and report current repository paths, package versions, AGENTS.md constraints, existing screen routes and actual contracts. List what may be retained, refactored or gated; identify asset/clinical dependencies. Do not assume missing API functionality exists.
2. Unpack the reference ZIP into a design reference folder; use exact source PNG order, not the earlier collage. Unpack `Bina-AI-Visual-Assets.zip` into the documented source directory; verify Appendix C, generate and review Light/Dark runtime derivatives, register them in pubspec and test loading before screen work. Create a local visual test harness with a 412×824 logical viewport, fa-IR, synthetic records, fixed reference time and deterministic image assets. Crop PNGs to the inner screen for comparison. No reference screenshots as application widgets.
3. Build tokens/ThemeExtension, font registration, Canvas/ribbon art, BinaSurface, buttons, row/icon wells, navigation, segments, status and metrics. Unit-test colors, text scale, semantics, theme persistence. Create a component gallery in development builds only, light/dark/system/high contrast and all states.
4. Implement V01–V09 in preview first, in reference order. Reuse actual layouts and domain components. For each, compare source side-by-side, save light/dark goldens, check RTL and 48dp targets, review content hierarchy and actual contrast. Then wire production state through approved feature contracts. If a capability is not approved, retain only isolated visual preview; do not ship dead or unsafe controls.
5. Apply the same wrappers to remaining auth, care, education, SOS, caregiver, qualified test, signed summary, account and system screens in §9.1–9.8; no separate visual style. Do not change clinical renderer geometry or API models for aesthetics. Audit offline/outbox, eye scope, permissions and sign-off regressions.
6. Test all enabled routes and all state variants, profile normal scrolling, verify at 320/360/390/412 widths, tablet and 200% font, native screen readers, keyboard and both themes. Run existing repository resource guard and tests after last edit. Record exact commands/results, failed cases, and what requires physical-device/clinical review.
7. Deliver a PR with list of changed files, design token mapping, reference image matrix, screenshots/goldens both themes, behavior/state coverage, accessibility results, known deviations, feature gates, missing production artwork and clinical blockers. No claim of pixel-perfect fidelity, full clinical validation or completed tests without evidence.

### 14.1 Required visual regression matrix

For each V01–V09: default Light and Dark 412×824, narrow 360×800, large text 200%, no network/cached where meaningful, empty/partial, failure, disabled/permission, and urgent or wrong-eye states where applicable. Keep the approved-reference synthetic baseline separate from safety-modified production fixtures. Add focused component goldens for all semantic pairs, icon wells, gradients, selected states, disabled/busy, focus ring, chart legend, chart null values and high-contrast. Visual comparison is not a substitute for widget/semantics tests. Snapshot tolerances must be chosen after renderer/font baselines; never mask all visual differences or use generated illustration similarity as proof of working UI.

### 14.2 Explicit visual differences requiring approval/verification

- The reference images place a left-facing back arrow on several RTL screens. Use platform-correct RTL navigation and omit back on root tabs. This is an intentional usability correction; log in comparison.
- The reference uses bright green status text and white labels on bright gradients. The accessible token variant darkens text-bearing regions while retaining vivid decoration. Actual composite contrast may require further adjustment.
- Preview shows stable IOP/VF and sample medication, dates, charts, and PDF/export; none establish clinical requirements. Eye context, signed/approved report content, SOS, offline freshness and gated feature changes override pixel similarity in production.
- Four standalone Light RGB raster sources are now available; no original transparent layers, official logo vector, exact font metrics or Dark artwork are supplied. Generate theme derivatives from these exact files using §4.4, obtain final visual/brand approval, and do not claim original vector fidelity or completed Dark assets.
- The repository and running Flutter application were not inspected or built in this revision. Code examples are illustrative; no implementation/test claims are made. Existing repo contract and SDK may require adaptations.



## Appendix A. Opaque token contrast checks (computed sRGB)

Computed using WCAG relative luminance for the exact role pairs in §4.3, not a visual/runtime accessibility audit. Ratios are rounded for display; acceptance uses unrounded values. Actual gradients, overlays, focus backgrounds, artwork and antialiasing must be checked in Flutter.

| Foreground / background | Light | Dark | Minimum |
|---|---:|---:|---:|
| `onSurface` / `canvas` | 15.27:1 | 16.41:1 | 4.5:1 |
| `onSurface` / `canvasTop` | 15.90:1 | 14.45:1 | 4.5:1 |
| `onSurface` / `canvasBottom` | 14.66:1 | 15.30:1 | 4.5:1 |
| `onSurface` / `surface` | 15.93:1 | 13.59:1 | 4.5:1 |
| `onSurface` / `surfaceRaised` | 16.57:1 | 11.75:1 | 4.5:1 |
| `onSurface` / `surfaceSoft` | 15.01:1 | 12.26:1 | 4.5:1 |
| `onSurface` / `surfaceMint` | 15.02:1 | 10.79:1 | 4.5:1 |
| `onSurface` / `surfaceAqua` | 14.79:1 | 12.23:1 | 4.5:1 |
| `onSurface` / `surfaceCream` | 15.46:1 | 10.94:1 | 4.5:1 |
| `onSurfaceVariant` / `canvas` | 7.15:1 | 10.92:1 | 4.5:1 |
| `onSurfaceVariant` / `surface` | 7.46:1 | 9.04:1 | 4.5:1 |
| `onSurfaceVariant` / `surfaceSoft` | 7.03:1 | 8.16:1 | 4.5:1 |
| `onSurfaceVariant` / `surfaceMint` | 7.03:1 | 7.18:1 | 4.5:1 |
| `onSurfaceVariant` / `surfaceAqua` | 6.93:1 | 8.14:1 | 4.5:1 |
| `onSurfaceVariant` / `surfaceCream` | 7.24:1 | 7.28:1 | 4.5:1 |
| `muted` / `surface` | 5.77:1 | 7.77:1 | 4.5:1 |
| `primary` / `surface` | 6.05:1 | 9.29:1 | 4.5:1 |
| `onPrimary` / `primary` | 6.29:1 | 9.99:1 | 4.5:1 |
| `onPrimaryContainer` / `primaryContainer` | 6.64:1 | 7.48:1 | 4.5:1 |
| `onPrimaryGradient` / `primaryGradStart` | 5.00:1 | 5.00:1 | 4.5:1 |
| `onPrimaryGradient` / `primaryGradEnd` | 7.87:1 | 8.67:1 | 4.5:1 |
| `onSecondary` / `secondary` | 4.88:1 | 8.66:1 | 4.5:1 |
| `onTertiary` / `tertiary` | 6.53:1 | 8.41:1 | 4.5:1 |
| `onTertiaryContainer` / `tertiaryContainer` | 7.31:1 | 8.75:1 | 4.5:1 |
| `success` / `successBg` | 5.43:1 | 7.97:1 | 4.5:1 |
| `success` / `surface` | 6.02:1 | 9.89:1 | 4.5:1 |
| `warning` / `warningBg` | 6.05:1 | 8.42:1 | 4.5:1 |
| `error` / `errorBg` | 5.83:1 | 7.74:1 | 4.5:1 |
| `onUrgentAction` / `urgentAction` | 6.84:1 | 6.58:1 | 4.5:1 |
| `info` / `infoBg` | 6.22:1 | 8.18:1 | 4.5:1 |
| `neutral` / `neutralBg` | 6.83:1 | 7.49:1 | 4.5:1 |
| `disabledFg` / `disabledBg` | 4.86:1 | 5.69:1 | 4.5:1 |
| `medicationInk` / `medicationWell` | 5.48:1 | 8.42:1 | 3:1 |
| `planInk` / `planWell` | 6.18:1 | 6.98:1 | 3:1 |
| `testInk` / `testWell` | 5.50:1 | 7.06:1 | 3:1 |
| `profileInk` / `profileWell` | 5.60:1 | 8.23:1 | 3:1 |
| `chart1` / `surface` | 5.19:1 | 9.89:1 | 3:1 |
| `chart1` / `chartBand` | 4.69:1 | 6.91:1 | 3:1 |
| `chart2` / `surface` | 5.75:1 | 9.11:1 | 3:1 |
| `chartAxis` / `surface` | 7.46:1 | 9.04:1 | 4.5:1 |
| `chartBandEdge` / `chartBand` | 4.41:1 | 5.98:1 | 3:1 |
| `focus` / `surface` | 6.05:1 | 9.96:1 | 3:1 |
| `outline` / `surface` | 4.85:1 | 5.26:1 | 3:1 |

All listed opaque pairs meet their stated minimum. Check additional pairs and white check glyph on successIcon, and test the actual rendered states before release.

## Appendix B. Reference image integrity

All reference PNGs are 1122 × 1402 pixels. SHA-256 below identifies the exact approved render bytes in the supplied ZIP. Do not substitute the earlier composite UI kit.

| Filename | SHA-256 |
|---|---|
| `01-Today.png` | `ab34207b336c98de5a1a60941cfd2d619ed1dc4717eb2bc3f140706314e8a030` |
| `02-Care.png` | `5478f10af7773b24c77e52d08f661d716ae566ae391e5dd7749bd031f9660a55` |
| `03-Tests.png` | `d3f39ef3d46d19cb147e72d9382c3fe7b34a760696f4704eb8bad96a6fce82fb` |
| `04-Results.png` | `d70eae5195cc0f17f737190cc0057388f9155e31962cd390c73e4ed3336ec38b` |
| `05-Combined-Report.png` | `e2afdd695ff7bb66d6b1d80f9541cfc30e5b58879da1cd0febd7e395a62c805c` |
| `06-Medication-Detail.png` | `c1a448bc6b657f0b1d37bff9355c3bb185a9d5271f2965174fdebd212c59a20a` |
| `07-VF-Detail.png` | `79f9d3948a63a861a24a00201d1db69981e5fa717968113c886e0c8eabc51150` |
| `08-IOP-Detail.png` | `197ad5dde67ae80109c7521736e9527e7b1935f0b91ac6d91a8cef0b9bbf5139` |
| `09-My-Account.png` | `615fef4b58968d0b58342bcd9ea21d545fd79872b9df7889030d643195fbd89f` |

## Appendix C. Standalone visual asset integrity and revision history

Archive: `Bina-AI-Visual-Assets.zip`. These are the exact four original PNG files; no runtime conversions, alpha edits, or image recompression were applied when creating the ZIP. Verify SHA-256 on the extracted bytes. RGB = opaque; none has an alpha channel.

| ID | Filename | Pixels | Bytes | SHA-256 |
|---|---|---|---:|---|
| A01 | `teal_emerald_eye_in_flowing_waves.png` | 1254 × 1254 | 1780174 | `902edcacf7425d7dfa6aab7ec80081eb06104ed8cf0d9cd0e80ae23fa4a2cf68` |
| A02 | `bina_ai_glossy_eye_logo.png` | 1536 × 1024 | 1402210 | `c17627e60a7f7b3bd93ddf2eb7fa2b395eb90e80de05fda5387f16bbc3472b46` |
| A03 | `serene_mint_wave_layers.png` | 2172 × 724 | 1472248 | `4ec964f584916500396a951eec21714dc78e74edd2ab557e728b175bad03ae1c` |
| A04 | `minimal_mint_teal_wave_banner.png` | 2172 × 724 | 1105958 | `66cdc02aa5cf2734706df3b2e59f142c42948dd6cf13f4a6230a7316614c7e83` |

### v2.1 change log

- Kept complete v2.0 design system, palette, screen inventory, components, motion, accessibility, clinical gates and implementation plan.
- Replaced missing-art/redraw guidance with four canonical raster sources and explicit production derivative contracts.
- Distinguished compact header wave (A04) from broad footer wave (A03); mapped all nine screens and added exact logo and iris treatment.
- Added theme-specific crop/matte/fade, responsive behavior, Flutter asset loading, local bundle and verification requirements.
- Dark derivatives, official vector/transparent logo, additional icons and dropper illustration are not delivered in this archive. Repository implementation and visual/clinical acceptance are still to be performed by the coding agents.

**End of specification.**
