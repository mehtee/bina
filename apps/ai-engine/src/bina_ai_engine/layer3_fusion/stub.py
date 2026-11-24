from __future__ import annotations

from typing import Literal

from bina_ai_engine.schemas import (
    ClinicalLabsInput,
    DiagnosticModality,
    DifferentialItem,
    FusionResult,
    SeverityGrade,
    SpecialistOutput,
    UrgencyTier,
)

CONDITION_CATALOG_FA: dict[str, tuple[str, bool]] = {
    "infectious_keratitis": ("کراتیت عفونی قرنیه", True),
    "papilledema": ("ادم پاپی (ورم سر عصب بینایی)", True),
    "retinal_detachment": ("جداشدگی شبکیه", True),
    "active_cnv": ("نئوواسکولاریزاسیون مشیمیه‌ای فعال (CNV)", True),
    "high_risk_rop": ("رتینوپاتی نوزادان نارس پرخطر (ROP)", True),
    "glaucoma": ("نوروپاتی گلوکوماتوز / گلوکوم", False),
    "glaucoma_progression": ("پیشرفت میدان بینایی در گلوکوم", False),
    "dr": ("رتینوپاتی دیابتی (DR)", False),
    "dme": ("ادم ماکولای دیابتی (DME)", False),
    "amd": ("دژنراسیون ماکولای وابسته به سن (AMD)", False),
    "keratoconus_manifest": ("کراتوکونوس آشکار قرنیه", False),
    "keratoconus_subclinical": ("کراتوکونوس تحت‌بالینی / Forme Fruste", False),
    "cataract": ("آب‌مروارید (کاتاراکت)", False),
    "pterygium": ("ناخنک چشم (پتریژیوم)", False),
    "diabetes_dr_risk": ("ریسک متابولیک رتینوپاتی دیابتی", False),
    "glaucoma_risk": ("ریسک کلینیکی گلوکوم", False),
}

MODALITY_LABELS_FA: dict[DiagnosticModality, str] = {
    "fundus": "فاندوس",
    "oct": "OCT",
    "octa": "OCT-A",
    "slit_lamp": "اسلیت‌لمپ",
    "topography": "توپوگرافی قرنیه",
    "visual_field": "میدان بینایی",
    "tabular_labs": "آزمایش‌ها و داده‌های بالینی",
    "unknown": "نامشخص",
}

SPECIALIST_TO_MODALITY: dict[str, DiagnosticModality] = {
    "fundus": "fundus",
    "oct": "oct",
    "anterior": "topography",
    "visual_field": "visual_field",
    "tabular_xgb": "tabular_labs",
}

CORE_MODALITIES: tuple[DiagnosticModality, ...] = (
    "fundus",
    "oct",
    "topography",
    "visual_field",
    "tabular_labs",
)


class StubMaskedFusionEngine:
    """Layer 3 Masked Multimodal Late-Fusion Engine honoring ADR-052."""

    def fuse(
        self,
        eye_laterality: Literal["OD", "OS"],
        specialist_outputs: list[SpecialistOutput],
        labs: ClinicalLabsInput | None,
    ) -> FusionResult:
        available_set: list[DiagnosticModality] = []
        for out in specialist_outputs:
            mod = SPECIALIST_TO_MODALITY.get(out.specialist_id)
            if mod and mod not in available_set:
                available_set.append(mod)

        missing_set: list[DiagnosticModality] = [m for m in CORE_MODALITIES if m not in available_set]

        if missing_set:
            avail_fa = "، ".join(MODALITY_LABELS_FA[m] for m in available_set) or "داده محدود"
            miss_fa = "، ".join(MODALITY_LABELS_FA[m] for m in missing_set)
            notice_fa = f"تست‌های ({miss_fa}) در این ویزیت موجود نبود؛ ارزیابی با تکیه بر ({avail_fa}) انجام شد."
        else:
            notice_fa = "تمام مودالیتی‌های اصلی تشخیصی در این ارزیابی ترکیب شدند."

        scores: dict[str, list[tuple[float, DiagnosticModality]]] = {}
        biomarkers: dict[str, float] = {}
        for out in specialist_outputs:
            mod = SPECIALIST_TO_MODALITY.get(out.specialist_id, "unknown")
            biomarkers.update(out.biomarkers)
            for cond, prob in out.probabilities.items():
                scores.setdefault(cond, []).append((prob, mod))

        # Cross-modality glaucoma reinforcement (Fundus C/D + OCT RNFL + VF + IOP)
        if "glaucoma" in scores or "glaucoma_progression" in scores or "glaucoma_risk" in scores:
            g_evidence: list[tuple[float, DiagnosticModality]] = []
            for key in ("glaucoma", "glaucoma_progression", "glaucoma_risk"):
                g_evidence.extend(scores.get(key, []))
            combined_glaucoma = min(0.97, max(p for p, _ in g_evidence) + (0.07 if len(g_evidence) >= 2 else 0.0))
            scores["glaucoma"] = [(combined_glaucoma, m) for _, m in g_evidence]

        differential: list[DifferentialItem] = []
        urgent_floor_hit = False

        for cond_code, entries in scores.items():
            max_prob = max(p for p, _ in entries)
            supporting = []
            for _, m in entries:
                if m not in supporting:
                    supporting.append(m)

            label_fa, is_urgent_pathology = CONDITION_CATALOG_FA.get(cond_code, (cond_code, False))
            if is_urgent_pathology and max_prob >= 0.55:
                severity: SeverityGrade = "urgent"
                urgent_floor_hit = True
            elif max_prob >= 0.75:
                severity = "severe"
            elif max_prob >= 0.45:
                severity = "moderate"
            else:
                severity = "mild"

            if max_prob >= 0.25 or is_urgent_pathology and max_prob >= 0.55:
                differential.append(
                    DifferentialItem(
                        condition_code=cond_code,
                        condition_name_fa=label_fa,
                        confidence=round(max_prob, 3),
                        confidence_interval_lower=round(max(0.0, max_prob - 0.08), 3),
                        confidence_interval_upper=round(min(1.0, max_prob + 0.06), 3),
                        severity=severity,
                        supporting_modalities=supporting,
                    )
                )

        differential.sort(key=lambda item: (item.severity == "urgent", item.confidence), reverse=True)
        if not differential:
            differential.append(
                DifferentialItem(
                    condition_code="within_normal_limits",
                    condition_name_fa="یافته پاتولوژیک برجسته مشاهده نشد (نیازمند تایید پزشک)",
                    confidence=0.88,
                    confidence_interval_lower=0.78,
                    confidence_interval_upper=0.95,
                    severity="mild",
                    supporting_modalities=available_set or ["tabular_labs"],
                )
            )

        discordance_flags_fa: list[str] = []
        rnfl_um = biomarkers.get("rnfl_um")
        iop_mmhg = biomarkers.get("iop_mmhg", labs.iop_mm_hg if labs else None)
        fast_prog = biomarkers.get("fast_progressor", 0.0)
        if ((rnfl_um is not None and rnfl_um < 75.0) or (iop_mmhg is not None and iop_mmhg >= 22.0)) and fast_prog < 0.5:
            if "visual_field" in available_set:
                discordance_flags_fa.append(
                    "ناهمخوانی بین‌مودالیتی: نازک‌شدن RNFL یا فشار چشم بالا بدون افت پیش‌رونده متناظر در میدان بینایی."
                )

        recommended_urgency: UrgencyTier
        if urgent_floor_hit:
            recommended_urgency = "urgent"
        elif any(d.severity in ("severe", "moderate") and d.confidence >= 0.45 for d in differential):
            recommended_urgency = "followup_3_6m"
        else:
            recommended_urgency = "routine"

        urgency_labels_fa: dict[UrgencyTier, str] = {
            "routine": "عادی",
            "followup_3_6m": "پیگیری ۳ تا ۶ ماه",
            "urgent": "ارجاع فوری",
        }

        return FusionResult(
            eye_laterality=eye_laterality,
            available_modalities=available_set,
            missing_modalities=missing_set,
            missing_modality_notice_fa=notice_fa,
            differential=differential,
            discordance_flags_fa=discordance_flags_fa,
            recommended_urgency=recommended_urgency,
            recommended_urgency_label_fa=urgency_labels_fa[recommended_urgency],
        )
