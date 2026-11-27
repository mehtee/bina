import React, { useEffect, useState } from "react";
import { BarChart3, Download, FileText } from "lucide-react";
import { useSearchParams } from "react-router";
import { apiDownloadBlob, apiRequest } from "~/core/api/client";
import type {
  AiQualityAnalyticsResponse,
  ClinicAnalyticsResponse,
  KpiRatio,
  PilotScorecardResponse,
  ReportDetailResponse,
  ReportListItem,
} from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useAuth } from "~/core/auth/auth-context";
import {
  formatJalaliDateTime,
  formatPercentFa,
  formatPersianDigits,
  KPI_UNAVAILABLE_FA,
} from "~/core/i18n/fa-ir";
import { AdherenceDonutChart } from "~/design-system/charts/clinical-charts";
import { DataTable, type DataColumn } from "~/design-system/composites/data-table";
import { MetricCard, PageHeader } from "~/design-system/composites/kpi-and-cards";
import { Button, StatusBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, LoadingSkeleton, StateSurface } from "~/design-system/primitives/state-surfaces";

export function ReportsCenterPage() {
  const { session } = useAuth();
  const [sp] = useSearchParams();
  const patientFilter = sp.get("patientId") ?? "";
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
  const [pdfErr, setPdfErr] = useState<string | null>(null);

  const listQuery = useScopedQuery<{ items: ReportListItem[]; total: number }>(
    ({ token, signal }) =>
      apiRequest(`/v1/reports${patientFilter ? `?patientId=${patientFilter}` : ""}`, { token, signal }),
    [patientFilter]
  );

  const activeId = selectedReportId ?? listQuery.data?.items?.[0]?.reportId ?? null;

  const detailQuery = useScopedQuery<ReportDetailResponse>(
    ({ token, signal }) => apiRequest(`/v1/reports/${activeId}`, { token, signal }),
    [activeId],
    { enabled: Boolean(activeId) }
  );

  useEffect(() => {
    return () => {
      if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    };
  }, [pdfObjectUrl]);

  async function handlePreviewPdf(reportId: string) {
    if (!session) return;
    setPdfErr(null);
    if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
    try {
      const { blob } = await apiDownloadBlob(`/v1/reports/${reportId}/pdf`, {
        token: session.accessToken,
      });
      const url = URL.createObjectURL(blob);
      setPdfObjectUrl(url);
    } catch {
      setPdfErr("خطا در بارگذاری فایل PDF از سرور.");
    }
  }

  const cols: DataColumn<ReportListItem>[] = [
    { key: "title", header: "عنوان گزارش", render: (r) => <strong>{r.titleFa ?? r.reportType}</strong> },
    { key: "patient", header: "بیمار", render: (r) => r.patientNameFa ?? r.patientId.slice(0, 8) },
    { key: "type", header: "نوع", render: (r) => <bdi dir="ltr">{r.reportType}</bdi> },
    { key: "hash", header: "SHA-256", render: (r) => <bdi dir="ltr" style={{ fontSize: "0.7rem" }}>{r.sourceSha256.slice(0, 12)}…</bdi> },
    { key: "date", header: "تاریخ صدور", render: (r) => formatJalaliDateTime(r.createdAtIso, true) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="مرکز گزارش‌های پزشکی و خروجی PDF وزیرمتن (H01–H07)"
        subtitle="گزارش‌های امضاشده تغییرناپذیر با اصالت‌سنجی هش SHA-256 و دریافت امن بدون قرار دادن توکن در نشانی"
      />

      {pdfErr && <AlertBanner tone="error" title={pdfErr} />}

      <div className="bina-grid">
        <div style={{ gridColumn: "span 7" }}>
          {listQuery.loading && !listQuery.data ? (
            <LoadingSkeleton rows={5} />
          ) : (
            <DataTable
              caption="گزارش‌های صادرشده"
              rows={listQuery.data?.items ?? []}
              columns={cols}
              getRowId={(r) => r.reportId}
              selectedId={activeId}
              onSelectRow={(r) => setSelectedReportId(r.reportId)}
            />
          )}
        </div>

        <aside className="bina-panel-raised" style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: 10 }}>
          {!detailQuery.data ? (
            <div style={{ color: "var(--muted)", fontSize: "0.8125rem" }}>گزارشی را برای مشاهده جزئیات انتخاب کنید.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 className="bina-panel-h3">جزئیات و اصالت گزارش</h2>
                <StatusBadge tone="success" label="صادرشده با فونت وزیرمتن" />
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                شناسه: <bdi dir="ltr">{detailQuery.data.reportId}</bdi>
              </div>
              <div dir="ltr" style={{ fontSize: "0.75rem", background: "var(--code-bg)", padding: 8, borderRadius: 6, wordBreak: "break-all" }}>
                <strong>SHA-256:</strong> {detailQuery.data.sourceSha256}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="primary" icon={<FileText size={15} />} onClick={() => void handlePreviewPdf(detailQuery.data!.reportId)}>
                  پیش‌نمایش PDF
                </Button>
                {pdfObjectUrl && (
                  <a
                    href={pdfObjectUrl}
                    download={`bina-report-${detailQuery.data.reportId.slice(0, 8)}.pdf`}
                    className="bina-button"
                    data-variant="secondary"
                  >
                    <Download size={15} /> دانلود
                  </a>
                )}
              </div>
              {pdfObjectUrl && (
                <iframe
                  title="پیش‌نمایش فایل PDF گزارش"
                  src={pdfObjectUrl}
                  style={{ width: "100%", height: 320, border: "1px solid var(--outline-variant)", borderRadius: 8, background: "#fff" }}
                />
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const clinicQuery = useScopedQuery<ClinicAnalyticsResponse>(
    ({ token, signal }) => apiRequest("/v1/analytics/clinic", { token, signal }),
    []
  );
  const pilotQuery = useScopedQuery<PilotScorecardResponse>(
    ({ token, signal }) => apiRequest("/v1/analytics/pilot", { token, signal }),
    []
  );
  const aiQualityQuery = useScopedQuery<AiQualityAnalyticsResponse>(
    ({ token, signal }) => apiRequest("/v1/analytics/ai-quality", { token, signal }),
    []
  );

  if (pilotQuery.loading && !pilotQuery.data) return <LoadingSkeleton rows={6} />;
  if (pilotQuery.error) {
    return (
      <StateSurface kind="error" title="خطا در دریافت آمار و شاخص‌ها" description={pilotQuery.error.messageFa} onRetry={pilotQuery.reload} />
    );
  }

  const pilot = pilotQuery.data;
  const clinic = clinicQuery.data;
  const aiq = aiQualityQuery.data;

  const pilotAccessModes = (pilot?.kpis.postopAdherenceByAccessMode ?? {}) as Record<string, KpiRatio | undefined>;
  const printPhoneRatio: KpiRatio = pilotAccessModes.print_phone ?? { numerator: 0, denominator: 0, rate: null };
  const medianTurnaround = pilot?.kpis.medianHitlTurnaroundMinutes;
  const medianTurnaroundVal = typeof medianTurnaround === "number" ? medianTurnaround : null;

  const aiMetrics = (aiq?.onlineOperationalMetrics ?? {}) as {
    totalStudies?: number;
    qcPassedAssets?: number;
    urgentFloorTriggeredStudies?: number;
    clinicianFeedbackCounts?: { agree?: number; partially_agree?: number; disagree?: number };
  };

  const toRatio = (v: unknown): KpiRatio => {
    if (v && typeof v === "object" && "numerator" in v && "denominator" in v) {
      return v as KpiRatio;
    }
    return { numerator: 0, denominator: 0, rate: null };
  };

  const pilotRows: Array<{ id: string; titleFa: string; targetFa: string; ratio: KpiRatio }> = pilot
    ? [
        { id: "adh", titleFa: "پایبندی تاییدشده پس از عمل (کل)", targetFa: "≥ ۷۰٪", ratio: toRatio(pilot.kpis.postopAdherenceConfirmedRate) },
        { id: "pp", titleFa: "پایبندی گروه چاپی و تلفنی (Print+Phone)", targetFa: "شامل‌شده در مخرج", ratio: printPhoneRatio },
        { id: "sla", titleFa: "رسیدگی به تریاژ در مهلت SLA", targetFa: "≥ ۹۵٪", ratio: toRatio(pilot.kpis.redFlagTriageSlaContactRate) },
        { id: "ref", titleFa: "نرخ حضور در ارجاع بسته‌حلقه", targetFa: "≥ ۷۵٪", ratio: toRatio(pilot.kpis.closedLoopReferralAttendanceRate) },
        { id: "qc", titleFa: "قبولی کنترل کیفیت (QC) در نوبت اول", targetFa: "≥ ۹۵٪", ratio: toRatio(pilot.kpis.diagnosticQcFirstPassRate) },
        { id: "hitl", titleFa: "تکمیل تایید چشم‌پزشک (HITL)", targetFa: "۱۰۰٪ قبل از انتشار", ratio: toRatio(pilot.kpis.hitlSignoffCompletionRate) },
        { id: "r2", titleFa: "نرخ پذیرش آزمون خانگی معتبر R2", targetFa: "پایلوت", ratio: toRatio(pilot.kpis.r2ValidTestAcceptanceRate) },
      ]
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="آمار کلینیک، کارت امتیاز پایلوت و کیفیت AI (I01–I04)"
        subtitle="اعداد واقعی با صورت/مخرج صریح؛ شاخص‌هایی با مخرج صفر به‌صورت «قابل محاسبه نیست» نمایش داده می‌شوند (هرگز ۰٪ یا ۱۰۰٪ جعلی نیست)."
        showWave
      />

      {clinic && (
        <div className="bina-kpis">
          <MetricCard label="انطباق SLA تریاژ" value={formatPercentFa(clinic.triageSlaCompliance.rate)} icon={<BarChart3 size={17} />} metaText={`${formatPersianDigits(clinic.triageSlaCompliance.numerator)} / ${formatPersianDigits(clinic.triageSlaCompliance.denominator)}`} />
          <MetricCard label="حضور در ارجاعات" value={formatPercentFa(clinic.referralAttendance.rate)} icon={<BarChart3 size={17} />} metaText={`${formatPersianDigits(clinic.referralAttendance.numerator)} / ${formatPersianDigits(clinic.referralAttendance.denominator)}`} />
          <MetricCard
            label="میانه زمان تایید پزشک"
            value={medianTurnaroundVal !== null ? formatPersianDigits(medianTurnaroundVal) : KPI_UNAVAILABLE_FA}
            unit={medianTurnaroundVal !== null ? "دقیقه" : undefined}
            icon={<BarChart3 size={17} />}
          />
        </div>
      )}

      {/* PRD §8.1 Pilot Scorecard I02 */}
      <section className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="bina-section-h2">کارت امتیاز پایلوت (PRD §8.1 — I02)</h2>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>تاریخ محاسبه: {pilot?.generatedAtJalali}</span>
        </div>
        <div className="bina-table-wrap">
          <table className="bina-table">
            <thead>
              <tr>
                <th>شاخص</th>
                <th>هدف PRD</th>
                <th>صورت / مخرج</th>
                <th>نرخ واقعی</th>
              </tr>
            </thead>
            <tbody>
              {pilotRows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.titleFa}</strong></td>
                  <td>{row.targetFa}</td>
                  <td className="bina-number">
                    {formatPersianDigits(row.ratio.numerator)} / {formatPersianDigits(row.ratio.denominator)}
                  </td>
                  <td>
                    <StatusBadge
                      tone={row.ratio.rate === null ? "neutral" : "info"}
                      label={row.ratio.rate === null ? KPI_UNAVAILABLE_FA : formatPercentFa(row.ratio.rate, 1)}
                      showIcon={false}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pilot?.noticeFa && <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{pilot.noticeFa}</div>}
      </section>

      <div className="bina-grid">
        {/* Online AI Operational Metrics vs Offline Benchmark Notice I03 */}
        {aiq && (
          <section className="bina-panel-raised" style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="bina-panel-h3">کیفیت عملیاتی مدل‌های هوش مصنوعی (I03)</h2>
            <AlertBanner tone="info" title="تفکیک معیارهای عملیاتی از ارزیابی برچسب‌خورده" description={aiq.offlineBenchmarkNoticeFa} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: "0.8125rem" }}>
              <div className="bina-panel">کل مطالعات: <strong className="bina-number">{formatPersianDigits(aiMetrics.totalStudies ?? 0)}</strong></div>
              <div className="bina-panel">فایل تایید QC: <strong className="bina-number">{formatPersianDigits(aiMetrics.qcPassedAssets ?? 0)}</strong></div>
              <div className="bina-panel">کف فوریت فعال‌شده: <strong className="bina-number">{formatPersianDigits(aiMetrics.urgentFloorTriggeredStudies ?? 0)}</strong></div>
            </div>
            <div style={{ fontSize: "0.8125rem" }}>
              بازخورد پزشکان: موافق {formatPersianDigits(aiMetrics.clinicianFeedbackCounts?.agree ?? 0)} •
              موافقت نسبی {formatPersianDigits(aiMetrics.clinicianFeedbackCounts?.partially_agree ?? 0)} •
              مخالف {formatPersianDigits(aiMetrics.clinicianFeedbackCounts?.disagree ?? 0)}
            </div>
          </section>
        )}

        {clinic && (
          <section className="bina-panel-raised" style={{ gridColumn: "span 5" }}>
            <h2 className="bina-panel-h3" style={{ marginBottom: 8 }}>توزیع پایبندی به درمان کلینیک</h2>
            <AdherenceDonutChart
              counts={{
                taken: clinic.adherenceDistribution.taken ?? 0,
                missed_with_reason: clinic.adherenceDistribution.missed_with_reason ?? 0,
                unavailable: clinic.adherenceDistribution.unavailable ?? 0,
                no_response: clinic.adherenceDistribution.no_response ?? 0,
              }}
            />
          </section>
        )}
      </div>
    </div>
  );
}
