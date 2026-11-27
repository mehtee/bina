import React, { useState } from "react";
import { Calendar, Eye, FileText, HeartPulse, History, Shield, UserCheck } from "lucide-react";
import { Link, useParams } from "react-router";
import { apiRequest } from "~/core/api/client";
import type {
  CaregiverGrant,
  Patient360Response,
  PatientTimelineEvent,
} from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useAuth, useCapabilities } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import {
  ACCESS_MODE_LABELS_FA,
  formatEyeLabelFa,
  formatJalaliDateTime,
  formatPersianDigits,
  type AccessMode,
} from "~/core/i18n/fa-ir";
import { PageHeader, PatientContextBar } from "~/design-system/composites/kpi-and-cards";
import { Button, EyeBadge, StatusBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, LoadingSkeleton, StateSurface } from "~/design-system/primitives/state-surfaces";

type PatientTabKey =
  | "overview"
  | "history"
  | "caregivers"
  | "timeline"
  | "studies"
  | "care"
  | "monitoring"
  | "alerts"
  | "reports"
  | "consent";

export function Patient360Page() {
  const { patientId } = useParams();
  const { session } = useAuth();
  const { can } = useCapabilities();
  const [activeTab, setActiveTab] = useState<PatientTabKey>("overview");

  // Clinical History form (B04)
  const [histSummary, setHistSummary] = useState("");
  const [histConditions, setHistConditions] = useState("");
  const [histBusy, setHistBusy] = useState(false);

  // Caregiver form (B05)
  const [cgPhone, setCgPhone] = useState("+98912");
  const [cgRel, setCgRel] = useState("همسر / فرزند");
  const [cgBusy, setCgBusy] = useState(false);

  // Action feedback
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const p360Query = useScopedQuery<Patient360Response>(
    ({ token, signal }) => apiRequest(`/v1/patients/${patientId}`, { token, signal }),
    [patientId]
  );

  const timelineQuery = useScopedQuery<{ items: PatientTimelineEvent[] }>(
    ({ token, signal }) => apiRequest(`/v1/patients/${patientId}/timeline`, { token, signal }),
    [patientId],
    { enabled: activeTab === "timeline" || activeTab === "overview" }
  );

  const caregiversQuery = useScopedQuery<{ items: CaregiverGrant[] }>(
    ({ token, signal }) => apiRequest(`/v1/patients/${patientId}/caregivers`, { token, signal }),
    [patientId],
    { enabled: activeTab === "caregivers" }
  );

  if (p360Query.loading && !p360Query.data) return <LoadingSkeleton rows={7} />;
  if (p360Query.error) {
    return (
      <StateSurface
        kind={p360Query.error.statusCode === 404 ? "empty" : "error"}
        title={p360Query.error.statusCode === 404 ? "پروفایل بیمار یافت نشد" : "خطا در بارگذاری پرونده بیمار"}
        description={p360Query.error.messageFa}
        onRetry={p360Query.reload}
      />
    );
  }

  const d = p360Query.data;
  if (!d) return null;

  const pat = d.patient as {
    patientId: string;
    fullNameFa: string;
    phoneMasked: string;
    nationalIdMasked?: string | null;
    birthYearJalali?: number | null;
    notesFa?: string | null;
    accessMode: AccessMode;
    mlTrainingConsentFlag: boolean;
  };
  const r2Sum = d.r2Summary as {
    odBaselineVaLogmar: number | null;
    osBaselineVaLogmar: number | null;
    latestIopOdMmHg: number | null;
    latestIopOsMmHg: number | null;
  };
  const odEpisodes = d.odEpisodes as Array<{ episodeId: string; status: string; activePrescriptionVersion: number }>;
  const osEpisodes = d.osEpisodes as Array<{ episodeId: string; status: string; activePrescriptionVersion: number }>;
  const studies = d.recentStudies as Array<{ studyId: string; eyeLaterality: string; status: string; createdAtIso: string }>;
  const histories = d.clinicalHistories as Array<{ historyId: string; summaryFa: string; conditions: string[]; createdAtIso: string }>;
  const consents = d.consents as Array<{ consentId: string; consentVersion: string; action: string; acceptedAtIso: string }>;

  async function handleAddHistory(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !patientId) return;
    setHistBusy(true);
    setActionErr(null);
    setActionMsg(null);
    try {
      await apiRequest(`/v1/patients/${patientId}/history`, {
        method: "POST",
        token: session.accessToken,
        body: {
          summaryFa: histSummary.trim(),
          conditions: histConditions.split("،").map((x) => x.trim()).filter(Boolean),
        },
      });
      setHistSummary("");
      setHistConditions("");
      setActionMsg("سابقه بالینی جدید به‌صورت تغییرناپذیر ثبت شد.");
      p360Query.reload();
    } catch (err) {
      setActionErr(toFriendlyError(err).messageFa);
    } finally {
      setHistBusy(false);
    }
  }

  async function handleGrantCaregiver(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !patientId) return;
    setCgBusy(true);
    setActionErr(null);
    try {
      await apiRequest(`/v1/patients/${patientId}/caregivers`, {
        method: "POST",
        token: session.accessToken,
        body: {
          caregiverPhone: cgPhone.trim(),
          relationshipFa: cgRel.trim(),
          scopes: ["view_today", "log_adherence", "report_symptom"],
        },
      });
      setActionMsg("مجوز دسترسی همراه ثبت شد.");
      caregiversQuery.reload();
    } catch (err) {
      setActionErr(toFriendlyError(err).messageFa);
    } finally {
      setCgBusy(false);
    }
  }

  async function handleRevokeCaregiver(grantId: string) {
    if (!session || !patientId) return;
    try {
      await apiRequest(`/v1/patients/${patientId}/caregivers/${grantId}/revoke`, {
        method: "POST",
        token: session.accessToken,
        body: {},
      });
      setActionMsg("دسترسی همراه فوراً لغو گردید.");
      caregiversQuery.reload();
    } catch (err) {
      setActionErr(toFriendlyError(err).messageFa);
    }
  }

  async function handleToggleConsent(action: "accepted" | "withdrawn", mlFlag: boolean) {
    if (!session || !patientId) return;
    setActionErr(null);
    try {
      await apiRequest(`/v1/patients/${patientId}/consent`, {
        method: "PATCH",
        token: session.accessToken,
        body: {
          consentVersion: "fa-ir-v2.1",
          action,
          mlTrainingConsentFlag: mlFlag,
        },
      });
      setActionMsg("وضعیت رضایت‌نامه با موفقیت ثبت شد.");
      p360Query.reload();
    } catch (err) {
      setActionErr(toFriendlyError(err).messageFa);
    }
  }

  const tabs: Array<{ key: PatientTabKey; label: string }> = [
    { key: "overview", label: "نمای کلی (B03)" },
    { key: "history", label: "سابقه بالینی (B04)" },
    { key: "caregivers", label: "همراهان (B05)" },
    { key: "timeline", label: "خط زمانی (B06)" },
    { key: "studies", label: "مطالعات (B07)" },
    { key: "care", label: "مراقبت (B08)" },
    { key: "monitoring", label: "پایش خانگی (B09)" },
    { key: "alerts", label: "هشدارها (B10)" },
    { key: "reports", label: "گزارش‌ها (B11)" },
    { key: "consent", label: "رضایت‌نامه (B12)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title={`پرونده یکپارچه بیمار — ${pat.fullNameFa}`}
        breadcrumbs={[{ label: "بیماران", to: "/patients" }, { label: pat.fullNameFa }]}
      />

      <PatientContextBar
        patientNameFa={pat.fullNameFa}
        patientId={pat.patientId}
        accessModeFa={ACCESS_MODE_LABELS_FA[pat.accessMode]}
        extraMetaFa={
          pat.birthYearJalali ? `تولد: ${formatPersianDigits(pat.birthYearJalali)} • موبایل: ${pat.phoneMasked}` : `موبایل: ${pat.phoneMasked}`
        }
        urgencyTier={d.openTriageCases.length > 0 ? "urgent" : null}
        actions={
          <>
            {can("study:upload") && (
              <Link to={`/diagnostics/new?patientId=${pat.patientId}`} className="bina-button" data-variant="primary">
                ثبت مطالعه تشخیصی
              </Link>
            )}
            {can("episode:create") && (
              <Link to={`/care/episodes/new?patientId=${pat.patientId}`} className="bina-button" data-variant="secondary">
                اپیزود مراقبت جدید
              </Link>
            )}
            <Link to={`/patients/${pat.patientId}/monitoring/overview`} className="bina-button" data-variant="ghost">
              داشبورد پایش خانگی
            </Link>
          </>
        }
      />

      {actionMsg && <AlertBanner tone="success" title={actionMsg} />}
      {actionErr && <AlertBanner tone="error" title="خطا در انجام عملیات" description={actionErr} />}

      {/* Paired Explicit Eye Cards (R02 — Right: OD, Left: OS — never swapped by CSS) */}
      <div className="bina-grid">
        <div className="bina-panel-raised" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <EyeBadge eye="OD" />
            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>اپیزودهای راست: {formatPersianDigits(odEpisodes.length)}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: "0.8125rem" }}>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>فشار چشم (IOP)</div>
              <strong className="bina-number">
                {r2Sum.latestIopOdMmHg !== null ? `${formatPersianDigits(r2Sum.latestIopOdMmHg)} mmHg` : "موجود نیست"}
              </strong>
            </div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>خط پایه VA</div>
              <strong className="bina-number">
                {r2Sum.odBaselineVaLogmar !== null ? `${formatPersianDigits(r2Sum.odBaselineVaLogmar)} logMAR` : "موجود نیست"}
              </strong>
            </div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>نسخه فعال</div>
              <strong className="bina-number">
                {odEpisodes[0] ? `v${formatPersianDigits(odEpisodes[0].activePrescriptionVersion)}` : "ندارد"}
              </strong>
            </div>
          </div>
        </div>

        <div className="bina-panel-raised" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <EyeBadge eye="OS" />
            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>اپیزودهای چپ: {formatPersianDigits(osEpisodes.length)}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: "0.8125rem" }}>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>فشار چشم (IOP)</div>
              <strong className="bina-number">
                {r2Sum.latestIopOsMmHg !== null ? `${formatPersianDigits(r2Sum.latestIopOsMmHg)} mmHg` : "موجود نیست"}
              </strong>
            </div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>خط پایه VA</div>
              <strong className="bina-number">
                {r2Sum.osBaselineVaLogmar !== null ? `${formatPersianDigits(r2Sum.osBaselineVaLogmar)} logMAR` : "موجود نیست"}
              </strong>
            </div>
            <div>
              <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>نسخه فعال</div>
              <strong className="bina-number">
                {osEpisodes[0] ? `v${formatPersianDigits(osEpisodes[0].activePrescriptionVersion)}` : "ندارد"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Scoped Tabs */}
      <div role="tablist" aria-label="بخش‌های پرونده بیمار" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tabs.map((t) => (
          <Button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            variant={activeTab === t.key ? "primary" : "secondary"}
            onClick={() => setActiveTab(t.key)}
            style={{ minBlockSize: 34, fontSize: "0.75rem" }}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="bina-grid">
          <div className="bina-panel-raised" style={{ gridColumn: "span 8", display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="bina-panel-h3">مطالعات تشخیصی اخیر ({formatPersianDigits(studies.length)})</h2>
            {studies.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--muted)" }}>هنوز مطالعه‌ای ثبت نشده است.</p>
            ) : (
              studies.map((s) => (
                <Link key={s.studyId} to={`/diagnostics/${s.studyId}`} className="bina-nav-item">
                  <span>مطالعه <bdi dir="ltr">{s.studyId.slice(0, 8)}</bdi> — {formatEyeLabelFa(s.eyeLaterality)}</span>
                  <StatusBadge tone={s.status === "signed_off" ? "success" : s.status === "qc_failed" ? "error" : "warning"} label={s.status} />
                </Link>
              ))
            )}
          </div>
          <div className="bina-panel-raised" style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 className="bina-panel-h3">خط زمانی خلاصه</h2>
            {(timelineQuery.data?.items ?? []).slice(0, 5).map((ev, i) => (
              <div key={i} style={{ fontSize: "0.8125rem", borderBlockEnd: "1px solid var(--panel-divider)", paddingBlockEnd: 6 }}>
                <strong>{ev.titleFa}</strong>
                <div style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                  {ev.occurredAtJalali} • {ev.summaryFa}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bina-grid">
          <form onSubmit={(e) => void handleAddHistory(e)} className="bina-panel-raised" style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="bina-panel-h3" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <History size={17} /> ثبت سابقه بالینی جدید (Append-Only)
            </h2>
            <textarea
              aria-label="شرح سابقه بالینی"
              className="bina-textarea"
              required
              value={histSummary}
              onChange={(e) => setHistSummary(e.target.value)}
              placeholder="شرح سابقه بیماری‌ها، جراحی‌های قبلی چشم و داروهای سیستمیک..."
            />
            <input
              aria-label="برچسب‌های سابقه بیماری"
              className="bina-input"
              value={histConditions}
              onChange={(e) => setHistConditions(e.target.value)}
              placeholder="برچسب‌ها با ویرگول فارسی (مثال: دیابت نوع ۲، گلوکوم)"
            />
            <Button type="submit" variant="primary" loading={histBusy} disabled={!can("patient:enroll")}>
              ثبت سابقه جدید
            </Button>
          </form>
          <div className="bina-panel-raised" style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 className="bina-panel-h3">سوابق ثبت‌شده ({formatPersianDigits(histories.length)})</h2>
            {histories.map((h) => (
              <div key={h.historyId} className="bina-panel" style={{ fontSize: "0.8125rem" }}>
                <div>{h.summaryFa}</div>
                <div style={{ marginTop: 4, color: "var(--muted)", fontSize: "0.75rem" }}>
                  تاریخ: {formatJalaliDateTime(h.createdAtIso, true)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "caregivers" && (
        <div className="bina-grid">
          <form onSubmit={(e) => void handleGrantCaregiver(e)} className="bina-panel-raised" style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="bina-panel-h3" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <UserCheck size={17} /> اعطای دسترسی همراه بیمار (B05)
            </h2>
            <input aria-label="شماره موبایل همراه بیمار" className="bina-input" dir="ltr" required value={cgPhone} onChange={(e) => setCgPhone(e.target.value)} placeholder="+98912..." />
            <input aria-label="نسبت همراه با بیمار" className="bina-input" required value={cgRel} onChange={(e) => setCgRel(e.target.value)} placeholder="نسبت همراه" />
            <Button type="submit" variant="primary" loading={cgBusy}>ثبت مجوز همراه</Button>
          </form>
          <div className="bina-panel-raised" style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 className="bina-panel-h3">همراهان مجاز</h2>
            {(caregiversQuery.data?.items ?? []).map((g) => (
              <div key={g.grantId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, border: "1px solid var(--outline-variant)", borderRadius: 8 }}>
                <div>
                  <strong>{g.relationshipFa}</strong>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>دسترسی‌ها: {g.scopes.join("، ")}</div>
                </div>
                {g.active ? (
                  <Button variant="urgent" onClick={() => void handleRevokeCaregiver(g.grantId)}>لغو فوری دسترسی</Button>
                ) : (
                  <StatusBadge tone="neutral" label="لغوشده" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-panel-h3" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Calendar size={17} /> خط زمانی رویدادهای بیمار (B06)
          </h2>
          {(timelineQuery.data?.items ?? []).map((ev, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderBlockEnd: "1px solid var(--panel-divider)" }}>
              <div>
                <strong>{ev.titleFa}</strong>
                <div style={{ fontSize: "0.8125rem", color: "var(--on-surface-variant)" }}>{ev.summaryFa}</div>
              </div>
              <div style={{ textAlign: "end", fontSize: "0.75rem" }}>
                {ev.eyeLaterality && <EyeBadge eye={ev.eyeLaterality} />}
                <div style={{ color: "var(--muted)", marginTop: 4 }}>{ev.occurredAtJalali}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "studies" && (
        <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-panel-h3" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Eye size={17} /> مطالعات تشخیصی (B07)
          </h2>
          {studies.map((s) => (
            <Link key={s.studyId} to={`/diagnostics/${s.studyId}`} className="bina-nav-item">
              <span>{formatEyeLabelFa(s.eyeLaterality)} — {s.status}</span>
              <span style={{ fontSize: "0.75rem" }}>{formatJalaliDateTime(s.createdAtIso)}</span>
            </Link>
          ))}
        </div>
      )}

      {activeTab === "care" && (
        <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-panel-h3" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <HeartPulse size={17} /> اپیزودهای مراقبت (B08)
          </h2>
          {[...odEpisodes, ...osEpisodes].map((ep) => (
            <Link key={ep.episodeId} to={`/care/episodes/${ep.episodeId}`} className="bina-nav-item">
              <span>اپیزود <bdi dir="ltr">{ep.episodeId.slice(0, 8)}</bdi> — نسخه {formatPersianDigits(ep.activePrescriptionVersion)}</span>
              <StatusBadge tone="info" label={ep.status} />
            </Link>
          ))}
        </div>
      )}

      {activeTab === "monitoring" && (
        <div className="bina-panel-raised">
          <p>برای مشاهده کامل نمودارهای حدت بینایی، آمسلر و iCare HOME2 بیمار به صفحه پایش خانگی بیمار بروید.</p>
          <Link to={`/patients/${pat.patientId}/monitoring/overview`} className="bina-button" data-variant="primary">
            ورود به نمای کلی پایش خانگی (D02)
          </Link>
        </div>
      )}

      {activeTab === "alerts" && (
        <div className="bina-panel-raised">
          <h2 className="bina-panel-h3">هشدارهای باز ({formatPersianDigits(d.openTriageCases.length)})</h2>
          <Link to="/triage" className="bina-button" data-variant="secondary" style={{ marginTop: 8 }}>
            مشاهده در صف تریاژ
          </Link>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="bina-panel-raised">
          <h2 className="bina-panel-h3" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FileText size={17} /> گزارش‌های صادرشده بیمار (B11)
          </h2>
          <Link to={`/reports?patientId=${pat.patientId}`} className="bina-button" data-variant="primary" style={{ marginTop: 8 }}>
            مشاهده گزارش‌های PDF بیمار
          </Link>
        </div>
      )}

      {activeTab === "consent" && (
        <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="bina-panel-h3" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Shield size={17} /> رضایت‌نامه و پژوهش D5 (B12)
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="primary" onClick={() => void handleToggleConsent("accepted", true)}>
              تایید رضایت‌نامه + پژوهش D5
            </Button>
            <Button variant="secondary" onClick={() => void handleToggleConsent("withdrawn", false)}>
              انصراف از رضایت پژوهش D5
            </Button>
          </div>
          {consents.map((c) => (
            <div key={c.consentId} style={{ fontSize: "0.8125rem", padding: 6, borderBlockEnd: "1px solid var(--panel-divider)" }}>
              نسخه {c.consentVersion} — وضعیت: <strong>{c.action === "withdrawn" ? "لغوشده" : "تاییدشده"}</strong> ({formatJalaliDateTime(c.acceptedAtIso, true)})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
