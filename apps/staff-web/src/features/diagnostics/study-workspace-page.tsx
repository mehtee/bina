import React, { lazy, Suspense, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileCheck2, Lock, MessageSquarePlus, RefreshCw, ShieldAlert } from "lucide-react";
import { useParams } from "react-router";
import { apiRequest } from "~/core/api/client";
import type {
  ClinicianFeedbackRecord,
  DiagnosticStudyDetail,
  PersianReportDraft,
  StudyComparisonResponse,
  StudyInferenceJobRecord,
} from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useAuth, useCapabilities } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import {
  formatEyeLabelFa,
  formatJalaliDateTime,
  formatModalityFa,
  formatPersianDigits,
  formatSeverityFa,
  formatStudyStatusFa,
  MODALITY_LABELS_FA,
  URGENCY_LABELS_FA,
  type EyeCode,
  type UrgencyTier,
} from "~/core/i18n/fa-ir";
import { ModalDialog } from "~/design-system/composites/data-table";
import { PageHeader, PatientContextBar } from "~/design-system/composites/kpi-and-cards";
import { Button, EyeBadge, StatusBadge, UrgencyBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, LoadingSkeleton, StateSurface } from "~/design-system/primitives/state-surfaces";
import type { ViewerSubMode } from "./viewer/evidence-viewer-panel";

const LazyEvidenceViewer = lazy(() =>
  import("./viewer/evidence-viewer-panel").then((m) => ({
    default: m.EvidenceViewerPanel,
  }))
);

type StudyWorkspaceTab =
  | "fusion"
  | "qc_jobs"
  | "oct"
  | "fundus"
  | "anterior"
  | "vf"
  | "risk"
  | "compare"
  | "report";

export function StudyWorkspacePage() {
  const { studyId } = useParams();
  const { session } = useAuth();
  const { can } = useCapabilities();
  const [tab, setTab] = useState<StudyWorkspaceTab>("fusion");

  // Recapture state (C03)
  const [recaptureModality, setRecaptureModality] = useState("fundus");
  const [recaptureEye, setRecaptureEye] = useState<EyeCode>("OD");
  const [recaptureKey, setRecaptureKey] = useState("s3://bina-dev/studies/recapture-clear.png");

  // Report draft editor state (C13)
  const [draftTitle, setDraftTitle] = useState("");
  const [draftFindings, setDraftFindings] = useState("");
  const [draftDifferential, setDraftDifferential] = useState("");
  const [draftCorrelation, setDraftCorrelation] = useState("");
  const [draftPlan, setDraftPlan] = useState("");
  const [draftUrgency, setDraftUrgency] = useState<UrgencyTier>("routine");
  const [draftVersion, setDraftVersion] = useState(1);
  const [highlightedEvidence, setHighlightedEvidence] = useState<string | null>(null);

  // Signoff Modal (C14)
  const [signoffOpen, setSignoffOpen] = useState(false);
  const [signoffAction, setSignoffAction] = useState<"approved" | "edited_approved" | "rejected">("approved");
  const [signoffUrgency, setSignoffUrgency] = useState<UrgencyTier>("routine");
  const [overrideReason, setOverrideReason] = useState("");

  // Clinician Feedback (C17)
  const [fbLayer, setFbLayer] = useState<"qc" | "specialist" | "fusion" | "segmentation" | "gradcam" | "report_draft" | "urgency">("fusion");
  const [fbState, setFbState] = useState<"agree" | "partially_agree" | "disagree">("agree");
  const [fbNote, setFbNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errFa, setErrFa] = useState<string | null>(null);

  const studyQuery = useScopedQuery<DiagnosticStudyDetail>(
    ({ token, signal }) => apiRequest(`/v1/diagnostic-studies/${studyId}`, { token, signal }),
    [studyId]
  );

  const jobsQuery = useScopedQuery<{ items: StudyInferenceJobRecord[] }>(
    ({ token, signal }) => apiRequest(`/v1/diagnostic-studies/${studyId}/jobs`, { token, signal }),
    [studyId],
    { enabled: tab === "qc_jobs" }
  );

  const feedbackQuery = useScopedQuery<{ items: ClinicianFeedbackRecord[] }>(
    ({ token, signal }) => apiRequest(`/v1/diagnostic-studies/${studyId}/feedback`, { token, signal }),
    [studyId]
  );

  const compareQuery = useScopedQuery<StudyComparisonResponse>(
    ({ token, signal }) => apiRequest(`/v1/diagnostic-studies/${studyId}/compare`, { token, signal }),
    [studyId],
    { enabled: tab === "compare" }
  );

  const study = studyQuery.data;

  useEffect(() => {
    if (!study) return;
    if (study.status === "qc_failed") {
      setTab("qc_jobs");
    }
    const d = study.persianReportDraft;
    if (d) {
      setDraftTitle(d.titleFa);
      setDraftFindings(d.modalityFindingsFa);
      setDraftDifferential(d.differentialSummaryFa);
      setDraftCorrelation(d.crossModalCorrelationFa);
      setDraftPlan(d.followUpPlanFa);
      setDraftUrgency(d.urgencyTier);
      setDraftVersion(d.draftVersion ?? 1);
      setSignoffUrgency(d.urgencyTier);
    }
    if (study.eyeLaterality === "OD" || study.eyeLaterality === "OS") {
      setRecaptureEye(study.eyeLaterality);
    }
  }, [study]);

  if (studyQuery.loading && !studyQuery.data) return <LoadingSkeleton rows={7} />;
  if (studyQuery.error) {
    return (
      <StateSurface kind="error" title="خطا در دریافت مطالعه تشخیصی" description={studyQuery.error.messageFa} onRetry={studyQuery.reload} />
    );
  }
  if (!study) return null;

  const isQcFailed = study.status === "qc_failed";
  const isSigned = study.status === "signed_off";
  const floorActive = Boolean(study.urgentFloorActive);

  async function handleRecapture(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !study) return;
    setBusy(true);
    setErrFa(null);
    try {
      await apiRequest(`/v1/diagnostic-studies/${study.studyId}/assets`, {
        method: "POST",
        token: session.accessToken,
        body: {
          assets: [
            {
              assetId: crypto.randomUUID(),
              s3ObjectKey: recaptureKey.trim(),
              declaredModality: recaptureModality,
              declaredEye: recaptureEye,
              blurScoreHint: 0.92,
            },
          ],
        },
      });
      setMsg("تصویر جایگزین ثبت و بازتحلیل انجام شد؛ سابقه فایل قبلی حفظ گردید.");
      studyQuery.reload();
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !study) return;
    setBusy(true);
    setErrFa(null);
    setMsg(null);
    try {
      const updated = await apiRequest<PersianReportDraft>(
        `/v1/diagnostic-studies/${study.studyId}/report-draft`,
        {
          method: "PUT",
          token: session.accessToken,
          body: {
            expectedDraftVersion: draftVersion,
            titleFa: draftTitle,
            modalityFindingsFa: draftFindings,
            differentialSummaryFa: draftDifferential,
            crossModalCorrelationFa: draftCorrelation,
            followUpPlanFa: draftPlan,
            urgencyTier: draftUrgency,
            evidenceIds: study.persianReportDraft?.evidenceIds ?? [],
          },
        }
      );
      setDraftVersion(updated.draftVersion ?? draftVersion + 1);
      setMsg(`پیش‌نویس گزارش در نسخه v${formatPersianDigits(updated.draftVersion ?? draftVersion + 1)} ذخیره شد.`);
      studyQuery.reload();
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignoff() {
    if (!session || !study) return;
    setBusy(true);
    setErrFa(null);
    try {
      await apiRequest(`/v1/diagnostic-studies/${study.studyId}/signoff`, {
        method: "POST",
        token: session.accessToken,
        body: {
          action: signoffAction,
          finalUrgency: signoffUrgency,
          finalReportTextFa: `${draftTitle}\n${draftFindings}\n${draftFollowUpOrDiff()}`,
          overrideReasonFa: signoffAction !== "approved" ? overrideReason.trim() : undefined,
          expectedDraftVersion: draftVersion,
        },
      });
      setSignoffOpen(false);
      setMsg("گزارش تشخیصی با موفقیت توسط چشم‌پزشک تایید و امضا شد.");
      studyQuery.reload();
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    } finally {
      setBusy(false);
    }
  }

  function draftFollowUpOrDiff() {
    return `${draftDifferential}\n${draftPlan}`;
  }

  async function handleSaveFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !study) return;
    try {
      await apiRequest(`/v1/diagnostic-studies/${study.studyId}/feedback`, {
        method: "POST",
        token: session.accessToken,
        body: { targetLayer: fbLayer, agreementState: fbState, noteFa: fbNote },
      });
      setFbNote("");
      setMsg("بازخورد بالینی به‌صورت تغییرناپذیر ثبت شد.");
      feedbackQuery.reload();
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    }
  }

  const tabs: Array<{ key: StudyWorkspaceTab; label: string; viewerMode?: ViewerSubMode; disabledIfQcFailed?: boolean }> = [
    { key: "fusion", label: "نمای کلی و ترکیب شواهد (C11)", disabledIfQcFailed: true },
    { key: "qc_jobs", label: "کنترل کیفیت و پردازش (C03/C04)" },
    { key: "oct", label: "OCT / OCT-A (C07)", viewerMode: "oct", disabledIfQcFailed: true },
    { key: "fundus", label: "شبکیه Fundus (C06)", viewerMode: "fundus", disabledIfQcFailed: true },
    { key: "anterior", label: "قدامی و توپوگرافی (C08)", viewerMode: "anterior", disabledIfQcFailed: true },
    { key: "vf", label: "میدان بینایی VF (C09)", viewerMode: "vf", disabledIfQcFailed: true },
    { key: "risk", label: "خطر بالینی و SHAP (C10)", viewerMode: "risk", disabledIfQcFailed: true },
    { key: "compare", label: "مقایسه سوابق (C15)", viewerMode: "compare", disabledIfQcFailed: true },
    { key: "report", label: "ویرایش گزارش و تایید (C13/C14)", disabledIfQcFailed: true },
  ];

  const allModalities = ["fundus", "oct", "octa", "topography", "visual_field", "tabular_xgb"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title={`میز کار مطالعه تشخیصی — ${formatEyeLabelFa(study.eyeLaterality)}`}
        breadcrumbs={[
          { label: "میز کار تشخیصی", to: "/diagnostics" },
          { label: study.studyId.slice(0, 8) },
        ]}
        actions={
          !isQcFailed &&
          !isSigned && (
            <Button
              variant="primary"
              disabled={!can("diagnostic:signoff")}
              icon={!can("diagnostic:signoff") ? <Lock size={15} /> : <FileCheck2 size={16} />}
              onClick={() => setSignoffOpen(true)}
            >
              تایید و امضای چشم‌پزشک (C14)
            </Button>
          )
        }
      />

      <PatientContextBar
        patientNameFa={`مطالعه ${study.studyId.slice(0, 8)}`}
        patientId={study.patientId}
        eyeLaterality={study.eyeLaterality}
        urgencyTier={study.fusionResult?.recommendedUrgency ?? null}
        accessModeFa={`وضعیت: ${formatStudyStatusFa(study.status)} • نسخه پیش‌نویس: v${formatPersianDigits(draftVersion)}`}
        actions={
          <StatusBadge
            tone={isSigned ? "success" : isQcFailed ? "error" : "warning"}
            label={isSigned ? "تاییدشده توسط پزشک" : isQcFailed ? "متوقف در دروازه QC" : "پیش‌نویس هوش مصنوعی (منتظر HITL)"}
          />
        }
      />

      {isQcFailed && (
        <AlertBanner
          tone="error"
          title="تصویربرداری در کنترل کیفیت (Layer 1 QC) رد شد — تحلیل تشخیصی متوقف است"
          description="مدل‌های تشخیصی روی تصویر بی‌کیفیت یا چشم اشتباه اجرا نمی‌شوند. از بخش کنترل کیفیت، تصویر جایگزین ارسال کنید."
        />
      )}

      {floorActive && !isQcFailed && (
        <AlertBanner
          tone="urgent"
          title="کف فوریت قطعی فعال است: ارجاع فوری (غیرقابل کاهش)"
          description={`این مطالعه دارای نشانه قطعی پرخطر است (${(study.urgentFloorRuleCodes ?? []).join("، ") || "PILLAR2_URGENT_FLOOR"}) و کاهش اولویت توسط مدل یا UI مسدود می‌شود.`}
        />
      )}

      {msg && <AlertBanner tone="success" title={msg} />}
      {errFa && <AlertBanner tone="error" title="خطای اعتبارسنجی / عملیات" description={errFa} />}

      {/* Tabs */}
      <div role="tablist" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tabs.map((t) => {
          const blocked = Boolean(t.disabledIfQcFailed && isQcFailed);
          return (
            <Button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              variant={tab === t.key ? "primary" : "secondary"}
              disabled={blocked}
              onClick={() => setTab(t.key)}
              style={{ minBlockSize: 34, fontSize: "0.75rem" }}
            >
              {t.label}
            </Button>
          );
        })}
      </div>

      {/* C03 / C04: QC & Jobs */}
      {tab === "qc_jobs" && (
        <div className="bina-grid">
          <div className="bina-panel-raised" style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="bina-section-h2">نتایج کنترل کیفیت (Layer 1 QC)</h2>
            {study.qcDecisions.map((q) => (
              <div key={q.assetId} className="bina-panel" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>مدالیته اعلامی: {formatModalityFa(q.modalityPrediction.declaredModality)} / تشخیص‌داده‌شده: {formatModalityFa(q.modalityPrediction.detectedModality)}</strong>
                  <StatusBadge tone={q.passed ? "success" : "error"} label={q.passed ? "تایید QC" : "رد QC"} />
                </div>
                {!q.passed && (
                  <>
                    <div style={{ color: "var(--error)", fontSize: "0.8125rem" }}>دلایل رد: {q.rejectionReasonsFa.join(" • ")}</div>
                    {q.recaptureInstructionFa && (
                      <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>راهنمای تصویربرداری مجدد: {q.recaptureInstructionFa}</div>
                    )}
                  </>
                )}
              </div>
            ))}

            {!isSigned && (
              <form onSubmit={(e) => void handleRecapture(e)} className="bina-panel" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h3 className="bina-panel-h3">ارسال تصویر جدید جایگزین (حفظ سابقه فایل ردشده)</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select aria-label="مدالیته تصویر جایگزین" className="bina-select" style={{ maxWidth: 180 }} value={recaptureModality} onChange={(e) => setRecaptureModality(e.target.value)}>
                    <option value="fundus">فوندوس</option>
                    <option value="oct">OCT</option>
                    <option value="topography">توپوگرافی</option>
                  </select>
                  <select aria-label="چشم تصویر جایگزین" className="bina-select" style={{ maxWidth: 160 }} value={recaptureEye} onChange={(e) => setRecaptureEye(e.target.value as EyeCode)}>
                    <option value="OD">چشم راست (OD)</option>
                    <option value="OS">چشم چپ (OS)</option>
                  </select>
                  <input aria-label="مسیر فایل تصویر جایگزین" dir="ltr" className="bina-input" style={{ flex: 1 }} value={recaptureKey} onChange={(e) => setRecaptureKey(e.target.value)} />
                  <Button type="submit" variant="primary" loading={busy} icon={<RefreshCw size={14} />}>ارسال مجدد</Button>
                </div>
              </form>
            )}
          </div>

          <div className="bina-panel-raised" style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 className="bina-section-h2">صف و وضعیت پردازش موتور AI</h2>
            {(jobsQuery.data?.items ?? []).length === 0 ? (
              <div className="bina-panel" style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
                {isQcFailed
                  ? "به‌دلیل توقف در دروازه کنترل کیفیت (Layer 1 QC)، هیچ وظیفه استنتاجی در صف اجرا نشده است."
                  : "هنوز وظیفه پردازشی برای این مطالعه ثبت نشده است."}
              </div>
            ) : (
              (jobsQuery.data?.items ?? []).map((j) => (
                <div key={j.jobId} className="bina-panel" style={{ fontSize: "0.8125rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <bdi dir="ltr">{j.jobId.slice(0, 8)}</bdi>
                    <StatusBadge tone={j.status === "completed" ? "success" : j.status === "qc_failed" ? "error" : "info"} label={formatStudyStatusFa(j.status)} />
                  </div>
                  <div style={{ color: "var(--muted)", marginTop: 4 }}>موتور: {j.engineMode} • زمان: {formatJalaliDateTime(j.createdAtIso, true)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* C11 Fusion Summary */}
      {tab === "fusion" && !isQcFailed && study.fusionResult && (
        <div className="bina-grid">
          <div className="bina-panel-raised" style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 className="bina-section-h2">تشخیص افتراقی چندوجهی و عدم قطعیت (C11 — مجموع Scores اجباری به ۱۰۰ نیست)</h2>
            {study.fusionResult.differential.map((diff) => (
              <div key={diff.conditionCode} className="bina-panel" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{diff.conditionNameFa}</strong>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className="bina-number" style={{ fontWeight: 700 }}>
                      {formatPersianDigits(Math.round(diff.confidence * 100))}٪
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      (بازه: {formatPersianDigits(Math.round(diff.confidenceIntervalLower * 100))}–{formatPersianDigits(Math.round(diff.confidenceIntervalUpper * 100))}٪)
                    </span>
                    <StatusBadge tone={diff.severity === "urgent" ? "urgent" : "warning"} label={formatSeverityFa(diff.severity)} />
                  </div>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>
                  مدالیته‌های پشتیبان: {diff.supportingModalities.map((m) => formatModalityFa(m)).join("، ")}
                </div>
              </div>
            ))}

            <h3 className="bina-panel-h3">ماتریس در دسترس بودن ۶ مدالیته</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {allModalities.map((m) => {
                const avail = (study.fusionResult!.availableModalities as string[]).includes(m);
                return (
                  <div key={m} className="bina-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                    <span>{MODALITY_LABELS_FA[m] ?? m}</span>
                    <StatusBadge tone={avail ? "success" : "neutral"} label={avail ? "موجود" : "ثبت‌نشده"} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bina-panel-raised" style={{ gridColumn: "span 5", display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="bina-panel-h3">عدم تطابق‌ها و داده‌های مفقود</h2>
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--on-surface-variant)" }}>
              {study.fusionResult.missingModalityNoticeFa}
            </p>
            {study.fusionResult.discordanceFlagsFa.map((f, idx) => (
              <AlertBanner key={idx} tone="warning" title="هشدار ناهمخوانی بالینی" description={f} />
            ))}
            <h3 className="bina-panel-h3" style={{ marginTop: 6 }}>بازخورد پزشک روی لایه‌ها</h3>
            <form onSubmit={(e) => void handleSaveFeedback(e)} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <select aria-label="لایه مورد بازخورد" className="bina-select" value={fbLayer} onChange={(e) => setFbLayer(e.target.value as typeof fbLayer)}>
                  <option value="fusion">ترکیب شواهد (Fusion)</option>
                  <option value="segmentation">ماسک سگمنتیشن</option>
                  <option value="gradcam">راهنمای Grad-CAM</option>
                  <option value="report_draft">پیش‌نویس گزارش</option>
                  <option value="urgency">سطح فوریت</option>
                </select>
                <select aria-label="وضعیت توافق پزشک" className="bina-select" value={fbState} onChange={(e) => setFbState(e.target.value as typeof fbState)}>
                  <option value="agree">موافق</option>
                  <option value="partially_agree">موافقت نسبی</option>
                  <option value="disagree">مخالف</option>
                </select>
              </div>
              <input aria-label="یادداشت بازخورد پزشک" className="bina-input" required value={fbNote} onChange={(e) => setFbNote(e.target.value)} placeholder="یادداشت بازخورد پزشک..." />
              <Button type="submit" variant="secondary" icon={<MessageSquarePlus size={14} />}>ثبت بازخورد</Button>
            </form>
          </div>
        </div>
      )}

      {/* Lazy Viewers (C06, C07, C08, C09, C10, C15) */}
      {!isQcFailed &&
        (tab === "oct" || tab === "fundus" || tab === "anterior" || tab === "vf" || tab === "risk" || tab === "compare") && (
          <Suspense fallback={<LoadingSkeleton rows={6} />}>
            <LazyEvidenceViewer
              study={study}
              mode={tab as ViewerSubMode}
              comparison={compareQuery.data}
            />
          </Suspense>
        )}

      {/* C13 / C14 Structured Persian Report Editor & Sign-Off */}
      {tab === "report" && !isQcFailed && (
        <div className="bina-grid">
          {/* Evidence Citation Rail */}
          <aside className="bina-panel-raised" style={{ gridColumn: "span 3", display: "flex", flexDirection: "column", gap: 8 }}>
            <h3 className="bina-panel-h3">ارجاعات شواهد قابل کلیک (Citations)</h3>
            {(study.persianReportDraft?.evidenceIds ?? []).map((eid) => (
              <button
                key={eid}
                type="button"
                onClick={() => setHighlightedEvidence(eid)}
                style={{
                  textAlign: "start",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--outline-variant)",
                  background: highlightedEvidence === eid ? "var(--primary-container)" : "var(--surface)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                <bdi dir="ltr">{eid}</bdi>
              </button>
            ))}
            {highlightedEvidence && (
              <div className="bina-panel" style={{ fontSize: "0.75rem" }}>
                شاهد فعال: <bdi dir="ltr"><strong>{highlightedEvidence}</strong></bdi> در {formatEyeLabelFa(study.eyeLaterality)}
              </div>
            )}
          </aside>

          <form onSubmit={(e) => void handleSaveDraft(e)} className="bina-panel-raised bina-report-body" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 className="bina-section-h2">ویرایشگر گزارش ساختاریافته فارسی</h2>
            <label htmlFor="draft-title" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>عنوان گزارش (ذکر صریح چشم الزامی)</label>
            <input id="draft-title" className="bina-input" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} disabled={isSigned} />

            <label htmlFor="draft-findings" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>یافته‌های مدالیته‌ها</label>
            <textarea id="draft-findings" className="bina-textarea" value={draftFindings} onChange={(e) => setDraftFindings(e.target.value)} disabled={isSigned} />

            <label htmlFor="draft-diff" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>جمع‌بندی افتراقی و همبستگی</label>
            <textarea id="draft-diff" className="bina-textarea" value={draftDifferential} onChange={(e) => setDraftDifferential(e.target.value)} disabled={isSigned} />
            <input id="draft-corr" aria-label="همبستگی بین‌مدالیته‌ای" className="bina-input" value={draftCorrelation} onChange={(e) => setDraftCorrelation(e.target.value)} disabled={isSigned} />

            <label htmlFor="draft-plan" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>برنامه پیگیری و ارجاع</label>
            <textarea id="draft-plan" className="bina-textarea" value={draftPlan} onChange={(e) => setDraftPlan(e.target.value)} disabled={isSigned} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <select
                aria-label="سطح فوریت پیشنهادی گزارش"
                className="bina-select"
                style={{ maxWidth: 220 }}
                value={draftUrgency}
                disabled={isSigned}
                onChange={(e) => setDraftUrgency(e.target.value as UrgencyTier)}
              >
                <option value="routine">عادی</option>
                <option value="followup_3_6m">پیگیری ۳ تا ۶ ماه</option>
                <option value="urgent">ارجاع فوری</option>
              </select>
              {!isSigned && (
                <Button type="submit" variant="secondary" loading={busy}>
                  ذخیره پیش‌نویس (نسخه v{formatPersianDigits(draftVersion)})
                </Button>
              )}
            </div>
          </form>

          {/* Validation & Signoff Inspector */}
          <aside className="bina-panel-raised" style={{ gridColumn: "span 3", display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 className="bina-panel-h3">وضعیت اعتبارسنجی و امضا (C14)</h3>
            {isSigned && study.signoff ? (
              <div className="bina-panel" style={{ background: "var(--success-bg)", color: "var(--success)", fontSize: "0.8125rem" }}>
                <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={16} /> امضاشده توسط چشم‌پزشک
                </div>
                <div style={{ marginTop: 6 }}>اولویت نهایی: {study.signoff.finalUrgencyLabelFa}</div>
                <div>زمان: {formatJalaliDateTime(study.signoff.signedAt, true)}</div>
              </div>
            ) : (
              <>
                <StatusBadge
                  tone={study.persianReportDraft?.validationPassed ? "success" : "warning"}
                  label={study.persianReportDraft?.validationPassed ? "معتبر برای بررسی پزشک" : "استفاده از الگوی ایمن جایگزین"}
                />
                {floorActive && (
                  <div style={{ fontSize: "0.75rem", color: "var(--error)", display: "flex", gap: 4 }}>
                    <AlertTriangle size={14} /> کف فوریت قطعی: «ارجاع فوری» قابل کاهش نیست.
                  </div>
                )}
                <Button
                  variant="primary"
                  disabled={!can("diagnostic:signoff")}
                  icon={!can("diagnostic:signoff") ? <ShieldAlert size={15} /> : undefined}
                  onClick={() => setSignoffOpen(true)}
                >
                  {can("diagnostic:signoff") ? "بررسی و امضای نهایی (C14)" : "امضا فقط توسط چشم‌پزشک مجاز است"}
                </Button>
              </>
            )}
          </aside>
        </div>
      )}

      {/* Signoff Confirmation Modal (C14) */}
      <ModalDialog
        open={signoffOpen}
        title="تایید و امضای نهایی چشم‌پزشک (HITL — C14)"
        onClose={() => setSignoffOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSignoffOpen(false)}>انصراف</Button>
            <Button variant="primary" loading={busy} onClick={() => void handleSignoff()}>
              ثبت امضای نهایی
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <EyeBadge eye={study.eyeLaterality} />
            <span style={{ fontSize: "0.8125rem" }}>نسخه پیش‌نویس: v{formatPersianDigits(draftVersion)}</span>
          </div>

          {floorActive && (
            <AlertBanner
              tone="urgent"
              title="حفاظت کف فوریت قطعی"
              description="انتخاب سطح پایین‌تر از «ارجاع فوری» برای این یافته مسدود شده است."
            />
          )}

          <div>
            <label htmlFor="signoff-action" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>نوع اقدام پزشک</label>
            <select id="signoff-action" className="bina-select" value={signoffAction} onChange={(e) => setSignoffAction(e.target.value as "approved" | "edited_approved" | "rejected")}>
              <option value="approved">تایید گزارش فعلی</option>
              <option value="edited_approved">تایید با ویرایش پزشک</option>
              <option value="rejected">رد تحلیل هوش مصنوعی</option>
            </select>
          </div>

          <div>
            <label htmlFor="signoff-urgency" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>اولویت نهایی</label>
            <select id="signoff-urgency" className="bina-select" value={signoffUrgency} onChange={(e) => setSignoffUrgency(e.target.value as UrgencyTier)}>
              <option value="routine" disabled={floorActive}>عادی {floorActive ? "(مسدود — کف فوری)" : ""}</option>
              <option value="followup_3_6m" disabled={floorActive}>پیگیری ۳ تا ۶ ماه {floorActive ? "(مسدود — کف فوری)" : ""}</option>
              <option value="urgent">{URGENCY_LABELS_FA.urgent}</option>
            </select>
          </div>

          {signoffAction !== "approved" && (
            <div>
              <label htmlFor="signoff-override-reason" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>علت ویرایش یا رد (الزامی — حداقل ۵ کاراکتر)</label>
              <textarea id="signoff-override-reason" className="bina-textarea" required value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
            </div>
          )}
        </div>
      </ModalDialog>
    </div>
  );
}
