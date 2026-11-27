# گزارش جامع ممیزی کیفیت، فرآیندها و تجربه کاربری (QA Audit Report) — وب‌اپلیکیشن کادر درمان بینا

- **محیط آزمون زنده:** `https://bina-dashboard.mehtea.ir/` (حالت `VITE_API_MODE=mock`، میزبانی استاتیک Nginx روی HTTPS)
- **مرجع فرآیندها:** [STAFF_WEB_PROCESSES_FA.md](./STAFF_WEB_PROCESSES_FA.md) (`P-M1` تا `P-L4`، ۱۳ ماژول `A`–`M`)
- **پوشه اسکرین‌شات‌های زنده (۵۱ تصویر):** [`docs/staff-web-qa-screenshots/`](./staff-web-qa-screenshots/)
- **مرورگر و رزولوشن آزمون:** Chromium Headless `1440×900` (`locale: fa-IR`) + ممیزی خودکار دسترسی‌پذیری `@axe-core/playwright` (`WCAG 2.0 / 2.1 / 2.2 AA`) + بازبینی بصری دستی تک‌تک تصاویر و سورس‌کد

---

## ۱. خلاصه اجرایی (Executive Summary)

### شاخص‌های سلامت فنی (Pass)
- **خطای کنسول مرورگر (`console.error` / `warning`):** `۰`
- **خطای اجرای صفحه‌ای (`pageerror`):** `۰`
- **درخواست شبکه ناموفق (`requestfailed`):** `۰`
- **درخواست به CDN خارجی (تخطی از الزام Self-Hosted ایران):** `۰`
- **تصویر شکسته (`naturalWidth === 0`):** `۰`
- **سرریز افقی (`scrollWidth > clientWidth` در `1440×900`):** `۰`
- **نشت توکن یا PHI در `localStorage` / `sessionStorage`:** `۰` (صرفاً کلید غیربالینی `bina_staff_ui_prefs_v1` برای تم/تراکم)

### خلاصه یافته‌ها و اشکالات کشف‌شده (۱۷ مورد مستند)
| شدت | تعداد | شرح کلیدی |
| :--- | :---: | :--- |
| **P0 — بحرانی (کارکرد شکسته در محیط دمو/زنده)** | **۳** | شکسته شدن انتخاب پرونده و اکشن‌های تریاژ (`QA-01`)، شکسته شدن اکشن بستن ارجاع (`QA-02`) و خالی بودن نمودار لاندولت C پایش خانگی (`QA-03`) به دلیل ناهمخوانی نام فیلدهای `mock-transport.ts` با اسکیمای OpenAPI |
| **P1 — بالا (دسترسی‌پذیری WCAG 2.2 AA / کارایی بالینی / ناقص بودن فرآیند)** | **۵** | خطاهای Critical `axe-core` روی `select`/`input`های بدون برچسب (`QA-04`)، نبود فرم واقعی خروجی پژوهشی `D5` در `/ops` (`QA-05`)، پیاده‌سازی‌نشدن میان‌برهای صفحه‌کلید `+ / - / 0` نمایشگر با وجود وعده در راهنما (`QA-06`)، نبود نقش `role="tablist"`/`role="tab"` در تب‌های اپیزود مراقبت (`QA-07`)، ناهمخوانی فیلدهای `symptoms` در `mock-transport.ts` (`QA-08`) |
| **P2 — متوسط (بومی‌سازی ۱۰۰٪ فارسی / RTL Bidi / نمایش داده)** | **۶** | نمایش رشته‌های خام انگلیسی Enum/Status در UI (`QA-09`)، معکوس شدن شماره‌های `+98` و واحدها در RTL به‌علت نبود `<bdi dir="ltr">` (`QA-10`)، بریدگی برچسب محور X در نمودار میدان بینایی (`QA-11`)، نمایش UUID کوتاه به‌جای نام بیمار در جداول تریاژ و ارجاع (`QA-12`)، خط تیره اضافه در نتایج جستجوی مطالعه (`QA-13`)، نمایش JSON خام محرک/پاسخ در جدول پایش خانگی (`QA-14`) |
| **P3 — ظرافت UI/UX و خوانایی بالینی** | **۳** | موج فوتر روشن روی سایدبار سبز-آبی تیره (`QA-15`)، هایلایت شدن اشتباه «بیماران» به‌جای «پایش خانگی» در مسیر `/patients/:id/monitoring/*` (`QA-16`)، نمایش کدهای داخلی مستندات (`A02`, `C11`, `E01-E02`, `J01-J10`, ...) در عناوین فارسی کاربر نهایی و پنل خالی صف پردازش در وضعیت رد QC (`QA-17`) |

---

## ۲. ماتریس اجرای گام‌به‌گام فرآیندها و اسکرین‌شات‌ها

| کد فرآیند | ماژول / مسیر زنده | وضعیت اجرا | زمان (ms) | اسکرین‌شات(ها) | اشکالات مرتبط |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `P-M1` | `/login` (تم روشن/تیره + دمو + ورود) | موفق | 2515 | [01](./staff-web-qa-screenshots/01-M1-login-light.png), [02](./staff-web-qa-screenshots/02-M1-login-dark.png) | — |
| `P-A1` | `/overview` (روشن/تیره + KPI + نمودار) | با تذکر | 3698 | [03](./staff-web-qa-screenshots/03-A1-overview-light.png), [04](./staff-web-qa-screenshots/04-A1-overview-dark.png) | `QA-09`, `QA-17` |
| `P-A2` | `/overview/my-work`, `/overview/activity` | با تذکر | 2046 | [05](./staff-web-qa-screenshots/05-A2-my-work.png), [06](./staff-web-qa-screenshots/06-A2-activity-feed.png) | `QA-09`, `QA-17` |
| `P-A3` | جستجوی سراسری `Ctrl+K` | با تذکر | 1801 | [07](./staff-web-qa-screenshots/07-A3-global-search.png) | `QA-10`, `QA-13` |
| `P-M4` | `/settings` (تم، سایدبار Deep Teal، تراکم) | با تذکر | 1820 | [08](./staff-web-qa-screenshots/08-M4-settings-default.png), [09](./staff-web-qa-screenshots/09-M4-settings-deep-sidebar.png) | `QA-06`, `QA-09`, `QA-15`, `QA-17` |
| `P-M2` | `/select-clinic` (تعویض کلینیک) | موفق | 1049 | [10](./staff-web-qa-screenshots/10-M2-select-clinic.png) | — |
| `P-B1` | `/patients`, `/patients/new` (ثبت‌نام ۳ مرحله) | با تذکر | 2609 | [11](./staff-web-qa-screenshots/11-B1-patients-list.png), [12](./staff-web-qa-screenshots/12-B1-enroll-step1.png), [13](./staff-web-qa-screenshots/13-B1-enroll-step3.png) | `QA-10`, `QA-17` |
| `P-B2/B3` | `/patients/:id` (پرونده ۳۶۰ + سابقه + همراه + خط زمانی) | با تذکر | 4630 | [14](./staff-web-qa-screenshots/14-B2-patient-360-overview.png), [15](./staff-web-qa-screenshots/15-B3-patient-360-history.png), [16](./staff-web-qa-screenshots/16-B3-patient-360-caregivers.png), [17](./staff-web-qa-screenshots/17-B2-patient-360-timeline.png) | `QA-04`, `QA-09`, `QA-10`, `QA-17` |
| `P-C1` | `/diagnostics`, `/diagnostics/new` | با خطای A11y | 2135 | [18](./staff-web-qa-screenshots/18-C1-diagnostics-worklist.png), [19](./staff-web-qa-screenshots/19-C1-diagnostics-new-upload.png) | `QA-04`, `QA-17` |
| `P-C2` | `/diagnostics/6666...02` (توقف سخت QC) | با خطای A11y | 1138 | [20](./staff-web-qa-screenshots/20-C2-study-qc-failed.png) | `QA-04`, `QA-09`, `QA-17` |
| `P-C3/C4` | `/diagnostics/6666...01` (Fusion/OCT/Fundus/Anterior/VF/SHAP/Compare) | با تذکر | 5869 | [21](./staff-web-qa-screenshots/21-C4-study-fusion.png), [22](./staff-web-qa-screenshots/22-C3-study-oct-mask-only.png), [23](./staff-web-qa-screenshots/23-C3-study-oct-with-gradcam.png), [24](./staff-web-qa-screenshots/24-C3-study-fundus.png), [25](./staff-web-qa-screenshots/25-C3-study-anterior-topo.png), [26](./staff-web-qa-screenshots/26-C3-study-vf.png), [27](./staff-web-qa-screenshots/27-C3-study-shap-risk.png), [28](./staff-web-qa-screenshots/28-C3-study-compare.png) | `QA-04`, `QA-06`, `QA-09`, `QA-10`, `QA-11`, `QA-17` |
| `P-C5` | ویرایش گزارش فارسی + مودال و ثبت امضای HITL | با خطای A11y | 2327 | [29](./staff-web-qa-screenshots/29-C5-study-report-editor.png), [30](./staff-web-qa-screenshots/30-C5-study-signoff-modal.png), [31](./staff-web-qa-screenshots/31-C5-study-signed-off.png) | `QA-04`, `QA-09`, `QA-17` |
| `P-E1..E5` | `/care`, `/care/episodes/new`, `/care/print-phone`, `/care/episodes/:id` | با خطای A11y/تب | 4290 | [32](./staff-web-qa-screenshots/32-E1-care-dashboard.png), [33](./staff-web-qa-screenshots/33-E1-new-episode.png), [34](./staff-web-qa-screenshots/34-E4-print-phone-queue.png), [35](./staff-web-qa-screenshots/35-E2-episode-detail-rx.png) | `QA-04`, `QA-07`, `QA-08`, `QA-09`, `QA-17` |
| `P-F1..F4` | `/triage`, `/triage/outages` | **شکسته در دمو (P0)** | 2805 | [38](./staff-web-qa-screenshots/38-F1-triage-queue-detail.png), [39](./staff-web-qa-screenshots/39-F4-triage-outages.png) | **`QA-01`**, `QA-04`, `QA-09`, `QA-12` |
| `P-G1/G2` | `/follow-ups`, `/follow-ups/referrals` | **شکسته در دمو (P0)** | 2049 | [40](./staff-web-qa-screenshots/40-G1-follow-ups.png), [41](./staff-web-qa-screenshots/41-G2-referrals.png) | **`QA-02`**, `QA-04`, `QA-09`, `QA-12` |
| `P-D1/D2` | `/monitoring`, `/patients/:id/monitoring/overview` | **نمودار خالی (P0)** | 2673 | [42](./staff-web-qa-screenshots/42-D1-monitoring-overview.png), [43](./staff-web-qa-screenshots/43-D2-patient-monitoring.png) | **`QA-03`**, `QA-04`, `QA-09`, `QA-14`, `QA-16` |
| `P-H1` | `/reports` (گزارش‌های PDF فارسی) | با تذکر | 1020 | [44](./staff-web-qa-screenshots/44-H1-reports-center.png) | `QA-09`, `QA-10`, `QA-17` |
| `P-I1/I2` | `/analytics` (کارت امتیاز پایلوت و کیفیت AI) | موفق | 1023 | [45](./staff-web-qa-screenshots/45-I1-analytics-scorecard.png) | `QA-17` |
| `P-J1/J2` | `/admin` (مدیریت کلینیک، نقش‌ها، نگهبان پیامک PHI 422) | با خطای A11y | 2600 | [46](./staff-web-qa-screenshots/46-J1-admin-clinic.png), [47](./staff-web-qa-screenshots/47-J2-admin-sms-phi-blocked.png) | `QA-04`, `QA-09`, `QA-17` |
| `P-K1` | `/integrations` (PACS / DICOM / FHIR) | با خطای A11y | 1500 | [48](./staff-web-qa-screenshots/48-K1-integrations.png) | `QA-04`, `QA-09`, `QA-17` |
| `P-L1..L4` | `/ops` (سلامت، Step-Up Audit، Break-Glass، پژوهش D5) | ناقص در D5 (P1) | 2453 | [49](./staff-web-qa-screenshots/49-L2-ops-stepup-locked.png), [50](./staff-web-qa-screenshots/50-L2-ops-audit-unlocked.png), [52](./staff-web-qa-screenshots/52-L3-ops-breakglass-active.png) | `QA-04`, **`QA-05`**, `QA-09` |
| `P-M3` | محدودیت نقش تکنسین + مسیر نامعتبر بدون لاگین | موفق | 2200 | [51](./staff-web-qa-screenshots/51-M3-technician-signoff-disabled.png), [53](./staff-web-qa-screenshots/53-M3-unauth-redirect-check.png) | `QA-04` |

---

## ۳. شرح دقیق اشکالات کشف‌شده، علت ریشه‌ای و راه‌حل

### اشکالات بحرانی (`P0 — Critical`)

#### `QA-01` — پنل جزئیات و اکشن‌های صف تریاژ (`Claim`, `ثبت تماس`, `ارجاع`, `بستن پرونده`) در حالت دمو کاملاً غیرقابل دسترس است
- **فرآیند و URL:** `P-F1`, `P-F2` — `https://bina-dashboard.mehtea.ir/triage`
- **اسکرین‌شات:** [38-F1-triage-queue-detail.png](./staff-web-qa-screenshots/38-F1-triage-queue-detail.png)
- **فایل‌های کد:**
  - [mock-transport.ts](file:///home/mahdi/projects/binaai/apps/staff-web/src/core/api/msw/mock-transport.ts#L648-L695) و [mock-transport.ts](file:///home/mahdi/projects/binaai/apps/staff-web/src/core/api/msw/mock-transport.ts#L1796-L1895)
  - [triage-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/triage/triage-page.tsx#L49-L55) و [triage-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/triage/triage-page.tsx#L151-L154)
- **چه اتفاقی افتاد:** با باز کردن `/triage` و حتی کلیک روی ردیف اول جدول، ستون چپ جزئیات پرونده همچنان پیام `یک پرونده را از جدول انتخاب کنید.` را نمایش می‌دهد و دکمه‌های `تخصیص به من (Claim)`، `ثبت نتیجه تماس`، `ثبت ارجاع` و `بستن پرونده تریاژ` اصلاً ظاهر نمی‌شوند.
- **علت ریشه‌ای:** طبق قرارداد OpenAPI (`TriageCase`), نام فیلد شناسه پرونده `caseId` است و `triage-page.tsx` از `c.caseId` استفاده می‌کند (`activeId = selectedCaseId ?? listQuery.data?.items?.[0]?.caseId ?? null`). اما در `mock-transport.ts` رکوردهای `db.triageCases` هنوز کلید `id` (به‌جای `caseId`) برمی‌گردانند و مسیرهای `GET/POST /v1/triage/cases/:id/*` هم روی `c.id` جستجو می‌کنند. نتیجه: `c.caseId === undefined` و درخواست جزئیات هرگز ارسال نمی‌شود.
- **راه‌حل:** در `mock-transport.ts` تمام رکوردهای `db.triageCases` را به قرارداد OpenAPI هم‌تراز کنید (`caseId` به‌جای `id` در داده پایه، فیلترها، جزئیات و اکشن‌های `claim`/`contact`/`referrals`/`close`) و یک تست کامپوننت برای کلیک روی ردیف تریاژ و نمایش دکمه `Claim` در `staff-web-clinical-safety.test.tsx` اضافه کنید.

---

#### `QA-02` — بستن حلقه ارجاع (`مراجعه انجام شد` / `عدم مراجعه`) در حالت دمو `referralId = undefined` ارسال می‌کند
- **فرآیند و URL:** `P-G2` — `https://bina-dashboard.mehtea.ir/follow-ups/referrals`
- **اسکرین‌شات:** [41-G2-referrals.png](./staff-web-qa-screenshots/41-G2-referrals.png)
- **فایل‌های کد:**
  - [mock-transport.ts](file:///home/mahdi/projects/binaai/apps/staff-web/src/core/api/msw/mock-transport.ts#L696-L720) و [mock-transport.ts](file:///home/mahdi/projects/binaai/apps/staff-web/src/core/api/msw/mock-transport.ts#L1922-L1945)
  - [followups-referrals-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/referrals/followups-referrals-page.tsx#L170-L185) و [care-dashboard-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/episodes/care-dashboard-page.tsx#L172-L176)
- **چه اتفاقی افتاد:** جدول ارجاعات رندر می‌شود اما کلیک روی `مراجعه انجام شد` یا `عدم مراجعه`، مسیر `PATCH /v1/referrals/undefined/outcome` را فراخوانی می‌کند و وضعیت ارجاع تغییر نمی‌کند.
- **علت ریشه‌ای:** طبق قرارداد OpenAPI (`ReferralRecord`)، نام فیلد `referralId` است؛ اما `mock-transport.ts` در `db.referrals` کلید `id` ذخیره کرده و در هندلر `PATCH /v1/referrals/:id/outcome` روی `r.id` جستجو می‌کند.
- **راه‌حل:** در `mock-transport.ts` فیلد `id` در `db.referrals` و اکشن `POST /v1/triage/cases/:id/referrals` را به `referralId` (مطابق OpenAPI) تغییر دهید و هندلر `PATCH /v1/referrals/:id/outcome` را روی `r.referralId` و `tc.caseId` به‌روزرسانی کنید.

---

#### `QA-03` — نمودار روند حدت بینایی خانگی (`Landolt C — logMAR`) در صفحه پایش بیمار کاملاً خالی رندر می‌شود
- **فرآیند و URL:** `P-D2` — `https://bina-dashboard.mehtea.ir/patients/44444444-4444-4444-8444-444444444401/monitoring/overview`
- **اسکرین‌شات:** [43-D2-patient-monitoring.png](./staff-web-qa-screenshots/43-D2-patient-monitoring.png)
- **فایل‌های کد:**
  - [mock-transport.ts](file:///home/mahdi/projects/binaai/apps/staff-web/src/core/api/msw/mock-transport.ts#L2017-L2045)
  - [monitoring-pages.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/monitoring/monitoring-pages.tsx#L244-L253)
- **چه اتفاقی افتاد:** کارت `روند حدت بینایی خانگی (لاندولت C — logMAR)` در صفحه پایش بیمار با وجود وجود ۲ نشست ثبت‌شده در پایین صفحه، هیچ نقطه‌ای روی نمودار رسم نمی‌کند و محور X صرفاً یک خط تیره `-` نشان می‌دهد.
- **علت ریشه‌ای:** طبق اسکیمای OpenAPI (`PatientVisionTrendsResponse`)، خروجی `GET /v1/r2/patients/:id/trends` باید شامل `{ patientId, od: [...], os: [...] }` (با کلید `recordedAt`) باشد؛ اما `mock-transport.ts` هنوز ساختار قدیمی `{ points: [...], baselines: ... }` برمی‌گرداند. در نتیجه `trendsQuery.data?.od` برابر `undefined` می‌شود.
- **راه‌حل:** خروجی `GET /v1/r2/patients/:id/trends` در `mock-transport.ts` را دقیقاً مطابق قرارداد OpenAPI (`{ patientId, od, os }`) بازنویسی کنید و تست رندر نمودار با حداقل ۲ نقطه `OD` و یک نقطه ردشده (`null gap`) اضافه کنید.

---

### اشکالات با اولویت بالا (`P1 — High`)

#### `QA-04` — خطاهای Critical دسترسی‌پذیری `axe-core` (`select-name` و `label` و `label-content-name-mismatch`) در ۱۲ مسیر
- **فرآیندها و URLها:**
  - `/diagnostics` (`P-C1`, [18](./staff-web-qa-screenshots/18-C1-diagnostics-worklist.png)) و `/diagnostics/new` ([19](./staff-web-qa-screenshots/19-C1-diagnostics-new-upload.png))
  - `/diagnostics/:studyId` تب‌های QC، Fusion، ویرایش گزارش و مودال امضا (`P-C2..C5`, [20](./staff-web-qa-screenshots/20-C2-study-qc-failed.png), [21](./staff-web-qa-screenshots/21-C4-study-fusion.png), [29](./staff-web-qa-screenshots/29-C5-study-report-editor.png), [30](./staff-web-qa-screenshots/30-C5-study-signoff-modal.png))
  - `/care` و `/care/episodes/:id` (`P-E1..E2`, [32](./staff-web-qa-screenshots/32-E1-care-dashboard.png), [35](./staff-web-qa-screenshots/35-E2-episode-detail-rx.png))
  - `/triage/outages` (`P-F4`, [39](./staff-web-qa-screenshots/39-F4-triage-outages.png))
  - `/follow-ups` (`P-G1`, [40](./staff-web-qa-screenshots/40-G1-follow-ups.png))
  - `/patients/:id/monitoring/overview` (`P-D2`, [43](./staff-web-qa-screenshots/43-D2-patient-monitoring.png))
  - `/admin`, `/integrations`, `/ops` (`P-J1..L3`, [46](./staff-web-qa-screenshots/46-J1-admin-clinic.png), [48](./staff-web-qa-screenshots/48-K1-integrations.png), [49](./staff-web-qa-screenshots/49-L2-ops-stepup-locked.png))
  - دکمه جمع کردن سایدبار در [app-shell.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/design-system/composites/app-shell.tsx#L238-L247) (`label-content-name-mismatch`: متن قابل مشاهده `جمع کردن منو` است ولی `aria-label` برابر `جمع کردن منوی کناری` است).
- **فایل‌های کد:**
  - [diagnostics-worklist-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/diagnostics/diagnostics-worklist-page.tsx), [study-workspace-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/diagnostics/study-workspace-page.tsx#L610-L633), [care-dashboard-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/episodes/care-dashboard-page.tsx), [episode-detail-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/episodes/episode-detail-page.tsx#L218-L238), [triage-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/triage/triage-page.tsx#L291-L357), [followups-referrals-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/referrals/followups-referrals-page.tsx), [monitoring-pages.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/monitoring/monitoring-pages.tsx#L350-L360), [admin-pages.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/admin/admin-pages.tsx), [integrations-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/integrations/integrations-page.tsx), [ops-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/ops_console/ops-page.tsx#L174-L181), [data-table.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/design-system/composites/data-table.tsx#L128-L150) (`SingleEyeSelect` فاقد `aria-label` پیش‌فرض).
- **چه اتفاقی افتاد:** `axe-core` روی صفحات فوق خطاهای Critical (`select-name` و `label`) گزارش کرد چون بسیاری از `<select>`ها و `<input>`ها یا فاقد `aria-label` بودند یا `<label>` بالای آن‌ها بدون `htmlFor`/`id` نوشته شده بود.
- **راه‌حل:**
  1. به `SingleEyeSelect` در `data-table.tsx` مقدار پیش‌فرض `aria-label="انتخاب چشم"` اضافه کنید.
  2. برای هر `<label>` بالای فیلد، `htmlFor` منطبق با `id` ورودی/سلکت اضافه کنید و به همه فیلترهای بدون برچسب `aria-label` دقیق فارسی بدهید.
  3. در `app-shell.tsx:243` متن دکمه و `aria-label` را هم‌سان کنید (وقتی سایدبار باز است `aria-label` را حذف کنید تا از متن قابل مشاهده `جمع کردن منو` استفاده شود).

---

#### `QA-05` — نبود فرم واقعی خروجی پژوهشی ناشناس‌سازی‌شده (`D5 Research Export`) حتی پس از فعال‌سازی Feature Flag
- **فرآیند و URL:** `P-L4` — `https://bina-dashboard.mehtea.ir/ops`
- **اسکرین‌شات:** [49-L2-ops-stepup-locked.png](./staff-web-qa-screenshots/49-L2-ops-stepup-locked.png), [50-L2-ops-audit-unlocked.png](./staff-web-qa-screenshots/50-L2-ops-audit-unlocked.png)
- **فایل کد:** [ops-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/ops_console/ops-page.tsx#L218-L231)
- **چه اتفاقی افتاد:** کارت `حاکمیت پژوهش D5 و شواهد مالی (L07 / L08 [G])` وقتی `research_d5_export` غیرفعال است لینک به `/admin` می‌دهد؛ اما اگر مدیر آن را فعال کند، فقط یک خط شمارش صف AI/Temporal نشان می‌دهد و **هیچ فرمی برای وارد کردن کد IRB، دلیل پژوهش و فراخوانی `POST /v1/research/export` وجود ندارد**.
- **علت ریشه‌ای:** بخش `else` در `ops-page.tsx:227-230` به‌عنوان خلاصه صف رها شده و به اندپوینت موجود `POST /v1/research/export` متصل نشده است.
- **راه‌حل:** وقتی `isFeatureEnabled("research_d5_export")` فعال و کاربر دارای `can("export:phi")` است، فرم دارای فیلدهای `کد کمیته اخلاق (IRB Protocol Code)`، `علت پژوهش (حداقل ۱۰ کاراکتر)`، گیت `Step-Up` و دکمه `دریافت بسته ناشناس‌سازی‌شده D5` را به `POST /v1/research/export` متصل کنید.

---

#### `QA-06` — میان‌برهای صفحه‌کلید `+ / - / 0` در بوم تصویر تشخیصی وعده داده شده‌اند اما پیاده‌سازی نشده‌اند
- **فرآیند و URL:** `P-M4` و `P-C3` — `https://bina-dashboard.mehtea.ir/settings` و `/diagnostics/:studyId`
- **اسکرین‌شات:** [09-M4-settings-deep-sidebar.png](./staff-web-qa-screenshots/09-M4-settings-deep-sidebar.png), [22-C3-study-oct-mask-only.png](./staff-web-qa-screenshots/22-C3-study-oct-mask-only.png)
- **فایل‌های کد:**
  - [settings-pages.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/settings/settings-pages.tsx#L180-L185) (اعلام میان‌بر: `کلیدهای + / - / 0 در بوم تصویر تشخیصی`)
  - [evidence-viewer-panel.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/diagnostics/viewer/evidence-viewer-panel.tsx#L50-L58) (فقط `Escape` برای خروج از تمام‌صفحه شنود می‌شود)
- **چه اتفاقی افتاد:** فشردن کلیدهای `+`، `-` یا `0` در نمایشگر OCT/Fundus هیچ تغییری در بزرگ‌نمایی (`zoom`) ایجاد نمی‌کند.
- **راه‌حل:** در `evidence-viewer-panel.tsx` یک `useEffect` با `keydown` اضافه کنید که وقتی فوکوس داخل `<input>`/`<textarea>` نیست، `+`/`=` را برای بزرگ‌نمایی، `-` را برای کوچک‌نمایی و `0` را برای بازنشانی (`zoom = 1`) و کلیدهای جهت‌دار را برای جابه‌جایی مقطع OCT (`sliceIndex`) اعمال کند.

---

#### `QA-07` — تب‌های جزئیات اپیزود مراقبت فاقد معناشناسی ARIA (`role="tablist"` / `role="tab"` / `aria-selected`) هستند
- **فرآیند و URL:** `P-E2`, `P-E3` — `https://bina-dashboard.mehtea.ir/care/episodes/55555555-5555-4555-8555-555555555501`
- **اسکرین‌شات:** [35-E2-episode-detail-rx.png](./staff-web-qa-screenshots/35-E2-episode-detail-rx.png)
- **فایل کد:** [episode-detail-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/episodes/episode-detail-page.tsx#L192-L199)
- **چه اتفاقی افتاد:** برخلاف `Patient360Page` و `StudyWorkspacePage` که از `role="tablist"` و `role="tab"` + `aria-selected` استفاده می‌کنند، تب‌های صفحه اپیزود صرفاً `<Button>` معمولی هستند و صفحه‌خوان‌ها آن‌ها را به‌عنوان تب تشخیص نمی‌دهند.
- **راه‌حل:** به کانتینر `div` در خط ۱۹۳ ویژگی `role="tablist"` و به هر `<Button>` ویژگی‌های `role="tab"` و `aria-selected={tab === k}` اضافه کنید.

---

#### `QA-08` — ناهمخوانی فیلدهای تاریخچه علائم (`symptoms`) در `mock-transport.ts` با قرارداد OpenAPI
- **فرآیند و URL:** `P-E3` — `/care/episodes/:episodeId` (تب علائم و هشدارها)
- **فایل‌های کد:**
  - [episode-detail-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/episodes/episode-detail-page.tsx#L317-L327) (`s.reportId`, `s.createdAtJalali`, `s.severePain`, `s.suddenVisionLoss`, ...)
  - [mock-transport.ts](file:///home/mahdi/projects/binaai/apps/staff-web/src/core/api/msw/mock-transport.ts#L1760-L1763) (`db.symptoms`)
- **چه اتفاقی افتاد:** `episode-detail-page.tsx` مطابق OpenAPI از کلیدهای `reportId` و `createdAtJalali` و بولی‌های علائم استفاده می‌کند؛ در صورت وجود نام‌های متفاوت در `db.symptoms` در حالت دمو، تاریخ جلالی یا برچسب علامت قرمز ممکن است خالی رندر شود.
- **راه‌حل:** ساختار `db.symptoms` در `mock-transport.ts` را به نوع تایپ‌شده `EpisodeSymptomHistoryItem` از `~/core/api/contracts` مقید کنید (هم‌تراز با همه کلکسیون‌های `mock-transport.ts` تا کامپایلر TypeScript هرگونه انحراف دمو از OpenAPI را در زمان بیلد بگیرد!).

---

### اشکالات با اولویت متوسط (`P2 — Medium`)

#### `QA-09` — نمایش رشته‌های خام انگلیسی Enum/Status در رابط کاربری ۱۰۰٪ فارسی (`fa-IR`)
- **فرآیندها و اسکرین‌شات‌ها:**
  - `/overview` ([03](./staff-web-qa-screenshots/03-A1-overview-light.png), [04](./staff-web-qa-screenshots/04-A1-overview-dark.png)): `وضعیت: New`، `وضعیت: OwnerAssigned`، `prescription.published`، `diagnostic.urgent-floor-applied`
  - `/settings` ([09](./staff-web-qa-screenshots/09-M4-settings-deep-sidebar.png)): `نقش فعال: ophthalmologist`
  - `/patients/:id` ([14](./staff-web-qa-screenshots/14-B2-patient-360-overview.png)): `pending_hitl`, `signed_off`, `post_cataract`
  - `/diagnostics/:id` ([20](./staff-web-qa-screenshots/20-C2-study-qc-failed.png), [21](./staff-web-qa-screenshots/21-C4-study-fusion.png), [31](./staff-web-qa-screenshots/31-C5-study-signed-off.png)): `qc_failed`, `pending_hitl`, `signed_off`, `fundus`, `urgent`, `moderate`, `fundus, oct, tabular_xgb`
  - `/care` ([32](./staff-web-qa-screenshots/32-E1-care-dashboard.png)) و `/care/episodes/:id` ([35](./staff-web-qa-screenshots/35-E2-episode-detail-rx.png)): `post_cataract`, `dispatched`
  - `/triage` ([38](./staff-web-qa-screenshots/38-F1-triage-queue-detail.png)): `New`, `OwnerAssigned`
  - `/follow-ups` ([40](./staff-web-qa-screenshots/40-G1-follow-ups.png)) و `/follow-ups/referrals` ([41](./staff-web-qa-screenshots/41-G2-referrals.png)): `referral_followup`, `print_phone_checkin`, `pending`, `dispatched`
  - `/reports` ([44](./staff-web-qa-screenshots/44-H1-reports-center.png)): `signed_diagnostic`
  - `/admin` ([46](./staff-web-qa-screenshots/46-J1-admin-clinic.png)): `ophthalmologist`, `coordinator`, `technician`, `admin`, `post_cataract`
  - `/integrations` ([48](./staff-web-qa-screenshots/48-K1-integrations.png)): `dicomweb`, `ok`, `outbound`, `delivered`
  - `/ops` ([50](./staff-web-qa-screenshots/50-L2-ops-audit-unlocked.png)): `care_episode`, `diagnostic_study`, `ophthalmologist`
- **علت ریشه‌ای:** نگاشت‌های فارسی متمرکز برای `StudyStatus`، `TriageStatus`، `SeverityGrade`، `ReferralStatus`، `FollowUpType`، `ProtocolType`، `ReportType` و `StaffRole` در [fa-ir.ts](file:///home/mahdi/projects/binaai/apps/staff-web/src/core/i18n/fa-ir.ts) به‌صورت یکپارچه استفاده نشده‌اند.
- **راه‌حل:** دیکشنری‌های کامل `STUDY_STATUS_FA`, `TRIAGE_STATUS_FA`, `SEVERITY_FA`, `REFERRAL_STATUS_FA`, `FOLLOWUP_TYPE_FA`, `PROTOCOL_FA`, `REPORT_TYPE_FA`, `ROLE_FA`, `AUDIT_ACTION_FA` را در `fa-ir.ts` تعریف کرده و در تمام جداول و کارت‌ها جایگزین رشته‌های خام کنید.

---

#### `QA-10` — معکوس شدن شماره‌های `+98`، کلید-مقدارهای بالینی و برچسب‌های LTR در چیدمان RTL
- **فرآیندها و اسکرین‌شات‌ها:**
  - جستجوی سراسری ([07](./staff-web-qa-screenshots/07-A3-global-search.png)): `4510***98912+` به‌جای `+98912***4510`
  - پذیرش بیمار ([12](./staff-web-qa-screenshots/12-B1-enroll-step1.png)): `موبایل: 989121234567+`
  - پرونده ۳۶۰ ([14](./staff-web-qa-screenshots/14-B2-patient-360-overview.png)): `موبایل: 4510***98912+`
  - توپوگرافی و میدان بینایی ([25](./staff-web-qa-screenshots/25-C3-study-anterior-topo.png), [26](./staff-web-qa-screenshots/26-C3-study-vf.png)): `D 44.8 :Kmax`، `µm 538 :Thinnest Pachy`، `-3.2 dB :MD`، `2.1 dB :PSD`، `94% :VFI`
  - مرکز گزارش‌ها ([44](./staff-web-qa-screenshots/44-H1-reports-center.png)): `:source_sha256`
- **فایل‌های کد:** [app-shell.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/design-system/composites/app-shell.tsx#L450-L465), [patients-list-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/patients/patients-list-page.tsx), [patient-360-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/patients/patient-360-page.tsx), [evidence-viewer-panel.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/diagnostics/viewer/evidence-viewer-panel.tsx#L90-L155), [reports-and-analytics-pages.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/reporting/reports-and-analytics-pages.tsx).
- **راه‌حل:** تمام شماره‌های `+98`، مقادیر فنی لاتین و شناسه‌های `SHA-256` را داخل `<bdi dir="ltr">` قرار دهید و کارت‌های شاخص‌های توپوگرافی/VF را با `flex` دوطرفه (`Kmax` سمت راست یا با `dir="ltr"` مجزا) نمایش دهید.

---

#### `QA-11` — بریدگی برچسب آخرین تاریخ محور X در نمودار میدان بینایی (`1405/09` به `1405/0`)
- **فرآیند و URL:** `P-C3` — `/diagnostics/66666666-6666-4666-8666-666666666601` (تب میدان بینایی VF)
- **اسکرین‌شات:** [26-C3-study-vf.png](./staff-web-qa-screenshots/26-C3-study-vf.png)
- **فایل کد:** [clinical-charts.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/design-system/charts/clinical-charts.tsx#L58-L68) (`padR = 16` برای `textAnchor="middle"` روی آخرین برچسب X کافی نیست)
- **راه‌حل:** `padR` را در `ChronologicalLineChart` از `16` به `36` افزایش دهید یا برای آخرین تیک محور X از `textAnchor="end"` استفاده کنید.

---

#### `QA-12` — نمایش پیشوند UUID (`44444444` / `77777777` / `66666666`) به‌جای نام فارسی بیمار در تریاژ، ارجاعات و مطالعه
- **اسکرین‌شات‌ها:** [21](./staff-web-qa-screenshots/21-C4-study-fusion.png), [38](./staff-web-qa-screenshots/38-F1-triage-queue-detail.png), [41](./staff-web-qa-screenshots/41-G2-referrals.png)
- **فایل‌های کد:** [triage-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/triage/triage-page.tsx#L79), [followups-referrals-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/referrals/followups-referrals-page.tsx#L165), [study-workspace-page.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/diagnostics/study-workspace-page.tsx#L289)
- **چه اتفاقی افتاد:** کاربر در صف تریاژ می‌بیند `44444444` و در صف ارجاعات `77777777`؛ تشخیص اینکه هر ردیف متعلق به کدام بیمار است در یک نگاه ممکن نیست (در حالی که در داشبورد `/overview` نام واقعی `مهدی احمدی` و `زهرا کریمی` نمایش داده می‌شود).
- **راه‌حل:** فیلد اختیاری `patientNameFa` را به قرارداد OpenAPI برای `TriageCase`، `ReferralRecord` و `DiagnosticStudyDetail` اضافه کرده (و در بک‌اند و `mock-transport.ts` پر کنید) تا نام فارسی بیمار همیشه در کنار کد کوتاه نمایش داده شود.

---

#### `QA-13` — خط تیره اضافه در انتهای ردیف‌های مطالعه در جستجوی سراسری `Ctrl+K`
- **فرآیند و اسکرین‌شات:** `P-A3` — [07-A3-global-search.png](./staff-web-qa-screenshots/07-A3-global-search.png)
- **فایل کد:** [app-shell.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/design-system/composites/app-shell.tsx#L476-L478)
- **چه اتفاقی افتاد:** عبارت `مهدی احمدی چشم راست (OD) —` بدون تاریخ جلالی و با خط تیره آویزان نمایش داده می‌شود.
- **راه‌حل:** خط تیره را شرطی کنید (`s.createdAtJalali ? \` — ${s.createdAtJalali}\` : ""`) و در `mock-transport.ts` مقدار `createdAtJalali` را در خروجی `/v1/overview/search` برگردانید.

---

#### `QA-14` — نمایش JSON خام در جدول داده‌های نشست آزمون خانگی (`{"gapDir":"top","logmar":0.2}`)
- **فرآیند و اسکرین‌شات:** `P-D2` — [43-D2-patient-monitoring.png](./staff-web-qa-screenshots/43-D2-patient-monitoring.png)
- **فایل کد:** [monitoring-pages.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/features/monitoring/monitoring-pages.tsx#L387-L410)
- **چه اتفاقی افتاد:** در جدول `جزئیات جلسه و داده‌های خام آزمون`، ستون‌های `محرک` و `پاسخ` رشته خام JSON (`{"gapDir":"top","logmar":0.2}`) نمایش می‌دهند و کلید `landolt_c` و `accepted` نیز انگلیسی است.
- **راه‌حل:** جهت شکاف لاندولت C (`top` ← `بالا`, `bottom` ← `پایین`, `left` ← `چپ`, `right` ← `راست`) و مقدار `logMAR` را به‌صورت فارسی خوانا قالب‌بندی کنید (با امکان مشاهده JSON خام فقط درون یک جزئیات قابل باز شدن برای دیباگ فنی).

---

### اشکالات ظرافت UI/UX (`P3 — Polish`)

#### `QA-15` — نمایش موج فوتر روشن (`wave_footer_light.webp`) روی سایدبار سبز-آبی تیره (`Deep Teal`)
- **فرآیند و اسکرین‌شات:** `P-M4` — [09-M4-settings-deep-sidebar.png](./staff-web-qa-screenshots/09-M4-settings-deep-sidebar.png)
- **فایل‌های کد:** [app-shell.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/design-system/composites/app-shell.tsx#L248), [brand-artwork.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/design-system/primitives/brand-artwork.tsx#L80-L95)
- **چه اتفاقی افتاد:** وقتی کاربر در تم روشن، سایدبار `سبز-آبی تیره` را انتخاب می‌کند، لوگوی بالا درست به نسخه تیره (`forceDarkLogo`) تغییر می‌کند اما `FooterWaveArtwork` پایین سایدبار همچنان نسخه روشن سفیدرنگ را نمایش می‌دهد و کادر سفید ناخوشایند ایجاد می‌کند.
- **راه‌حل:** پراپ `forceDark?: boolean` را به `FooterWaveArtwork` اضافه کرده و در `app-shell.tsx:248` مقدار `forceDark={sidebarVariant === "deep"}` پاس دهید.

---

#### `QA-16` — هایلایت اشتباه منوی «بیماران» به‌جای «پایش خانگی» در مسیر `/patients/:patientId/monitoring/*`
- **فرآیند و اسکرین‌شات:** `P-D2` — [43-D2-patient-monitoring.png](./staff-web-qa-screenshots/43-D2-patient-monitoring.png)
- **فایل کد:** [app-shell.tsx](file:///home/mahdi/projects/binaai/apps/staff-web/src/design-system/composites/app-shell.tsx#L151-L152)
- **چه اتفاقی افتاد:** در صفحه پایش خانگی یک بیمار (`/patients/:id/monitoring/overview`)، آیتم `بیماران` در سایدبار فعال می‌شود به‌جای `پایش خانگی`.
- **راه‌حل:** در `isActivePath` مسیرهای منطبق با `/patients/.+/monitoring` را به `/monitoring` نگاشت دهید تا منوی `پایش خانگی` هایلایت شود و `بیماران` همزمان فعال نشود.

---

#### `QA-17` — نشت کدهای داخلی مشخصات طراحی (`A02`, `C11`, `E01–E02`, `J01–J10`, `R07`) در عناوین کاربر نهایی + پنل خالی صف پردازش در رد QC
- **اسکرین‌شات‌ها:** تقریباً تمام صفحات ([03](./staff-web-qa-screenshots/03-A1-overview-light.png), [09](./staff-web-qa-screenshots/09-M4-settings-deep-sidebar.png), [20](./staff-web-qa-screenshots/20-C2-study-qc-failed.png), [32](./staff-web-qa-screenshots/32-E1-care-dashboard.png), [46](./staff-web-qa-screenshots/46-J1-admin-clinic.png))
- **چه اتفاقی افتاد:**
  1. کدهای داخلی مستند UI/UX (`کارهای من (A02)`, `فعالیت‌ها (A05)`, `مدیریت مراقبت و درمان (E01–E02)`, `سفید-یخی روشن (پیش‌فرض R07)`, `سبز-آبی تیره (R03/R06)`) در متن قابل مشاهده برای پزشک و پرستار نمایش داده می‌شوند که تجربه کاربری حرفه‌ای بالینی را شلوغ می‌کند.
  2. در [20-C2-study-qc-failed.png](./staff-web-qa-screenshots/20-C2-study-qc-failed.png)، کارت چپ `صف و وضعیت پردازش (C04 — Layer 6 Jobs)` هنگام رد QC کاملاً سفید و خالی است و هیچ پیام راهنمایی ندارد.
- **راه‌حل:**
  1. تمام شناسه‌های داخلی طراحی (`A01..M11`, `R03..R14`) را از عناوین و دکمه‌های کاربر نهایی حذف کنید (در صورت نیاز فقط در کامنت کد یا `data-testid` نگه دارید).
  2. در کارت صف پردازش `study-workspace-page.tsx` هنگام خالی بودن آرایه `jobs`، پیام روشن نمایش دهید: «به‌دلیل توقف در دروازه کنترل کیفیت، هیچ وظیفه استنتاجی در صف اجرا نشده است.»

---

## ۴. اولویت‌بندی پیشنهادی برای رفع اشکالات (Action Plan)

1. **موج اول (فوری — رفع P0 در `mock-transport.ts` و هم‌ترازی با OpenAPI):** رفع `QA-01` (تریاژ)، `QA-02` (ارجاعات)، `QA-03` (روند پایش R2) و `QA-08` (علائم اپیزود) با تایپ‌گذاری مستقیم کلکسیون‌های `mock-transport.ts` با قراردادهای `~/core/api/contracts`.
2. **موج دوم (دسترسی‌پذیری و تکمیل فرآیند — P1):** رفع کامل تمام خطاهای `axe-core` (`QA-04`)، افزودن فرم خروجی پژوهشی `D5` به `/ops` (`QA-05`)، پیاده‌سازی میان‌برهای `+ / - / 0` نمایشگر (`QA-06`) و افزودن `role="tablist"`/`role="tab"` به تب‌های اپیزود (`QA-07`).
3. **موج سوم (بومی‌سازی ۱۰۰٪ فارسی، Bidi و ظرافت بالینی — P2/P3):** ترجمه کامل تمام Enumها (`QA-09`)، ایزوله‌سازی `<bdi dir="ltr">` (`QA-10`)، اصلاح `padR` نمودار (`QA-11`)، نمایش نام بیمار کنار کد در تریاژ/ارجاع/مطالعه (`QA-12`)، اصلاح جستجوی سراسری (`QA-13`)، فرمت فارسی جدول R2 (`QA-14`)، موج تیره سایدبار Deep Teal (`QA-15`)، اصلاح هایلایت منوی پایش (`QA-16`) و پاکسازی کدهای داخلی طراحی از UI (`QA-17`).
4. **موج چهارم (تست رگرسیون و بازنشر):** افزودن تست رگرسیون برای تمام موارد بالا، اجرای مجدد Playwright + `axe-core` با هدف `0 critical` و `0 serious` در تمامی ۱۳ ماژول، و بازنشر استاتیک روی `https://bina-dashboard.mehtea.ir/`.
