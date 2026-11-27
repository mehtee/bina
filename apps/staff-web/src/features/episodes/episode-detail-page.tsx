import React, { useState } from "react";
import { CheckCircle2, FileText, Lock, Plus, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router";
import { apiRequest } from "~/core/api/client";
import type {
  AdherenceEventResponse,
  CareEpisode,
  CreateReportResponse,
  DropItemInput,
  EpisodeSymptomHistoryItem,
  PrescriptionVersion,
} from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useAuth, useCapabilities } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import {
  ADHERENCE_LABELS_FA,
  formatEyeLabelFa,
  formatJalaliDateTime,
  formatPersianDigits,
} from "~/core/i18n/fa-ir";
import { PageHeader, PatientContextBar } from "~/design-system/composites/kpi-and-cards";
import { TabList, TabPanel } from "~/design-system/composites/tabs";
import { Button, EyeBadge, StatusBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, LoadingSkeleton, StateSurface } from "~/design-system/primitives/state-surfaces";

type EpisodeTab = "rx" | "adherence" | "symptoms" | "closure";

export function EpisodeDetailPage() {
  const { episodeId } = useParams();
  const { session } = useAuth();
  const { can } = useCapabilities();
  const [tab, setTab] = useState<EpisodeTab>("rx");

  const [reasonFa, setReasonFa] = useState("");
  const [drops, setDrops] = useState<DropItemInput[]>([
    {
      drugNameFa: "بتامتازون ۰.۱٪ چشمی",
      genericName: "betamethasone",
      bottleCapColorFa: "قرمز",
      frequencyPerDay: 4,
      durationDays: 14,
      instructionsFa: "بین دو قطره متفاوت ۵ دقیقه فاصله بگذارید.",
    },
  ]);
  const [closureReason, setClosureReason] = useState("اتمام دوره پیگیری موفق و تایید پزشک");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errFa, setErrFa] = useState<string | null>(null);

  const epQuery = useScopedQuery<CareEpisode>(
    ({ token, signal }) => apiRequest(`/v1/episodes/${episodeId}`, { token, signal }),
    [episodeId]
  );
  const rxHistQuery = useScopedQuery<{ items: PrescriptionVersion[] }>(
    ({ token, signal }) => apiRequest(`/v1/episodes/${episodeId}/prescriptions`, { token, signal }),
    [episodeId]
  );
  const adhQuery = useScopedQuery<{ items: AdherenceEventResponse[] }>(
    ({ token, signal }) => apiRequest(`/v1/episodes/${episodeId}/adherence`, { token, signal }),
    [episodeId],
    { enabled: tab === "adherence" }
  );
  const symQuery = useScopedQuery<{ items: EpisodeSymptomHistoryItem[] }>(
    ({ token, signal }) => apiRequest(`/v1/episodes/${episodeId}/symptoms`, { token, signal }),
    [episodeId],
    { enabled: tab === "symptoms" }
  );

  if (epQuery.loading && !epQuery.data) return <LoadingSkeleton rows={6} />;
  if (epQuery.error) {
    return (
      <StateSurface kind="error" title="خطا در دریافت اپیزود مراقبت" description={epQuery.error.messageFa} onRetry={epQuery.reload} />
    );
  }
  const ep = epQuery.data;
  if (!ep) return null;

  const latestRx = rxHistQuery.data?.items?.[0];

  async function handlePublishRx(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !ep) return;
    setBusy(true);
    setErrFa(null);
    setMsg(null);
    try {
      const created = await apiRequest<PrescriptionVersion>(`/v1/episodes/${ep.episodeId}/prescriptions`, {
        method: "POST",
        token: session.accessToken,
        body: {
          eyeLaterality: ep.eyeLaterality,
          reasonFa: reasonFa.trim(),
          items: drops,
        },
      });
      setMsg(`نسخه شماره ${formatPersianDigits(created.version)} برای ${formatEyeLabelFa(created.eyeLaterality)} با موفقیت منتشر شد.`);
      setReasonFa("");
      epQuery.reload();
      rxHistQuery.reload();
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseEpisode() {
    if (!session || !ep) return;
    setBusy(true);
    setErrFa(null);
    try {
      await apiRequest(`/v1/episodes/${ep.episodeId}/close`, {
        method: "PATCH",
        token: session.accessToken,
        body: { status: "completed", reasonFa: closureReason },
      });
      setMsg("دوره مراقبت با موفقیت پایان یافت.");
      epQuery.reload();
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateSchedulePdf() {
    if (!session || !ep) return;
    setBusy(true);
    setErrFa(null);
    try {
      const rep = await apiRequest<CreateReportResponse>("/v1/reports", {
        method: "POST",
        token: session.accessToken,
        body: {
          reportType: "patient_schedule",
          patientId: ep.patientId,
          sourceRefId: ep.episodeId,
          titleFa: `برنامه قطره و مراقبت ${formatEyeLabelFa(ep.eyeLaterality)}`,
          sections: [
            {
              headingFa: `برنامه دارویی ${formatEyeLabelFa(ep.eyeLaterality)} — نسخه v${latestRx?.version ?? 1}`,
              linesFa: drops.map(
                (d) =>
                  `${d.drugNameFa} (درب ${d.bottleCapColorFa}) — روزی ${formatPersianDigits(d.frequencyPerDay)} بار به مدت ${formatPersianDigits(d.durationDays)} روز`
              ),
            },
          ],
        },
      });
      setMsg(`گزارش PDF چاپی ایجاد شد (شناسه: ${rep.reportId.slice(0, 8)}).`);
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title={`اپیزود مراقبت ${formatEyeLabelFa(ep.eyeLaterality)} (E04–E12)`}
        breadcrumbs={[{ label: "مراقبت", to: "/care" }, { label: ep.episodeId.slice(0, 8) }]}
        actions={
          <Button variant="secondary" icon={<FileText size={15} />} loading={busy} onClick={() => void handleGenerateSchedulePdf()}>
            تولید نسخه چاپی PDF
          </Button>
        }
      />

      <PatientContextBar
        patientNameFa={`اپیزود ${formatEyeLabelFa(ep.eyeLaterality)}`}
        patientId={ep.patientId}
        eyeLaterality={ep.eyeLaterality}
        accessModeFa={`پروتکل: ${ep.protocolType} • نسخه فعال: v${formatPersianDigits(ep.activePrescriptionVersion)}`}
        actions={
          <StatusBadge
            tone={ep.status === "active" ? "success" : "info"}
            label={ep.status === "active" ? "فعال" : "تکمیل‌شده"}
          />
        }
      />

      {msg && <AlertBanner tone="success" title={msg} />}
      {errFa && <AlertBanner tone="error" title="خطای عملیات" description={errFa} />}

      <TabList<EpisodeTab>
        idPrefix="episode-detail"
        ariaLabel="بخش‌های دوره مراقبت"
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: "rx", label: "تنظیم و تاریخچه نسخه" },
          { key: "adherence", label: "پایبندی و مصرف" },
          { key: "symptoms", label: "علائم و هشدارها" },
          { key: "closure", label: "پایان دوره مراقبت" },
        ]}
      />

      <TabPanel idPrefix="episode-detail" tabKey="rx" activeKey={tab}>
        <div className="bina-grid">
          <form onSubmit={(e) => void handlePublishRx(e)} className="bina-panel-raised" style={{ gridColumn: "span 8", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="bina-section-h2">تنظیم نسخه جدید ({formatEyeLabelFa(ep.eyeLaterality)})</h2>
              <EyeBadge eye={ep.eyeLaterality} />
            </div>

            {!can("prescription:publish") && (
              <AlertBanner
                tone="warning"
                title="انتشار نسخه فقط توسط چشم‌پزشک مجاز است"
                description="نقش شما فاقد مجوز چشم‌پزشک برای انتشار نسخه نهایی است؛ تغییر این نسخه روی چشم مقابل اثری نخواهد داشت."
              />
            )}

            {drops.map((drop, idx) => (
              <div key={idx} className="bina-panel" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.8fr 0.7fr 0.7fr auto", gap: 8, alignItems: "end" }}>
                <div>
                  <label htmlFor={`rx-drug-${idx}`} style={{ fontSize: "0.75rem", fontWeight: 600 }}>نام دارو (فارسی)</label>
                  <input id={`rx-drug-${idx}`} className="bina-input" value={drop.drugNameFa} onChange={(e) => setDrops((prev) => prev.map((d, i) => (i === idx ? { ...d, drugNameFa: e.target.value } : d)))} />
                </div>
                <div>
                  <label htmlFor={`rx-gen-${idx}`} style={{ fontSize: "0.75rem", fontWeight: 600 }}>نام ژنریک</label>
                  <input id={`rx-gen-${idx}`} className="bina-input" dir="ltr" value={drop.genericName} onChange={(e) => setDrops((prev) => prev.map((d, i) => (i === idx ? { ...d, genericName: e.target.value } : d)))} />
                </div>
                <div>
                  <label htmlFor={`rx-cap-${idx}`} style={{ fontSize: "0.75rem", fontWeight: 600 }}>رنگ درب</label>
                  <input id={`rx-cap-${idx}`} className="bina-input" value={drop.bottleCapColorFa} onChange={(e) => setDrops((prev) => prev.map((d, i) => (i === idx ? { ...d, bottleCapColorFa: e.target.value } : d)))} />
                </div>
                <div>
                  <label htmlFor={`rx-freq-${idx}`} style={{ fontSize: "0.75rem", fontWeight: 600 }}>نوبت/روز</label>
                  <input id={`rx-freq-${idx}`} type="number" min={1} max={24} className="bina-input" dir="ltr" value={drop.frequencyPerDay} onChange={(e) => setDrops((prev) => prev.map((d, i) => (i === idx ? { ...d, frequencyPerDay: Number(e.target.value) } : d)))} />
                </div>
                <div>
                  <label htmlFor={`rx-days-${idx}`} style={{ fontSize: "0.75rem", fontWeight: 600 }}>روز</label>
                  <input id={`rx-days-${idx}`} type="number" min={1} max={180} className="bina-input" dir="ltr" value={drop.durationDays} onChange={(e) => setDrops((prev) => prev.map((d, i) => (i === idx ? { ...d, durationDays: Number(e.target.value) } : d)))} />
                </div>
                <Button variant="ghost" aria-label="حذف دارو" disabled={drops.length <= 1} onClick={() => setDrops((prev) => prev.filter((_, i) => i !== idx))}>
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}

            <div>
              <Button
                variant="secondary"
                icon={<Plus size={15} />}
                onClick={() =>
                  setDrops((prev) => [
                    ...prev,
                    { drugNameFa: "اشک مصنوعی بدون نگهدارنده", genericName: "artificial_tears", bottleCapColorFa: "سبز", frequencyPerDay: 4, durationDays: 30 },
                  ])
                }
              >
                افزودن قطره جدید
              </Button>
            </div>

            <div>
              <label htmlFor="rx-reason" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                دلیل انتشار نسخه جدید (الزامی برای تاریخچه نسخه‌ها)
              </label>
              <input id="rx-reason" className="bina-input" required value={reasonFa} onChange={(e) => setReasonFa(e.target.value)} placeholder="مثال: تغییر دوز در ویزیت هفته اول چشم راست..." />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                انتشار فقط نسخه {formatEyeLabelFa(ep.eyeLaterality)} را به‌روز می‌کند.
              </span>
              <Button type="submit" variant="primary" loading={busy} disabled={!can("prescription:publish")} icon={!can("prescription:publish") ? <Lock size={15} /> : undefined}>
                انتشار نسخه جدید (v{formatPersianDigits(ep.activePrescriptionVersion + 1)})
              </Button>
            </div>
          </form>

          {/* Side Live Preview & Version History E06 */}
          <aside className="bina-panel-raised" style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 className="bina-panel-h3">پیش‌نمایش کارت برنامه امروز بیمار (پیش‌نویس)</h3>
            <div className="bina-panel" style={{ background: "var(--surface-mint)" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{formatEyeLabelFa(ep.eyeLaterality)}</div>
              {drops.map((d, i) => (
                <div key={i} style={{ fontSize: "0.8125rem", marginBottom: 4 }}>
                  • <strong>{d.drugNameFa}</strong> (درب {d.bottleCapColorFa}) — {formatPersianDigits(d.frequencyPerDay)} بار در روز
                </div>
              ))}
            </div>
            <h3 className="bina-panel-h3">تاریخچه نسخه‌های منتشرشده (E06)</h3>
            {(rxHistQuery.data?.items ?? []).map((rx) => (
              <div key={rx.prescriptionId} className="bina-panel" style={{ fontSize: "0.8125rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>نسخه v{formatPersianDigits(rx.version)}</strong>
                  <span>{formatJalaliDateTime(rx.publishedAt)}</span>
                </div>
                <div style={{ color: "var(--muted)", marginTop: 4 }}>
                  {rx.items.map((it) => it.drugNameFa).join("، ")}
                </div>
              </div>
            ))}
          </aside>
        </div>
      </TabPanel>

      <TabPanel idPrefix="episode-detail" tabKey="adherence" activeKey={tab}>
        <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-panel-h3">گزارش‌های پایبندی ثبت‌شده (۴ وضعیت مجزا — E07)</h2>
          {(adhQuery.data?.items ?? []).map((ev) => (
            <div key={ev.eventId} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderBlockEnd: "1px solid var(--panel-divider)", fontSize: "0.8125rem" }}>
              <span>{ADHERENCE_LABELS_FA[ev.state]}{ev.deduplicated ? " (تکراری حذف‌شده)" : ""}</span>
              <span>{formatJalaliDateTime(ev.recordedAt, true)}</span>
            </div>
          ))}
        </div>
      </TabPanel>

      <TabPanel idPrefix="episode-detail" tabKey="symptoms" activeKey={tab}>
        <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-panel-h3">علائم گزارش‌شده توسط بیمار (E08)</h2>
          {(symQuery.data?.items ?? []).map((s) => {
            const isRedFlag = s.severePain || s.suddenVisionLoss || s.purulentDischarge || s.flashesOrCurtain;
            return (
              <div key={s.reportId} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderBlockEnd: "1px solid var(--panel-divider)", fontSize: "0.8125rem" }}>
                <div>
                  <strong>{s.freeTextFa || "ثبت چک‌لیست ساختاریافته"}</strong>
                  <div style={{ color: "var(--muted)" }}>{s.createdAtJalali}</div>
                </div>
                <StatusBadge tone={isRedFlag ? "urgent" : "success"} label={isRedFlag ? "علامت قرمز فوری" : "بدون علامت قرمز"} />
              </div>
            );
          })}
        </div>
      </TabPanel>

      <TabPanel idPrefix="episode-detail" tabKey="closure" activeKey={tab}>
        <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 620 }}>
          <h2 className="bina-section-h2">بستن و پایان دوره مراقبت (E12)</h2>
          <label htmlFor="episode-closure-reason" style={{ fontSize: "0.75rem", fontWeight: 600 }}>شرح پایان دوره مراقبت</label>
          <input id="episode-closure-reason" className="bina-input" value={closureReason} onChange={(e) => setClosureReason(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" disabled={ep.status !== "active"} loading={busy} icon={<CheckCircle2 size={16} />} onClick={() => void handleCloseEpisode()}>
              {ep.status === "active" ? "تایید و اتمام دوره مراقبت" : "این دوره قبلاً تکمیل شده است"}
            </Button>
            <Link to={`/reports?patientId=${ep.patientId}`} className="bina-button" data-variant="secondary">
              مشاهده گزارش‌های بیمار
            </Link>
          </div>
        </div>
      </TabPanel>
    </div>
  );
}
