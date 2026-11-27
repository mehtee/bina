import React from "react";
import { AlertTriangle, Inbox, Lock, RefreshCw, ShieldAlert, WifiOff } from "lucide-react";
import { Button } from "./badges-and-buttons";

export function AlertBanner({
  tone = "info",
  title,
  description,
  action,
  role = "status",
}: {
  tone?: "urgent" | "error" | "warning" | "info" | "success";
  title: string;
  description?: string;
  action?: React.ReactNode;
  role?: "alert" | "status";
}) {
  const isUrgent = tone === "urgent" || tone === "error";
  if (isUrgent) {
    return (
      <div className="bina-urgent-strip" role="alert">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>{title}</div>
            {description && (
              <div style={{ fontSize: "0.8125rem", marginTop: 2 }}>{description}</div>
            )}
          </div>
        </div>
        {action}
      </div>
    );
  }

  const palette =
    tone === "warning"
      ? { bg: "var(--warning-bg)", fg: "var(--warning)", bd: "var(--warning)" }
      : tone === "success"
        ? { bg: "var(--success-bg)", fg: "var(--success)", bd: "var(--success)" }
        : { bg: "var(--info-bg)", fg: "var(--info)", bd: "var(--info)" };

  return (
    <div
      role={role}
      style={{
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.bd}`,
        borderRadius: "var(--radius-card)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{title}</div>
        {description && <div style={{ fontSize: "0.8125rem", marginTop: 2 }}>{description}</div>}
      </div>
      {action}
    </div>
  );
}

export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bina-panel" aria-busy="true" aria-label="در حال بارگذاری اطلاعات">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 22,
              borderRadius: "var(--radius-dense)",
              background: "var(--surface-soft)",
              width: i % 2 === 0 ? "100%" : "78%",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function StateSurface({
  kind,
  title,
  description,
  onRetry,
  action,
}: {
  kind: "empty" | "filter_empty" | "error" | "permission" | "gated" | "offline";
  title: string;
  description: string;
  onRetry?: () => void;
  action?: React.ReactNode;
}) {
  const Icon =
    kind === "permission"
      ? Lock
      : kind === "gated"
        ? ShieldAlert
        : kind === "offline"
          ? WifiOff
          : kind === "error"
            ? AlertTriangle
            : Inbox;

  return (
    <div
      className="bina-panel-raised"
      role={kind === "error" ? "alert" : "status"}
      style={{
        padding: "28px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: kind === "error" ? "var(--error-bg)" : "var(--icon-well)",
          color: kind === "error" ? "var(--error)" : "var(--primary)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon size={24} aria-hidden="true" />
      </div>
      <h2 className="bina-section-h2">{title}</h2>
      <p style={{ margin: 0, maxWidth: 460, fontSize: "0.875rem", color: "var(--on-surface-variant)" }}>
        {description}
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        {onRetry && (
          <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={onRetry}>
            تلاش مجدد
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
