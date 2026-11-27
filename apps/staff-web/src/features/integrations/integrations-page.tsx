import React, { useState } from "react";
import { Activity, Plug, Plus } from "lucide-react";
import { apiRequest } from "~/core/api/client";
import type { IntegrationDeliveryRecord, IntegrationEndpointRecord } from "~/core/api/contracts";
import { useScopedQuery } from "~/core/api/use-scoped-query";
import { useAuth } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import { formatJalaliDateTime } from "~/core/i18n/fa-ir";
import { DataTable, type DataColumn } from "~/design-system/composites/data-table";
import { PageHeader } from "~/design-system/composites/kpi-and-cards";
import { Button, StatusBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner, LoadingSkeleton } from "~/design-system/primitives/state-surfaces";

export function IntegrationsPage() {
  const { session } = useAuth();
  const [type, setType] = useState<"dicom_dimse" | "dicomweb" | "fhir_his" | "icare_home2" | "sms_gateway">("fhir_his");
  const [nameFa, setNameFa] = useState("");
  const [url, setUrl] = useState("https://");
  const [aeTitle, setAeTitle] = useState("");
  const [secret, setSecret] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [errFa, setErrFa] = useState<string | null>(null);

  const epQuery = useScopedQuery<{ items: IntegrationEndpointRecord[] }>(
    ({ token, signal }) => apiRequest("/v1/integrations/endpoints", { token, signal }),
    []
  );
  const histQuery = useScopedQuery<{ items: IntegrationDeliveryRecord[]; total: number }>(
    ({ token, signal }) => apiRequest("/v1/integrations/history", { token, signal }),
    []
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setErrFa(null);
    try {
      await apiRequest("/v1/integrations/endpoints", {
        method: "POST",
        token: session.accessToken,
        body: {
          integrationType: type,
          nameFa,
          endpointUrl: url,
          aeTitle: aeTitle.trim() || undefined,
          authMode: secret.trim() ? "bearer" : "none",
          secret: secret.trim() || undefined,
          enabled: true,
        },
      });
      setNameFa("");
      setSecret("");
      setMsg("نقطه اتصال جدید با پوشش کامل کلید محرمانه ثبت شد.");
      epQuery.reload();
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    }
  }

  async function handleTest(endpointId: string) {
    if (!session) return;
    setErrFa(null);
    try {
      await apiRequest(`/v1/integrations/endpoints/${endpointId}/test`, {
        method: "POST",
        token: session.accessToken,
        body: {},
      });
      setMsg("آزمون اتصال انجام و در تاریخچه تبادل ثبت شد.");
      epQuery.reload();
      histQuery.reload();
    } catch (err) {
      setErrFa(toFriendlyError(err).messageFa);
    }
  }

  const epCols: DataColumn<IntegrationEndpointRecord>[] = [
    { key: "name", header: "نام اتصال", render: (e) => <strong>{e.nameFa}</strong> },
    { key: "type", header: "نوع", render: (e) => <bdi dir="ltr">{e.integrationType}</bdi> },
    { key: "url", header: "نشانی", render: (e) => <bdi dir="ltr">{e.endpointUrl}</bdi> },
    { key: "secret", header: "کلید (پوشش‌داده‌شده)", render: (e) => <bdi dir="ltr">{e.secretMasked ?? "ندارد"}</bdi> },
    {
      key: "test",
      header: "آخرین وضعیت",
      render: (e) => (
        <StatusBadge
          tone={e.lastTestStatus === "ok" ? "success" : e.lastTestStatus === "failed" ? "error" : "neutral"}
          label={e.lastTestStatus ?? "تست‌نشده"}
        />
      ),
    },
    {
      key: "act",
      header: "تست",
      render: (e) => (
        <Button variant="secondary" style={{ minBlockSize: 30, fontSize: "0.75rem" }} icon={<Activity size={14} />} onClick={() => void handleTest(e.endpointId)}>
          بررسی اتصال
        </Button>
      ),
    },
  ];

  const histCols: DataColumn<IntegrationDeliveryRecord>[] = [
    { key: "ep", header: "درگاه", render: (d) => d.endpointNameFa ?? d.payloadType },
    { key: "dir", header: "جهت", render: (d) => d.direction },
    { key: "status", header: "وضعیت", render: (d) => <StatusBadge tone={d.status === "delivered" ? "success" : "error"} label={d.status} /> },
    { key: "code", header: "HTTP", render: (d) => <span className="bina-number">{d.httpStatus ?? "—"}</span> },
    { key: "date", header: "زمان", render: (d) => formatJalaliDateTime(d.createdAtIso, true) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="دستگاه‌ها، DICOM / FHIR / HIS و پایش هویت‌زدایی (K01–K07)"
        subtitle="پیکربندی درگاه‌های بیمارستانی با پوشش دائمی کلیدهای محرمانه و هویت‌زدایی DICOM در سمت سرور"
      />
      {msg && <AlertBanner tone="success" title={msg} />}
      {errFa && <AlertBanner tone="error" title="خطای اتصال" description={errFa} />}

      <form onSubmit={(e) => void handleCreate(e)} className="bina-panel-raised" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="نوع درگاه یکپارچه‌سازی" className="bina-select" style={{ maxWidth: 170 }} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="fhir_his">FHIR / HIS</option>
          <option value="dicomweb">DICOMweb</option>
          <option value="dicom_dimse">DICOM DIMSE</option>
          <option value="icare_home2">iCare HOME2</option>
          <option value="sms_gateway">درگاه پیامک</option>
        </select>
        <input aria-label="نام فارسی درگاه" className="bina-input" style={{ maxWidth: 200 }} required value={nameFa} onChange={(e) => setNameFa(e.target.value)} placeholder="نام فارسی درگاه..." />
        <input aria-label="نشانی درگاه" dir="ltr" className="bina-input" style={{ flex: 1, minWidth: 200 }} required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        <input aria-label="DICOM AE Title" dir="ltr" className="bina-input" style={{ maxWidth: 140 }} value={aeTitle} onChange={(e) => setAeTitle(e.target.value)} placeholder="AE Title" />
        <input aria-label="توکن محرمانه درگاه" dir="ltr" type="password" className="bina-input" style={{ maxWidth: 160 }} value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="توکن (در پاسخ مخفی می‌شود)" />
        <Button type="submit" variant="primary" icon={<Plus size={14} />}>ثبت درگاه</Button>
      </form>

      {epQuery.loading && !epQuery.data ? <LoadingSkeleton rows={4} /> : (
        <DataTable caption="فهرست درگاه‌های یکپارچه‌سازی" rows={epQuery.data?.items ?? []} columns={epCols} getRowId={(e) => e.endpointId} />
      )}

      <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 className="bina-panel-h3" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plug size={17} /> سوابق ارسال و دریافت (K04)
        </h2>
        <DataTable caption="تاریخچه تبادل داده" rows={histQuery.data?.items ?? []} columns={histCols} getRowId={(d) => d.deliveryId} />
      </div>
    </div>
  );
}
