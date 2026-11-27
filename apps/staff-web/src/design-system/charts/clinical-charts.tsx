import React, { useState } from "react";
import { ADHERENCE_LABELS_FA, formatPersianDigits, type AdherenceState } from "~/core/i18n/fa-ir";
import { Button } from "~/design-system/primitives/badges-and-buttons";

export interface ChartPoint {
  readonly label: string;
  readonly value: number | null;
  readonly rejected?: boolean;
  readonly reasonFa?: string;
}

export interface ChartSeries {
  readonly id: string;
  readonly nameFa: string;
  readonly colorVar: string;
  readonly dashed?: boolean;
  readonly shape?: "circle" | "diamond";
  readonly points: readonly ChartPoint[];
}

export function ChronologicalLineChart({
  title,
  unit,
  eyeLabelFa,
  sourceLabelFa,
  series,
  referenceValue,
  referenceLabelFa,
  height = 240,
}: {
  title: string;
  unit: string;
  eyeLabelFa: string;
  sourceLabelFa: string;
  series: readonly ChartSeries[];
  referenceValue?: number | null;
  referenceLabelFa?: string;
  height?: number;
}) {
  const [showTable, setShowTable] = useState(false);

  const validValues: number[] = [];
  for (const s of series) {
    for (const p of s.points) {
      if (typeof p.value === "number" && !Number.isNaN(p.value)) {
        validValues.push(p.value);
      }
    }
  }
  if (typeof referenceValue === "number") validValues.push(referenceValue);

  const minVal = validValues.length > 0 ? Math.min(...validValues) : 0;
  const maxVal = validValues.length > 0 ? Math.max(...validValues) : 1;
  const padRange = Math.max(0.1, (maxVal - minVal) * 0.15);
  const yMin = minVal - padRange;
  const yMax = maxVal + padRange;

  const w = 520;
  const h = height;
  const padL = 44;
  const padR = 36;
  const padT = 16;
  const padB = 32;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const maxLen = Math.max(1, ...series.map((s) => s.points.length));
  const xAt = (idx: number) => (maxLen === 1 ? padL + plotW / 2 : padL + (idx / (maxLen - 1)) * plotW);
  const yAt = (val: number) => padT + plotH - ((val - yMin) / Math.max(0.001, yMax - yMin)) * plotH;

  const labels = series[0]?.points.map((p) => p.label) ?? [];

  return (
    <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
        <div>
          <h3 className="bina-panel-h3">{title}</h3>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            {eyeLabelFa} • واحد: <bdi dir="ltr">{unit}</bdi> • منبع: {sourceLabelFa}
          </div>
        </div>
        <Button variant="ghost" style={{ minBlockSize: 28, fontSize: "0.75rem" }} onClick={() => setShowTable((v) => !v)}>
          {showTable ? "نمایش نمودار" : "مشاهده جدول داده‌ها"}
        </Button>
      </div>

      {/* Explicit Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: "0.75rem" }}>
        {series.map((s) => (
          <div key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              aria-hidden="true"
              style={{
                width: 14,
                height: 3,
                background: s.colorVar,
                borderTop: s.dashed ? `2px dashed ${s.colorVar}` : undefined,
              }}
            />
            <span>{s.nameFa}</span>
          </div>
        ))}
        {typeof referenceValue === "number" && referenceLabelFa && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--chart-reference)" }}>
            <span>--- {referenceLabelFa} ({formatPersianDigits(referenceValue)})</span>
          </div>
        )}
      </div>

      {showTable ? (
        <div className="bina-table-wrap">
          <table className="bina-table">
            <thead>
              <tr>
                <th>سری</th>
                <th>زمان</th>
                <th>مقدار ({unit})</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {series.flatMap((s) =>
                s.points.map((pt, idx) => (
                  <tr key={`${s.id}-${idx}`}>
                    <td>{s.nameFa}</td>
                    <td>{pt.label}</td>
                    <td className="bina-number">
                      {pt.value === null ? "داده موجود نیست" : formatPersianDigits(pt.value)}
                    </td>
                    <td>{pt.rejected ? `ردشده: ${pt.reasonFa ?? "نامعتبر"}` : pt.value === null ? "مفقود" : "معتبر"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div dir="ltr" style={{ width: "100%", overflowX: "auto" }}>
          <svg
            viewBox={`0 0 ${w} ${h}`}
            role="img"
            aria-label={`${title} — ${eyeLabelFa}`}
            style={{ width: "100%", height: "auto", minWidth: 360, display: "block" }}
          >
            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const val = yMin + frac * (yMax - yMin);
              const y = yAt(val);
              return (
                <g key={frac}>
                  <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--chart-grid)" strokeWidth={1} />
                  <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="var(--chart-axis)">
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Optional Reference Line */}
            {typeof referenceValue === "number" && (
              <line
                x1={padL}
                y1={yAt(referenceValue)}
                x2={w - padR}
                y2={yAt(referenceValue)}
                stroke="var(--chart-reference)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
            )}

            {/* Series segments (null gaps intentionally break segments — never interpolated) */}
            {series.map((s) => {
              const segments: Array<Array<{ x: number; y: number }>> = [];
              let currentSeg: Array<{ x: number; y: number }> = [];
              s.points.forEach((pt, idx) => {
                if (pt.value !== null && !pt.rejected) {
                  currentSeg.push({ x: xAt(idx), y: yAt(pt.value) });
                } else {
                  if (currentSeg.length > 0) {
                    segments.push(currentSeg);
                    currentSeg = [];
                  }
                }
              });
              if (currentSeg.length > 0) segments.push(currentSeg);

              return (
                <g key={s.id}>
                  {segments.map((seg, sIdx) => {
                    const d = seg.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
                    return (
                      <path
                        key={sIdx}
                        d={d}
                        fill="none"
                        stroke={s.colorVar}
                        strokeWidth={2}
                        strokeDasharray={s.dashed ? "5 3" : undefined}
                      />
                    );
                  })}
                  {s.points.map((pt, idx) => {
                    if (pt.value === null) return null;
                    const cx = xAt(idx);
                    const cy = yAt(pt.value);
                    if (pt.rejected) {
                      return (
                        <g key={idx}>
                          <line x1={cx - 4} y1={cy - 4} x2={cx + 4} y2={cy + 4} stroke="var(--chart-rejected)" strokeWidth={2} />
                          <line x1={cx + 4} y1={cy - 4} x2={cx - 4} y2={cy + 4} stroke="var(--chart-rejected)" strokeWidth={2} />
                        </g>
                      );
                    }
                    if (s.shape === "diamond") {
                      return (
                        <polygon
                          key={idx}
                          points={`${cx},${cy - 5} ${cx + 5},${cy} ${cx},${cy + 5} ${cx - 5},${cy}`}
                          fill={s.colorVar}
                        />
                      );
                    }
                    return <circle key={idx} cx={cx} cy={cy} r={4} fill={s.colorVar} />;
                  })}
                </g>
              );
            })}

            {/* Chronological LTR X-axis labels */}
            {labels.map((lbl, idx) => (
              <text key={idx} x={xAt(idx)} y={h - 8} textAnchor="middle" fontSize={10} fill="var(--chart-axis)">
                {lbl}
              </text>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}

export function AdherenceDonutChart({
  counts,
}: {
  counts: Record<AdherenceState, number>;
}) {
  const entries: Array<{ key: AdherenceState; label: string; color: string; value: number }> = [
    { key: "taken", label: ADHERENCE_LABELS_FA.taken, color: "var(--success)", value: counts.taken },
    { key: "missed_with_reason", label: ADHERENCE_LABELS_FA.missed_with_reason, color: "var(--error)", value: counts.missed_with_reason },
    { key: "unavailable", label: ADHERENCE_LABELS_FA.unavailable, color: "var(--warning)", value: counts.unavailable },
    { key: "no_response", label: ADHERENCE_LABELS_FA.no_response, color: "var(--neutral)", value: counts.no_response },
  ];
  const total = entries.reduce((acc, e) => acc + e.value, 0);
  const confirmedPct = total > 0 ? `${formatPersianDigits(Math.round((counts.taken / total) * 100))}٪` : "—";

  const radius = 44;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: 112, height: 112, flexShrink: 0 }}>
        <svg viewBox="0 0 112 112" width={112} height={112} aria-label="نمودار ۴ وضعیت پایبندی">
          <circle cx={56} cy={56} r={radius} fill="none" stroke="var(--surface-soft)" strokeWidth={14} />
          {total > 0 &&
            entries.map((entry) => {
              const frac = entry.value / total;
              const dash = frac * circ;
              const seg = (
                <circle
                  key={entry.key}
                  cx={56}
                  cy={56}
                  r={radius}
                  fill="none"
                  stroke={entry.color}
                  strokeWidth={14}
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 56 56)"
                />
              );
              offset += dash;
              return seg;
            })}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <strong className="bina-number" style={{ fontSize: "1.125rem" }}>{confirmedPct}</strong>
          <span style={{ fontSize: "0.6875rem", color: "var(--muted)" }}>تاییدشده</span>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 6 }}>
        {entries.map((e) => (
          <div key={e.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: e.color }} />
              {e.label}
            </span>
            <strong className="bina-number">{formatPersianDigits(e.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SignedShapBars({
  contributions,
}: {
  contributions: Array<{ featureFa: string; weight: number }>;
}) {
  const maxAbs = Math.max(0.05, ...contributions.map((c) => Math.abs(c.weight)));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {contributions.map((item, idx) => {
        const pct = Math.min(100, Math.round((Math.abs(item.weight) / maxAbs) * 100));
        const positive = item.weight >= 0;
        return (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "150px 1fr 64px", alignItems: "center", gap: 8, fontSize: "0.75rem" }}>
            <span>{item.featureFa}</span>
            <div style={{ height: 10, background: "var(--surface-soft)", borderRadius: 4, overflow: "hidden", display: "flex", justifyContent: positive ? "flex-start" : "flex-end" }}>
              <div
                style={{
                  width: `${pct}%`,
                  background: positive ? "var(--chart-operational-amber)" : "var(--chart-operational-teal)",
                }}
              />
            </div>
            <bdi dir="ltr" className="bina-number" style={{ textAlign: "end" }}>
              {item.weight >= 0 ? `+${item.weight.toFixed(2)}` : item.weight.toFixed(2)}
            </bdi>
          </div>
        );
      })}
    </div>
  );
}
