import React, { useState } from "react";
import { Plus, ScanEye, Trash2, UploadCloud } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { apiRequest } from "~/core/api/client";
import type {
  DiagnosticStudyDetail,
  DiagnosticStudyWorklistItem,
  DiagnosticStudyWorklistResponse,
  PatientListResponse,
  StudyAssetInput,
} from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useAuth, useCapabilities } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import {
  formatPersianDigits,
  MODALITY_LABELS_FA,
  type EyeCode,
  type StudyEyeCode,
  type UrgencyTier,
} from "~/core/i18n/fa-ir";
import { DataTable, SingleEyeSelect, type DataColumn } from "~/design-system/composites/data-table";
import { PageHeader } from "~/design-system/composites/kpi-and-cards";
import { Button, EyeBadge, StatusBadge, UrgencyBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, LoadingSkeleton, StateSurface } from "~/design-system/primitives/state-surfaces";

export function DiagnosticsWorklistPage() {
  const { can } = useCapabilities();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<"" | UrgencyTier>("");
  const [eyeFilter, setEyeFilter] = useState<"" | StudyEyeCode>("");

  const listQuery = useScopedQuery<DiagnosticStudyWorklistResponse>(
    ({ token, signal }) => {
      const sp = new URLSearchParams();
      if (statusFilter) sp.set("status", statusFilter);
      if (urgencyFilter) sp.set("urgencyTier", urgencyFilter);
      if (eyeFilter) sp.set("eyeLaterality", eyeFilter);
      const qs = sp.toString();
      return apiRequest(`/v1/diagnostic-studies${qs ? `?${qs}` : ""}`, { token, signal });
    },
    [statusFilter, urgencyFilter, eyeFilter]
  );

  const columns: DataColumn<DiagnosticStudyWorklistItem>[] = [
    {
      key: "patient",
      header: "بیمار و مطالعه",
      render: (s) => (
        <div>
          <strong>{s.patientNameFa}</strong>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}><bdi dir="ltr">{s.studyId.slice(0, 8)}</bdi></div>
        </div>
      ),
    },
    { key: "eye", header: "چشم", render: (s) => <EyeBadge eye={s.eyeLaterality} /> },
    {
      key: "modalities",
      header: "مدالیته‌ها",
      render: (s) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {s.modalities.map((m) => (
            <StatusBadge key={m} tone="neutral" label={m} showIcon={false} />
          ))}
        </div>
      ),
    },
    {
      key: "top",
      header: "یافته محتمل",
      render: (s) => s.topConditionNameFa ?? (s.status === "qc_failed" ? "ردشده در کنترل کیفیت (QC)" : "—"),
    },
    {
      key: "urgency",
      header: "اولویت",
      render: (s) => (s.urgencyTier ? <UrgencyBadge tier={s.urgencyTier} /> : <StatusBadge tone="neutral" label="تعیین‌نشده" showIcon={false} />),
    },
    {
      key: "status",
      header: "وضعیت",
      render: (s) => (
        <StatusBadge
          tone={s.status === "signed_off" ? "success" : s.status === "qc_failed" ? "error" : "warning"}
          label={
            s.status === "signed_off"
              ? "تاییدشده توسط پزشک"
              : s.status === "qc_failed"
                ? "ردشده در QC"
                : "در انتظار بررسی پزشک"
          }
        />
      ),
    },
    { key: "date", header: "تاریخ", render: (s) => s.createdAtJalali },
    {
      key: "open",
      header: "باز کردن",
      render: (s) => (
        <Link to={`/diagnostics/${s.studyId}`} className="bina-button" data-variant="primary" style={{ minBlockSize: 30, fontSize: "0.75rem" }}>
          میز کار مطالعه
        </Link>
      ),
    },
  ];

  const queueTabs = [
    ["", "همه مطالعات"],
    ["pending_hitl", "در انتظار بررسی پزشک"],
    ["qc_failed", "نیازمند تصویربرداری مجدد (QC)"],
    ["signed_off", "تاییدشده"],
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="میز کار تشخیصی چندوجهی (C01)"
        subtitle={`تعداد مطالعات در صف فعلی: ${formatPersianDigits(listQuery.data?.total ?? 0)}`}
        actions={
          can("study:upload") && (
            <Link to="/diagnostics/new" className="bina-button" data-variant="primary">
              <Plus size={16} />
              <span>ثبت مطالعه و آپلود تصاویر (C02)</span>
            </Link>
          )
        }
      />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {queueTabs.map(([k, lbl]) => (
          <Button
            key={k}
            variant={statusFilter === k ? "primary" : "secondary"}
            onClick={() => setStatusFilter(k)}
            style={{ minBlockSize: 32, fontSize: "0.75rem" }}
          >
            {lbl}
          </Button>
        ))}
      </div>

      <div className="bina-panel-raised" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="فیلتر سطح فوریت مطالعات" className="bina-select" style={{ maxWidth: 200 }} value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value as "" | UrgencyTier)}>
          <option value="">همه سطوح فوریت</option>
          <option value="urgent">ارجاع فوری</option>
          <option value="followup_3_6m">پیگیری ۳ تا ۶ ماه</option>
          <option value="routine">عادی</option>
        </select>
        <select aria-label="فیلتر چشم مطالعات" className="bina-select" style={{ maxWidth: 180 }} value={eyeFilter} onChange={(e) => setEyeFilter(e.target.value as "" | StudyEyeCode)}>
          <option value="">همه چشم‌ها</option>
          <option value="OD">چشم راست (OD)</option>
          <option value="OS">چشم چپ (OS)</option>
        </select>
      </div>

      {listQuery.loading && !listQuery.data ? (
        <LoadingSkeleton rows={6} />
      ) : listQuery.error ? (
        <StateSurface kind="error" title="خطا در دریافت لیست مطالعات" description={listQuery.error.messageFa} onRetry={listQuery.reload} />
      ) : (
        <DataTable
          caption="فهرست مطالعات تشخیصی"
          rows={listQuery.data?.items ?? []}
          columns={columns}
          getRowId={(s) => s.studyId}
          onSelectRow={(s) => void navigate(`/diagnostics/${s.studyId}`)}
        />
      )}
    </div>
  );
}

export function NewStudyUploadPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const [patientId, setPatientId] = useState(sp.get("patientId") ?? "");
  const [studyEye, setStudyEye] = useState<EyeCode>("OD");
  const [assets, setAssets] = useState<Array<{ declaredModality: StudyAssetInput["declaredModality"]; declaredEye: EyeCode; s3ObjectKey: string; blurHint: string; conditionHint: string }>>([
    { declaredModality: "fundus", declaredEye: "OD", s3ObjectKey: "s3://bina-dev/uploads/fundus-od.png", blurHint: "0.85", conditionHint: "" },
    { declaredModality: "oct", declaredEye: "OD", s3ObjectKey: "s3://bina-dev/uploads/oct-od.dcm", blurHint: "0.9", conditionHint: "" },
  ]);
  const [hba1c, setHba1c] = useState("7.4");
  const [iopMmHg, setIopMmHg] = useState("16");
  const [submitting, setSubmitting] = useState(false);
  const [errorFa, setErrorFa] = useState<string | null>(null);

  const patientsQuery = useScopedQuery<PatientListResponse>(
    ({ token, signal }) => apiRequest("/v1/patients?limit=50", { token, signal }),
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSubmitting(true);
    setErrorFa(null);
    try {
      const payloadAssets: StudyAssetInput[] = assets.map((a) => ({
        assetId: crypto.randomUUID(),
        s3ObjectKey: a.s3ObjectKey.trim(),
        declaredModality: a.declaredModality,
        declaredEye: a.declaredEye,
        blurScoreHint: Number(a.blurHint) || 0.85,
        conditionHints: a.conditionHint ? [a.conditionHint] : undefined,
      }));
      const created = await apiRequest<DiagnosticStudyDetail>("/v1/diagnostic-studies", {
        method: "POST",
        token: session.accessToken,
        body: {
          patientId,
          eyeLaterality: studyEye,
          assets: payloadAssets,
          labs: { hba1c: Number(hba1c) || 7.0, iop_mmhg: Number(iopMmHg) || 15 },
        },
      });
      void navigate(`/diagnostics/${created.studyId}`);
    } catch (err) {
      setErrorFa(toFriendlyError(err).messageFa);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="ثبت مطالعه و ورود تصاویر چندوجهی (C02)"
        subtitle="برای هر فایل، مدالیته و چشم راست/چپ باید صریحاً مشخص شود؛ تصاویر دارای تاری یا خطای چشم در دروازه QC متوقف می‌شوند."
        breadcrumbs={[{ label: "میز کار تشخیصی", to: "/diagnostics" }, { label: "مطالعه جدید" }]}
      />
      {errorFa && <AlertBanner tone="error" title="خطا در ارسال مطالعه" description={errorFa} />}

      <form onSubmit={(e) => void handleSubmit(e)} className="bina-grid">
        <div className="bina-panel-raised" style={{ gridColumn: "span 8", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label htmlFor="st-patient" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>بیمار</label>
              <select id="st-patient" className="bina-select" required value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                <option value="">انتخاب بیمار...</option>
                {(patientsQuery.data?.items ?? []).map((p) => (
                  <option key={p.patientId} value={p.patientId}>{p.fullNameFa}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="st-eye" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>چشم هدف مطالعه</label>
              <SingleEyeSelect id="st-eye" value={studyEye} onChange={setStudyEye} />
            </div>
          </div>

          <div
            style={{
              border: "2px dashed var(--outline)",
              background: "var(--surface-mint)",
              borderRadius: "var(--radius-card)",
              padding: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <UploadCloud size={22} color="var(--primary)" />
              <div>
                <strong>افزودن فایل تصویربرداری / DICOM</strong>
                <div style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>
                  پشتیبانی از فوندوس، OCT، OCT-A، بخش قدامی، توپوگرافی و میدان بینایی
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              icon={<Plus size={15} />}
              onClick={() =>
                setAssets((prev) => [
                  ...prev,
                  { declaredModality: "topography", declaredEye: studyEye, s3ObjectKey: `s3://bina-dev/uploads/topo-${prev.length}.json`, blurHint: "0.9", conditionHint: "" },
                ])
              }
            >
              افزودن ردیف فایل
            </Button>
          </div>

          {assets.map((asset, idx) => (
            <div key={idx} className="bina-panel" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr 0.7fr 0.8fr auto", gap: 8, alignItems: "end" }}>
              <div>
                <label htmlFor={`up-mod-${idx}`} style={{ fontSize: "0.75rem", fontWeight: 600 }}>مدالیته</label>
                <select
                  id={`up-mod-${idx}`}
                  className="bina-select"
                  value={asset.declaredModality}
                  onChange={(e) =>
                    setAssets((prev) =>
                      prev.map((a, i) =>
                        i === idx ? { ...a, declaredModality: e.target.value as StudyAssetInput["declaredModality"] } : a
                      )
                    )
                  }
                >
                  {Object.entries(MODALITY_LABELS_FA).filter(([k]) => k !== "tabular_xgb").map(([k, lbl]) => (
                    <option key={k} value={k}>{lbl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`up-eye-${idx}`} style={{ fontSize: "0.75rem", fontWeight: 600 }}>چشم فایل</label>
                <SingleEyeSelect
                  id={`up-eye-${idx}`}
                  value={asset.declaredEye}
                  onChange={(nextEye) => setAssets((prev) => prev.map((a, i) => (i === idx ? { ...a, declaredEye: nextEye } : a)))}
                />
              </div>
              <div>
                <label htmlFor={`up-key-${idx}`} style={{ fontSize: "0.75rem", fontWeight: 600 }}>مسیر ذخیره / فایل</label>
                <input
                  id={`up-key-${idx}`}
                  dir="ltr"
                  className="bina-input"
                  value={asset.s3ObjectKey}
                  onChange={(e) => setAssets((prev) => prev.map((a, i) => (i === idx ? { ...a, s3ObjectKey: e.target.value } : a)))}
                />
              </div>
              <div>
                <label htmlFor={`up-blur-${idx}`} style={{ fontSize: "0.75rem", fontWeight: 600 }}>کیفیت (تست QC)</label>
                <input
                  id={`up-blur-${idx}`}
                  dir="ltr"
                  className="bina-input"
                  value={asset.blurHint}
                  onChange={(e) => setAssets((prev) => prev.map((a, i) => (i === idx ? { ...a, blurHint: e.target.value } : a)))}
                />
              </div>
              <div>
                <label htmlFor={`up-cond-${idx}`} style={{ fontSize: "0.75rem", fontWeight: 600 }}>نشانه تست</label>
                <select
                  id={`up-cond-${idx}`}
                  className="bina-select"
                  value={asset.conditionHint}
                  onChange={(e) => setAssets((prev) => prev.map((a, i) => (i === idx ? { ...a, conditionHint: e.target.value } : a)))}
                >
                  <option value="">عادی</option>
                  <option value="active_cnv">Active CNV</option>
                </select>
              </div>
              <Button variant="ghost" aria-label="حذف فایل" disabled={assets.length <= 1} onClick={() => setAssets((prev) => prev.filter((_, i) => i !== idx))}>
                <Trash2 size={15} />
              </Button>
            </div>
          ))}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label htmlFor="up-hba1c" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>HbA1c (%)</label>
              <input id="up-hba1c" dir="ltr" className="bina-input" value={hba1c} onChange={(e) => setHba1c(e.target.value)} />
            </div>
            <div>
              <label htmlFor="up-iop" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>IOP (mmHg)</label>
              <input id="up-iop" dir="ltr" className="bina-input" value={iopMmHg} onChange={(e) => setIopMmHg(e.target.value)} />
            </div>
          </div>

          <Button type="submit" variant="primary" loading={submitting} icon={<ScanEye size={16} />}>
            ارسال جهت کنترل کیفیت (QC) و تحلیل AI
          </Button>
        </div>

        <aside className="bina-panel-raised" style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 className="bina-panel-h3">خلاصه کنترل پیش از ارسال</h2>
          <div style={{ fontSize: "0.8125rem" }}>
            تعداد فایل‌ها: <strong>{formatPersianDigits(assets.length)}</strong>
          </div>
          <AlertBanner
            tone="info"
            title="دروازه کنترل کیفیت اجباری (Layer 1 QC)"
            description="برای شبیه‌سازی رد تصویر تار در محیط توسعه، مقدار کیفیت را کمتر از 0.3 وارد کنید."
          />
        </aside>
      </form>
    </div>
  );
}
