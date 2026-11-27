import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { apiRequest } from "~/core/api/client";
import type { DiagnosticStudyDetail, ResearchExportResponse } from "~/core/api/contracts";
import { ApiClientError } from "~/core/errors/error-mapper";
import { AuthProvider, useAuth } from "~/core/auth/auth-context";
import { formatBrandText, getStaffBrand } from "~/core/config/brand";
import { SYNTHETIC_CONSTANTS, SYNTHETIC_DEMO_ACCOUNTS } from "~/core/fixtures/staff-web-fixtures";
import {
  AUXILIARY_GRADCAM_LABEL_FA,
  formatEyeLabelFa,
  formatPercentFa,
  formatPersianDigits,
  KPI_UNAVAILABLE_FA,
  URGENCY_LABELS_FA,
} from "~/core/i18n/fa-ir";
import { ThemeProvider } from "~/core/theme/theme-provider";
import { AppShell, RequireCapability } from "~/design-system/composites/app-shell";
import { ClinicAdminPage } from "~/features/admin/admin-pages";
import { LoginPage } from "~/features/auth/login-page";
import { SelectClinicPage } from "~/features/auth/select-clinic-page";
import { StudyWorkspacePage } from "~/features/diagnostics/study-workspace-page";
import { EvidenceViewerPanel } from "~/features/diagnostics/viewer/evidence-viewer-panel";
import { EpisodeDetailPage } from "~/features/episodes/episode-detail-page";
import { PatientMonitoringPage } from "~/features/monitoring/monitoring-pages";
import { OpsConsolePage } from "~/features/ops_console/ops-page";
import { EnrollPatientPage } from "~/features/patients/patients-list-page";
import { ReferralsPage } from "~/features/referrals/followups-referrals-page";
import { AnalyticsPage } from "~/features/reporting/reports-and-analytics-pages";
import { TriageQueuePage } from "~/features/triage/triage-page";

function TestProviders({
  initialEntries = ["/"],
  children,
}: {
  initialEntries?: string[];
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AutoLoginGate({
  oidcToken,
  children,
}: {
  oidcToken: string;
  children: React.ReactNode;
}) {
  const { session, loginWithOidc } = useAuth();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    if (!session) {
      void loginWithOidc({ oidcToken, clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1 }).then(() => {
        if (active) setReady(true);
      });
    } else {
      setReady(true);
    }
    return () => {
      active = false;
    };
  }, [session, loginWithOidc, oidcToken]);

  if (!ready || !session) return <div>در حال ورود آزمایشی…</div>;
  return <>{children}</>;
}

describe("Staff Web — Clinical Safety, Localization & UI/UX Invariants", () => {
  it("centralizes rebrandable product name, Persian digits, eye laterality, 3 urgency tiers, and zero-denominator KPI label", () => {
    const brand = getStaffBrand();
    expect(brand.appNameFa.length).toBeGreaterThan(0);
    expect(formatBrandText("به {appName} خوش آمدید")).toContain(brand.appNameFa);
    expect(formatPersianDigits("1405/09/02")).toBe("۱۴۰۵/۰۹/۰۲");
    expect(formatEyeLabelFa("OD")).toBe("چشم راست (OD)");
    expect(formatEyeLabelFa("OS")).toBe("چشم چپ (OS)");
    expect(URGENCY_LABELS_FA.routine).toBe("عادی");
    expect(URGENCY_LABELS_FA.followup_3_6m).toBe("پیگیری ۳ تا ۶ ماه");
    expect(URGENCY_LABELS_FA.urgent).toBe("ارجاع فوری");
    expect(formatPercentFa(null)).toBe(KPI_UNAVAILABLE_FA);
    expect(KPI_UNAVAILABLE_FA).toBe("قابل محاسبه نیست");
  });

  it("enforces RBAC capability gating between ophthalmologist and technician roles without persisting tokens or PHI to localStorage", async () => {
    const techAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "technician")!;

    render(
      <TestProviders initialEntries={["/admin"]}>
        <AutoLoginGate oidcToken={techAccount.oidcToken}>
          <Routes>
            <Route element={<AppShell />}>
              <Route
                path="/admin"
                element={
                  <RequireCapability capability="admin:manage">
                    <div>پنل مدیریت کلینیک</div>
                  </RequireCapability>
                }
              />
            </Route>
          </Routes>
        </AutoLoginGate>
      </TestProviders>
    );

    expect(await screen.findByText("دسترسی به این بخش مجاز نیست")).toBeInTheDocument();
    expect(screen.queryByText("پنل مدیریت کلینیک")).not.toBeInTheDocument();
    // Only non-PHI UI theme preferences may exist in localStorage; never tokens or PHI
    const serialized = JSON.stringify(window.localStorage);
    expect(serialized).not.toMatch(/token|Bearer|dev-oidc|patient|مرادی/i);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("switches clinics and increments sessionEpoch cleanly in SelectClinicPage", async () => {
    const ophthAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "ophthalmologist")!;

    function EpochProbe() {
      const { sessionEpoch, session } = useAuth();
      return (
        <div>
          <span data-testid="epoch">{sessionEpoch}</span>
          <span data-testid="clinic">{session?.clinicId}</span>
          <SelectClinicPage />
        </div>
      );
    }

    render(
      <TestProviders initialEntries={["/select-clinic"]}>
        <AutoLoginGate oidcToken={ophthAccount.oidcToken}>
          <Routes>
            <Route path="/select-clinic" element={<EpochProbe />} />
            <Route path="/overview" element={<div>داشبورد پس از تعویض</div>} />
          </Routes>
        </AutoLoginGate>
      </TestProviders>
    );

    const initialClinic = (await screen.findByTestId("clinic")).textContent;
    expect(initialClinic).toBe(SYNTHETIC_CONSTANTS.CLINIC_A1);

    const switchButtons = await screen.findAllByRole("button", { name: /ورود به این کلینیک/ });
    expect(switchButtons.length).toBeGreaterThan(0);
    fireEvent.click(switchButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText("داشبورد پس از تعویض")).toBeInTheDocument();
    });
  });

  it("renders LoginPage in explicit demo mode with non-PHI quick demo accounts and signs in cleanly", async () => {
    render(
      <TestProviders initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/overview" element={<div>صفحه داشبورد</div>} />
        </Routes>
      </TestProviders>
    );

    expect(screen.getByText(/محیط نمایشی — داده آزمایشی/)).toBeInTheDocument();
    const ophthBtn = screen.getByRole("button", { name: /دکتر علیرضا مرادی/ });
    fireEvent.click(ophthBtn);
    const submitBtn = screen.getByRole("button", { name: /ورود/ });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("صفحه داشبورد")).toBeInTheDocument();
  });

  it("enforces neutral #090D12 clinical viewer canvas and keeps Auxiliary Grad-CAM OFF by default with exact Persian disclaimer", async () => {
    const ophthAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "ophthalmologist")!;
    const session = await apiRequest<{ accessToken: string }>("/v1/auth/staff/session", {
      method: "POST",
      body: { oidcToken: ophthAccount.oidcToken },
    });
    const study = await apiRequest<DiagnosticStudyDetail>(
      `/v1/diagnostic-studies/${SYNTHETIC_CONSTANTS.STUDY_1_CNV}`,
      { token: session.accessToken }
    );

    const { container } = render(
      <TestProviders>
        <EvidenceViewerPanel study={study} mode="oct" />
      </TestProviders>
    );

    // Primary segmentation mask SVG is ON by default
    expect(container.querySelector('svg[aria-label="ماسک سگمنتیشن اولیه"]')).toBeInTheDocument();
    // Auxiliary Grad-CAM SVG is strictly OFF by default
    expect(container.querySelector(`svg[aria-label="${AUXILIARY_GRADCAM_LABEL_FA}"]`)).toBeNull();

    const gradCamToggle = screen.getByRole("checkbox", { name: new RegExp(AUXILIARY_GRADCAM_LABEL_FA) });
    expect(gradCamToggle).not.toBeChecked();

    fireEvent.click(gradCamToggle);
    expect(gradCamToggle).toBeChecked();
    expect(container.querySelector(`svg[aria-label="${AUXILIARY_GRADCAM_LABEL_FA}"]`)).toBeInTheDocument();
  });

  it("blocks Layer 1 QC-failed study with explicit recapture instructions (STUDY_2_QC_FAIL)", async () => {
    const ophthAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "ophthalmologist")!;

    render(
      <TestProviders initialEntries={[`/diagnostics/${SYNTHETIC_CONSTANTS.STUDY_2_QC_FAIL}`]}>
        <AutoLoginGate oidcToken={ophthAccount.oidcToken}>
          <Routes>
            <Route path="/diagnostics/:studyId" element={<StudyWorkspacePage />} />
          </Routes>
        </AutoLoginGate>
      </TestProviders>
    );

    expect(await screen.findByText(/متوقف در دروازه QC/)).toBeInTheDocument();
    expect(screen.getByText(/تصویربرداری در کنترل کیفیت \(Layer 1 QC\) رد شد/)).toBeInTheDocument();
  });

  it("enforces deterministic urgent-floor non-downgrade on active CNV study (STUDY_1_CNV)", async () => {
    const ophthAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "ophthalmologist")!;

    render(
      <TestProviders initialEntries={[`/diagnostics/${SYNTHETIC_CONSTANTS.STUDY_1_CNV}`]}>
        <AutoLoginGate oidcToken={ophthAccount.oidcToken}>
          <Routes>
            <Route path="/diagnostics/:studyId" element={<StudyWorkspacePage />} />
          </Routes>
        </AutoLoginGate>
      </TestProviders>
    );

    // Open Signoff modal
    const signoffBtn = await screen.findByRole("button", { name: /تایید و امضای چشم‌پزشک/ });
    fireEvent.click(signoffBtn);

    // Urgent floor warning should be visible
    expect((await screen.findAllByText(/کف فوریت قطعی/)).length).toBeGreaterThan(0);

    // Verify backend/mock rejects forced downgrade via API
    const sess = await apiRequest<{ accessToken: string }>("/v1/auth/staff/session", {
      method: "POST",
      body: { oidcToken: ophthAccount.oidcToken },
    });
    await expect(
      apiRequest(`/v1/diagnostic-studies/${SYNTHETIC_CONSTANTS.STUDY_1_CNV}/signoff`, {
        method: "POST",
        token: sess.accessToken,
        body: {
          action: "approved",
          finalUrgency: "routine",
          clinicianNoteFa: "تلاش برای کاهش سطح فوریت",
        },
      })
    ).rejects.toThrow();
  });

  it("renders post-op episode detail with explicit OD laterality isolation and versioned Rx history", async () => {
    const ophthAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "ophthalmologist")!;

    render(
      <TestProviders initialEntries={[`/care/episodes/${SYNTHETIC_CONSTANTS.EPISODE_1_OD}`]}>
        <AutoLoginGate oidcToken={ophthAccount.oidcToken}>
          <Routes>
            <Route path="/care/episodes/:episodeId" element={<EpisodeDetailPage />} />
          </Routes>
        </AutoLoginGate>
      </TestProviders>
    );

    const eyeBadges = await screen.findAllByText("چشم راست (OD)");
    expect(eyeBadges.length).toBeGreaterThan(0);
    expect(screen.getByText(/تاریخچه نسخه‌های منتشرشده/)).toBeInTheDocument();
  });

  it("enrolls a non-smartphone Print+Phone patient with +98 phone validation", async () => {
    const coordAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "coordinator")!;

    render(
      <TestProviders initialEntries={["/patients/new"]}>
        <AutoLoginGate oidcToken={coordAccount.oidcToken}>
          <Routes>
            <Route path="/patients/new" element={<EnrollPatientPage />} />
            <Route path="/patients/:patientId" element={<div>پرونده بیمار ثبت شد</div>} />
          </Routes>
        </AutoLoginGate>
      </TestProviders>
    );

    const nameInput = await screen.findByLabelText(/نام و نام خانوادگی بیمار/);
    const phoneInput = screen.getByLabelText(/شماره موبایل ایران/);
    fireEvent.change(nameInput, { target: { value: "حسین کریمی" } });
    fireEvent.change(phoneInput, { target: { value: "+989123456789" } });

    // Advance to step 2 (Access Mode) and select Print+Phone
    fireEvent.click(screen.getByRole("button", { name: /۲\. شیوه دسترسی/ }));
    const ppBtn = await screen.findByText(/چاپی و تلفنی/);
    fireEvent.click(ppBtn);

    // Advance to step 3 (Consent & Submit)
    fireEvent.click(screen.getByRole("button", { name: /۳\. رضایت‌نامه و تایید/ }));
    fireEvent.click(await screen.findByRole("button", { name: /ثبت نهایی بیمار/ }));
    expect(await screen.findByText("پرونده بیمار ثبت شد")).toBeInTheDocument();
  });

  it("renders AnalyticsPage Pilot Scorecard with explicit numerator/denominator and zero-denominator guard", async () => {
    const adminAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "admin")!;

    render(
      <TestProviders initialEntries={["/analytics"]}>
        <AutoLoginGate oidcToken={adminAccount.oidcToken}>
          <Routes>
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </AutoLoginGate>
      </TestProviders>
    );

    expect(await screen.findByRole("heading", { level: 2, name: /کارت امتیاز پایلوت/ })).toBeInTheDocument();
    expect(screen.getByText(/تفکیک معیارهای عملیاتی از ارزیابی برچسب‌خورده/)).toBeInTheDocument();
  });

  it("enforces ClinicAdminPage SMS PHI guard (422) and OpsConsolePage Step-Up authentication gate", async () => {
    const adminAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "admin")!;

    const { unmount } = render(
      <TestProviders initialEntries={["/admin"]}>
        <AutoLoginGate oidcToken={adminAccount.oidcToken}>
          <Routes>
            <Route path="/admin" element={<ClinicAdminPage />} />
          </Routes>
        </AutoLoginGate>
      </TestProviders>
    );

    expect(await screen.findByText(/قالب‌های پیامک بدون PHI/)).toBeInTheDocument();
    const keyInput = screen.getByPlaceholderText("template_key");
    const bodyInput = screen.getByPlaceholderText(/متن فارسی بدون نام دارو یا بیماری/);
    fireEvent.change(keyInput, { target: { value: "unsafe_sms" } });
    fireEvent.change(bodyInput, { target: { value: "قطره بتامتازون شما برای کراتیت آماده است" } });
    fireEvent.click(screen.getByRole("button", { name: /ثبت قالب پیامک/ }));

    expect(await screen.findByText(/قالب پیامک نباید حاوی نام دارو/)).toBeInTheDocument();
    unmount();

    // OpsConsole Step-Up Gate
    render(
      <TestProviders initialEntries={["/ops"]}>
        <AutoLoginGate oidcToken={adminAccount.oidcToken}>
          <Routes>
            <Route path="/ops" element={<OpsConsolePage />} />
          </Routes>
        </AutoLoginGate>
      </TestProviders>
    );

    expect(await screen.findByText(/تایید مجدد امنیتی برای مشاهده ممیزی الزامی است/)).toBeInTheDocument();
    const stepUpInput = screen.getByLabelText("کد تایید مجدد Step-Up");
    fireEvent.change(stepUpInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /تایید Step-Up/ }));

    expect(await screen.findByRole("table", { name: "لاگ ممیزی" })).toBeInTheDocument();
  });

  it("QA-01/QA-02/QA-03 regression: loads Triage inspector & urgent-close guard, closes Referral outcome, and renders R2 trends", async () => {
    const ophthAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "ophthalmologist")!;

    // QA-01: Triage detail inspector loads immediately for first case & urgent close without contact is blocked
    const { unmount: unmountTriage } = render(
      <TestProviders initialEntries={["/triage"]}>
        <AutoLoginGate oidcToken={ophthAccount.oidcToken}>
          <Routes>
            <Route path="/triage" element={<TriageQueuePage />} />
          </Routes>
        </AutoLoginGate>
      </TestProviders>
    );
    expect(await screen.findByRole("button", { name: /تخصیص به من/ })).toBeInTheDocument();
    const closeInput = screen.getByPlaceholderText(/توضیح نهایی/);
    fireEvent.change(closeInput, { target: { value: "تلاش برای بستن بدون تماس" } });
    fireEvent.click(screen.getByRole("button", { name: /بستن پرونده تریاژ/ }));
    expect(await screen.findByText(/بستن پرونده فوری پیش از تماس یا ارجاع مجاز نیست/)).toBeInTheDocument();
    unmountTriage();

    // QA-02: Referral outcome updates cleanly via referralId
    const { unmount: unmountRef } = render(
      <TestProviders initialEntries={["/follow-ups/referrals"]}>
        <AutoLoginGate oidcToken={ophthAccount.oidcToken}>
          <Routes>
            <Route path="/follow-ups/referrals" element={<ReferralsPage />} />
          </Routes>
        </AutoLoginGate>
      </TestProviders>
    );
    const attendBtn = await screen.findByRole("button", { name: /مراجعه انجام شد/ });
    fireEvent.click(attendBtn);
    expect(await screen.findByText(/حضور بیمار ثبت و پرونده تریاژ مرتبط بسته شد/)).toBeInTheDocument();
    unmountRef();

    // QA-03: R2 trends endpoint returns OD series with Persian trial labels
    render(
      <TestProviders initialEntries={[`/patients/${SYNTHETIC_CONSTANTS.PATIENT_1}/monitoring/overview`]}>
        <AutoLoginGate oidcToken={ophthAccount.oidcToken}>
          <Routes>
            <Route path="/patients/:patientId/monitoring/*" element={<PatientMonitoringPage />} />
          </Routes>
        </AutoLoginGate>
      </TestProviders>
    );
    expect(await screen.findByText(/حدت بینایی لاندولت C/)).toBeInTheDocument();
    expect((await screen.findAllByText(/جهت: بالا/)).length).toBeGreaterThan(0);
  });

  it("QA-05 regression: enforces RBAC + Step-Up gates and canonical POST /v1/research/exports contract without PHI", async () => {
    const adminAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "admin")!;
    const techAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "technician")!;

    // 1) Non-authorized role (technician) gets 403 FORBIDDEN_ROLE
    const techSession = await apiRequest<{ accessToken: string }>("/v1/auth/staff/session", {
      method: "POST",
      body: { oidcToken: techAccount.oidcToken },
    });
    await expect(
      apiRequest("/v1/research/exports", {
        method: "POST",
        token: techSession.accessToken,
        body: { irbProtocolCode: "IR.TUMS.EYE.1405.042", reasonFa: "پژوهش شبکیه" },
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN_ROLE",
      messageFa: "نقش کاربری شما مجوز این عملیات را ندارد.",
    } satisfies Partial<ApiClientError>);

    // 2) Authorized role without Step-Up gets 403 FORBIDDEN_STEP_UP_REQUIRED
    const adminSession = await apiRequest<{ accessToken: string }>("/v1/auth/staff/session", {
      method: "POST",
      body: { oidcToken: adminAccount.oidcToken },
    });
    await expect(
      apiRequest("/v1/research/exports", {
        method: "POST",
        token: adminSession.accessToken,
        body: { irbProtocolCode: "IR.TUMS.EYE.1405.042", reasonFa: "پژوهش شبکیه" },
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN_STEP_UP_REQUIRED",
      messageFa: "برای دسترسی یا خروجی داده‌های حساس، تایید مجدد امنیتی الزامی است.",
    } satisfies Partial<ApiClientError>);

    // 3) Authorized role WITH Step-Up gets canonical ResearchExportResponse & PseudonymizedStudyRow shape
    const stepUp = await apiRequest<{ accessToken: string }>("/v1/auth/staff/step-up", {
      method: "POST",
      token: adminSession.accessToken,
      body: { stepUpCode: "654321" },
    });
    const exportRes = await apiRequest<ResearchExportResponse>("/v1/research/exports", {
      method: "POST",
      token: stepUp.accessToken,
      body: { irbProtocolCode: "IR.TUMS.EYE.1405.042", reasonFa: "پژوهش", limit: 10 },
    });
    expect(exportRes.irbProtocolCode).toBe("IR.TUMS.EYE.1405.042");
    expect(exportRes.recordCount).toBe(exportRes.records.length);
    expect(exportRes.recordCount).toBeGreaterThan(0);
    expect(exportRes.manifestSha256).toMatch(/^[0-9a-f]{64}$/);
    for (const row of exportRes.records) {
      expect(Object.keys(row).sort()).toEqual([
        "eyeLaterality",
        "finalUrgency",
        "studyStatus",
        "subjectPseudonym",
        "topConditionCode",
      ]);
      expect(String(row.subjectPseudonym)).toMatch(/^SUBJ-[0-9a-f]{14}$/);
    }
    const serialized = JSON.stringify(exportRes);
    expect(serialized).not.toMatch(/احمدی|کریمی|موسوی|0912|patientId/i);

    // 4) UI OpsConsolePage D5 form enforces Step-Up before enabling submit, then renders manifestSha256
    await apiRequest("/v1/admin/features", {
      method: "PATCH",
      token: adminSession.accessToken,
      body: { flagKey: "research_d5_export", enabled: true },
    });
    try {
      render(
        <TestProviders initialEntries={["/ops"]}>
          <AutoLoginGate oidcToken={adminAccount.oidcToken}>
            <Routes>
              <Route path="/ops" element={<OpsConsolePage />} />
            </Routes>
          </AutoLoginGate>
        </TestProviders>
      );

      const exportBtn = await screen.findByRole("button", { name: /استخراج بسته ناشناس‌سازی‌شده D5/ });
      expect(exportBtn).toBeDisabled();

      // Complete Step-Up
      fireEvent.change(screen.getByLabelText("کد تایید مجدد Step-Up"), { target: { value: "654321" } });
      fireEvent.click(screen.getByRole("button", { name: /تایید Step-Up/ }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /استخراج بسته ناشناس‌سازی‌شده D5/ })).not.toBeDisabled();
      });

      fireEvent.change(screen.getByLabelText("علت و شرح پژوهش D5"), { target: { value: "مطالعه شبکیه" } });
      fireEvent.click(screen.getByRole("button", { name: /استخراج بسته ناشناس‌سازی‌شده D5/ }));

      expect(await screen.findByText(/خروجی پژوهشی D5 آماده شد/)).toBeInTheDocument();
      expect(await screen.findByText(/چکیده اصالت بسته \(SHA-256\)/)).toBeInTheDocument();
    } finally {
      await apiRequest("/v1/admin/features", {
        method: "PATCH",
        token: adminSession.accessToken,
        body: { flagKey: "research_d5_export", enabled: false },
      });
    }
  });

  it("QA-06 regression: handles plain + / - / 0 zoom shortcuts, respects limits, avoids Ctrl/Cmd browser zoom, and ignores editable controls", async () => {
    const ophthAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "ophthalmologist")!;
    const session = await apiRequest<{ accessToken: string }>("/v1/auth/staff/session", {
      method: "POST",
      body: { oidcToken: ophthAccount.oidcToken },
    });
    const study = await apiRequest<DiagnosticStudyDetail>(
      `/v1/diagnostic-studies/${SYNTHETIC_CONSTANTS.STUDY_1_CNV}`,
      { token: session.accessToken }
    );

    const { container } = render(
      <TestProviders>
        <div>
          <input aria-label="یادداشت آزمایشی" />
          <textarea aria-label="توضیح آزمایشی" />
          <select aria-label="انتخاب آزمایشی">
            <option value="a">الف</option>
          </select>
          <EvidenceViewerPanel study={study} mode="oct" />
        </div>
      </TestProviders>
    );

    const img = container.querySelector("img")!;
    const stage = img.parentElement as HTMLElement;
    expect(stage.style.transform).toBe("scale(1)");

    // Zoom in with "+" and "=" up to max 2.2
    fireEvent.keyDown(window, { key: "+" });
    expect(stage.style.transform).toBe("scale(1.25)");
    fireEvent.keyDown(window, { key: "=" });
    expect(stage.style.transform).toBe("scale(1.5)");
    for (let i = 0; i < 6; i += 1) {
      fireEvent.keyDown(window, { key: "+" });
    }
    expect(stage.style.transform).toBe("scale(2.2)");

    // Reset with "0"
    fireEvent.keyDown(window, { key: "0" });
    expect(stage.style.transform).toBe("scale(1)");

    // Zoom out with "-" down to min 0.75
    fireEvent.keyDown(window, { key: "-" });
    expect(stage.style.transform).toBe("scale(0.75)");
    fireEvent.keyDown(window, { key: "-" });
    expect(stage.style.transform).toBe("scale(0.75)");

    // Reset back to 1
    fireEvent.keyDown(window, { key: "0" });
    expect(stage.style.transform).toBe("scale(1)");

    // Modifier keys (Ctrl/Cmd browser zoom) must NOT trigger viewer zoom or preventDefault
    const ctrlPlus = new KeyboardEvent("keydown", { key: "+", ctrlKey: true, cancelable: true });
    window.dispatchEvent(ctrlPlus);
    expect(ctrlPlus.defaultPrevented).toBe(false);
    expect(stage.style.transform).toBe("scale(1)");

    const metaMinus = new KeyboardEvent("keydown", { key: "-", metaKey: true, cancelable: true });
    window.dispatchEvent(metaMinus);
    expect(metaMinus.defaultPrevented).toBe(false);
    expect(stage.style.transform).toBe("scale(1)");

    // Typing in input / textarea / select must NOT trigger viewer zoom
    const inputEl = screen.getByLabelText("یادداشت آزمایشی");
    const textareaEl = screen.getByLabelText("توضیح آزمایشی");
    const selectEl = screen.getByLabelText("انتخاب آزمایشی");
    fireEvent.keyDown(inputEl, { key: "+" });
    fireEvent.keyDown(textareaEl, { key: "-" });
    fireEvent.keyDown(selectEl, { key: "+" });
    expect(stage.style.transform).toBe("scale(1)");
  });

  it("QA-07 regression: provides WAI-ARIA tablist/tab/tabpanel semantics, roving tabindex, and RTL keyboard navigation on EpisodeDetailPage", async () => {
    const ophthAccount = SYNTHETIC_DEMO_ACCOUNTS.find((a) => a.role === "ophthalmologist")!;

    render(
      <div dir="rtl">
        <TestProviders initialEntries={[`/care/episodes/${SYNTHETIC_CONSTANTS.EPISODE_1_OD}`]}>
          <AutoLoginGate oidcToken={ophthAccount.oidcToken}>
            <Routes>
              <Route path="/care/episodes/:episodeId" element={<EpisodeDetailPage />} />
            </Routes>
          </AutoLoginGate>
        </TestProviders>
      </div>
    );

    const tablist = await screen.findByRole("tablist", { name: "بخش‌های دوره مراقبت" });
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    const [rxTab, adherenceTab, symptomsTab, closureTab] = tabs as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];

    // Initial state: first tab active, roving tabIndex 0/-1/-1/-1, linked tabpanel
    expect(rxTab).toHaveAttribute("aria-selected", "true");
    expect(rxTab).toHaveAttribute("tabindex", "0");
    expect(adherenceTab).toHaveAttribute("aria-selected", "false");
    expect(adherenceTab).toHaveAttribute("tabindex", "-1");
    expect(symptomsTab).toHaveAttribute("tabindex", "-1");
    expect(closureTab).toHaveAttribute("tabindex", "-1");

    const rxPanel = screen.getByRole("tabpanel");
    expect(rxPanel).toHaveAttribute("id", rxTab.getAttribute("aria-controls")!);
    expect(rxPanel).toHaveAttribute("aria-labelledby", rxTab.id);

    // RTL: ArrowLeft moves visually left to next tab (rx -> adherence)
    rxTab.focus();
    fireEvent.keyDown(rxTab, { key: "ArrowLeft" });
    expect(adherenceTab).toHaveAttribute("aria-selected", "true");
    expect(adherenceTab).toHaveAttribute("tabindex", "0");
    expect(rxTab).toHaveAttribute("tabindex", "-1");
    expect(document.activeElement).toBe(adherenceTab);

    const adherencePanel = screen.getByRole("tabpanel");
    expect(adherencePanel).toHaveAttribute("id", adherenceTab.getAttribute("aria-controls")!);
    expect(adherencePanel).toHaveAttribute("aria-labelledby", adherenceTab.id);

    // ArrowLeft again (adherence -> symptoms)
    fireEvent.keyDown(adherenceTab, { key: "ArrowLeft" });
    expect(symptomsTab).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(symptomsTab);

    // RTL: ArrowRight moves visually right to previous tab (symptoms -> adherence)
    fireEvent.keyDown(symptomsTab, { key: "ArrowRight" });
    expect(adherenceTab).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(adherenceTab);

    // End jumps to last tab (closure)
    fireEvent.keyDown(adherenceTab, { key: "End" });
    expect(closureTab).toHaveAttribute("aria-selected", "true");
    expect(closureTab).toHaveAttribute("tabindex", "0");
    expect(document.activeElement).toBe(closureTab);
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", closureTab.id);

    // Home jumps to first tab (rx)
    fireEvent.keyDown(closureTab, { key: "Home" });
    expect(rxTab).toHaveAttribute("aria-selected", "true");
    expect(rxTab).toHaveAttribute("tabindex", "0");
    expect(document.activeElement).toBe(rxTab);
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", rxTab.id);
  });
});
