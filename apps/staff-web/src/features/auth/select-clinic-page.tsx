import { useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import { Button, StatusBadge } from "~/design-system/primitives/badges-and-buttons";
import { PageHeader } from "~/design-system/composites/kpi-and-cards";
import { AlertBanner } from "~/design-system/primitives/state-surfaces";

export function SelectClinicPage() {
  const { session, switchClinic } = useAuth();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorFa, setErrorFa] = useState<string | null>(null);

  if (!session) return null;

  async function handleSelect(clinicId: string) {
    setBusyId(clinicId);
    setErrorFa(null);
    try {
      await switchClinic(clinicId);
      void navigate("/overview");
    } catch (err) {
      setErrorFa(toFriendlyError(err).messageFa);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="انتخاب کلینیک فعال (M04)"
        subtitle="تغییر کلینیک تمامی درخواست‌های باز و داده‌های حافظه موقت قبلی را به‌صورت اتمیک پاکسازی می‌کند."
      />
      {errorFa && <AlertBanner tone="error" title="خطا در تغییر کلینیک" description={errorFa} />}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {session.authorizedClinics.map((c) => {
          const isCurrent = c.clinicId === session.clinicId;
          return (
            <div key={c.clinicId} className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                  <Building2 size={18} />
                  {c.clinicNameFa}
                </span>
                {isCurrent && <StatusBadge tone="success" label="فعال" />}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--on-surface-variant)" }}>
                نقش: {c.role} • تقویم: {c.calendarMode} • اورژانس: <bdi dir="ltr">{c.emergencyPhone}</bdi>
              </div>
              <Button
                variant={isCurrent ? "secondary" : "primary"}
                loading={busyId === c.clinicId}
                disabled={isCurrent}
                icon={isCurrent ? <CheckCircle2 size={15} /> : undefined}
                onClick={() => void handleSelect(c.clinicId)}
              >
                {isCurrent ? "کلینیک فعلی" : "ورود به این کلینیک"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
