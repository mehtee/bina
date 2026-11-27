import React, { useState } from "react";
import { UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { apiRequest } from "~/core/api/client";
import type {
  AccessMode,
  PatientListItem,
  PatientListResponse,
  StaffEnrolledPatientResponse,
} from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useAuth, useCapabilities } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import {
  ACCESS_MODE_LABELS_FA,
  formatJalaliDateTime,
  formatPersianDigits,
  normalizeLatinDigits,
} from "~/core/i18n/fa-ir";
import { DataTable, type DataColumn } from "~/design-system/composites/data-table";
import { PageHeader } from "~/design-system/composites/kpi-and-cards";
import { Button, StatusBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, LoadingSkeleton, StateSurface } from "~/design-system/primitives/state-surfaces";

export function PatientsListPage() {
  const { can } = useCapabilities();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [accessMode, setAccessMode] = useState<"" | AccessMode>("");

  const listQuery = useScopedQuery<PatientListResponse>(
    ({ token, signal }) => {
      const sp = new URLSearchParams();
      if (appliedQuery) sp.set("q", appliedQuery);
      if (accessMode) sp.set("accessMode", accessMode);
      const qs = sp.toString();
      return apiRequest(`/v1/patients${qs ? `?${qs}` : ""}`, { token, signal });
    },
    [appliedQuery, accessMode]
  );

  const columns: DataColumn<PatientListItem>[] = [
    {
      key: "name",
      header: "نام و شناسه بیمار",
      render: (p) => (
        <div>
          <strong style={{ display: "block" }}>{p.fullNameFa}</strong>
          <bdi dir="ltr" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            {p.patientId.slice(0, 8)}
          </bdi>
        </div>
      ),
    },
    {
      key: "phone",
      header: "تماس (پوشش‌داده‌شده)",
      render: (p) => <bdi dir="ltr" className="bina-number">{p.phoneMasked}</bdi>,
    },
    {
      key: "accessMode",
      header: "شیوه دسترسی",
      render: (p) => (
        <StatusBadge
          tone={p.accessMode === "print_phone" ? "warning" : p.accessMode === "caregiver" ? "info" : "success"}
          label={ACCESS_MODE_LABELS_FA[p.accessMode]}
          showIcon={false}
        />
      ),
    },
    {
      key: "episodes",
      header: "اپیزود فعال",
      render: (p) => <span className="bina-number">{formatPersianDigits(p.activeEpisodeCount)}</span>,
    },
    {
      key: "triage",
      header: "تریاژ باز",
      render: (p) =>
        p.openTriageCount > 0 ? (
          <StatusBadge tone="urgent" label={`${formatPersianDigits(p.openTriageCount)} مورد`} />
        ) : (
          <StatusBadge tone="neutral" label="۰" showIcon={false} />
        ),
    },
    {
      key: "createdAt",
      header: "تاریخ ثبت",
      render: (p) => formatJalaliDateTime(p.createdAtIso),
    },
    {
      key: "actions",
      header: "عملیات",
      render: (p) => (
        <Link to={`/patients/${p.patientId}`} className="bina-button" data-variant="secondary" style={{ minBlockSize: 30, fontSize: "0.75rem" }}>
          پرونده ۳۶۰°
        </Link>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="مدیریت و فهرست بیماران (B01)"
        subtitle={`تعداد کل در دامنه کلینیک: ${formatPersianDigits(listQuery.data?.total ?? 0)}`}
        actions={
          can("patient:enroll") && (
            <Link to="/patients/new" className="bina-button" data-variant="primary">
              <UserPlus size={16} />
              <span>ثبت و پذیرش بیمار جدید</span>
            </Link>
          )
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedQuery(searchInput.trim());
        }}
        className="bina-panel-raised"
        style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}
      >
        <input
          className="bina-input"
          style={{ maxWidth: 320 }}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="جستجو با نام بیمار یا کد..."
          aria-label="جستجوی بیمار"
        />
        <select
          className="bina-select"
          style={{ maxWidth: 220 }}
          value={accessMode}
          onChange={(e) => setAccessMode(e.target.value as "" | AccessMode)}
          aria-label="فیلتر شیوه دسترسی"
        >
          <option value="">همه شیوه‌های دسترسی</option>
          <option value="app">اپلیکیشن بیمار</option>
          <option value="caregiver">همراه بیمار</option>
          <option value="print_phone">چاپی و تلفنی (Print+Phone)</option>
        </select>
        <Button type="submit" variant="primary">اعمال فیلتر</Button>
        {(appliedQuery || accessMode) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearchInput("");
              setAppliedQuery("");
              setAccessMode("");
            }}
          >
            پاکسازی فیلتر
          </Button>
        )}
      </form>

      {listQuery.loading && !listQuery.data ? (
        <LoadingSkeleton rows={6} />
      ) : listQuery.error ? (
        <StateSurface
          kind="error"
          title="خطا در دریافت فهرست بیماران"
          description={listQuery.error.messageFa}
          onRetry={listQuery.reload}
        />
      ) : (
        <DataTable
          caption="فهرست بیماران کلینیک"
          rows={listQuery.data?.items ?? []}
          columns={columns}
          getRowId={(p) => p.patientId}
          onSelectRow={(p) => void navigate(`/patients/${p.patientId}`)}
          emptyTitle="بیماری با این مشخصات یافت نشد"
          emptyDescription="فیلترها را تغییر دهید یا بیمار جدید ثبت کنید."
        />
      )}
    </div>
  );
}

export function EnrollPatientPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fullNameFa, setFullNameFa] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+98912");
  const [nationalIdMasked, setNationalIdMasked] = useState("");
  const [birthYearJalali, setBirthYearJalali] = useState("1345");
  const [accessMode, setAccessMode] = useState<AccessMode>("app");
  const [notesFa, setNotesFa] = useState("");
  const [consentVersion, setConsentVersion] = useState("fa-ir-v2.1");
  const [mlConsent, setMlConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorFa, setErrorFa] = useState<string | null>(null);

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSubmitting(true);
    setErrorFa(null);
    try {
      const normalizedPhone = normalizeLatinDigits(phoneNumber.trim());
      const parsedYear = Number(normalizeLatinDigits(birthYearJalali.trim()));
      const res = await apiRequest<StaffEnrolledPatientResponse>("/v1/patients", {
        method: "POST",
        token: session.accessToken,
        body: {
          fullNameFa: fullNameFa.trim(),
          phoneNumber: normalizedPhone,
          nationalIdMasked: nationalIdMasked.trim() || undefined,
          birthYearJalali: Number.isInteger(parsedYear) && parsedYear >= 1280 ? parsedYear : undefined,
          accessMode,
          notesFa: notesFa.trim() || undefined,
          consentVersion: consentVersion.trim(),
          mlTrainingConsentFlag: mlConsent,
        },
      });
      void navigate(`/patients/${res.patientId}`);
    } catch (err) {
      setErrorFa(toFriendlyError(err).messageFa);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="ثبت و پذیرش بیمار جدید (B02)"
        subtitle="ثبت بیمار در ۳ مرحله به همراه انتخاب شیوه دسترسی (اپ، همراه یا Print+Phone) و رضایت‌نامه تفکیک‌شده"
        breadcrumbs={[{ label: "بیماران", to: "/patients" }, { label: "ثبت بیمار جدید" }]}
      />

      {errorFa && <AlertBanner tone="error" title="خطا در ثبت بیمار" description={errorFa} />}

      <form onSubmit={(e) => void handleEnroll(e)} className="bina-grid">
        <div className="bina-panel-raised" style={{ gridColumn: "span 8", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {([1, 2, 3] as const).map((s) => (
              <Button
                key={s}
                variant={step === s ? "primary" : "secondary"}
                onClick={() => setStep(s)}
                style={{ flex: 1 }}
              >
                {s === 1 ? "۱. هویت و شماره +98" : s === 2 ? "۲. شیوه دسترسی" : "۳. رضایت‌نامه و تایید"}
              </Button>
            ))}
          </div>

          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label htmlFor="pat-name" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                  نام و نام خانوادگی بیمار (الزامی)
                </label>
                <input
                  id="pat-name"
                  className="bina-input"
                  required
                  value={fullNameFa}
                  onChange={(e) => setFullNameFa(e.target.value)}
                  placeholder="مثال: فاطمه محمدی"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label htmlFor="pat-phone" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                    شماره موبایل ایران (+98)
                  </label>
                  <input
                    id="pat-phone"
                    dir="ltr"
                    className="bina-input"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+989123456789"
                  />
                </div>
                <div>
                  <label htmlFor="pat-year" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                    سال تولد شمسی
                  </label>
                  <input
                    id="pat-year"
                    dir="ltr"
                    className="bina-input"
                    value={birthYearJalali}
                    onChange={(e) => setBirthYearJalali(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="pat-nid" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                  کد ملی پوشش‌داده‌شده (Masked — اختیاری)
                </label>
                <input
                  id="pat-nid"
                  dir="ltr"
                  className="bina-input"
                  value={nationalIdMasked}
                  onChange={(e) => setNationalIdMasked(e.target.value)}
                  placeholder="001***4567"
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="primary" onClick={() => setStep(2)}>مرحله بعد</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <fieldset style={{ border: "1px solid var(--outline-variant)", borderRadius: 8, padding: 12 }}>
                <legend style={{ fontWeight: 600, paddingInline: 6 }}>شیوه دسترسی بیمار به برنامه مراقبت</legend>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(["app", "caregiver", "print_phone"] as AccessMode[]).map((mode) => (
                    <label key={mode} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="accessMode"
                        value={mode}
                        checked={accessMode === mode}
                        onChange={() => setAccessMode(mode)}
                      />
                      <strong>{ACCESS_MODE_LABELS_FA[mode]}</strong>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="pat-notes" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                  توضیحات پذیرش (اختیاری)
                </label>
                <textarea
                  id="pat-notes"
                  className="bina-textarea"
                  value={notesFa}
                  onChange={(e) => setNotesFa(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Button variant="secondary" onClick={() => setStep(1)}>مرحله قبل</Button>
                <Button variant="primary" onClick={() => setStep(3)}>مرحله بعد</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label htmlFor="pat-consent" style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                  نسخه رضایت‌نامه درمان و مراقبت
                </label>
                <input
                  id="pat-consent"
                  dir="ltr"
                  className="bina-input"
                  value={consentVersion}
                  onChange={(e) => setConsentVersion(e.target.value)}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, background: "var(--surface-soft)", borderRadius: 8 }}>
                <input
                  type="checkbox"
                  checked={mlConsent}
                  onChange={(e) => setMlConsent(e.target.checked)}
                />
                <span>رضایت جداگانه برای استفاده هویت‌زدایی‌شده در پژوهش D5 (اختیاری)</span>
              </label>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Button variant="secondary" onClick={() => setStep(2)}>مرحله قبل</Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  ثبت نهایی بیمار
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Contextual Read-only Preview */}
        <aside className="bina-panel-raised" style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="bina-panel-h3">پیش‌نمایش پذیرش بیمار</h2>
          <div style={{ fontSize: "0.8125rem", display: "flex", flexDirection: "column", gap: 6 }}>
            <div>نام: <strong>{fullNameFa || "—"}</strong></div>
            <div>موبایل: <bdi dir="ltr">{phoneNumber || "—"}</bdi></div>
            <div>شیوه دسترسی: <strong>{ACCESS_MODE_LABELS_FA[accessMode]}</strong></div>
            <div>رضایت پژوهش: <strong>{mlConsent ? "تاییدشده" : "خیر"}</strong></div>
          </div>
          {accessMode === "print_phone" && (
            <AlertBanner
              tone="info"
              title="مسیر برابر Print+Phone"
              description="پس از ثبت، بیمار در صف مراقبت چاپی و تماس تلفنی با شمارش برابر در KPI پایلوت قرار می‌گیرد."
            />
          )}
        </aside>
      </form>
    </div>
  );
}
