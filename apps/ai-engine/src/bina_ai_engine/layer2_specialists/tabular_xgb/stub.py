from __future__ import annotations

from bina_ai_engine.schemas import SpecialistInput, SpecialistOutput


class StubTabularXgbSpecialist:
    """Layer 2 Tabular Clinical/Lab Risk specialist (XGBoost + SHAP biomarker weights)."""

    plugin_id = "tabular_xgb"
    supported_modalities = ("tabular_labs",)

    def predict(self, payload: SpecialistInput) -> SpecialistOutput:
        labs = payload.labs
        hba1c = labs.hba1c_percent if (labs and labs.hba1c_percent is not None) else 6.0
        iop = labs.iop_mm_hg if (labs and labs.iop_mm_hg is not None) else 15.0
        cct = (
            labs.central_corneal_thickness_um
            if (labs and labs.central_corneal_thickness_um is not None)
            else 540.0
        )

        diabetes_dr_risk = min(0.95, max(0.05, (hba1c - 5.5) * 0.18 + 0.1))
        glaucoma_risk = min(0.95, max(0.05, (iop - 14.0) * 0.06 + (540.0 - cct) * 0.002 + 0.12))

        eye_fa = "چشم راست" if payload.eye_laterality == "OD" else "چشم چپ"
        return SpecialistOutput(
            specialist_id="tabular_xgb",
            backbone_id="xgboost_v1",
            eye_laterality=payload.eye_laterality,
            probabilities={
                "diabetes_dr_risk": round(diabetes_dr_risk, 4),
                "glaucoma_risk": round(glaucoma_risk, 4),
            },
            biomarkers={
                "shap_hba1c_contribution": round(max(0.0, (hba1c - 6.0) * 0.15), 4),
                "shap_iop_contribution": round(max(0.0, (iop - 18.0) * 0.08), 4),
                "iop_mmhg": float(iop),
                "hba1c_percent": float(hba1c),
            },
            summary_fa=f"مدل ریسک جدولی XGBoost برای آزمایش‌ها و فشار چشم ({eye_fa}) محاسبه شد.",
        )
