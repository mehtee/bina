import React, { useState } from "react";
import { CalendarCheck, CheckCircle2, Send } from "lucide-react";
import { Link } from "react-router";
import { apiRequest } from "~/core/api/client";
import type { FollowUpTaskRecord, PatientListResponse, ReferralRecord } from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useAuth } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import {
  formatFollowUpStatusFa,
  formatFollowUpTypeFa,
  formatJalaliDateTime,
  formatReferralStatusFa,
  type EyeCode,
} from "~/core/i18n/fa-ir";
import { DataTable, SingleEyeSelect, type DataColumn } from "~/design-system/composites/data-table";
import { PageHeader } from "~/design-system/composites/kpi-and-cards";
import { Button, EyeBadge, StatusBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, LoadingSkeleton } from "~/design-system/primitives/state-surfaces";

export function FollowUpsPage() {
  const { session } = useAuth();
  const [statusFilter, setStatusFilter] = useState("");
  const [patientId, setPatientId] = useState("");
  const [eye, setEye] = useState<EyeCode>("OD");
  const [taskType, setTaskType] = useState<"postop_call" | "print_phone_checkin" | "clinic_visit" | "referral_followup" | "r2_recalibration">("postop_call");
  const [outcomeFa, setOutcomeFa] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [errFa, setErrFa] = useState<string | null>(null);

  const tasksQuery = useScopedQuery<{ items: FollowUpTaskRecord[]; total: number }>(
    ({ token, signal }) => apiRequest(`/v1/follow-ups${statusFilter ? `?status=${statusFilter}` : ""}`, { token, signal }),
    [statusFilter]
  );
  const patientsQuery = useScopedQuery<PatientListResponse>(
    ({ token, signal }) => apiRequest("/v1/patients?limit=50", { token, signal }),
    []
  );

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !patientId) return;
    setErrFa(null);
    try {
      await apiRequest("/v1/follow-ups", {
        method: "POST",
        token: session.accessToken,
        body: {
          patientId,
          eyeLaterality: eye,
          taskType,
          dueAt: new Date(Date.now() + 86400_000).toISOString(),
          outcomeFa: outcomeFa.trim() || undefined,
        },
      });
      setMsg("وظیفه پیگیری جدید ثبت شد.");
      setOutcomeFa("");
      tasksQuery.reload();
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    }
  }

  async function handleUpdateStatus(taskId: string, status: "completed" | "missed") {
    if (!session) return;
    await apiRequest(`/v1/follow-ups/${taskId}`, {
      method: "PATCH",
      token: session.accessToken,
      body: { status, outcomeFa: status === "completed" ? "پیگیری با بیمار تکمیل شد" : "عدم پاسخ در نوبت پیگیری" },
    });
    tasksQuery.reload();
  }

  const cols: DataColumn<FollowUpTaskRecord>[] = [
    { key: "patient", header: "بیمار", render: (t) => <strong>{t.patientNameFa ?? t.patientId.slice(0, 8)}</strong> },
    { key: "eye", header: "چشم", render: (t) => t.eyeLaterality ? <EyeBadge eye={t.eyeLaterality} /> : "عمومی" },
    { key: "type", header: "نوع پیگیری", render: (t) => formatFollowUpTypeFa(t.taskType) },
    { key: "due", header: "سررسید جلالی", render: (t) => t.dueAtJalali },
    { key: "status", header: "وضعیت", render: (t) => <StatusBadge tone={t.status === "completed" ? "success" : t.status === "missed" ? "error" : "warning"} label={formatFollowUpStatusFa(t.status)} /> },
    {
      key: "act",
      header: "اقدام",
      render: (t) =>
        t.status === "pending" ? (
          <div style={{ display: "flex", gap: 6 }}>
            <Button variant="primary" style={{ minBlockSize: 30, fontSize: "0.75rem" }} onClick={() => void handleUpdateStatus(t.taskId, "completed")}>
              انجام شد
            </Button>
            <Button variant="ghost" style={{ minBlockSize: 30, fontSize: "0.75rem" }} onClick={() => void handleUpdateStatus(t.taskId, "missed")}>
              عدم حضور
            </Button>
          </div>
        ) : (
          <span>{t.outcomeFa ?? "—"}</span>
        ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="برنامه پیگیری‌ها و تقویم جلالی (G01, G05, G06)"
        subtitle="زمان‌بندی تماس‌های پس از جراحی، پیگیری نسخه چاپی و بررسی مراجعات"
        actions={
          <Link to="/follow-ups/referrals" className="bina-button" data-variant="primary">
            <Send size={15} /> مدیریت ارجاعات (G02–G04)
          </Link>
        }
      />
      {msg && <AlertBanner tone="success" title={msg} />}
      {errFa && <AlertBanner tone="error" title="خطا" description={errFa} />}

      <form onSubmit={(e) => void handleCreateTask(e)} className="bina-panel-raised" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="انتخاب بیمار برای پیگیری" className="bina-select" style={{ maxWidth: 220 }} required value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">انتخاب بیمار...</option>
          {(patientsQuery.data?.items ?? []).map((p) => (
            <option key={p.patientId} value={p.patientId}>{p.fullNameFa}</option>
          ))}
        </select>
        <div style={{ width: 170 }}>
          <SingleEyeSelect value={eye} onChange={setEye} ariaLabel="چشم پیگیری" />
        </div>
        <select aria-label="نوع پیگیری" className="bina-select" style={{ maxWidth: 200 }} value={taskType} onChange={(e) => setTaskType(e.target.value as "postop_call" | "print_phone_checkin" | "clinic_visit" | "referral_followup" | "r2_recalibration")}>
          <option value="postop_call">تماس پس از عمل</option>
          <option value="print_phone_checkin">پیگیری Print+Phone</option>
          <option value="clinic_visit">ویزیت کلینیک</option>
          <option value="referral_followup">پیگیری ارجاع</option>
          <option value="r2_recalibration">کالیبراسیون مجدد R2</option>
        </select>
        <input aria-label="توضیح پیگیری" className="bina-input" style={{ maxWidth: 240 }} value={outcomeFa} onChange={(e) => setOutcomeFa(e.target.value)} placeholder="توضیح پیگیری..." />
        <Button type="submit" variant="primary" icon={<CalendarCheck size={15} />}>ثبت پیگیری</Button>
        <select aria-label="فیلتر وضعیت پیگیری‌ها" className="bina-select" style={{ maxWidth: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">همه وضعیت‌ها</option>
          <option value="pending">در انتظار</option>
          <option value="completed">انجام‌شده</option>
          <option value="missed">عقب‌افتاده / ناموفق</option>
        </select>
      </form>

      {tasksQuery.loading && !tasksQuery.data ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <DataTable caption="لیست پیگیری‌ها" rows={tasksQuery.data?.items ?? []} columns={cols} getRowId={(t) => t.taskId} />
      )}
    </div>
  );
}

export function ReferralsPage() {
  const { session } = useAuth();
  const [missReason, setMissReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const refsQuery = useScopedQuery<{ items: ReferralRecord[]; total: number }>(
    ({ token, signal }) => apiRequest("/v1/referrals", { token, signal }),
    []
  );

  async function handleOutcome(referralId: string, status: "attended" | "missed") {
    if (!session) return;
    await apiRequest(`/v1/referrals/${referralId}/outcome`, {
      method: "PATCH",
      token: session.accessToken,
      body: { status, missReasonFa: status === "missed" ? missReason || "عدم مراجعه بیمار" : undefined },
    });
    setMsg(status === "attended" ? "حضور بیمار ثبت و پرونده تریاژ مرتبط بسته شد." : "عدم حضور بیمار ثبت شد.");
    refsQuery.reload();
  }

  const cols: DataColumn<ReferralRecord>[] = [
    {
      key: "patient",
      header: "بیمار / پرونده",
      render: (r) => {
        const name = (r as Record<string, unknown>).patientNameFa;
        return <strong>{typeof name === "string" && name ? name : r.caseId.slice(0, 8)}</strong>;
      },
    },
    { key: "dest", header: "مرکز مقصد", render: (r) => r.destinationHospitalFa },
    { key: "status", header: "وضعیت", render: (r) => <StatusBadge tone={r.status === "attended" ? "success" : r.status === "missed" ? "error" : "info"} label={formatReferralStatusFa(r.status)} /> },
    { key: "date", header: "تاریخ صدور", render: (r) => formatJalaliDateTime(r.createdAt) },
    {
      key: "act",
      header: "بستن حلقه (Outcome)",
      render: (r) =>
        r.status === "dispatched" ? (
          <div style={{ display: "flex", gap: 6 }}>
            <Button variant="primary" style={{ minBlockSize: 30, fontSize: "0.75rem" }} icon={<CheckCircle2 size={14} />} onClick={() => void handleOutcome(r.referralId, "attended")}>
              مراجعه انجام شد
            </Button>
            <Button variant="ghost" style={{ minBlockSize: 30, fontSize: "0.75rem" }} onClick={() => void handleOutcome(r.referralId, "missed")}>
              عدم مراجعه
            </Button>
          </div>
        ) : (
          <span>{r.status === "attended" ? "مراجعه انجام شد" : "عدم مراجعه"}</span>
        ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="فهرست و پیگیری بسته‌حلقه ارجاعات (G02–G04)"
        breadcrumbs={[{ label: "پیگیری‌ها", to: "/follow-ups" }, { label: "ارجاعات" }]}
      />
      {msg && <AlertBanner tone="success" title={msg} />}
      <div className="bina-panel-raised" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label htmlFor="ref-miss-reason" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>علت عدم مراجعه (در صورت انتخاب عدم مراجعه):</label>
        <input id="ref-miss-reason" className="bina-input" style={{ maxWidth: 320 }} value={missReason} onChange={(e) => setMissReason(e.target.value)} placeholder="مثال: مشکل حمل‌ونقل یا تغییر زمان..." />
      </div>
      {refsQuery.loading && !refsQuery.data ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <DataTable caption="فهرست ارجاعات" rows={refsQuery.data?.items ?? []} columns={cols} getRowId={(r) => r.referralId} />
      )}
    </div>
  );
}
