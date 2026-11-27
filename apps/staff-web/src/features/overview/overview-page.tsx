import { lazy, Suspense } from "react";
import {
  Activity,
  BellRing,
  CheckCircle2,
  Eye,
  FilePlus2,
  HeartPulse,
  ScanEye,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router";
import { apiRequest } from "~/core/api/client";
import type {
  OverviewDashboardResponse,
  RecentActivityItem,
} from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useCapabilities } from "~/core/auth/auth-context";
import {
  formatAuditActionFa,
  formatEyeLabelFa,
  formatJalaliDateTime,
  formatPersianDigits,
  formatRoleFa,
  formatTriageStatusFa,
} from "~/core/i18n/fa-ir";
import { DataTable, type DataColumn } from "~/design-system/composites/data-table";
import { MetricCard, PageHeader } from "~/design-system/composites/kpi-and-cards";
import { EyeBadge, StatusBadge, UrgencyBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, LoadingSkeleton, StateSurface } from "~/design-system/primitives/state-surfaces";

const LazyLineChart = lazy(() =>
  import("~/design-system/charts/clinical-charts").then((m) => ({
    default: m.ChronologicalLineChart,
  }))
);

export function OverviewDashboardPage() {
  const { can } = useCapabilities();
  const dashQuery = useScopedQuery<OverviewDashboardResponse>(
    ({ token, signal }) => apiRequest("/v1/overview/dashboard", { token, signal }),
    []
  );
  const activityQuery = useScopedQuery<{ items: RecentActivityItem[] }>(
    ({ token, signal }) => apiRequest("/v1/overview/activity?limit=8", { token, signal }),
    []
  );

  if (dashQuery.loading && !dashQuery.data) {
    return <LoadingSkeleton rows={6} />;
  }
  if (dashQuery.error) {
    return (
      <StateSurface
        kind="error"
        title="خطا در دریافت نمای کلی کلینیک"
        description={dashQuery.error.messageFa}
        onRetry={dashQuery.reload}
      />
    );
  }

  const d = dashQuery.data;
  if (!d) return null;

  const urgentItems = d.queueUrgentItems as Array<{
    caseId: string;
    patientId: string;
    patientNameFa: string;
    eyeLaterality: string;
    status: string;
    slaDueAtIso: string;
  }>;

  const pendingHitl = d.pendingHitlItems as Array<{
    studyId: string;
    patientId: string;
    patientNameFa: string;
    eyeLaterality: string;
    urgencyTier?: string | null;
    createdAtIso: string;
  }>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--grid-gap)" }}>
      <PageHeader
        title="داشبورد کلینیک"
        subtitle="خلاصه وضعیت بیماران، صف تریاژ، بررسی‌های تشخیصی هوش مصنوعی و مراقبت پس از جراحی"
        showWave
        actions={
          <>
            <span className="bina-badge" data-tone="neutral">
              تاریخ: {d.todayJalali}
            </span>
            <Link to="/overview/my-work" className="bina-button" data-variant="secondary">
              کارهای من
            </Link>
            <Link to="/overview/activity" className="bina-button" data-variant="ghost">
              فعالیت‌ها
            </Link>
          </>
        }
      />

      {d.urgentTriageCount > 0 && (
        <AlertBanner
          tone="urgent"
          title={`${formatPersianDigits(d.urgentTriageCount)} پرونده فوری تریاژ منتظر اقدام است`}
          description={
            d.overdueSlaCount > 0
              ? `${formatPersianDigits(d.overdueSlaCount)} مورد از زمان SLA عبور کرده است.`
              : "اولویت‌های ارجاع فوری باید بر اساس پروتکل بررسی شوند."
          }
          action={
            <Link to="/triage?urgencyTier=urgent" className="bina-button" data-variant="urgent">
              مشاهده صف فوری
            </Link>
          }
        />
      )}

      {/* 5 Compact KPI Cards matching 01-Clinical-Dashboard.png (R07) */}
      <div className="bina-kpis">
        <MetricCard
          label="اپیزودهای فعال OD / OS"
          value={`${formatPersianDigits(d.activeEpisodesOd)} / ${formatPersianDigits(d.activeEpisodesOs)}`}
          icon={<Eye size={17} />}
          wellBg="var(--test-well)"
          wellInk="var(--test-ink)"
          metaText="راست / چپ مجزا"
          to="/care"
        />
        <MetricCard
          label="بیماران چاپی و تلفنی"
          value={d.printPhoneCohortCount}
          icon={<HeartPulse size={17} />}
          wellBg="var(--profile-well)"
          wellInk="var(--profile-ink)"
          metaText="Print+Phone"
          to="/care/print-phone"
        />
        <MetricCard
          label="موارد نیازمند اقدام فوری"
          value={d.urgentTriageCount}
          icon={<BellRing size={17} />}
          wellBg="var(--error-bg)"
          wellInk="var(--error)"
          deltaText={d.overdueSlaCount > 0 ? `${formatPersianDigits(d.overdueSlaCount)} تاخیر SLA` : "در مهلت"}
          deltaTone={d.overdueSlaCount > 0 ? "error" : "success"}
          to="/triage?urgencyTier=urgent"
        />
        <MetricCard
          label="مطالعات منتظر تایید پزشک"
          value={d.pendingHitlStudies}
          icon={<ScanEye size={17} />}
          wellBg="var(--plan-well)"
          wellInk="var(--plan-ink)"
          deltaText={d.qcFailedStudies > 0 ? `${formatPersianDigits(d.qcFailedStudies)} رد QC` : "QC آماده"}
          deltaTone={d.qcFailedStudies > 0 ? "warning" : "info"}
          to="/diagnostics"
        />
        <MetricCard
          label="هشدارهای پایش خانگی R2"
          value={d.r2AlertCount}
          icon={<Activity size={17} />}
          wellBg="var(--medication-well)"
          wellInk="var(--medication-ink)"
          metaText={`اختلال فعال: ${formatPersianDigits(d.activeOutagesCount)}`}
          to="/monitoring"
        />
      </div>

      {/* 12-Column Asymmetric Mosaic: Right s3 / Center s5 / Left s4 */}
      <div className="bina-grid">
        {/* Right Column (s3): Operational Split & System Status */}
        <div style={{ gridColumn: "span 3", display: "flex", flexDirection: "column", gap: "var(--grid-gap)" }}>
          <section className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="bina-panel-h3">وضعیت مطالعات تشخیصی AI</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.8125rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>در انتظار تایید چشم‌پزشک (HITL)</span>
                <strong className="bina-number">{formatPersianDigits(d.pendingHitlStudies)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>ردشده در کنترل کیفیت (QC)</span>
                <strong className="bina-number" style={{ color: "var(--error)" }}>
                  {formatPersianDigits(d.qcFailedStudies)}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>پرونده‌های باز تریاژ</span>
                <strong className="bina-number">{formatPersianDigits(d.openTriageCount)}</strong>
              </div>
            </div>
          </section>

          <section className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 className="bina-panel-h3">برنامه مراقبت به تفکیک چشم</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.8125rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>چشم راست (OD)</span>
                <StatusBadge tone="info" label={`${formatPersianDigits(d.activeEpisodesOd)} اپیزود`} showIcon={false} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>چشم چپ (OS)</span>
                <StatusBadge tone="neutral" label={`${formatPersianDigits(d.activeEpisodesOs)} اپیزود`} showIcon={false} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>مراقبت غیرهوشمند</span>
                <StatusBadge tone="warning" label={`${formatPersianDigits(d.printPhoneCohortCount)} نفر`} showIcon={false} />
              </div>
            </div>
          </section>

          <section className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 className="bina-panel-h3">وضعیت سامانه و اختلالات</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8125rem" }}>
              {d.activeOutagesCount === 0 ? (
                <StatusBadge tone="success" label="تمامی سرویس‌ها عملیاتی هستند" />
              ) : (
                <StatusBadge tone="warning" label={`${formatPersianDigits(d.activeOutagesCount)} اختلال فعال ثبت‌شده`} />
              )}
            </div>
            <Link to="/triage/outages" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "none" }}>
              مدیریت گزارش اختلالات کلینیک ←
            </Link>
          </section>
        </div>

        {/* Center Column (s5): Operational Chart + Pending HITL & Recent Activity */}
        <div style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: "var(--grid-gap)" }}>
          <Suspense fallback={<LoadingSkeleton rows={3} />}>
            <LazyLineChart
              title="خلاصه بار کاری مطالعات و پایش کلینیک"
              unit="تعداد"
              eyeLabelFa="نمای تجمیعی کلینیک (چشم‌ها در رکورد مجزا)"
              sourceLabelFa="آمار عملیاتی سرور"
              height={190}
              series={[
                {
                  id: "diagnostics",
                  nameFa: "مطالعات منتظر بررسی",
                  colorVar: "var(--chart-operational-teal)",
                  points: [
                    { label: "شروع بازه", value: Math.max(0, d.pendingHitlStudies - 1) },
                    { label: "میانه", value: d.pendingHitlStudies },
                    { label: "امروز", value: d.pendingHitlStudies + d.qcFailedStudies },
                  ],
                },
                {
                  id: "triage",
                  nameFa: "تریاژ باز",
                  colorVar: "var(--chart-operational-blue)",
                  dashed: true,
                  shape: "diamond",
                  points: [
                    { label: "شروع بازه", value: Math.max(0, d.openTriageCount - 1) },
                    { label: "میانه", value: d.openTriageCount },
                    { label: "امروز", value: d.openTriageCount },
                  ],
                },
              ]}
            />
          </Suspense>

          <section className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="bina-panel-h3">مطالعات منتظر تایید پزشک (HITL)</h2>
              <Link to="/diagnostics" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "none" }}>
                مشاهده همه ←
              </Link>
            </div>
            {pendingHitl.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--muted)" }}>
                در حال حاضر مطالعه منتظر تایید وجود ندارد.
              </p>
            ) : (
              pendingHitl.slice(0, 4).map((item) => (
                <Link
                  key={item.studyId}
                  to={`/diagnostics/${item.studyId}`}
                  className="bina-list-row-link"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: "var(--radius-input)",
                    background: "var(--surface)",
                    border: "1px solid var(--outline-variant)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{item.patientNameFa}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {formatJalaliDateTime(item.createdAtIso, true)}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <EyeBadge eye={item.eyeLaterality} />
                    <UrgencyBadge tier={item.urgencyTier ?? "routine"} />
                  </div>
                </Link>
              ))
            )}
          </section>

          <section className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="bina-panel-h3">آخرین فعالیت‌های کلینیک</h2>
              <Link to="/overview/activity" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "none" }}>
                فهرست کامل ←
              </Link>
            </div>
            {(activityQuery.data?.items ?? []).slice(0, 5).map((act) => (
              <div
                key={act.activityId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  paddingBlock: 6,
                  borderBlockEnd: "1px solid var(--panel-divider)",
                  fontSize: "0.8125rem",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>{formatAuditActionFa(act.action)}</span>
                  {act.reasonFa && <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{act.reasonFa}</div>}
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{act.occurredAtJalali}</span>
              </div>
            ))}
          </section>
        </div>

        {/* Left Column (s4): Urgent Alerts Queue + Quick Actions */}
        <div style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: "var(--grid-gap)" }}>
          <section className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="bina-panel-h3">
                هشدارهای فوری و تریاژ ({formatPersianDigits(urgentItems.length)})
              </h2>
              <Link to="/triage" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "none" }}>
                صف تریاژ ←
              </Link>
            </div>
            {urgentItems.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8125rem", color: "var(--muted)" }}>
                <CheckCircle2 size={16} /> صف هشدارهای فوری خالی است.
              </div>
            ) : (
              urgentItems.slice(0, 5).map((item) => (
                <Link
                  key={item.caseId}
                  to={`/triage?selected=${item.caseId}`}
                  className="bina-list-row-link"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: "var(--radius-input)",
                    background: "var(--surface)",
                    border: "1px solid var(--outline-variant)",
                    borderInlineStart: "3px solid var(--error)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{item.patientNameFa}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {formatEyeLabelFa(item.eyeLaterality)} • وضعیت: {formatTriageStatusFa(item.status)}
                    </div>
                  </div>
                  <UrgencyBadge tier="urgent" />
                </Link>
              ))
            )}
          </section>

          <section className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="bina-panel-h3">دسترسی سریع</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {can("patient:enroll") && (
                <Link
                  to="/patients/new"
                  className="bina-panel bina-quick-tile"
                  style={{
                    background: "var(--surface-aqua)",
                    textDecoration: "none",
                    color: "var(--on-surface)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: 12,
                    textAlign: "center",
                  }}
                >
                  <UserPlus size={20} color="var(--primary)" />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>ثبت بیمار جدید</span>
                </Link>
              )}
              {can("study:upload") && (
                <Link
                  to="/diagnostics/new"
                  className="bina-panel bina-quick-tile"
                  style={{
                    background: "var(--surface-mint)",
                    textDecoration: "none",
                    color: "var(--on-surface)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: 12,
                    textAlign: "center",
                  }}
                >
                  <ScanEye size={20} color="var(--primary)" />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>ایجاد مطالعه تشخیصی</span>
                </Link>
              )}
              {can("episode:create") && (
                <Link
                  to="/care/episodes/new"
                  className="bina-panel bina-quick-tile"
                  style={{
                    background: "var(--surface-cream)",
                    textDecoration: "none",
                    color: "var(--on-surface)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: 12,
                    textAlign: "center",
                  }}
                >
                  <HeartPulse size={20} color="var(--warning)" />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>شروع اپیزود مراقبت</span>
                </Link>
              )}
              {can("report:read") && (
                <Link
                  to="/reports"
                  className="bina-panel bina-quick-tile"
                  style={{
                    background: "var(--surface-soft)",
                    textDecoration: "none",
                    color: "var(--on-surface)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: 12,
                    textAlign: "center",
                  }}
                >
                  <FilePlus2 size={20} color="var(--info)" />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>مرکز گزارش‌های PDF</span>
                </Link>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function MyWorkPage() {
  const dashQuery = useScopedQuery<OverviewDashboardResponse>(
    ({ token, signal }) => apiRequest("/v1/overview/dashboard", { token, signal }),
    []
  );

  if (dashQuery.loading && !dashQuery.data) return <LoadingSkeleton rows={5} />;
  if (dashQuery.error) {
    return (
      <StateSurface
        kind="error"
        title="خطا در دریافت کارهای من"
        description={dashQuery.error.messageFa}
        onRetry={dashQuery.reload}
      />
    );
  }

  const hitl = (dashQuery.data?.pendingHitlItems ?? []) as Array<{
    studyId: string;
    patientId: string;
    patientNameFa: string;
    eyeLaterality: string;
    urgencyTier?: string | null;
    createdAtIso: string;
  }>;
  const urgent = (dashQuery.data?.queueUrgentItems ?? []) as Array<{
    caseId: string;
    patientId: string;
    patientNameFa: string;
    eyeLaterality: string;
    status: string;
    slaDueAtIso: string;
  }>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="میز کار و وظایف جاری"
        subtitle="فهرست تلفیقی مطالعات در انتظار تایید و پرونده‌های فوری تریاژ در کلینیک فعلی"
        breadcrumbs={[{ label: "داشبورد", to: "/overview" }, { label: "کارهای من" }]}
      />
      <div className="bina-grid">
        <div className="bina-panel-raised" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-section-h2">مطالعات منتظر تایید پزشک ({formatPersianDigits(hitl.length)})</h2>
          {hitl.map((h) => (
            <Link key={h.studyId} to={`/diagnostics/${h.studyId}`} className="bina-nav-item">
              <span>{h.patientNameFa} — {formatEyeLabelFa(h.eyeLaterality)}</span>
              <UrgencyBadge tier={h.urgencyTier ?? "routine"} />
            </Link>
          ))}
        </div>
        <div className="bina-panel-raised" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-section-h2">پرونده‌های فوری تریاژ ({formatPersianDigits(urgent.length)})</h2>
          {urgent.map((u) => (
            <Link key={u.caseId} to={`/triage?selected=${u.caseId}`} className="bina-nav-item">
              <span>{u.patientNameFa} — {formatEyeLabelFa(u.eyeLaterality)}</span>
              <StatusBadge tone="urgent" label={formatTriageStatusFa(u.status)} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ActivityFeedPage() {
  const actQuery = useScopedQuery<{ items: RecentActivityItem[] }>(
    ({ token, signal }) => apiRequest("/v1/overview/activity?limit=40", { token, signal }),
    []
  );

  if (actQuery.loading && !actQuery.data) return <LoadingSkeleton rows={6} />;
  if (actQuery.error) {
    return (
      <StateSurface
        kind="error"
        title="خطا در دریافت فعالیت‌ها"
        description={actQuery.error.messageFa}
        onRetry={actQuery.reload}
      />
    );
  }

  const columns: DataColumn<RecentActivityItem>[] = [
    { key: "action", header: "رویداد", render: (r) => <strong>{formatAuditActionFa(r.action)}</strong> },
    { key: "actorRole", header: "نقش انجام‌دهنده", render: (r) => formatRoleFa(r.actorRole) },
    { key: "resourceType", header: "موجودیت", render: (r) => <bdi dir="ltr">{r.resourceType}</bdi> },
    { key: "reasonFa", header: "توضیح", render: (r) => r.reasonFa ?? "—" },
    {
      key: "bg",
      header: "دسترسی اضطراری",
      render: (r) =>
        r.breakGlass ? (
          <StatusBadge tone="error" label="دسترسی اضطراری" />
        ) : (
          <StatusBadge tone="neutral" label="عادی" showIcon={false} />
        ),
    },
    { key: "time", header: "تاریخ جلالی", render: (r) => r.occurredAtJalali },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="جریان فعالیت‌های اخیر کلینیک"
        subtitle="فهرست رویدادهای عملیاتی بدون افشای داده‌های حساس بیماران"
        breadcrumbs={[{ label: "داشبورد", to: "/overview" }, { label: "فعالیت‌های اخیر" }]}
      />
      <AlertBanner
        tone="info"
        title="تفکیک از لاگ کامل ممیزی"
        description="برای بررسی گزارش کامل ممیزی (Audit Log)، تایید مجدد امنیتی در بخش عملیات سیستم (/ops) الزامی است."
      />
      <DataTable
        caption="فعالیت‌های اخیر"
        rows={actQuery.data?.items ?? []}
        columns={columns}
        getRowId={(r) => r.activityId}
      />
    </div>
  );
}
