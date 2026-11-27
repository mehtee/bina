import React, { useState } from "react";
import { Building2, Flag, MessageSquareWarning, Plus, Shield, Users } from "lucide-react";
import { apiRequest } from "~/core/api/client";
import type {
  ConsentTemplateRecord,
  FeatureFlagRecord,
  MessageTemplateRecord,
  ProtocolTemplateRecord,
  StaffMembershipRecord,
  StaffRole,
} from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useAuth } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import { DataTable, type DataColumn } from "~/design-system/composites/data-table";
import { PageHeader } from "~/design-system/composites/kpi-and-cards";
import { Button, StatusBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, LoadingSkeleton } from "~/design-system/primitives/state-surfaces";

export function ClinicAdminPage() {
  const { session, refreshProfile } = useAuth();
  const [clinicNameFa, setClinicNameFa] = useState(session?.clinic?.nameFa ?? "");
  const [dicomAe, setDicomAe] = useState("BINA_PACS_A");

  // New Staff
  const [staffUserId, setStaffUserId] = useState("");
  const [staffNameFa, setStaffNameFa] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("technician");

  // SMS Template (PHI Guarded)
  const [tplKey, setTplKey] = useState("");
  const [tplBodyFa, setTplBodyFa] = useState("");

  // Consent Template
  const [conVersion, setConVersion] = useState("v2.2");
  const [conTitleFa, setConTitleFa] = useState("");
  const [conBodyFa, setConBodyFa] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [errFa, setErrFa] = useState<string | null>(null);

  const staffQuery = useScopedQuery<{ items: StaffMembershipRecord[] }>(
    ({ token, signal }) => apiRequest("/v1/admin/staff", { token, signal }),
    []
  );
  const protoQuery = useScopedQuery<{ registeredTypes: string[]; versions: ProtocolTemplateRecord[] }>(
    ({ token, signal }) => apiRequest("/v1/admin/protocols", { token, signal }),
    []
  );
  const smsQuery = useScopedQuery<{ items: MessageTemplateRecord[] }>(
    ({ token, signal }) => apiRequest("/v1/admin/message-templates", { token, signal }),
    []
  );
  const consentQuery = useScopedQuery<{ items: ConsentTemplateRecord[] }>(
    ({ token, signal }) => apiRequest("/v1/admin/consents", { token, signal }),
    []
  );
  const flagsQuery = useScopedQuery<{ items: FeatureFlagRecord[] }>(
    ({ token, signal }) => apiRequest("/v1/admin/features", { token, signal }),
    []
  );

  async function runAdminOp(fn: () => Promise<void>, successText: string) {
    setErrFa(null);
    setMsg(null);
    try {
      await fn();
      setMsg(successText);
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    }
  }

  const staffCols: DataColumn<StaffMembershipRecord>[] = [
    { key: "name", header: "نام کاربر", render: (m) => <strong>{m.fullNameFa ?? m.userId.slice(0, 8)}</strong> },
    { key: "role", header: "نقش", render: (m) => <StatusBadge tone="info" label={m.role} showIcon={false} /> },
    { key: "status", header: "وضعیت", render: (m) => <StatusBadge tone={m.active ? "success" : "error"} label={m.active ? "فعال" : "غیرفعال"} /> },
    {
      key: "act",
      header: "تغییر وضعیت",
      render: (m) => (
        <Button
          variant={m.active ? "urgent" : "secondary"}
          style={{ minBlockSize: 30, fontSize: "0.75rem" }}
          onClick={() =>
            void runAdminOp(async () => {
              await apiRequest(`/v1/admin/staff/${m.id}`, {
                method: "PATCH",
                token: session!.accessToken,
                body: { active: !m.active },
              });
              staffQuery.reload();
            }, "وضعیت عضویت کادر درمان به‌روزرسانی شد.")
          }
        >
          {m.active ? "غیرفعال‌سازی" : "فعال‌سازی"}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="مدیریت کلینیک، کارکنان، قالب‌ها و قابلیت‌ها (J01–J10)"
        subtitle="تغییرات حساس با حفاظت آخرین مدیر کلینیک، فیلتر PHI پیامک و ممیزی ثبت می‌شوند."
        showWave
      />

      {msg && <AlertBanner tone="success" title={msg} />}
      {errFa && <AlertBanner tone="error" title="خطا / جلوگیری توسط سیاست کلینیک" description={errFa} />}

      {/* Clinic Settings J01/J04 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runAdminOp(async () => {
            await apiRequest("/v1/admin/clinic", {
              method: "PATCH",
              token: session!.accessToken,
              body: { nameFa: clinicNameFa, dicomAeTitle: dicomAe },
            });
            await refreshProfile();
          }, "مشخصات کلینیک به‌روزرسانی شد.");
        }}
        className="bina-panel-raised"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}
      >
        <div style={{ flex: 1, minWidth: 220 }}>
          <label htmlFor="admin-clinic-name" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: 4 }}>
            <Building2 size={14} /> نام کلینیک (فارسی)
          </label>
          <input id="admin-clinic-name" className="bina-input" value={clinicNameFa} onChange={(e) => setClinicNameFa(e.target.value)} />
        </div>
        <div style={{ width: 200 }}>
          <label htmlFor="admin-dicom-ae" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: 4 }}>DICOM AE Title</label>
          <input id="admin-dicom-ae" dir="ltr" className="bina-input" value={dicomAe} onChange={(e) => setDicomAe(e.target.value)} />
        </div>
        <Button type="submit" variant="primary">ذخیره اطلاعات کلینیک</Button>
      </form>

      {/* Staff RBAC Directory */}
      <section className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 className="bina-panel-h3" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Users size={17} /> اعضای کادر درمان و ماتریس نقش‌ها (حفاظت از آخرین مدیر فعال)
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runAdminOp(async () => {
              await apiRequest("/v1/admin/staff", {
                method: "POST",
                token: session!.accessToken,
                body: { userId: staffUserId || crypto.randomUUID(), role: staffRole, fullNameFa: staffNameFa },
              });
              setStaffNameFa("");
              setStaffUserId("");
              staffQuery.reload();
            }, "عضو جدید به کلینیک اضافه شد.");
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <input aria-label="نام عضو جدید" className="bina-input" style={{ maxWidth: 220 }} required value={staffNameFa} onChange={(e) => setStaffNameFa(e.target.value)} placeholder="نام عضو جدید..." />
          <input aria-label="شناسه کاربری اختیاری" dir="ltr" className="bina-input" style={{ maxWidth: 260 }} value={staffUserId} onChange={(e) => setStaffUserId(e.target.value)} placeholder="User UUID (اختیاری)" />
          <select aria-label="نقش عضو جدید" className="bina-select" style={{ maxWidth: 180 }} value={staffRole} onChange={(e) => setStaffRole(e.target.value as StaffRole)}>
            <option value="ophthalmologist">چشم‌پزشک</option>
            <option value="optometrist">اپتومتریست</option>
            <option value="technician">تکنسین</option>
            <option value="coordinator">هماهنگ‌کننده</option>
            <option value="admin">مدیر کلینیک</option>
          </select>
          <Button type="submit" variant="primary" icon={<Plus size={14} />}>افزودن عضو</Button>
        </form>
        {staffQuery.loading && !staffQuery.data ? <LoadingSkeleton rows={4} /> : (
          <DataTable caption="فهرست کادر درمان" rows={staffQuery.data?.items ?? []} columns={staffCols} getRowId={(m) => m.id} />
        )}
      </section>

      <div className="bina-grid">
        {/* PHI-Guarded SMS Templates J07 */}
        <section className="bina-panel-raised" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="bina-panel-h3" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <MessageSquareWarning size={17} /> قالب‌های پیامک بدون PHI (J07)
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runAdminOp(async () => {
                await apiRequest("/v1/admin/message-templates", {
                  method: "POST",
                  token: session!.accessToken,
                  body: { templateKey: tplKey, bodyTemplateFa: tplBodyFa, channel: "sms" },
                });
                setTplKey("");
                setTplBodyFa("");
                smsQuery.reload();
              }, "قالب پیامک با موفقیت ثبت شد.");
            }}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <input dir="ltr" aria-label="کلید قالب پیامک" className="bina-input" required value={tplKey} onChange={(e) => setTplKey(e.target.value)} placeholder="template_key" />
            <textarea aria-label="متن فارسی قالب پیامک" className="bina-textarea" required value={tplBodyFa} onChange={(e) => setTplBodyFa(e.target.value)} placeholder="متن فارسی بدون نام دارو یا بیماری..." />
            <Button type="submit" variant="primary">ثبت قالب پیامک (با بررسی ضد-PHI)</Button>
          </form>
          {(smsQuery.data?.items ?? []).map((t) => (
            <div key={t.templateId} className="bina-panel" style={{ fontSize: "0.75rem" }}>
              <strong>{t.templateKey}</strong> (v{t.version}): {t.bodyTemplateFa}
            </div>
          ))}
        </section>

        {/* Feature Flags & Consents J05/J08/J09 */}
        <section className="bina-panel-raised" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="bina-panel-h3" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Flag size={17} /> قابلیت‌های فعال کلینیک (Feature Flags — J08)
          </h2>
          {(flagsQuery.data?.items ?? []).map((f) => (
            <div key={f.flagKey} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, border: "1px solid var(--outline-variant)", borderRadius: 8 }}>
              <div>
                <strong style={{ fontSize: "0.8125rem" }}>{f.labelFa}</strong>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{f.descriptionFa}</div>
              </div>
              <Button
                variant={f.enabled ? "primary" : "secondary"}
                style={{ minBlockSize: 30, fontSize: "0.75rem" }}
                onClick={() =>
                  void runAdminOp(async () => {
                    await apiRequest("/v1/admin/features", {
                      method: "PATCH",
                      token: session!.accessToken,
                      body: { flagKey: f.flagKey, enabled: !f.enabled },
                    });
                    flagsQuery.reload();
                    await refreshProfile();
                  }, `وضعیت قابلیت ${f.flagKey} تغییر یافت.`)
                }
              >
                {f.enabled ? "فعال" : "غیرفعال"}
              </Button>
            </div>
          ))}

          <h3 className="bina-panel-h3" style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Shield size={16} /> قالب‌های رضایت‌نامه و پروتکل‌ها (J05 / J09)
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runAdminOp(async () => {
                await apiRequest("/v1/admin/consents", {
                  method: "POST",
                  token: session!.accessToken,
                  body: { consentType: "research_d5", version: conVersion, titleFa: conTitleFa, bodyFa: conBodyFa },
                });
                setConTitleFa("");
                setConBodyFa("");
                consentQuery.reload();
              }, "قالب رضایت‌نامه ثبت شد.");
            }}
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            <input aria-label="عنوان رضایت‌نامه" className="bina-input" style={{ maxWidth: 160 }} required value={conTitleFa} onChange={(e) => setConTitleFa(e.target.value)} placeholder="عنوان رضایت‌نامه" />
            <input aria-label="متن رضایت‌نامه" className="bina-input" style={{ flex: 1 }} required value={conBodyFa} onChange={(e) => setConBodyFa(e.target.value)} placeholder="متن (حداقل ۱۰ کاراکتر)" />
            <input aria-label="نسخه رضایت‌نامه" dir="ltr" className="bina-input" style={{ maxWidth: 80 }} value={conVersion} onChange={(e) => setConVersion(e.target.value)} />
            <Button type="submit" variant="secondary">ثبت</Button>
          </form>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            پروتکل‌های ثبت‌شده: {(protoQuery.data?.registeredTypes ?? []).join("، ")}
          </div>
        </section>
      </div>
    </div>
  );
}
