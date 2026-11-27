import React, { useState } from "react";
import { BookOpen, Eye, HeartPulse, PhoneCall, Plus, Printer } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { apiRequest } from "~/core/api/client";
import type {
  AccessMode,
  CareEpisode,
  CareEpisodeWorklistItem,
  CareEpisodeWorklistResponse,
  ClinicAnalyticsResponse,
  PatientListResponse,
  PrintPhoneQueueItem,
  ReferralRecord,
} from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useAuth, useCapabilities } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import {
  ACCESS_MODE_LABELS_FA,
  formatEyeLabelFa,
  formatJalaliDateTime,
  formatPersianDigits,
  formatProtocolFa,
  formatReferralStatusFa,
  type EyeCode,
} from "~/core/i18n/fa-ir";
import { AdherenceDonutChart } from "~/design-system/charts/clinical-charts";
import { DataTable, SingleEyeSelect, type DataColumn } from "~/design-system/composites/data-table";
import { MetricCard, PageHeader } from "~/design-system/composites/kpi-and-cards";
import { Button, EyeBadge, StatusBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, LoadingSkeleton, StateSurface } from "~/design-system/primitives/state-surfaces";

export function CareDashboardPage() {
  const { can } = useCapabilities();
  const [eyeFilter, setEyeFilter] = useState<"" | EyeCode>("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "completed">("");

  const episodesQuery = useScopedQuery<CareEpisodeWorklistResponse>(
    ({ token, signal }) => {
      const sp = new URLSearchParams();
      if (eyeFilter) sp.set("eyeLaterality", eyeFilter);
      if (statusFilter) sp.set("status", statusFilter);
      const qs = sp.toString();
      return apiRequest(`/v1/episodes${qs ? `?${qs}` : ""}`, { token, signal });
    },
    [eyeFilter, statusFilter]
  );

  const analyticsQuery = useScopedQuery<ClinicAnalyticsResponse>(
    ({ token, signal }) => apiRequest("/v1/analytics/clinic", { token, signal }),
    [],
    { enabled: can("analytics:read") }
  );

  const refsQuery = useScopedQuery<{ items: ReferralRecord[] }>(
    ({ token, signal }) => apiRequest("/v1/referrals", { token, signal }),
    [],
    { enabled: can("triage:manage") }
  );

  const items = episodesQuery.data?.items ?? [];
  const activeOd = items.filter((i) => i.status === "active" && i.eyeLaterality === "OD").length;
  const activeOs = items.filter((i) => i.status === "active" && i.eyeLaterality === "OS").length;
  const printPhoneCount = items.filter((i) => i.accessMode === "print_phone").length;

  const columns: DataColumn<CareEpisodeWorklistItem>[] = [
    {
      key: "patient",
      header: "بیمار",
      render: (ep) => (
        <div>
          <strong>{ep.patientNameFa}</strong>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}><bdi dir="ltr">{ep.phoneMasked}</bdi></div>
        </div>
      ),
    },
    { key: "eye", header: "چشم (تفکیک‌شدنی نیست)", render: (ep) => <EyeBadge eye={ep.eyeLaterality} /> },
    { key: "protocol", header: "پروتکل", render: (ep) => <bdi dir="ltr">{ep.protocolType}</bdi> },
    { key: "rx", header: "نسخه فعال", render: (ep) => `v${formatPersianDigits(ep.activePrescriptionVersion)}` },
    { key: "mode", header: "کانال", render: (ep) => ACCESS_MODE_LABELS_FA[ep.accessMode] },
    { key: "anchor", header: "شروع جراحی", render: (ep) => ep.anchorAtJalali },
    {
      key: "status",
      header: "وضعیت",
      render: (ep) => (
        <StatusBadge
          tone={ep.status === "active" ? "success" : ep.status === "completed" ? "info" : "neutral"}
          label={ep.status === "active" ? "فعال" : ep.status === "completed" ? "تکمیل‌شده" : "لغوشده"}
        />
      ),
    },
    {
      key: "actions",
      header: "مدیریت",
      render: (ep) => (
        <Link to={`/care/episodes/${ep.episodeId}`} className="bina-button" data-variant="secondary" style={{ minBlockSize: 30, fontSize: "0.75rem" }}>
          جزئیات و نسخه
        </Link>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--grid-gap)" }}>
      <PageHeader
        title="مدیریت مراقبت و درمان (E01–E02)"
        subtitle="پایش اپیزودهای مراقبت پس از جراحی با تفکیک کامل چشم راست و چشم چپ، پایبندی ۴ وضعیتی و مسیر Print+Phone"
        showWave
        actions={
          <>
            <Link to="/care/print-phone" className="bina-button" data-variant="secondary">
              <PhoneCall size={15} />
              <span>صف چاپی و تلفنی (E10)</span>
            </Link>
            {can("episode:create") && (
              <Link to="/care/episodes/new" className="bina-button" data-variant="primary">
                <Plus size={15} />
                <span>ایجاد اپیزود جدید (E03)</span>
              </Link>
            )}
          </>
        }
      />

      <div className="bina-kpis">
        <MetricCard label="کل اپیزودها" value={episodesQuery.data?.total ?? 0} icon={<HeartPulse size={17} />} />
        <MetricCard label="اپیزود فعال چشم راست (OD)" value={activeOd} icon={<Eye size={17} />} wellBg="var(--test-well)" wellInk="var(--test-ink)" />
        <MetricCard label="اپیزود فعال چشم چپ (OS)" value={activeOs} icon={<Eye size={17} />} wellBg="var(--plan-well)" wellInk="var(--plan-ink)" />
        <MetricCard label="مسیر Print+Phone" value={printPhoneCount} icon={<Printer size={17} />} wellBg="var(--warning-bg)" wellInk="var(--warning)" to="/care/print-phone" />
      </div>

      <div className="bina-panel-raised" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="فیلتر چشم اپیزودها" className="bina-select" style={{ maxWidth: 200 }} value={eyeFilter} onChange={(e) => setEyeFilter(e.target.value as "" | EyeCode)}>
          <option value="">هر دو چشم (فیلتر نمایش)</option>
          <option value="OD">فقط چشم راست (OD)</option>
          <option value="OS">فقط چشم چپ (OS)</option>
        </select>
        <select aria-label="فیلتر وضعیت اپیزودها" className="bina-select" style={{ maxWidth: 200 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | "active" | "completed")}>
          <option value="">همه وضعیت‌ها</option>
          <option value="active">فعال</option>
          <option value="completed">تکمیل‌شده</option>
        </select>
      </div>

      {episodesQuery.loading && !episodesQuery.data ? (
        <LoadingSkeleton rows={5} />
      ) : episodesQuery.error ? (
        <StateSurface kind="error" title="خطا در دریافت اپیزودها" description={episodesQuery.error.messageFa} onRetry={episodesQuery.reload} />
      ) : (
        <DataTable caption="فهرست دوره‌های مراقبت" rows={items} columns={columns} getRowId={(ep) => ep.episodeId} />
      )}

      <div className="bina-grid">
        <div className="bina-panel-raised" style={{ gridColumn: "span 6" }}>
          <h2 className="bina-panel-h3" style={{ marginBottom: 10 }}>وضعیت پایبندی به دارو (E07)</h2>
          <AdherenceDonutChart
            counts={{
              taken: analyticsQuery.data?.adherenceDistribution?.taken ?? 0,
              missed_with_reason: analyticsQuery.data?.adherenceDistribution?.missed_with_reason ?? 0,
              unavailable: analyticsQuery.data?.adherenceDistribution?.unavailable ?? 0,
              no_response: analyticsQuery.data?.adherenceDistribution?.no_response ?? 0,
            }}
          />
        </div>
        <div className="bina-panel-raised" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="bina-panel-h3">ارجاعات اخیر (E / G)</h2>
            <Link to="/follow-ups/referrals" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "none" }}>
              مدیریت ارجاعات ←
            </Link>
          </div>
          {(refsQuery.data?.items ?? []).slice(0, 4).map((r) => {
            const name = (r as Record<string, unknown>).patientNameFa;
            return (
              <div key={r.referralId} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", paddingBlock: 6, borderBlockEnd: "1px solid var(--panel-divider)" }}>
                <span>{typeof name === "string" && name ? name : `پرونده ${r.caseId.slice(0, 8)}`} — {r.destinationHospitalFa}</span>
                <StatusBadge tone={r.status === "attended" ? "success" : r.status === "missed" ? "error" : "info"} label={formatReferralStatusFa(r.status)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function NewEpisodePage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const [patientId, setPatientId] = useState(sp.get("patientId") ?? "");
  const [eyeLaterality, setEyeLaterality] = useState<EyeCode>("OD");
  const [protocolType, setProtocolType] = useState("post_cataract");
  const [accessMode, setAccessMode] = useState<AccessMode>("app");
  const [anchorAt, setAnchorAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [busy, setBusy] = useState(false);
  const [errorFa, setErrorFa] = useState<string | null>(null);

  const patientsQuery = useScopedQuery<PatientListResponse>(
    ({ token, signal }) => apiRequest("/v1/patients?limit=50", { token, signal }),
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setErrorFa(null);
    try {
      const created = await apiRequest<CareEpisode>("/v1/episodes", {
        method: "POST",
        token: session.accessToken,
        body: {
          patientId,
          protocolType,
          eyeLaterality,
          surgeonId: session.userId,
          accessMode,
          anchorAt: new Date(anchorAt).toISOString(),
        },
      });
      void navigate(`/care/episodes/${created.episodeId}`);
    } catch (err) {
      setErrorFa(toFriendlyError(err).messageFa);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="ثبت اپیزود جراحی و مراقبت جدید (E03)"
        subtitle="هر اپیزود و نسخه دارویی منحصراً متعلق به یک چشم (چشم راست یا چشم چپ) است و هرگز با هم ترکیب نمی‌شوند."
        breadcrumbs={[{ label: "مراقبت", to: "/care" }, { label: "اپیزود جدید" }]}
      />

      {errorFa && <AlertBanner tone="error" title="خطا در ایجاد اپیزود" description={errorFa} />}

      <form onSubmit={(e) => void handleSubmit(e)} className="bina-panel-raised" style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label htmlFor="ep-patient" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>بیمار</label>
          <select id="ep-patient" className="bina-select" required value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">انتخاب بیمار...</option>
            {(patientsQuery.data?.items ?? []).map((p) => (
              <option key={p.patientId} value={p.patientId}>
                {p.fullNameFa} ({p.phoneMasked})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ep-eye" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>چشم هدف (اجباری — تک‌چشم)</label>
          <SingleEyeSelect id="ep-eye" value={eyeLaterality} onChange={setEyeLaterality} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label htmlFor="ep-proto" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>پروتکل بالینی</label>
            <select id="ep-proto" className="bina-select" value={protocolType} onChange={(e) => setProtocolType(e.target.value)}>
              <option value="post_cataract">مراقبت پس از کاتاراکت (post_cataract)</option>
            </select>
          </div>
          <div>
            <label htmlFor="ep-mode" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>شیوه دسترسی</label>
            <select id="ep-mode" className="bina-select" value={accessMode} onChange={(e) => setAccessMode(e.target.value as AccessMode)}>
              <option value="app">اپلیکیشن بیمار</option>
              <option value="caregiver">همراه بیمار</option>
              <option value="print_phone">چاپی و تلفنی (Print+Phone)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="ep-anchor" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>زمان مرجع جراحی (T0)</label>
          <input id="ep-anchor" type="datetime-local" dir="ltr" className="bina-input" value={anchorAt} onChange={(e) => setAnchorAt(e.target.value)} />
        </div>

        <Button type="submit" variant="primary" loading={busy}>ایجاد اپیزود تک‌چشمی</Button>
      </form>
    </div>
  );
}

export function PrintPhoneQueuePage() {
  const { session } = useAuth();
  const [selectedEpisode, setSelectedEpisode] = useState<PrintPhoneQueueItem | null>(null);
  const [outcomeFa, setOutcomeFa] = useState("");
  const [status, setStatus] = useState<"completed" | "pending" | "missed">("completed");
  const [msg, setMsg] = useState<string | null>(null);
  const [errFa, setErrFa] = useState<string | null>(null);

  const qQuery = useScopedQuery<{ items: PrintPhoneQueueItem[]; total: number }>(
    ({ token, signal }) => apiRequest("/v1/care/print-phone", { token, signal }),
    []
  );

  async function handleLogOutreach(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !selectedEpisode) return;
    setErrFa(null);
    try {
      await apiRequest(`/v1/care/print-phone/${selectedEpisode.episodeId}/outreach`, {
        method: "POST",
        token: session.accessToken,
        body: { status, outcomeFa },
      });
      setMsg(`تماس تلفنی برای ${selectedEpisode.patientNameFa} (${formatEyeLabelFa(selectedEpisode.eyeLaterality)}) ثبت شد.`);
      setOutcomeFa("");
      setSelectedEpisode(null);
      qQuery.reload();
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    }
  }

  const cols: DataColumn<PrintPhoneQueueItem>[] = [
    { key: "patient", header: "بیمار", render: (i) => <strong>{i.patientNameFa}</strong> },
    { key: "phone", header: "تماس", render: (i) => <bdi dir="ltr">{i.phoneMasked}</bdi> },
    { key: "eye", header: "چشم", render: (i) => <EyeBadge eye={i.eyeLaterality} /> },
    { key: "rx", header: "نسخه فعال", render: (i) => `v${formatPersianDigits(i.activePrescriptionVersion)}` },
    { key: "last", header: "آخرین پیگیری", render: (i) => i.lastOutreachOutcomeFa ?? "هنوز تماس ثبت نشده" },
    {
      key: "act",
      header: "عملیات",
      render: (i) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="primary" style={{ minBlockSize: 30, fontSize: "0.75rem" }} onClick={() => setSelectedEpisode(i)}>
            ثبت تماس تلفنی
          </Button>
          <Link to={`/care/episodes/${i.episodeId}`} className="bina-button" data-variant="secondary" style={{ minBlockSize: 30, fontSize: "0.75rem" }}>
            نسخه چاپی
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="صف مراقبت غیرهوشمند چاپی و تلفنی (Print+Phone — E10)"
        subtitle="بیماران بدون گوشی هوشمند با حقوق کامل مراقبت، گزارش چاپی درشت‌خط و ثبت تماس‌های دوره‌ای"
        breadcrumbs={[{ label: "مراقبت", to: "/care" }, { label: "چاپی و تلفنی" }]}
      />
      {msg && <AlertBanner tone="success" title={msg} />}
      {errFa && <AlertBanner tone="error" title="خطا" description={errFa} />}

      {selectedEpisode && (
        <form onSubmit={(e) => void handleLogOutreach(e)} className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="bina-panel-h3">
            ثبت نتیجه تماس تلفنی برای {selectedEpisode.patientNameFa} ({formatEyeLabelFa(selectedEpisode.eyeLaterality)})
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            <select aria-label="وضعیت تماس تلفنی" className="bina-select" style={{ maxWidth: 200 }} value={status} onChange={(e) => setStatus(e.target.value as "completed" | "pending" | "missed")}>
              <option value="completed">تماس موفق (تکمیل‌شد)</option>
              <option value="pending">در انتظار پیگیری مجدد</option>
              <option value="missed">پاسخ نداد</option>
            </select>
            <input aria-label="نتیجه تماس و تایید مصرف قطره" className="bina-input" required value={outcomeFa} onChange={(e) => setOutcomeFa(e.target.value)} placeholder="نتیجه تماس و تایید مصرف قطره..." />
            <Button type="submit" variant="primary">ثبت تماس</Button>
            <Button variant="ghost" onClick={() => setSelectedEpisode(null)}>انصراف</Button>
          </div>
        </form>
      )}

      {qQuery.loading && !qQuery.data ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <DataTable caption="صف Print+Phone" rows={qQuery.data?.items ?? []} columns={cols} getRowId={(i) => i.episodeId} />
      )}

      <div className="bina-panel" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8125rem" }}>
        <BookOpen size={16} color="var(--primary)" />
        <span>محتوای آموزشی استاندارد (E09): آموزش چکانیدن صحیح قطره، تفکیک رنگ درب بطری، و هشدارهای علائم قرمز چشم در نسخه چاپی بیمار درج می‌شود.</span>
      </div>
    </div>
  );
}
