import React, { lazy, Suspense, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Eye, Plus, ShieldOff, Smartphone } from "lucide-react";
import { Link, useParams } from "react-router";
import { apiRequest } from "~/core/api/client";
import type {
  DeviceQualificationRecord,
  HomeVisionTestRecord,
  IopReadingRecord,
  MonitoringPlanRecord,
  PatientIopListResponse,
  PatientListResponse,
  PatientVisionTrendsResponse,
  R2MonitoringOverviewResponse,
  R2SessionDetailResponse,
} from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useAuth, useCapabilities } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import {
  formatEyeLabelFa,
  formatJalaliDateTime,
  formatPersianDigits,
  formatR2TrialPayloadFa,
  R2_QUALITY_LABELS_FA,
  R2_TEST_TYPE_LABELS_FA,
  type EyeCode,
} from "~/core/i18n/fa-ir";
import { DataTable, SingleEyeSelect, type DataColumn } from "~/design-system/composites/data-table";
import { MetricCard, PageHeader } from "~/design-system/composites/kpi-and-cards";
import { Button, EyeBadge, StatusBadge, UrgencyBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, LoadingSkeleton, StateSurface } from "~/design-system/primitives/state-surfaces";

const LazyLineChart = lazy(() =>
  import("~/design-system/charts/clinical-charts").then((m) => ({
    default: m.ChronologicalLineChart,
  }))
);

export function MonitoringOverviewPage() {
  const { session } = useAuth();
  const { can } = useCapabilities();
  const [modelCode, setModelCode] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [killReason, setKillReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [errFa, setErrFa] = useState<string | null>(null);

  const overviewQuery = useScopedQuery<R2MonitoringOverviewResponse>(
    ({ token, signal }) => apiRequest("/v1/r2/monitoring/overview", { token, signal }),
    []
  );
  const devicesQuery = useScopedQuery<{ items: DeviceQualificationRecord[] }>(
    ({ token, signal }) => apiRequest("/v1/r2/devices", { token, signal }),
    []
  );
  const patientsQuery = useScopedQuery<PatientListResponse>(
    ({ token, signal }) => apiRequest("/v1/patients?limit=25", { token, signal }),
    []
  );

  async function handleAddDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setErrFa(null);
    try {
      await apiRequest("/v1/r2/devices", {
        method: "POST",
        token: session.accessToken,
        body: { modelCode, manufacturer, verifiedStatus: "qualified", displayPpi: 400 },
      });
      setModelCode("");
      setManufacturer("");
      setMsg("دستگاه در رجیستری صلاحیت ثبت شد.");
      devicesQuery.reload();
      overviewQuery.reload();
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    }
  }

  async function handleToggleKillSwitch(dev: DeviceQualificationRecord) {
    if (!session) return;
    const nextStatus = dev.verifiedStatus === "killed" ? "qualified" : "killed";
    if (nextStatus === "killed" && killReason.trim().length < 5) {
      setErrFa("برای فعال‌سازی Kill-Switch، ثبت دلیل ایمنی (حداقل ۵ کاراکتر) الزامی است.");
      return;
    }
    setErrFa(null);
    try {
      await apiRequest(`/v1/r2/devices/${dev.deviceId}`, {
        method: "PATCH",
        token: session.accessToken,
        body: {
          verifiedStatus: nextStatus,
          killSwitchReasonFa: nextStatus === "killed" ? killReason.trim() : undefined,
        },
      });
      setMsg(nextStatus === "killed" ? `دستگاه ${dev.modelCode} مسدود شد.` : `دستگاه ${dev.modelCode} مجدداً مجاز شد.`);
      devicesQuery.reload();
      overviewQuery.reload();
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    }
  }

  const d = overviewQuery.data;

  const deviceCols: DataColumn<DeviceQualificationRecord>[] = [
    { key: "model", header: "مدل دستگاه", render: (r) => <bdi dir="ltr"><strong>{r.modelCode}</strong></bdi> },
    { key: "mfg", header: "سازنده", render: (r) => r.manufacturer },
    {
      key: "status",
      header: "وضعیت صلاحیت",
      render: (r) => (
        <StatusBadge
          tone={r.verifiedStatus === "qualified" ? "success" : r.verifiedStatus === "killed" ? "error" : "warning"}
          label={r.verifiedStatus === "qualified" ? "تاییدشده" : r.verifiedStatus === "killed" ? "مسدود (Kill-Switch)" : "موقت"}
        />
      ),
    },
    { key: "reason", header: "توضیح", render: (r) => r.killSwitchReasonFa ?? "—" },
    {
      key: "act",
      header: "کلید قطع ایمنی",
      render: (r) =>
        can("r2:manage") ? (
          <Button
            variant={r.verifiedStatus === "killed" ? "secondary" : "urgent"}
            style={{ minBlockSize: 30, fontSize: "0.75rem" }}
            onClick={() => void handleToggleKillSwitch(r)}
          >
            {r.verifiedStatus === "killed" ? "بازگشایی دستگاه" : "قطع ایمنی (Kill)"}
          </Button>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="پایش بینایی خانگی R2 و رجیستری دستگاه‌ها (D01, D10, D12)"
        subtitle="پایش کالیبره‌شده لاندولت C و آمسلر، تشخیص تغییر قابل اتکا (EWMA/CUSUM) و کنترل صلاحیت دستگاه‌ها"
        showWave
      />

      {msg && <AlertBanner tone="success" title={msg} />}
      {errFa && <AlertBanner tone="error" title="خطا" description={errFa} />}

      {overviewQuery.loading && !d ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <div className="bina-kpis">
          <MetricCard label="بیماران در پایش" value={d?.enrolledPatientCount ?? 0} icon={<Eye size={17} />} />
          <MetricCard label="برنامه‌های پایش فعال" value={d?.activePlanCount ?? 0} icon={<Activity size={17} />} />
          <MetricCard label="آزمون‌های پذیرفته‌شده" value={d?.acceptedTestCount ?? 0} icon={<CheckCircle2 size={17} />} wellBg="var(--success-bg)" wellInk="var(--success)" />
          <MetricCard label="هشدارهای فعال روند" value={d?.activeAlertCount ?? 0} icon={<AlertTriangle size={17} />} wellBg="var(--warning-bg)" wellInk="var(--warning)" />
          <MetricCard label="دستگاه‌های مسدودشده" value={d?.killedDeviceCount ?? 0} icon={<ShieldOff size={17} />} wellBg="var(--error-bg)" wellInk="var(--error)" />
        </div>
      )}

      <div className="bina-grid">
        {/* Patient list drilldown to D02 */}
        <div className="bina-panel-raised" style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-panel-h3">انتخاب بیمار برای پایش تفکیکی (D02)</h2>
          {(patientsQuery.data?.items ?? []).map((p) => (
            <Link key={p.patientId} to={`/patients/${p.patientId}/monitoring/overview`} className="bina-nav-item">
              <span>{p.fullNameFa}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>نمای پایش ←</span>
            </Link>
          ))}
        </div>

        {/* Latest R2 Trend Alerts (D12) */}
        <div className="bina-panel-raised" style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-panel-h3">هشدارهای روند تغییرات R2 (D12)</h2>
          {(d?.latestAlerts ?? []).map((a) => (
            <div key={a.id} className="bina-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{a.summaryFa}</strong>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  {formatEyeLabelFa(a.eyeLaterality)} • EWMA: {a.ewmaValue} • CUSUM: {a.cusumValue}
                </div>
              </div>
              <UrgencyBadge tier={a.severity} />
            </div>
          ))}
        </div>
      </div>

      {/* Device Registry D10 */}
      <section className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 className="bina-section-h2" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Smartphone size={18} /> رجیستری صلاحیت دستگاه‌ها و Kill-Switch (D10)
        </h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input aria-label="دلیل مسدودسازی دستگاه" className="bina-input" style={{ maxWidth: 280 }} value={killReason} onChange={(e) => setKillReason(e.target.value)} placeholder="دلیل مسدودسازی دستگاه (در صورت Kill)..." />
          {can("r2:manage") && (
            <form onSubmit={(e) => void handleAddDevice(e)} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input dir="ltr" aria-label="کد مدل دستگاه" className="bina-input" style={{ maxWidth: 160 }} required value={modelCode} onChange={(e) => setModelCode(e.target.value)} placeholder="Model Code" />
              <input aria-label="شرکت سازنده دستگاه" className="bina-input" style={{ maxWidth: 150 }} required value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="سازنده" />
              <Button type="submit" variant="primary" icon={<Plus size={14} />}>ثبت دستگاه</Button>
            </form>
          )}
        </div>
        <DataTable caption="رجیستری دستگاه‌ها" rows={devicesQuery.data?.items ?? []} columns={deviceCols} getRowId={(dev) => dev.deviceId} />
      </section>
    </div>
  );
}

export function PatientMonitoringPage() {
  const { patientId } = useParams();
  const { session } = useAuth();
  const { isFeatureEnabled, can } = useCapabilities();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [planEye, setPlanEye] = useState<EyeCode>("OD");
  const [cadenceDays, setCadenceDays] = useState(7);
  const [planMsg, setPlanMsg] = useState<string | null>(null);

  const trendsQuery = useScopedQuery<PatientVisionTrendsResponse>(
    ({ token, signal }) => apiRequest(`/v1/r2/patients/${patientId}/trends`, { token, signal }),
    [patientId]
  );
  const sessionsQuery = useScopedQuery<{ items: HomeVisionTestRecord[]; total: number }>(
    ({ token, signal }) => apiRequest(`/v1/r2/patients/${patientId}/sessions`, { token, signal }),
    [patientId]
  );
  const plansQuery = useScopedQuery<{ items: MonitoringPlanRecord[] }>(
    ({ token, signal }) => apiRequest(`/v1/r2/patients/${patientId}/plans`, { token, signal }),
    [patientId]
  );
  const iopQuery = useScopedQuery<PatientIopListResponse>(
    ({ token, signal }) => apiRequest(`/v1/r2/patients/${patientId}/iop`, { token, signal }),
    [patientId],
    { enabled: isFeatureEnabled("icare_home2_iop") }
  );

  const activeSessionId = selectedSessionId ?? sessionsQuery.data?.items?.[0]?.id ?? null;
  const sessionDetailQuery = useScopedQuery<R2SessionDetailResponse>(
    ({ token, signal }) => apiRequest(`/v1/r2/sessions/${activeSessionId}`, { token, signal }),
    [activeSessionId],
    { enabled: Boolean(activeSessionId) }
  );

  const odPoints = (trendsQuery.data?.od ?? []).map((p) => ({
    label: formatJalaliDateTime(p.recordedAt),
    value: p.vaLogmar ?? null,
  }));
  const osPoints = (trendsQuery.data?.os ?? []).map((p) => ({
    label: formatJalaliDateTime(p.recordedAt),
    value: p.vaLogmar ?? null,
  }));
  const odBaselineRef = trendsQuery.data?.od?.[0]?.vaLogmar ?? null;

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !patientId) return;
    await apiRequest(`/v1/r2/patients/${patientId}/plans`, {
      method: "POST",
      token: session.accessToken,
      body: {
        eyeLaterality: planEye,
        testTypes: ["landolt_c", "amsler"],
        cadenceDays,
        alertThresholdLogmar: 0.2,
        active: true,
      },
    });
    setPlanMsg(`برنامه پایش برای ${formatEyeLabelFa(planEye)} ایجاد شد.`);
    plansQuery.reload();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="پایش طولی بینایی خانگی بیمار (D02–D09)"
        breadcrumbs={[{ label: "پایش خانگی", to: "/monitoring" }, { label: patientId?.slice(0, 8) ?? "" }]}
      />
      {planMsg && <AlertBanner tone="success" title={planMsg} />}

      <div className="bina-grid">
        {/* Landolt C VA Trend (D04/D08) */}
        <div style={{ gridColumn: "span 7" }}>
          <Suspense fallback={<LoadingSkeleton rows={4} />}>
            <LazyLineChart
              title="روند حدت بینایی خانگی (لاندولت C — logMAR)"
              unit="logMAR"
              eyeLabelFa="مقایسه مجزای چشم راست (OD) و چشم چپ (OS)"
              sourceLabelFa="آزمون کالیبره‌شده خانگی (نقاط ردشده حذف/علامت‌گذاری شده‌اند)"
              referenceValue={odBaselineRef}
              referenceLabelFa="خط پایه چشم راست"
              series={[
                { id: "od-va", nameFa: "چشم راست (OD)", colorVar: "var(--chart-od)", shape: "circle", points: odPoints.length > 0 ? odPoints : [{ label: "—", value: null }] },
                { id: "os-va", nameFa: "چشم چپ (OS)", colorVar: "var(--chart-os)", dashed: true, shape: "diamond", points: osPoints.length > 0 ? osPoints : [{ label: "—", value: null }] },
              ]}
            />
          </Suspense>
        </div>

        {/* Non-mirrored Amsler Comparison (D05) */}
        <div className="bina-panel-raised" style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="bina-panel-h3">مقایسه شبکه آمسلر هم‌مقیاس (D05 — بدون آینه‌سازی)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} dir="ltr">
            {["Baseline (OD)", "Latest (OD)"].map((title, idx) => (
              <div key={title} className="bina-panel" style={{ textAlign: "center", background: "var(--vf-paper)", color: "var(--vf-ink)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: 6 }}>{title}</div>
                <svg viewBox="0 0 100 100" width="100%" style={{ maxWidth: 130 }}>
                  {[20, 40, 60, 80].map((pos) => (
                    <React.Fragment key={pos}>
                      <line x1={pos} y1={0} x2={pos} y2={100} stroke="#40565D" strokeWidth={0.8} />
                      <line x1={0} y1={pos} x2={100} y2={pos} stroke="#40565D" strokeWidth={0.8} />
                    </React.Fragment>
                  ))}
                  <circle cx={50} cy={50} r={2.5} fill="#171717" />
                  {idx === 1 && <ellipse cx={58} cy={46} rx={12} ry={8} fill="rgba(167,45,53,0.22)" stroke="#A72D35" strokeWidth={1.2} />}
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gated iCare HOME2 (D03) & Gated Home VR VF (D11) */}
      <div className="bina-grid">
        <div className="bina-panel-raised" style={{ gridColumn: "span 7" }}>
          <h2 className="bina-panel-h3" style={{ marginBottom: 8 }}>فشار داخل چشم خانگی iCare HOME2 [G — D03]</h2>
          {!isFeatureEnabled("icare_home2_iop") ? (
            <StateSurface kind="gated" title="اتصال فشارسنج خانگی غیرفعال است" description="قابلیت icare_home2_iop برای این کلینیک فعال نشده است." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(iopQuery.data?.items ?? []).map((r: IopReadingRecord) => (
                <div key={r.readingId} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", padding: 6, borderBlockEnd: "1px solid var(--panel-divider)" }}>
                  <span>{r.eyeLabelFa} — <strong className="bina-number">{formatPersianDigits(r.iopMmHg)} mmHg</strong></span>
                  <span>کیفیت: <bdi dir="ltr">{r.qualityScore}</bdi> • {formatJalaliDateTime(r.measuredAtIso, true)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bina-panel-raised" style={{ gridColumn: "span 5" }}>
          <h2 className="bina-panel-h3" style={{ marginBottom: 8 }}>میدان بینایی خانگی VR [پیشنهادی / D11]</h2>
          <StateSurface
            kind="gated"
            title="پروتکل VR خانگی تایید نشده است"
            description="مطابق PRD/ADR، میدان بینایی خانگی VR جزو الحاقات پیشنهادی است و با نتایج HFA کلینیک ادغام نمی‌شود."
          />
        </div>
      </div>

      {/* Monitoring Plan (D09) & Session Raw Trials (D06/D07) */}
      <div className="bina-grid">
        <form onSubmit={(e) => void handleCreatePlan(e)} className="bina-panel-raised" style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-panel-h3">برنامه پایش</h2>
          <SingleEyeSelect value={planEye} onChange={setPlanEye} ariaLabel="چشم برنامه پایش" />
          <label htmlFor="r2-cadence-days" style={{ fontSize: "0.75rem", fontWeight: 600 }}>دوره تکرار (روز)</label>
          <input id="r2-cadence-days" type="number" min={1} max={90} className="bina-input" value={cadenceDays} onChange={(e) => setCadenceDays(Number(e.target.value))} />
          <Button type="submit" variant="primary" disabled={!can("r2:manage")}>ثبت برنامه پایش</Button>
          {(plansQuery.data?.items ?? []).map((pl) => (
            <div key={pl.planId} className="bina-panel" style={{ fontSize: "0.75rem" }}>
              {pl.eyeLabelFa} — هر {formatPersianDigits(pl.cadenceDays)} روز ({pl.testTypes.map((t) => R2_TEST_TYPE_LABELS_FA[t] ?? t).join("، ")})
            </div>
          ))}
        </form>

        <div className="bina-panel-raised" style={{ gridColumn: "span 8", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-panel-h3">جزئیات جلسه و داده‌های آزمون (تغییرناپذیر)</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(sessionsQuery.data?.items ?? []).map((s) => (
              <Button
                key={s.id}
                variant={activeSessionId === s.id ? "primary" : "secondary"}
                onClick={() => setSelectedSessionId(s.id)}
                style={{ minBlockSize: 30, fontSize: "0.75rem" }}
              >
                {formatJalaliDateTime(s.measuredAtIso)} ({s.eyeLaterality})
              </Button>
            ))}
          </div>
          {sessionDetailQuery.data && (
            <>
              <div style={{ display: "flex", gap: 10, fontSize: "0.8125rem", flexWrap: "wrap" }}>
                <EyeBadge eye={sessionDetailQuery.data.session.eyeLaterality} />
                <span>نوع آزمون: {R2_TEST_TYPE_LABELS_FA[sessionDetailQuery.data.session.testType] ?? sessionDetailQuery.data.session.testType}</span>
                <span>logMAR: {sessionDetailQuery.data.session.vaLogmar !== null && sessionDetailQuery.data.session.vaLogmar !== undefined ? formatPersianDigits(sessionDetailQuery.data.session.vaLogmar) : "—"}</span>
                <StatusBadge
                  tone={sessionDetailQuery.data.session.qualityStatus === "accepted" ? "success" : "error"}
                  label={R2_QUALITY_LABELS_FA[sessionDetailQuery.data.session.qualityStatus] ?? sessionDetailQuery.data.session.qualityStatus}
                />
              </div>
              <div className="bina-table-wrap">
                <table className="bina-table">
                  <thead>
                    <tr>
                      <th>شماره</th>
                      <th>محرک</th>
                      <th>پاسخ</th>
                      <th>زمان واکنش (ms)</th>
                      <th>صحت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionDetailQuery.data.trials.map((tr) => (
                      <tr key={tr.trialId}>
                        <td>{formatPersianDigits(tr.trialIndex)}</td>
                        <td>{formatR2TrialPayloadFa(tr.stimulus)}</td>
                        <td>{formatR2TrialPayloadFa(tr.response)}</td>
                        <td className="bina-number">{tr.reactionMs !== null && tr.reactionMs !== undefined ? formatPersianDigits(tr.reactionMs) : "—"}</td>
                        <td>{tr.correct ? "درست" : "غلط"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
