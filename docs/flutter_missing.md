# Flutter Patient App (`apps/patient-app`) — Missing Features, UX Polish & Further Development Backlog

> **Purpose:** Authoritative engineering checklist of everything currently **hidden by build flags**, **not yet implemented**, **stubbed/in-memory**, or **missing polish (Onboarding & Smooth Animations)** in `apps/patient-app/`, measured against `docs/BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md`, `docs/PRD.md`, `docs/ADR.md`, and `AGENTS.md`.
>
> **Last Audited:** 2026-11-25 (at commit `58272ba`)

---

## 1. Implemented in Code, But Hidden on Current Web Deployment (`bina-flutter.mehtea.ir`)

These features already exist and pass widget tests, but were **not visible** on `bina-flutter.mehtea.ir` because `flutter build web --release --no-wasm-dry-run` used the conservative R1 defaults in `apps/patient-app/lib/core/config/app_config.dart`:

| Feature / Tab | Code Location | Why Hidden Right Now | How to Enable / Fix |
|---|---|---|---|
| **Results Tab (`نتایج` — `T-B19`, `RES-01..05`)** | `lib/features/diagnostic_results/diagnostic_results_screens.dart` | `ENABLE_WAVE3_RESULTS` defaults to `false` | Build with `--dart-define=ENABLE_WAVE3_RESULTS=true` (or change default for staging/demo profile) |
| **Tests Tab (`آزمون‌ها` — `T-B21/T-B22`, `TEST-01..15`)** | `lib/features/vision_testing/vision_testing_screens.dart` | `ENABLE_WAVE4_TESTS` defaults to `false` | Build with `--dart-define=ENABLE_WAVE4_TESTS=true` |
| **Visual Reference Gallery (`/__preview`, `V01–V09`)** | `lib/features/preview_harness/preview_harness_screen.dart` | Gated by `!kReleaseMode && previewFlag` | Add explicit staging/demo flag (e.g. `ALLOW_DEMO_PREVIEW=true`) kept **off** in true clinical production builds |
| **Runnable Landolt C & Amsler on Web Demo** | `packages/device_sensors/lib/src/sensor_ports.dart` | `WebVerificationSensorAdapter(allowLabVerification: false)` intentionally blocks Web clinical start (`TEST-02`) | Add `--dart-define=ENABLE_WEB_LAB_MODE=true` (clearly badged as **non-clinical demo/lab mode**) so reviewers can walk through the full Landolt C & Amsler test flows on Web |
| **Live Mock Session Skips Welcome/Auth** | `lib/app/providers.dart` (`SessionNotifier.build`) | In `mock` mode, `SessionNotifier` auto-populates a mock patient session so `/bootstrap` jumps straight to `/today` | Separate `startAuthenticated` / onboarding-first behavior so first-time visitors see Onboarding + Auth unless explicitly skipped |

**Action item for deployment scripts (`infra/scripts/deploy-patient-web.sh`):**
- Support clean build profiles (`--profile=demo` enabling all 5 tabs + onboarding + lab demo badge vs. `--profile=prod-r1` / `--profile=prod-full` wired to live `/v1/` API).

---

## 2. NEW Requirement: First-Run Interactive Onboarding Flow

**Current state:** Missing. The app jumps from a static `BootstrapScreen` straight to `/today` (in mock mode) or a single-card `/auth/welcome` screen (in live mode).

### Required Implementation (`lib/features/onboarding/` or `auth_onboarding/`)
- **Route:** `/onboarding` (shown once on first launch before `/auth/welcome`, and always re-openable from `حساب من -> راهنمای برنامه`).
- **Persistence:** Store `onboarding_completed_v1` in durable local storage (`OfflineStorePort`) so returning users go straight to `/auth/welcome` or `/today`.
- **Slide Structure (3–4 concise, calm, Persian `fa-IR` RTL slides using `BinaBrand.appNameFa` — never hardcoded `بینا`):**
  1. **Welcome & Brand Reveal:** Animated A02 glossy eye mark + A01 iris reveal introducing `{appName}` as a clinic-guided eye care companion.
  2. **Eye-Isolated Medication & Drop Plan (`چشم راست` / `چشم چپ`):** Explains separate right/left eye schedules, bottle-cap cues, and offline recording.
  3. **24/7 Offline Urgent Help (`کمک فوری`):** Explains how emergency clinic contact and red-flag guidance work even without internet.
  4. **Verified Reports & Home Vision Checks:** Explains ophthalmologist-signed summaries (`نتایج`) and calibrated home vision checks (`آزمون‌ها`) + quick theme choice (`روشن` / `تیره` / `مطابق دستگاه`) before starting.
- **UX & Safety Non-Negotiables:**
  - Smooth `PageView` swipe + explicit `بعدی` / `قبلی` buttons (`>=48dp` targets) + animated page indicator dots + always-visible `رد کردن` (`Skip`) button.
  - Persistent `کمک فوری` button on onboarding so emergency help is **never** blocked by onboarding.
  - No marketing hype, no fake health promises, no mandatory account registration, and full RTL + `200%` `TextScaler` + Dark Mode support.

---

## 3. NEW Requirement: Smooth Android-Grade Animations & Microinteractions

**Current state:** Although timing tokens exist in `packages/design_system/lib/src/tokens/bina_spacing.dart` (`BinaMotion`), almost **zero** screens or routes currently animate. Tab switches snap abruptly (`IndexedStack`), page navigations have no custom transitions, launch/bootstrap has no entrance reveal, and cards appear statically.

### What Must Be Added (Smooth, Fluid, Android Material 3 Feel)

1. **App Launch & Startup Entrance Animation (`BootstrapScreen` & First Paint):**
   - Gentle `300–450ms` `Curves.easeOutCubic` fade + subtle scale (`0.92 -> 1.0`) logo reveal on `BootstrapScreen`, transitioning smoothly (crossfade) into `/onboarding`, `/auth/welcome`, or `/today` instead of an abrupt jump.
   - Replace abrupt static text loading placeholders with calm subtle fade-in transitions once data resolves (avoiding infinite pulsing shimmer loops per `v2.1 §8`).

2. **Android-Like Page & Route Transitions (`router.dart` & `bina_theme.dart`):**
   - Configure `pageTransitionsTheme` in `buildBinaTheme()` (`PredictiveBackPageTransitionsBuilder` / `FadeUpwardsPageTransitionsBuilder` or `ZoomPageTransitionsBuilder` for Android/Web consistency).
   - Build a reusable `BinaTransitionPage<T>` helper (extending `CustomTransitionPage<T>`) for `GoRoute.pageBuilder`:
     - **Forward detail push (`220ms`, `Curves.easeOutCubic`):** Subtle RTL-aware directional slide (`Offset(-0.06, 0)` in RTL -> `Offset.zero`) + smooth fade (`0.0 -> 1.0`).
     - **Modal/flow push (e.g., Dose Record, Symptom Flow, Onboarding):** Vertical fade-up (`Offset(0, 0.05)` -> `Offset.zero`, `220ms`).
     - **Back pop (`180ms`):** Clean reverse transition preserving focus.

3. **Smooth Root Tab Switching (`BinaAppShell` / `BinaFloatingDock`):**
   - Replace abrupt hard-cut tab switching with a smooth `120–160ms` `AnimatedSwitcher` / fade+micro-slide wrapper around active tab content while preserving per-branch scroll state.
   - Animate the active pill indicator inside `BinaFloatingDock` (smooth pill slide/morph + subtle icon scale `0.95 -> 1.0` on selection, `140–180ms`, `Curves.easeOutCubic`).

4. **Staggered Screen & Card Entrance Animations (Reusable `BinaEntrance` widget in `design_system`):**
   - Create `BinaFadeSlideIn` / `BinaStaggeredList` in `packages/design_system/lib/src/widgets/bina_motion_widgets.dart`:
     - Subtle `180–260ms` fade (`0 -> 1`) + `12–16dp` vertical rise (`Curves.easeOutCubic`) with short `35–50ms` stagger per visible hero/card on initial screen appearance (`Today`, `Care`, `Tests`, `Results`, `Account`, `Onboarding`).
     - Strictly play once per screen mount (never replay on scroll jitter or minor state updates).

5. **Interactive Microinteractions Across Components (`packages/design_system/`):**
   - **`BinaSurface` / `BinaRichRow` / `BinaGradientButton`:** Smooth `100ms` tactile press feedback (subtle ink ripple + gentle elevation/border response on non-urgent controls; keep scale locked `1.0` on SOS/irreversible medication commit buttons per `v2.1 §7.1`).
   - **`BinaCareProgress`:** Smooth `TweenAnimationBuilder<double>` (`180ms`, `Curves.easeOutCubic`) interpolating progress bar width when doses are recorded.
   - **`BinaSegments`:** Smooth animated sliding pill indicator (`AnimatedAlign` / `AnimatedPositioned`) instead of static container swap.
   - **`BinaHero` & `BinaReceipt`:** Smooth `160ms` `AnimatedSwitcher` state crossfades when offline/sync/receipt status changes.
   - **Dialogs & Bottom Sheets (`BinaSheet` / `showBinaConfirmDialog`):** Smooth `160–220ms` fade+scale/slide transitions.
   - **Scroll Physics:** Explicit `BouncingScrollPhysics` / platform-native `ClampingScrollPhysics` with `StretchingOverscrollIndicator` (Android 12+ Material 3 stretch overscroll feel!).

6. **Hard Clinical & Accessibility Guardrails for ALL Animations (Mandatory):**
   - **Reduced Motion:** Every animation MUST read `BinaMotion.resolve(context, duration)` (plus an explicit in-app `کاهش انیمیشن` toggle in `ACC-04 AccessibilitySettingsScreen` wired to a Riverpod provider) and drop to `Duration.zero` when enabled.
   - **Clinical Stimulus Immunity (`v2.1 §8 & §10`):** ZERO app animations, fades, hero transitions, or theme crossfades inside `IsolatedClinicalSurface` (`LandoltSessionScreen`, `AmslerSessionScreen`) or clinical data charts.
   - **Urgent SOS Safety:** ZERO artificial launch/modal delays, ZERO pulsing/flashing red animations, and immediate `0ms` appearance for `BinaUrgentActionCard` and `/help/urgent`.

---

## 4. Missing Pages & Routes (Compared to `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` §9)

### A. Wave 4 / Gated `[G]` Clinical & Partner Device Flows
1. **`TEST-14` (`/tests/baseline`) — Baseline Session Tracker:**
   - Displays required vs. completed baseline vision test sessions from backend contract, clearly stating `پایه در حال تکمیل` != `پایدار`.
2. **`TEST-16` (`/tests/home-iop`), `TEST-17` (Connection/Import State), `TEST-18` (HOME2 Receipt) — iCare HOME2 Partner Integration:**
   - Wire `POST /v1/integrations/icare-home2/readings` (`IcareHome2ReadingRequest` / `IcareHome2ReadingResponse` already exist in `bina_api_dtos.dart`) into `PatientGatewayPort`, `MockPatientGateway`, and `HttpPatientGateway`.
   - Build partner device status, eye confirmation, transfer receipt (`mmHg`, timestamp, source serial, quarantined duplicate/wrong-eye handling), and strict non-diagnostic wording (never allow manual unverified IOP typing or camera-based IOP).
3. **`RES-06` — Patient-Safe Signed PDF Viewer / Export:**
   - Accessible text-first view + optional authorized patient-safe PDF download/open with explicit privacy confirmation dialog (never expose clinician-only raw AI PDF).
4. **Live Data-Backed `V07` (`/results/:signedReportId/vf`) & `V08` (`/results/iop`) Routes `[G]`:**
   - Currently exist ONLY as isolated synthetic preview widgets (`VfDetailPreviewScreen`, `IopDetailPreviewScreen`). When backend contracts & clinical approval unlock them, wire live routes backed by real authorized per-eye series & maps.

### B. Edge / System / Lifecycle Routes
5. **`AUTH-10` — Enrollment Unavailable Screen (`/auth/no-plan`):**
   - Dedicated calm screen for an authenticated patient linked to a clinic who has zero active care episodes yet (with clinic contact, no fake demo schedule).
6. **`CARE-13` — Local Reminder Notification Deep-Link Entry:**
   - Dedicated handler/route resolving notification tap payload `(tenantId, patientId, episodeId, eye, rxVersion, doseId)`, verifying active auth & latest prescription version, and gracefully rejecting superseded reminders.
7. **`SYS-05` — Required App Update / Incompatible API Contract Screen (`/system/update-required`):**
   - Non-dismissible version-mismatch notice with official clinic/app-store update guidance while keeping `/help/urgent` accessible.
8. **`SYS-06` — Dedicated Permission-Denied Recovery Screen:**
   - Reusable route/panel explaining denied Camera / Notification / Sensor permissions with native OS App Settings launcher when supported.

---

## 5. Missing Standalone Design System Components (`packages/design_system/`)

Per `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` §7 & §7.3, extract/implement these reusable widgets in `apps/patient-app/packages/design_system/`:

| Component | Spec Ref | Description |
|---|---|---|
| `BinaFadeSlideIn` / `BinaTransitionPage` | §8 + UX polish | Reusable reduced-motion-aware entrance animation and RTL-aware route transition page builder |
| `BinaStepHeader` | §7 | Multi-step progress header (`مرحله ۲ از ۵` + animated bar) for Onboarding, Auth, Symptoms, and Vision Testing |
| `BinaSheet` (`showBinaBottomSheet`) | §7 | Frosted/solid modal bottom sheet (`radius 24` top corners, explicit close button, safe insets, auto full-page fallback at `>=2.0x` text scale) |
| `BinaPermissionPanel` | §7 | Reusable privacy rationale + native permission request + OS settings recovery card |
| `BinaIOPChart` `[G]` | §7.3 & §9.0A V08 | Real interactive chronological IOP time-series plot (`CustomPainter` or audited lightweight chart) with actual timestamp X-axis, `chartBand` clinician target zone, `>=48dp` point selection, and accessible companion data table |
| `BinaVFMap` `[G]` | §7.3 & §9.0A V07 | Deterministic white-paper locked 24-2 grayscale visual field map renderer (immune to Dark Mode inversion & RTL flip) with textual accessibility summary |
| `BinaChartLegend` | §7.3 | Reusable chart legend with target-band swatch and line/marker symbols |
| `BinaTimeline` | §7 | Reusable chronological timeline widget for medication taper phases (`CARE-05`) and adherence/test history |
| `BinaMeasurementCard` & `BinaReportCard` | §7 | Reusable structured cards extracted from inline implementations in `vision_testing_screens.dart` and `diagnostic_results_screens.dart` |
| **Local Vector Artwork (`assets/icons/` SVGs)** | §7.5 | Custom local SVG assets replacing current Material Icon fallbacks: teal dropper bottle (`V06`), symbolic IOP gauge & VF dot-matrix (`V03`), and VR goggles icon (`V01`/`V03` preview) |

---

## 6. Missing Platform, Storage, Media & Live-Backend Adapters

1. **Real Persistent Offline Storage (`packages/offline_store`):**
   - Currently wired to `InMemoryOfflineStore()` in `lib/app/providers.dart` — reloading the browser tab clears session, cached care plan, theme preference, onboarding completion, and outbox queue!
   - **Needed:**
     - **Web adapter:** `IndexedDbOfflineStore` (or `package:web` encrypted storage adapter) for persistent Web verification/staging (explicitly keeping zero real PHI in unencrypted browser storage per `v2.1 §11.4`).
     - **Mobile (Android/iOS) adapter:** Encrypted SQLCipher / `flutter_secure_storage` + `sqflite_sqlcipher` adapter behind `OfflineStorePort`.
   - Persist user preferences (`themeMode`, `highContrast`, `reducedMotion`, `hasSeenOnboarding`) across restarts.

2. **Real Audio Playback for Education (`EDU-03`):**
   - Currently `BinaAudioPlayer` toggles UI state only.
   - **Needed:** Bundle compact local Persian MP3/Opus audio narration clips under `assets/audio/` (zero external CDN), wire a lightweight audio port (`EducationAudioPort`) with pause-on-navigation, progress elapsed/total timer, and audio-unavailable graceful fallback.

3. **Native Local Notifications Adapter (`packages/offline_store`):**
   - Currently wired to `InMemoryLocalReminderAdapter()`.
   - **Needed:** Native Android/iOS `flutter_local_notifications` adapter behind `LocalReminderPort` enforcing PHI-free lock-screen copy (`زمان بررسی برنامه مراقبت شماست`), exact per-`(tenantId, patientId, episodeId, eye, version, doseId)` IDs, and `CARE-13` tap deep-linking.

4. **Native Mobile Sensor Adapters (`packages/device_sensors`):**
   - Currently only `WebVerificationSensorAdapter` is implemented.
   - **Needed (for Android/iOS release builds on dedicated mobile CI / build host — NOT this low-RAM Linux server):**
     - Face-to-screen viewing distance estimator (ARKit TrueDepth / ARCore / on-device MediaPipe Face Mesh — zero video/image persistence).
     - Ambient light (`lux`) & screen glare sensor adapter.
     - IMU gyroscope/accelerometer tilt stability adapter.
     - Device hardware qualification registry & server kill-switch check.

5. **Live Backend & Nginx `/v1/` Proxy Integration:**
   - Wire `bina-flutter.mehtea.ir` (or staging domain) to proxy `/v1/` -> `apps/backend` (same pattern as `sanjia.mehtea.ir`), update `CORS_ALLOWED_ORIGINS` in backend `.env`, and verify full live OTP, care plan, outbox sync, caregiver revocation, signed diagnostic summaries, and R2 vision test persistence against PostgreSQL + RLS.

6. **Playwright Cross-System Browser E2E Suite (`tests/e2e/`):**
   - Add Playwright E2E tests (`--workers=1`, `--disable-dev-shm-usage`) running against containerized `apps/backend` + `apps/ai-engine(cpu_stub)` + compiled Flutter Web `apps/patient-app/build/web` (and later `apps/staff-web`) verifying:
     - Zero external CDN requests in network log
     - `axe-core` WCAG 2.2 AA accessibility & RTL Jalali rendering
     - End-to-end Pillar 1 (clinic -> patient drop adherence + offline SOS) and Pillar 2 (technician upload -> ophthalmologist sign-off -> patient `نتایج` signed summary)

---

## 7. Recommended Implementation Order (Next Sprint)

1. **Priority 1 — Immediate Demo & UX Upgrade (High Visual Impact):**
   - Add **First-Run Interactive Onboarding** (`/onboarding`, 4 slides, skippable, persistent).
   - Add **Smooth Android-Grade Animations** (`BinaTransitionPage`, `BinaFadeSlideIn`, animated `BinaFloatingDock` pill, smooth tab transitions, `BinaCareProgress` interpolation, `BootstrapScreen` entrance reveal, in-app reduced-motion toggle).
   - Add **Web Persistent Storage** (`IndexedDb` / `window.localStorage` preference & demo cache adapter behind `OfflineStorePort`) so refresh preserves state on `bina-flutter.mehtea.ir`.
   - Rebuild & redeploy `bina-flutter.mehtea.ir` with **all 5 tabs enabled** (`ENABLE_WAVE3_RESULTS=true`, `ENABLE_WAVE4_TESTS=true`, demo lab mode for Web testing).
2. **Priority 2 — Remaining Spec Components & Gated Pages:**
   - Extract `BinaStepHeader`, `BinaSheet`, `BinaPermissionPanel`, `BinaTimeline`, `BinaChartLegend`, `BinaIOPChart`, `BinaVFMap`, and custom local SVG icons.
   - Implement `TEST-14` (baseline), `TEST-16..18` (iCare HOME2), `AUTH-10`, `SYS-05`, `SYS-06`, and `RES-06` (when patient-safe PDF endpoint is approved).
3. **Priority 3 — Live Backend Wiring, E2E & Mobile Native Adapters:**
   - Reverse-proxy `/v1/` to `apps/backend` and run live `BINA_DATA_MODE=live` smoke tests.
   - Add Playwright browser E2E under `tests/e2e/`.
   - Implement native Android/iOS plugins (SQLCipher, `flutter_local_notifications`, real audio, ARKit/MediaPipe/IMU/Lux sensors) on a mobile-capable CI/build machine.
