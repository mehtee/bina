import React, { useState } from "react";
import { AlertTriangle, BellRing, PhoneCall, Send, ShieldCheck, Wrench } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { apiRequest } from "~/core/api/client";
import type { ClinicOutageRecord, TriageCase, TriageCaseDetailResponse } from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useAuth } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import {
  formatEyeLabelFa,
  formatJalaliDateTime,
  formatPersianDigits,
  formatTriageStatusFa,
  type UrgencyTier,
} from "~/core/i18n/fa-ir";
import { DataTable, type DataColumn } from "~/design-system/composites/data-table";
import { MetricCard, PageHeader } from "~/design-system/composites/kpi-and-cards";
import { Button, EyeBadge, StatusBadge, UrgencyBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, LoadingSkeleton, StateSurface } from "~/design-system/primitives/state-surfaces";

export function TriageQueuePage() {
  const { session } = useAuth();
  const [sp] = useSearchParams();

  const [urgencyFilter, setUrgencyFilter] = useState<"" | UrgencyTier>((sp.get("urgencyTier") as "" | UrgencyTier) || "");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(sp.get("selected"));

  // Action states inside inspector
  const [contactOutcome, setContactOutcome] = useState<"contacted" | "no_answer" | "escalated">("contacted");
  const [contactNote, setContactNote] = useState("");
  const [refHospital, setRefHospital] = useState("بیمارستان تخصصی چشم فارابی");
  const [refReason, setRefReason] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const listQuery = useScopedQuery<{ items: TriageCase[]; total: number }>(
    ({ token, signal }) => {
      const p = new URLSearchParams();
      if (urgencyFilter) p.set("urgencyTier", urgencyFilter);
      if (statusFilter) p.set("status", statusFilter);
      const qs = p.toString();
      return apiRequest(`/v1/triage/cases${qs ? `?${qs}` : ""}`, { token, signal });
    },
    [urgencyFilter, statusFilter]
  );

  const activeId = selectedCaseId ?? listQuery.data?.items?.[0]?.caseId ?? null;

  const detailQuery = useScopedQuery<TriageCaseDetailResponse>(
    ({ token, signal }) => apiRequest(`/v1/triage/cases/${activeId}`, { token, signal }),
    [activeId],
    { enabled: Boolean(activeId) }
  );

  const items = listQuery.data?.items ?? [];
  const urgentCount = items.filter((c) => c.urgencyTier === "urgent" && c.status !== "Closed").length;
  const unassignedCount = items.filter((c) => !c.ownerId && c.status !== "Closed").length;
  const closedCount = items.filter((c) => c.status === "Closed").length;

  async function runCaseAction(fn: () => Promise<void>, successText: string) {
    setActionBusy(true);
    setActionErr(null);
    setActionMsg(null);
    try {
      await fn();
      setActionMsg(successText);
      listQuery.reload();
      detailQuery.reload();
    } catch (err) {
      setActionErr(toFriendlyError(err).messageFa);
    } finally {
      setActionBusy(false);
    }
  }

  const columns: DataColumn<TriageCase>[] = [
    {
      key: "patient",
      header: "بیمار",
      render: (c) => {
        const name = (c as Record<string, unknown>).patientNameFa;
        return <strong>{typeof name === "string" && name ? name : c.patientId.slice(0, 8)}</strong>;
      },
    },
    { key: "eye", header: "چشم", render: (c) => <EyeBadge eye={c.eyeLaterality} /> },
    { key: "urgency", header: "اولویت (۳ سطح مصوب)", render: (c) => <UrgencyBadge tier={c.urgencyTier} /> },
    { key: "status", header: "وضعیت گردش کار", render: (c) => <StatusBadge tone={c.status === "Closed" ? "success" : "info"} label={formatTriageStatusFa(c.status)} /> },
    { key: "sla", header: "مهلت SLA", render: (c) => formatJalaliDateTime(c.slaDueAt, true) },
  ];

  const detail = detailQuery.data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="صف یکپارچه تریاژ و هشدارها (F01–F08)"
        subtitle="تفکیک مستقل سطح فوریت ۳گانه از وضعیت پیگیری، کنترل تماس، ارجاع و حفاظت ضد-بستن پرونده فوری بدون اقدام"
        actions={
          <>
            <Link to="/triage/outages" className="bina-button" data-variant="secondary">
              <Wrench size={15} /> ثبت اختلال کلینیک (F05)
            </Link>
            <Link to="/follow-ups/referrals" className="bina-button" data-variant="secondary">
              پیگیری ارجاعات (G02)
            </Link>
          </>
        }
      />

      {urgentCount > 0 && (
        <AlertBanner
          tone="urgent"
          title={`${formatPersianDigits(urgentCount)} پرونده «ارجاع فوری» باز در صف وجود دارد`}
          description="بستن پرونده فوری پیش از برقراری تماس، ثبت ارجاع یا تایید رد خطا توسط چشم‌پزشک توسط سرور مسدود می‌شود."
        />
      )}

      <div className="bina-kpis">
        <MetricCard label="ارجاع فوری باز" value={urgentCount} icon={<AlertTriangle size={17} />} wellBg="var(--error-bg)" wellInk="var(--error)" />
        <MetricCard label="بدون مسئول (Unassigned)" value={unassignedCount} icon={<BellRing size={17} />} wellBg="var(--warning-bg)" wellInk="var(--warning)" />
        <MetricCard label="کل پرونده‌های فیلترشده" value={listQuery.data?.total ?? 0} icon={<PhoneCall size={17} />} />
        <MetricCard label="بسته‌شده" value={closedCount} icon={<ShieldCheck size={17} />} wellBg="var(--success-bg)" wellInk="var(--success)" />
      </div>

      <div className="bina-panel-raised" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="فیلتر سطح فوریت تریاژ" className="bina-select" style={{ maxWidth: 210 }} value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value as "" | UrgencyTier)}>
          <option value="">همه سطوح فوریت</option>
          <option value="urgent">فقط ارجاع فوری</option>
          <option value="followup_3_6m">پیگیری ۳ تا ۶ ماه</option>
          <option value="routine">عادی</option>
        </select>
        <select aria-label="فیلتر وضعیت گردش کار تریاژ" className="bina-select" style={{ maxWidth: 210 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">همه وضعیت‌ها</option>
          <option value="New">جدید (New)</option>
          <option value="OwnerAssigned">تخصیص‌یافته</option>
          <option value="ContactEstablished">تماس برقرار شد</option>
          <option value="Referred">ارجاع‌شده</option>
          <option value="Closed">بسته‌شده</option>
        </select>
      </div>

      {actionMsg && <AlertBanner tone="success" title={actionMsg} />}
      {actionErr && <AlertBanner tone="error" title="اقدام مجاز نیست / خطا" description={actionErr} />}

      <div className="bina-grid">
        <div style={{ gridColumn: "span 7" }}>
          {listQuery.loading && !listQuery.data ? (
            <LoadingSkeleton rows={6} />
          ) : listQuery.error ? (
            <StateSurface kind="error" title="خطا" description={listQuery.error.messageFa} onRetry={listQuery.reload} />
          ) : (
            <DataTable
              caption="صف پرونده‌های تریاژ"
              rows={items}
              columns={columns}
              getRowId={(c) => c.caseId}
              selectedId={activeId}
              onSelectRow={(c) => setSelectedCaseId(c.caseId)}
            />
          )}
        </div>

        {/* Sticky Detail Inspector (F02, F03, F07) */}
        <aside className="bina-panel-raised" style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: 12 }}>
          {!detail ? (
            <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>یک پرونده را از جدول انتخاب کنید.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div>
                  <h2 className="bina-section-h2">پرونده {detail.triageCase.caseId.slice(0, 8)}</h2>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                    {formatEyeLabelFa(detail.triageCase.eyeLaterality)} • منبع: {detail.triageCase.sourcePillar}
                  </div>
                </div>
                <UrgencyBadge tier={detail.triageCase.urgencyTier} />
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  variant="primary"
                  loading={actionBusy}
                  disabled={!session || detail.triageCase.status === "Closed"}
                  onClick={() =>
                    void runCaseAction(
                      () => apiRequest(`/v1/triage/cases/${detail.triageCase.caseId}/claim`, { method: "POST", token: session!.accessToken, body: {} }),
                      "مسئولیت پرونده به شما تخصیص یافت."
                    )
                  }
                >
                  تخصیص به من (Claim)
                </Button>
                <Link to={`/patients/${detail.triageCase.patientId}`} className="bina-button" data-variant="secondary">
                  پرونده بیمار
                </Link>
              </div>

              {/* Log Contact (F03) */}
              <div className="bina-panel" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h3 className="bina-panel-h3">ثبت تماس تلفنی / پیگیری (F03)</h3>
                <div style={{ display: "flex", gap: 6 }}>
                  <select aria-label="نتیجه تماس تلفنی" className="bina-select" style={{ maxWidth: 160 }} value={contactOutcome} onChange={(e) => setContactOutcome(e.target.value as "contacted" | "no_answer" | "escalated")}>
                    <option value="contacted">تماس برقرار شد</option>
                    <option value="no_answer">پاسخ نداد</option>
                    <option value="escalated">ارجاع به پزشک</option>
                  </select>
                  <input aria-label="خلاصه مکالمه تلفنی" className="bina-input" value={contactNote} onChange={(e) => setContactNote(e.target.value)} placeholder="خلاصه مکالمه..." />
                </div>
                <Button
                  variant="secondary"
                  loading={actionBusy}
                  disabled={!contactNote.trim()}
                  onClick={() =>
                    void runCaseAction(async () => {
                      await apiRequest(`/v1/triage/cases/${detail.triageCase.caseId}/contact`, {
                        method: "POST",
                        token: session!.accessToken,
                        body: { outcome: contactOutcome, channel: "phone", noteFa: contactNote.trim() },
                      });
                      setContactNote("");
                    }, "تماس جدید در تاریخچه پرونده ثبت شد.")
                  }
                >
                  ثبت نتیجه تماس
                </Button>
              </div>

              {/* Dispatch Closed-Loop Referral (G03) */}
              <div className="bina-panel" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h3 className="bina-panel-h3">ایجاد ارجاع بسته‌حلقه (G03)</h3>
                <input aria-label="مرکز درمانی مقصد ارجاع" className="bina-input" value={refHospital} onChange={(e) => setRefHospital(e.target.value)} placeholder="مرکز مقصد" />
                <input aria-label="علت بالینی ارجاع" className="bina-input" value={refReason} onChange={(e) => setRefReason(e.target.value)} placeholder="علت بالینی ارجاع..." />
                <Button
                  variant="secondary"
                  icon={<Send size={14} />}
                  loading={actionBusy}
                  disabled={!refReason.trim()}
                  onClick={() =>
                    void runCaseAction(async () => {
                      await apiRequest(`/v1/triage/cases/${detail.triageCase.caseId}/referrals`, {
                        method: "POST",
                        token: session!.accessToken,
                        body: { destinationHospitalFa: refHospital.trim(), reasonFa: refReason.trim(), urgent: detail.triageCase.urgencyTier === "urgent" },
                      });
                      setRefReason("");
                    }, "ارجاع برای بیمار صادر و ثبت شد.")
                  }
                >
                  ثبت ارجاع
                </Button>
              </div>

              {/* Close Case */}
              {detail.triageCase.status !== "Closed" && (
                <div className="bina-panel" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h3 className="bina-panel-h3">بستن پرونده</h3>
                  <input aria-label="توضیح نهایی بستن پرونده تریاژ" className="bina-input" value={closeNote} onChange={(e) => setCloseNote(e.target.value)} placeholder="توضیح نهایی جهت بستن پرونده (حداقل ۵ کاراکتر)..." />
                  <Button
                    variant="urgent"
                    loading={actionBusy}
                    disabled={closeNote.trim().length < 5}
                    onClick={() =>
                      void runCaseAction(
                        () =>
                          apiRequest(`/v1/triage/cases/${detail.triageCase.caseId}/close`, {
                            method: "POST",
                            token: session!.accessToken,
                            body: { resolutionNoteFa: closeNote.trim(), resolutionType: "resolved" },
                          }),
                        "پرونده با موفقیت بسته شد."
                      )
                    }
                  >
                    بستن پرونده تریاژ
                  </Button>
                </div>
              )}

              {/* Trigger & Contact Timeline */}
              <div style={{ fontSize: "0.75rem" }}>
                <strong>تاریخچه تماس و رویدادها:</strong>
                {(detail.contactLogs ?? []).map((log, i) => {
                  const rec = log as Record<string, unknown>;
                  return (
                    <div key={i} style={{ paddingBlock: 4, borderBlockEnd: "1px solid var(--panel-divider)" }}>
                      {String(rec.noteFa ?? "—")} ({formatJalaliDateTime(String(rec.createdAtIso ?? rec.createdAt ?? ""), true)})
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export function OutagesPage() {
  const { session } = useAuth();
  const [titleFa, setTitleFa] = useState("");
  const [channel, setChannel] = useState<"sms" | "ai_engine" | "ehr_his" | "phone" | "portal">("sms");
  const [severity, setSeverity] = useState<"warning" | "critical">("warning");
  const [msg, setMsg] = useState<string | null>(null);

  const outagesQuery = useScopedQuery<{ items: ClinicOutageRecord[] }>(
    ({ token, signal }) => apiRequest("/v1/triage/outages", { token, signal }),
    []
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    await apiRequest("/v1/triage/outages", {
      method: "POST",
      token: session.accessToken,
      body: { titleFa, affectedChannel: channel, severity },
    });
    setTitleFa("");
    setMsg("اختلال عملیاتی جدید ثبت شد.");
    outagesQuery.reload();
  }

  async function handleResolve(outageId: string) {
    if (!session) return;
    await apiRequest(`/v1/triage/outages/${outageId}`, {
      method: "PATCH",
      token: session.accessToken,
      body: { status: "resolved" },
    });
    outagesQuery.reload();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader title="ثبت و مدیریت اختلالات کلینیک" breadcrumbs={[{ label: "تریاژ", to: "/triage" }, { label: "اختلالات" }]} />
      {msg && <AlertBanner tone="success" title={msg} />}
      <form onSubmit={(e) => void handleCreate(e)} className="bina-panel-raised" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input aria-label="شرح اختلال کانال" className="bina-input" style={{ maxWidth: 320 }} required value={titleFa} onChange={(e) => setTitleFa(e.target.value)} placeholder="شرح اختلال کانال..." />
        <select aria-label="کانال دچار اختلال" className="bina-select" style={{ maxWidth: 160 }} value={channel} onChange={(e) => setChannel(e.target.value as "sms" | "ai_engine" | "ehr_his" | "phone" | "portal")}>
          <option value="sms">درگاه پیامک</option>
          <option value="ai_engine">موتور AI</option>
          <option value="ehr_his">اتصال HIS</option>
          <option value="phone">خط تلفن</option>
        </select>
        <select aria-label="شدت اختلال" className="bina-select" style={{ maxWidth: 150 }} value={severity} onChange={(e) => setSeverity(e.target.value as "warning" | "critical")}>
          <option value="warning">هشدار</option>
          <option value="critical">بحرانی</option>
        </select>
        <Button type="submit" variant="primary">ثبت اختلال</Button>
      </form>
      {(outagesQuery.data?.items ?? []).map((o) => (
        <div key={o.outageId} className="bina-panel-raised" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>{o.titleFa}</strong>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>کانال: {o.affectedChannel} • شدت: {o.severity} • وضعیت: {o.status}</div>
          </div>
          {o.status !== "resolved" && (
            <Button variant="secondary" onClick={() => void handleResolve(o.outageId)}>ثبت رفع اختلال</Button>
          )}
        </div>
      ))}
    </div>
  );
}
