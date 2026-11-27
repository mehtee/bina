import React, { useState } from "react";
import { Cpu, KeyRound, Lock, Server, ShieldAlert } from "lucide-react";
import { Link } from "react-router";
import { apiRequest } from "~/core/api/client";
import type {
  AuditLogEntry,
  BreakGlassSessionRecord,
  OpsHealthResponse,
  OpsJobsResponse,
  OpsModelsResponse,
  PatientListResponse,
  ResearchExportResponse,
} from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useAuth, useCapabilities } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import {
  formatAuditActionFa,
  formatJalaliDateTime,
  formatPersianDigits,
  formatRoleFa,
} from "~/core/i18n/fa-ir";
import { DataTable, type DataColumn } from "~/design-system/composites/data-table";
import { MetricCard, PageHeader } from "~/design-system/composites/kpi-and-cards";
import { Button, StatusBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, StateSurface } from "~/design-system/primitives/state-surfaces";

export function OpsConsolePage() {
  const { session, performStepUp } = useAuth();
  const { can, isFeatureEnabled, stepUpVerified } = useCapabilities();

  const [bgPatientId, setBgPatientId] = useState("");
  const [bgReason, setBgReason] = useState("");
  const [stepCode, setStepCode] = useState("654321");
  const [irbCode, setIrbCode] = useState("IR.TUMS.EYE.1405.042");
  const [exportReason, setExportReason] = useState("");
  const [exportResult, setExportResult] = useState<ResearchExportResponse | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [errFa, setErrFa] = useState<string | null>(null);

  const healthQuery = useScopedQuery<OpsHealthResponse>(
    ({ token, signal }) => apiRequest("/v1/ops/health", { token, signal }),
    []
  );
  const jobsQuery = useScopedQuery<OpsJobsResponse>(
    ({ token, signal }) => apiRequest("/v1/ops/jobs", { token, signal }),
    []
  );
  const modelsQuery = useScopedQuery<OpsModelsResponse>(
    ({ token, signal }) => apiRequest("/v1/ops/models", { token, signal }),
    []
  );
  const bgQuery = useScopedQuery<{ items: BreakGlassSessionRecord[]; total: number }>(
    ({ token, signal }) => apiRequest("/v1/ops/break-glass", { token, signal }),
    []
  );
  const auditQuery = useScopedQuery<{ items: AuditLogEntry[]; total: number }>(
    ({ token, signal }) => apiRequest("/v1/ops/audit", { token, signal }),
    [stepUpVerified],
    { enabled: stepUpVerified }
  );
  const patientsQuery = useScopedQuery<PatientListResponse>(
    ({ token, signal }) => apiRequest("/v1/patients?limit=25", { token, signal }),
    [],
    { enabled: can("patient:read") }
  );

  async function handleStepUpNow(e: React.FormEvent) {
    e.preventDefault();
    setErrFa(null);
    try {
      await performStepUp(stepCode);
      setMsg("تایید مجدد امنیتی (Step-Up) انجام شد و سوابق ممیزی در دسترس قرار گرفت.");
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    }
  }

  async function handleOpenBreakGlass(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setErrFa(null);
    try {
      await apiRequest("/v1/ops/break-glass", {
        method: "POST",
        token: session.accessToken,
        body: { patientId: bgPatientId, reasonFa: bgReason, durationMinutes: 60 },
      });
      setBgReason("");
      setMsg("نشست دسترسی اضطراری (Break-Glass) ثبت و لاگ ممیزی آن درج شد.");
      bgQuery.reload();
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    }
  }

  async function handleRevokeBg(sessionId: string) {
    if (!session) return;
    await apiRequest(`/v1/ops/break-glass/${sessionId}/revoke`, {
      method: "POST",
      token: session.accessToken,
      body: { reasonFa: "پایان نیاز اضطراری" },
    });
    bgQuery.reload();
  }

  const activeBgCount = (bgQuery.data?.items ?? []).filter((b) => b.active).length;

  const auditCols: DataColumn<AuditLogEntry>[] = [
    { key: "action", header: "عملیات", render: (a) => <strong>{a.action}</strong> },
    { key: "actor", header: "نقش", render: (a) => a.actorRole },
    { key: "res", header: "منبع", render: (a) => <bdi dir="ltr">{a.resourceType}</bdi> },
    { key: "reason", header: "علت / شرح", render: (a) => a.reasonFa ?? "—" },
    { key: "time", header: "زمان", render: (a) => formatJalaliDateTime(a.occurredAtIso, true) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="کنسول عملیات، ممیزی امنیتی، دسترسی اضطراری و مدل‌ها (L01–L08)"
        subtitle="پایش سلامت سرویس‌ها، صف‌های پردازش، رجیستری مدل‌های Apache 2.0 و دسترسی ممیزی محافظت‌شده با Step-Up"
      />

      {activeBgCount > 0 && (
        <AlertBanner
          tone="urgent"
          title={`${formatPersianDigits(activeBgCount)} نشست دسترسی اضطراری (Break-Glass) فعال است`}
          description="تمام مشاهدات با برچسب Break-Glass در لاگ تغییرناپذیر ممیزی ثبت می‌شوند."
        />
      )}

      {msg && <AlertBanner tone="success" title={msg} />}
      {errFa && <AlertBanner tone="error" title="خطای عملیات / دسترسی" description={errFa} />}

      <div className="bina-kpis">
        <MetricCard
          label="پایگاه داده و تاخیر"
          value={Number((healthQuery.data?.database as Record<string, unknown> | undefined)?.latencyMs ?? 0)}
          unit="ms"
          icon={<Server size={17} />}
          deltaText={String((healthQuery.data?.database as Record<string, unknown> | undefined)?.status ?? "ok")}
          deltaTone="success"
        />
        <MetricCard label="حالت موتور AI" value={modelsQuery.data?.aiEngineMode ?? "cpu_stub"} icon={<Cpu size={17} />} metaText={modelsQuery.data?.foundationBackbone ?? "dinov2_apache2"} />
        <MetricCard label="رویدادهای Outbox منتشرنشده" value={Number((healthQuery.data?.queues as Record<string, unknown> | undefined)?.unpublishedOutboxEvents ?? 0)} icon={<Server size={17} />} />
        <MetricCard label="مدل‌های رجیستری" value={modelsQuery.data?.artifacts.length ?? 0} icon={<Cpu size={17} />} />
      </div>

      <div className="bina-grid">
        {/* Step-up & Audit Log (L03) */}
        <section className="bina-panel-raised" style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="bina-panel-h3" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Lock size={17} /> سوابق ممیزی کلینیک (L03 — نیازمند Step-Up)
          </h2>
          {!stepUpVerified ? (
            <form onSubmit={(e) => void handleStepUpNow(e)} className="bina-panel" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <AlertBanner
                tone="warning"
                title="تایید مجدد امنیتی برای مشاهده ممیزی الزامی است"
                description="برای جلوگیری از دسترسی ناخواسته به لاگ‌ها، کد تایید مجدد (حداقل ۶ رقم) را وارد کنید."
              />
              <input
                aria-label="کد تایید مجدد Step-Up"
                dir="ltr"
                className="bina-input"
                style={{ maxWidth: 180 }}
                value={stepCode}
                onChange={(e) => setStepCode(e.target.value)}
              />
              <Button type="submit" variant="primary" icon={<KeyRound size={15} />}>تایید Step-Up و نمایش لاگ</Button>
            </form>
          ) : (
            <DataTable caption="لاگ ممیزی" rows={auditQuery.data?.items ?? []} columns={auditCols} getRowId={(a) => a.id} />
          )}
        </section>

        {/* Break-glass Lifecycle (L04) */}
        <section className="bina-panel-raised" style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="bina-panel-h3" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ShieldAlert size={17} /> دسترسی اضطراری Break-Glass (L04)
          </h2>
          <form onSubmit={(e) => void handleOpenBreakGlass(e)} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select aria-label="انتخاب بیمار برای دسترسی اضطراری" className="bina-select" required value={bgPatientId} onChange={(e) => setBgPatientId(e.target.value)}>
              <option value="">انتخاب بیمار...</option>
              {(patientsQuery.data?.items ?? []).map((p) => (
                <option key={p.patientId} value={p.patientId}>{p.fullNameFa}</option>
              ))}
            </select>
            <input aria-label="دلیل اورژانسی دسترسی اضطراری" className="bina-input" required value={bgReason} onChange={(e) => setBgReason(e.target.value)} placeholder="دلیل اورژانسی (حداقل ۱۰ کاراکتر)..." />
            <Button type="submit" variant="urgent" disabled={!can("break_glass:access")}>ایجاد نشست Break-Glass</Button>
          </form>
          {(bgQuery.data?.items ?? []).map((b) => (
            <div key={b.sessionId} className="bina-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
              <div>
                <strong>{b.reasonFa}</strong>
                <div>وضعیت: {b.active ? "فعال" : "خاتمه‌یافته"}</div>
              </div>
              {b.active && (
                <Button variant="secondary" style={{ minBlockSize: 28, fontSize: "0.75rem" }} onClick={() => void handleRevokeBg(b.sessionId)}>
                  لغو فوری
                </Button>
              )}
            </div>
          ))}
        </section>
      </div>

      {/* Model Registry L06 & Queues L02 */}
      <div className="bina-grid">
        <section className="bina-panel-raised" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-panel-h3">رجیستری مدل‌ها و مجوز تجاری Apache 2.0 (L06)</h2>
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--on-surface-variant)" }}>
            {modelsQuery.data?.commercialLicensePolicyFa}
          </p>
          <div style={{ fontSize: "0.8125rem" }}>
            ارائه‌دهنده LLM: <bdi dir="ltr">{modelsQuery.data?.llmProvider} / {modelsQuery.data?.llmModel}</bdi>
          </div>
          {(modelsQuery.data?.artifacts ?? []).map((a) => (
            <div key={a.modelName} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", padding: 6, borderBlockEnd: "1px solid var(--panel-divider)" }}>
              <bdi dir="ltr"><strong>{a.modelName}</strong></bdi>
              <StatusBadge tone={a.hasMetricsJson ? "success" : "neutral"} label={a.hasMetricsJson ? "دارای Metrics" : "بدون خروجی"} />
            </div>
          ))}
        </section>

        <section className="bina-panel-raised" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-panel-h3">حاکمیت پژوهش ناشناس‌سازی‌شده D5 و شواهد مالی</h2>
          {!isFeatureEnabled("research_d5_export") ? (
            <StateSurface
              kind="gated"
              title="ماژول‌های پژوهش D5 و شواهد مالی گیت‌شده هستند"
              description="خروجی بدون نام D5 نیازمند مجوز کمیته اخلاق (IRB) و تایید هویت‌زدایی است؛ می‌توانید از طریق تنظیمات کلینیک وضعیت قابلیت را فعال کنید."
              action={<Link to="/admin" className="bina-button" data-variant="secondary">مدیریت کلینیک</Link>}
            />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!session) return;
                setErrFa(null);
                setExportResult(null);
                void apiRequest<ResearchExportResponse>("/v1/research/exports", {
                  method: "POST",
                  token: session.accessToken,
                  body: { irbProtocolCode: irbCode.trim(), reasonFa: exportReason.trim(), limit: 100 },
                })
                  .then((res) => {
                    setExportResult(res);
                    setExportReason("");
                    auditQuery.reload();
                  })
                  .catch((err) => setErrFa(toFriendlyError(err).messageFa));
              }}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                صف پردازش فعال: {formatPersianDigits(jobsQuery.data?.aiInferenceJobs.length ?? 0)} وظیفه AI و {formatPersianDigits(jobsQuery.data?.workflowRuns.length ?? 0)} گردش‌کار Temporal.
              </div>
              {!stepUpVerified && (
                <AlertBanner
                  tone="warning"
                  title="تایید مجدد امنیتی (Step-Up) برای خروجی پژوهشی D5 الزامی است"
                  description="ابتدا تایید مجدد امنیتی را در بخش سوابق ممیزی انجام دهید تا مجوز خروجی ناشناس‌سازی‌شده فعال شود."
                />
              )}
              <input
                aria-label="کد مصوبه کمیته اخلاق IRB"
                dir="ltr"
                className="bina-input"
                required
                minLength={4}
                value={irbCode}
                onChange={(e) => setIrbCode(e.target.value)}
                placeholder="IR.TUMS.EYE.1405.xxx"
              />
              <input
                aria-label="علت و شرح پژوهش D5"
                className="bina-input"
                required
                minLength={5}
                value={exportReason}
                onChange={(e) => setExportReason(e.target.value)}
                placeholder="شرح هدف پژوهش (حداقل ۵ کاراکتر)..."
              />
              <Button type="submit" variant="primary" disabled={!can("export:phi") || !stepUpVerified}>
                استخراج بسته ناشناس‌سازی‌شده D5 (نیازمند Step-Up)
              </Button>
              {exportResult && (
                <>
                  <AlertBanner
                    tone="success"
                    title="خروجی پژوهشی D5 آماده شد"
                    description={`بسته ناشناس‌سازی‌شده D5 برای کد ${exportResult.irbProtocolCode} با ${formatPersianDigits(exportResult.recordCount)} رکورد بدون شناسه هویتی آماده شد.`}
                  />
                  <div className="bina-panel" style={{ fontSize: "0.75rem", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <span>چکیده اصالت بسته (SHA-256):</span>
                    <bdi dir="ltr" style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                      {exportResult.manifestSha256}
                    </bdi>
                  </div>
                </>
              )}
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
