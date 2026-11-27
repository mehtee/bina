import React from "react";
import { Link } from "react-router";
import { HeaderWaveArtwork } from "~/design-system/primitives/brand-artwork";
import { EyeBadge, StatusBadge, UrgencyBadge } from "~/design-system/primitives/badges-and-buttons";
import { formatPersianDigits } from "~/core/i18n/fa-ir";

export function PageHeader({
  title,
  subtitle,
  showWave = false,
  actions,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  showWave?: boolean;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; to?: string }>;
}) {
  return (
    <header
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "var(--radius-card)",
        paddingBlock: 6,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      {showWave && <HeaderWaveArtwork />}
      <div style={{ position: "relative", zIndex: 1 }}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="مسیر صفحه" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "var(--muted)", marginBottom: 4 }}>
            {breadcrumbs.map((b, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span aria-hidden="true">/</span>}
                {b.to ? (
                  <Link to={b.to} style={{ color: "var(--primary)", textDecoration: "none" }}>
                    {b.label}
                  </Link>
                ) : (
                  <span aria-current="page">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="bina-page-h1">{title}</h1>
        {subtitle && (
          <p style={{ margin: "2px 0 0", fontSize: "0.8125rem", color: "var(--on-surface-variant)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {actions}
        </div>
      )}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  unit,
  icon,
  wellBg = "var(--test-well)",
  wellInk = "var(--test-ink)",
  metaText,
  deltaText,
  deltaTone = "neutral",
  to,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  wellBg?: string;
  wellInk?: string;
  metaText?: string;
  deltaText?: string;
  deltaTone?: "success" | "warning" | "error" | "info" | "neutral";
  to?: string;
}) {
  const inner = (
    <div
      className={to ? "bina-panel-raised bina-card-interactive" : "bina-panel-raised"}
      style={{
        minBlockSize: "var(--kpi-min-height)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 6,
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: wellBg,
              color: wellInk,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <span style={{ fontSize: "0.8125rem", color: "var(--on-surface-variant)", fontWeight: 500 }}>
            {label}
          </span>
        </div>
        {deltaText && <StatusBadge tone={deltaTone} label={deltaText} showIcon={false} />}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span
            className="bina-number"
            style={{ fontSize: "1.625rem", lineHeight: "2.125rem", fontWeight: 700, color: "var(--on-surface)" }}
          >
            {typeof value === "number" ? formatPersianDigits(value) : value}
          </span>
          {unit && <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{unit}</span>}
        </div>
        {metaText && <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{metaText}</span>}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
        {inner}
      </Link>
    );
  }
  return inner;
}

export function PatientContextBar({
  loading,
  patientNameFa,
  patientId,
  accessModeFa,
  eyeLaterality,
  urgencyTier,
  extraMetaFa,
  actions,
}: {
  loading?: boolean;
  patientNameFa?: string | null;
  patientId?: string | null;
  accessModeFa?: string;
  eyeLaterality?: "OD" | "OS" | "OU" | null;
  urgencyTier?: "routine" | "followup_3_6m" | "urgent" | null;
  extraMetaFa?: string;
  actions?: React.ReactNode;
}) {
  if (loading || !patientNameFa || !patientId) {
    return (
      <div
        className="bina-panel-raised"
        style={{
          minBlockSize: "var(--context-min-height)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
        aria-busy="true"
      >
        <span style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
          در حال بارگذاری هویت بیمار...
        </span>
      </div>
    );
  }

  const initials = patientNameFa.trim().slice(0, 2);
  return (
    <section
      aria-label="هویت بیمار انتخاب‌شده"
      className="bina-panel-raised"
      style={{
        minBlockSize: "var(--context-min-height)",
        position: "sticky",
        insetBlockStart: 58,
        zIndex: 18,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--radius-pill)",
            background: "var(--primary-container)",
            color: "var(--on-primary-container)",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: "0.875rem",
          }}
        >
          {initials}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ fontSize: "1rem", color: "var(--on-surface)" }}>{patientNameFa}</strong>
            <bdi
              dir="ltr"
              style={{
                fontSize: "0.75rem",
                background: "var(--code-bg)",
                padding: "1px 6px",
                borderRadius: 4,
                color: "var(--on-surface-variant)",
              }}
            >
              {patientId.slice(0, 8)}
            </bdi>
            {eyeLaterality && <EyeBadge eye={eyeLaterality} />}
            {urgencyTier && <UrgencyBadge tier={urgencyTier} />}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
            {[accessModeFa, extraMetaFa].filter(Boolean).join(" • ")}
          </div>
        </div>
      </div>
      {actions && <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </section>
  );
}
