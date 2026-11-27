import React, { useEffect } from "react";
import { X } from "lucide-react";
import { formatEyeLabelFa, type EyeCode, type StudyEyeCode } from "~/core/i18n/fa-ir";
import { Button } from "~/design-system/primitives/badges-and-buttons";
import { StateSurface } from "~/design-system/primitives/state-surfaces";

export interface DataColumn<T> {
  readonly key: string;
  readonly header: string;
  readonly align?: "start" | "center" | "end";
  readonly render: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  caption,
  rows,
  columns,
  getRowId,
  selectedId,
  onSelectRow,
  emptyTitle = "موردی یافت نشد",
  emptyDescription = "هیچ داده‌ای برای نمایش وجود ندارد.",
}: {
  caption: string;
  rows: readonly T[];
  columns: readonly DataColumn<T>[];
  getRowId: (row: T) => string;
  selectedId?: string | null;
  onSelectRow?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (rows.length === 0) {
    return <StateSurface kind="empty" title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="bina-table-wrap">
      <table className="bina-table">
        <caption
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
          }}
        >
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" style={{ textAlign: col.align ?? "start" }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = getRowId(row);
            const selected = Boolean(selectedId && selectedId === id);
            return (
              <tr
                key={id}
                data-selected={selected ? "true" : undefined}
                onClick={onSelectRow ? () => onSelectRow(row) : undefined}
                style={{ cursor: onSelectRow ? "pointer" : undefined }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align ?? "start" }}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function EyeSelector({
  value,
  onChange,
  allowBothFilter = false,
  label = "انتخاب چشم",
}: {
  value: StudyEyeCode;
  onChange: (next: StudyEyeCode) => void;
  allowBothFilter?: boolean;
  label?: string;
}) {
  const options: StudyEyeCode[] = allowBothFilter ? ["OD", "OS", "OU"] : ["OD", "OS"];
  return (
    <div role="group" aria-label={label} style={{ display: "inline-flex", background: "var(--surface-soft)", padding: 3, borderRadius: "var(--radius-input)", border: "1px solid var(--outline-variant)", gap: 4 }}>
      {options.map((eye) => {
        const active = value === eye;
        return (
          <button
            key={eye}
            type="button"
            onClick={() => onChange(eye)}
            aria-pressed={active}
            style={{
              minBlockSize: 30,
              paddingInline: 10,
              borderRadius: "var(--radius-dense)",
              border: "none",
              font: "inherit",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              background: active ? "var(--primary-container)" : "transparent",
              color: active ? "var(--on-primary-container)" : "var(--on-surface-variant)",
            }}
          >
            {formatEyeLabelFa(eye)}
          </button>
        );
      })}
    </div>
  );
}

export function SingleEyeSelect({
  value,
  onChange,
  id,
  required = true,
  ariaLabel = "انتخاب چشم",
}: {
  value: EyeCode;
  onChange: (next: EyeCode) => void;
  id?: string;
  required?: boolean;
  ariaLabel?: string;
}) {
  return (
    <select
      id={id}
      aria-label={id ? undefined : ariaLabel}
      className="bina-select"
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value as EyeCode)}
    >
      <option value="OD">چشم راست (OD)</option>
      <option value="OS">چشم چپ (OS)</option>
    </select>
  );
}

export function ModalDialog({
  open,
  title,
  onClose,
  children,
  footer,
  width = 560,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="bina-modal-scrim"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "var(--scrim-alpha)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        className="bina-panel-raised"
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-overlay)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderBlockEnd: "1px solid var(--panel-divider)", paddingBlockEnd: 10 }}>
          <h2 className="bina-section-h2">{title}</h2>
          <Button variant="ghost" aria-label="بستن پنجره" onClick={onClose} style={{ minInlineSize: 36, paddingInline: 8 }}>
            <X size={18} aria-hidden="true" />
          </Button>
        </div>
        <div>{children}</div>
        {footer && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderBlockStart: "1px solid var(--panel-divider)", paddingBlockStart: 12 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
