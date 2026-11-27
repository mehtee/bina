import React, { useEffect, useState } from "react";
import { Expand, Layers, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type {
  DiagnosticStudyDetail,
  StudyComparisonResponse,
} from "~/core/api/contracts";
import {
  buildSyntheticFundusSvgDataUri,
  buildSyntheticOctSvgDataUri,
} from "~/core/fixtures/staff-web-fixtures";
import {
  AUXILIARY_GRADCAM_LABEL_FA,
  formatEyeLabelFa,
  formatPersianDigits,
  MODALITY_LABELS_FA,
} from "~/core/i18n/fa-ir";
import { ChronologicalLineChart, SignedShapBars } from "~/design-system/charts/clinical-charts";
import { Button, StatusBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner } from "~/design-system/primitives/state-surfaces";

export type ViewerSubMode = "general" | "oct" | "fundus" | "anterior" | "vf" | "risk" | "compare";

const VIEWER_ZOOM_MIN = 0.75;
const VIEWER_ZOOM_MAX = 2.2;
const VIEWER_ZOOM_STEP = 0.25;
const VIEWER_ZOOM_DEFAULT = 1;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  ) {
    return true;
  }
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function EvidenceViewerPanel({
  study,
  mode = "general",
  comparison,
}: {
  study: DiagnosticStudyDetail;
  mode?: ViewerSubMode;
  comparison?: StudyComparisonResponse | null;
}) {
  const [selectedModality, setSelectedModality] = useState<string>(
    mode === "fundus" ? "fundus" : mode === "oct" ? "oct" : study.qcDecisions?.[0]?.modalityPrediction.declaredModality ?? "oct"
  );
  const [zoom, setZoom] = useState(VIEWER_ZOOM_DEFAULT);
  const [sliceIndex, setSliceIndex] = useState(96);
  const [showPrimaryMask, setShowPrimaryMask] = useState(true);
  const [maskOpacity, setMaskOpacity] = useState(35);
  // STRICT SAFETY RULE: Auxiliary Grad-CAM is OFF by default and strictly separated from segmentation masks
  const [showAuxiliaryGradCam, setShowAuxiliaryGradCam] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const isImageViewportMode = mode === "general" || mode === "oct" || mode === "fundus";

  useEffect(() => {
    if (mode === "fundus") setSelectedModality("fundus");
    else if (mode === "oct") setSelectedModality("oct");
    else if (mode === "anterior") setSelectedModality("topography");
    else if (mode === "vf") setSelectedModality("visual_field");
  }, [mode]);

  // Keyboard shortcuts (plain keys only): Esc exits fullscreen; +/-/0 zoom; ArrowLeft/ArrowRight slice navigation
  useEffect(() => {
    if (!isImageViewportMode) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) {
        return;
      }
      if (isEditableTarget(ev.target)) {
        return;
      }
      if (ev.key === "Escape" && fullscreen) {
        setFullscreen(false);
      } else if (ev.key === "+" || ev.key === "=") {
        ev.preventDefault();
        setZoom((z) => Math.min(VIEWER_ZOOM_MAX, Number((z + VIEWER_ZOOM_STEP).toFixed(2))));
      } else if (ev.key === "-") {
        ev.preventDefault();
        setZoom((z) => Math.max(VIEWER_ZOOM_MIN, Number((z - VIEWER_ZOOM_STEP).toFixed(2))));
      } else if (ev.key === "0") {
        ev.preventDefault();
        setZoom(VIEWER_ZOOM_DEFAULT);
      } else if (selectedModality === "oct" && ev.key === "ArrowLeft") {
        setSliceIndex((s) => Math.min(98, s + 1));
      } else if (selectedModality === "oct" && ev.key === "ArrowRight") {
        setSliceIndex((s) => Math.max(93, s - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, isImageViewportMode, selectedModality]);

  const activeQc = study.qcDecisions?.find((q) => q.modalityPrediction.declaredModality === selectedModality);
  const activeSpecialist = study.specialistOutputs.find(
    (s) => s.specialistId === (selectedModality === "topography" || selectedModality === "slit_lamp" ? "anterior" : selectedModality)
  );
  const rawImgUrl =
    selectedModality === "fundus"
      ? buildSyntheticFundusSvgDataUri(`${study.eyeLaterality} Fundus — Raw`, false)
      : buildSyntheticOctSvgDataUri(`${study.eyeLaterality} OCT B-Scan #${sliceIndex}/128`, Boolean(study.urgentFloorActive));

  if (mode === "anterior") {
    const bio = activeSpecialist?.biomarkers ?? {};
    const topoMaps = [
      { title: "نقشه انحنای قدامی (Axial)", unit: "D", scale: "۳۸ تا ۴۸ دیوپتر", color: "linear-gradient(135deg,#1d5c8c,#2fb36d,#f2b824,#d93d3d)", available: true },
      { title: "نقشه ارتفاع قدامی (Anterior Elevation)", unit: "µm", scale: "-۲۰ تا +۴۰ میکرومتر", color: "linear-gradient(135deg,#204b88,#41b08a,#efe56b)", available: true },
      { title: "نقشه ضخامت قرنیه (Pachymetry)", unit: "µm", scale: "۴۰۰ تا ۶۲۰ میکرومتر", color: "linear-gradient(135deg,#d93d3d,#f2b824,#2fb36d,#1d5c8c)", available: true },
      { title: "نقشه چهارم (Posterior Elevation)", unit: "µm", scale: "داده خام ثبت نشده", color: "", available: false },
    ];
    return (
      <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="bina-section-h2">بخش قدامی و توپوگرافی قرنیه (C08 — شبکه ۲×۲ با مقیاس بومی)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {topoMaps.map((m, idx) => (
            <div key={idx} className="bina-viewport" style={{ padding: 12, minHeight: 190, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                <strong>{m.title}</strong>
                <bdi dir="ltr">{m.unit}</bdi>
              </div>
              {m.available ? (
                <div style={{ height: 115, borderRadius: 6, background: m.color, opacity: 0.9, border: "1px solid var(--viewer-border)" }} />
              ) : (
                <div style={{ height: 115, borderRadius: 6, border: "1px dashed var(--viewer-border)", display: "grid", placeItems: "center", fontSize: "0.8125rem", color: "var(--muted)" }}>
                  داده نقشه چهارم در این دستگاه موجود نیست (جعل نمی‌شود)
                </div>
              )}
              <div style={{ fontSize: "0.75rem", color: "var(--viewer-text)" }}>مقیاس بومی: {m.scale}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          <div className="bina-panel" dir="ltr" style={{ display: "flex", justifyContent: "space-between" }}><span>Kmax</span><strong className="bina-number">{bio.kmax_d ?? "—"} D</strong></div>
          <div className="bina-panel" dir="ltr" style={{ display: "flex", justifyContent: "space-between" }}><span>K1</span><strong className="bina-number">{bio.k1_d ?? "—"} D</strong></div>
          <div className="bina-panel" dir="ltr" style={{ display: "flex", justifyContent: "space-between" }}><span>K2</span><strong className="bina-number">{bio.k2_d ?? "—"} D</strong></div>
          <div className="bina-panel" dir="ltr" style={{ display: "flex", justifyContent: "space-between" }}><span>Thinnest Pachy</span><strong className="bina-number">{bio.thinnest_pachymetry_um ?? "—"} µm</strong></div>
        </div>
      </div>
    );
  }

  if (mode === "vf") {
    const bio = study.specialistOutputs.find((s) => s.specialistId === "visual_field")?.biomarkers ?? {};
    const sampleGrid = [
      [26, 28, 29, 27],
      [27, 29, 25, 24],
      [28, 22, 19, 26],
      [27, 25, 27, 28],
    ];
    return (
      <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="bina-section-h2">تحلیل میدان بینایی (C09 — مختصات بومی بدون آینه‌سازی در RTL)</h2>
        <div className="bina-grid">
          <div className="bina-viewport" dir="ltr" style={{ gridColumn: "span 5", padding: 14 }}>
            <div style={{ fontSize: "0.75rem", marginBottom: 8 }}>24-2 Threshold Sensitivity (dB) — {study.eyeLaterality}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {sampleGrid.flat().map((val, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--vf-paper)",
                    color: "var(--vf-ink)",
                    padding: 10,
                    textAlign: "center",
                    borderRadius: 4,
                    fontWeight: 700,
                    fontSize: "0.875rem",
                  }}
                >
                  {val}
                </div>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: "span 7", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <div className="bina-panel" dir="ltr" style={{ display: "flex", justifyContent: "space-between" }}><span>MD</span><strong>{bio.md_db ?? -3.2} dB</strong></div>
              <div className="bina-panel" dir="ltr" style={{ display: "flex", justifyContent: "space-between" }}><span>PSD</span><strong>{bio.psd_db ?? 2.1} dB</strong></div>
              <div className="bina-panel" dir="ltr" style={{ display: "flex", justifyContent: "space-between" }}><span>VFI</span><strong>{bio.vfi_pct ?? 94}%</strong></div>
            </div>
            <ChronologicalLineChart
              title="روند طولی شاخص MD (پروتکل سازگار 24-2)"
              unit="dB"
              eyeLabelFa={formatEyeLabelFa(study.eyeLaterality)}
              sourceLabelFa="پریمتری استاندارد کلینیک"
              height={180}
              series={[
                {
                  id: "md",
                  nameFa: `MD (${formatEyeLabelFa(study.eyeLaterality)})`,
                  colorVar: "var(--chart-od)",
                  points: [
                    { label: "1404/06", value: -2.1 },
                    { label: "1404/09", value: -2.5 },
                    { label: "1405/03", value: null },
                    { label: "1405/09", value: Number(bio.md_db ?? -3.2) },
                  ],
                },
              ]}
            />
          </div>
        </div>
      </div>
    );
  }

  if (mode === "risk") {
    const tabSpec = study.specialistOutputs.find((s) => s.specialistId === "tabular_xgb");
    return (
      <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="bina-section-h2">داده‌های بالینی و آزمایشگاهی + سهم ویژگی‌های SHAP (C10)</h2>
        <AlertBanner
          tone="info"
          title="تفسیر همبستگی آماری (نه علیت)"
          description="مقادیر SHAP صرفاً میزان سهم هر متغیر در برآورد ریسک مدل را نمایش می‌دهند و جایگزین تصمیم بالینی پزشک نیستند."
        />
        <SignedShapBars
          contributions={[
            { featureFa: "ضخامت مرکزی ماکولا (CMT)", weight: 0.42 },
            { featureFa: "تغییر ضخامت اخیر (+Δ)", weight: 0.31 },
            { featureFa: "HbA1c (کنترل قند خون)", weight: 0.14 },
            { featureFa: "فشار داخل چشم (IOP)", weight: -0.06 },
          ]}
        />
        {tabSpec && (
          <div style={{ fontSize: "0.8125rem", color: "var(--on-surface-variant)" }}>
            خلاصه مدل جدولی ({tabSpec.backboneId}): {tabSpec.summaryFa}
          </div>
        )}
      </div>
    );
  }

  if (mode === "compare") {
    return (
      <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 className="bina-section-h2">مقایسه طولی با مطالعات قبلی هم‌چشم (C15)</h2>
        {!comparison || comparison.priorStudies.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>مطالعه قبلی سازگار برای مقایسه در این چشم یافت نشد.</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="bina-viewport" style={{ padding: 12 }}>
                <div style={{ fontSize: "0.75rem", marginBottom: 6 }}>مطالعه فعلی ({formatEyeLabelFa(study.eyeLaterality)})</div>
                <img src={rawImgUrl} alt="اسکن فعلی" style={{ width: "100%", height: 210, objectFit: "contain" }} />
              </div>
              <div className="bina-viewport" style={{ padding: 12 }}>
                <div style={{ fontSize: "0.75rem", marginBottom: 6 }}>
                  مطالعه قبلی ({formatEyeLabelFa(comparison.priorStudies[0]?.eyeLaterality)})
                </div>
                <img
                  src={buildSyntheticOctSvgDataUri(`${comparison.priorStudies[0]?.eyeLaterality ?? "OD"} Prior Baseline`, false)}
                  alt="اسکن قبلی"
                  style={{ width: "100%", height: 210, objectFit: "contain" }}
                />
              </div>
            </div>
            <div className="bina-panel">
              <h3 className="bina-panel-h3">تغییرات بیومارکرهای کلیدی (Deltas)</h3>
              {comparison.biomarkerDeltas.map((d) => (
                <div key={d.metricKey} style={{ display: "flex", justifyContent: "space-between", paddingBlock: 4, fontSize: "0.8125rem" }}>
                  <bdi dir="ltr">{d.metricKey}</bdi>
                  <bdi dir="ltr" className="bina-number">
                    {d.priorValue} → {d.currentValue} (Δ {d.delta >= 0 ? `+${d.delta}` : d.delta})
                  </bdi>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: fullscreen ? "1fr" : "156px minmax(0, 1fr) 296px",
        gap: 10,
        position: fullscreen ? "fixed" : undefined,
        inset: fullscreen ? 0 : undefined,
        zIndex: fullscreen ? 90 : undefined,
        background: fullscreen ? "var(--viewer-canvas)" : undefined,
        padding: fullscreen ? 16 : undefined,
      }}
    >
      {/* Modality Thumbnail Rail */}
      {!fullscreen && (
        <div className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h3 className="bina-panel-h3">مدالیته‌های مطالعه</h3>
          {["fundus", "oct", "octa", "topography", "visual_field"].map((mod) => {
            const hasAsset = study.qcDecisions?.some((q) => q.modalityPrediction.declaredModality === mod && q.passed);
            const active = selectedModality === mod;
            return (
              <button
                key={mod}
                type="button"
                onClick={() => setSelectedModality(mod)}
                style={{
                  textAlign: "start",
                  padding: 8,
                  borderRadius: 8,
                  border: active ? "2px solid var(--selected-outline)" : "1px solid var(--outline-variant)",
                  background: active ? "var(--primary-container)" : "var(--surface)",
                  color: "var(--on-surface)",
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: "0.75rem",
                }}
              >
                <div style={{ fontWeight: 700 }}>{MODALITY_LABELS_FA[mod] ?? mod}</div>
                <div style={{ fontSize: "0.7rem", color: hasAsset ? "var(--success)" : "var(--muted)" }}>
                  {hasAsset ? "موجود • تایید QC" : "ثبت نشده"}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Theme-Invariant Neutral Clinical Viewport (#090D12 — zero filters, zero decorative art) */}
      <div className="bina-viewport" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
            <bdi dir="ltr">{study.eyeLaterality}</bdi> — {MODALITY_LABELS_FA[selectedModality] ?? selectedModality}
            {activeQc ? ` (${activeQc.passed ? "تایید QC" : "رد QC"})` : " — بدون فایل"}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button
              variant="ghost"
              style={{ color: "var(--viewer-text)", minBlockSize: 30 }}
              aria-label="بزرگ‌نمایی"
              title="بزرگ‌نمایی (+)"
              onClick={() => setZoom((z) => Math.min(VIEWER_ZOOM_MAX, Number((z + VIEWER_ZOOM_STEP).toFixed(2))))}
            >
              <ZoomIn size={16} />
            </Button>
            <Button
              variant="ghost"
              style={{ color: "var(--viewer-text)", minBlockSize: 30 }}
              aria-label="کوچک‌نمایی"
              title="کوچک‌نمایی (-)"
              onClick={() => setZoom((z) => Math.max(VIEWER_ZOOM_MIN, Number((z - VIEWER_ZOOM_STEP).toFixed(2))))}
            >
              <ZoomOut size={16} />
            </Button>
            <Button
              variant="ghost"
              style={{ color: "var(--viewer-text)", minBlockSize: 30 }}
              aria-label="بازنشانی نما"
              title="بازنشانی نما (0)"
              onClick={() => setZoom(VIEWER_ZOOM_DEFAULT)}
            >
              <RotateCcw size={16} />
            </Button>
            <Button
              variant="ghost"
              style={{ color: "var(--viewer-text)", minBlockSize: 30 }}
              aria-label="تمام‌صفحه"
              title="تمام‌صفحه (Esc برای خروج)"
              onClick={() => setFullscreen((f) => !f)}
            >
              <Expand size={16} />
            </Button>
          </div>
        </div>

        {/* Image + Pixel-Aligned SVG Segmentation Overlay Canvas */}
        <div
          style={{
            position: "relative",
            height: fullscreen ? "65vh" : 360,
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
            background: "#090D12",
            borderRadius: 6,
          }}
        >
          <div
            style={{
              position: "relative",
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 120ms ease",
              width: 520,
              height: fullscreen ? "62vh" : 340,
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          >
            <img
              src={rawImgUrl}
              alt={`${formatEyeLabelFa(study.eyeLaterality)} — ${selectedModality}`}
              width={520}
              height={340}
              style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
            />
            {showPrimaryMask && (
              <svg
                viewBox="0 0 320 220"
                aria-label="ماسک سگمنتیشن اولیه"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: maskOpacity / 100,
                  pointerEvents: "none",
                }}
              >
                <ellipse cx="162" cy="118" rx="34" ry="18" fill="#8CC4FF" stroke="#83E8D6" strokeWidth="2" />
                <ellipse cx="196" cy="134" rx="26" ry="11" fill="#FFD387" stroke="#FFD387" strokeWidth="1.5" />
              </svg>
            )}
            {showAuxiliaryGradCam && (
              <svg
                viewBox="0 0 320 220"
                aria-label={AUXILIARY_GRADCAM_LABEL_FA}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0.38,
                  pointerEvents: "none",
                }}
              >
                <defs>
                  <radialGradient id="gradcam-aux">
                    <stop offset="0%" stopColor="#ff453a" stopOpacity="0.9" />
                    <stop offset="55%" stopColor="#ffd60a" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ffd60a" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="170" cy="122" r="54" fill="url(#gradcam-aux)" />
              </svg>
            )}
          </div>
        </div>

        {/* OCT B-Scan Slice Filmstrip */}
        {selectedModality === "oct" && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBlock: 2 }}>
            {[93, 94, 95, 96, 97, 98].map((sl) => (
              <button
                key={sl}
                type="button"
                onClick={() => setSliceIndex(sl)}
                style={{
                  minWidth: 74,
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: sliceIndex === sl ? "2px solid var(--viewer-focus)" : "1px solid var(--viewer-border)",
                  background: "var(--viewer-chrome)",
                  color: "var(--viewer-text)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                مقطع {formatPersianDigits(sl)}
              </button>
            ))}
          </div>
        )}

        {/* Independent Overlay Controls (Mask vs Separate Auxiliary Grad-CAM) */}
        <div
          style={{
            background: "var(--viewer-chrome)",
            borderRadius: 6,
            padding: 10,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={showPrimaryMask} onChange={(e) => setShowPrimaryMask(e.target.checked)} />
              <Layers size={14} />
              <span>ماسک سگمنتیشن اولیه (IRF/SRF/Disc)</span>
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span>شفافیت: {formatPersianDigits(maskOpacity)}٪</span>
              <input
                type="range"
                min={0}
                max={100}
                value={maskOpacity}
                onChange={(e) => setMaskOpacity(Number(e.target.value))}
                aria-label="شفافیت ماسک سگمنتیشن"
              />
            </label>
          </div>

          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#FFD387", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showAuxiliaryGradCam}
              onChange={(e) => setShowAuxiliaryGradCam(e.target.checked)}
            />
            <span>{AUXILIARY_GRADCAM_LABEL_FA}</span>
          </label>
        </div>
      </div>

      {/* Quantitative Biomarker & Specialist Findings Inspector */}
      {!fullscreen && (
        <aside className="bina-panel-raised" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 className="bina-panel-h3">شاخص‌های کمی و یافته‌های متخصص</h3>
          {activeSpecialist ? (
            <>
              <StatusBadge tone="info" label={`بک‌بون: ${activeSpecialist.backboneId}`} showIcon={false} />
              <p style={{ margin: 0, fontSize: "0.8125rem", lineHeight: 1.7 }}>{activeSpecialist.summaryFa}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {Object.entries(activeSpecialist.biomarkers).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", borderBlockEnd: "1px solid var(--panel-divider)", paddingBlock: 3 }}>
                    <bdi dir="ltr">{k}</bdi>
                    <strong className="bina-number">{formatPersianDigits(v)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
              داده‌ای برای این مدالیته در مطالعه ثبت نشده است (عدم تحلیل به‌معنای سالم بودن نیست).
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
