from __future__ import annotations

from bina_ai_engine.schemas import SpecialistInput, SpecialistOutput


class StubFundusSpecialist:
    """Layer 2 Fundus specialist (DR, Glaucoma, AMD, Papilledema, ROP) on Apache 2.0 DINOv2 slot."""

    plugin_id = "fundus"
    supported_modalities = ("fundus",)

    def __init__(self, backbone_id: str = "dinov2_apache2") -> None:
        self._backbone_id = backbone_id

    def predict(self, payload: SpecialistInput) -> SpecialistOutput:
        hints = {h.lower() for a in payload.assets for h in a.condition_hints}
        keys = " ".join(a.s3_object_key.lower() for a in payload.assets)

        papilledema = 0.89 if ("papilledema" in hints or "papilledema" in keys) else 0.03
        rop = 0.87 if ("high_risk_rop" in hints or "rop" in hints or "rop" in keys) else 0.02
        rd = 0.91 if ("retinal_detachment" in hints or "rd" in keys) else 0.02
        glaucoma = 0.78 if ("glaucoma" in hints or "glaucoma" in keys) else 0.14
        dr = 0.74 if ("dr" in hints or "dr" in keys) else 0.16
        amd = 0.72 if ("amd" in hints or "amd" in keys) else 0.11

        cup_to_disc = 0.76 if glaucoma > 0.6 else 0.42
        eye_fa = "چشم راست" if payload.eye_laterality == "OD" else "چشم چپ"

        return SpecialistOutput(
            specialist_id="fundus",
            backbone_id=payload.backbone_override or self._backbone_id,
            eye_laterality=payload.eye_laterality,
            probabilities={
                "dr": dr,
                "glaucoma": glaucoma,
                "amd": amd,
                "papilledema": papilledema,
                "high_risk_rop": rop,
                "retinal_detachment": rd,
            },
            biomarkers={
                "cup_to_disc_ratio": cup_to_disc,
            },
            summary_fa=f"تحلیل تصویر ته چشم ({eye_fa}) با مدل {payload.backbone_override or self._backbone_id} انجام شد.",
        )
