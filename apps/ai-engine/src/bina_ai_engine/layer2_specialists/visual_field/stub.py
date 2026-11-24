from __future__ import annotations

from bina_ai_engine.schemas import SpecialistInput, SpecialistOutput


class StubVisualFieldSpecialist:
    """Layer 2 Visual Field (HFA 8x9 perimetry) glaucoma progression specialist."""

    plugin_id = "visual_field"
    supported_modalities = ("visual_field",)

    def predict(self, payload: SpecialistInput) -> SpecialistOutput:
        hints = {h.lower() for a in payload.assets for h in a.condition_hints}
        slope = (
            payload.labs.vf_md_slope_db_per_year
            if (payload.labs and payload.labs.vf_md_slope_db_per_year is not None)
            else (-1.45 if "fast_progressor" in hints or "glaucoma" in hints else -0.18)
        )
        fast_progressor = 1.0 if slope <= -1.0 else 0.0
        prog_prob = 0.84 if fast_progressor > 0.5 else 0.14

        eye_fa = "چشم راست" if payload.eye_laterality == "OD" else "چشم چپ"
        return SpecialistOutput(
            specialist_id="visual_field",
            backbone_id="vf_spatial_temporal_v1",
            eye_laterality=payload.eye_laterality,
            probabilities={
                "glaucoma_progression": prog_prob,
            },
            biomarkers={
                "md_slope_db_per_year": float(slope),
                "fast_progressor": fast_progressor,
            },
            summary_fa=f"تحلیل روند میدان بینایی ({eye_fa}) انجام شد.",
        )
