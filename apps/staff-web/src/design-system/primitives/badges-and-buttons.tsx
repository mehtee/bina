import React from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Eye,
  Info,
  XCircle,
} from "lucide-react";
import {
  formatEyeLabelFa,
  URGENCY_LABELS_FA,
  type StudyEyeCode,
  type UrgencyTier,
} from "~/core/i18n/fa-ir";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "gradient" | "secondary" | "ghost" | "urgent";
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = "primary",
  loading = false,
  icon,
  disabled,
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`bina-button ${className}`.trim()}
      data-variant={variant}
      disabled={Boolean(disabled || loading)}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function UrgencyBadge({ tier }: { tier: UrgencyTier | string | null | undefined }) {
  const normalized: UrgencyTier =
    tier === "urgent" || tier === "followup_3_6m" || tier === "routine" ? tier : "routine";

  const tone =
    normalized === "urgent" ? "urgent" : normalized === "followup_3_6m" ? "warning" : "info";
  const Icon =
    normalized === "urgent"
      ? AlertTriangle
      : normalized === "followup_3_6m"
        ? CalendarClock
        : Info;

  return (
    <span className="bina-badge" data-tone={tone}>
      <Icon size={13} aria-hidden="true" />
      <span>{URGENCY_LABELS_FA[normalized]}</span>
    </span>
  );
}

export function StatusBadge({
  tone = "neutral",
  label,
  showIcon = true,
}: {
  tone?: "urgent" | "error" | "warning" | "success" | "info" | "neutral";
  label: string;
  showIcon?: boolean;
}) {
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "error" || tone === "urgent"
        ? XCircle
        : tone === "warning"
          ? AlertTriangle
          : Info;

  return (
    <span className="bina-badge" data-tone={tone}>
      {showIcon && <Icon size={13} aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
}

export function EyeBadge({ eye }: { eye: StudyEyeCode | string | null | undefined }) {
  const full = formatEyeLabelFa(eye);
  const bg =
    eye === "OD"
      ? "var(--test-well)"
      : eye === "OS"
        ? "var(--plan-well)"
        : "var(--neutral-bg)";
  const fg =
    eye === "OD"
      ? "var(--test-ink)"
      : eye === "OS"
        ? "var(--plan-ink)"
        : "var(--neutral)";

  return (
    <span
      className="bina-badge"
      style={{ background: bg, color: fg }}
      title={full}
    >
      <Eye size={13} aria-hidden="true" />
      <span>{full}</span>
    </span>
  );
}
