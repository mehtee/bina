from __future__ import annotations

from bina_ai_engine.schemas import SpecialistInput, SpecialistOutput


class StubOctSpecialist:
    """Layer 2 OCT & OCT-A specialist (MONAI/U-Net layer+fluid segmentation + AMD/DME/CNV)."""

    plugin_id = "oct"
    supported_modalities = ("oct", "octa")

    def predict(self, payload: SpecialistInput) -> SpecialistOutput:
        hints = {h.lower() for a in payload.assets for h in a.condition_hints}
        keys = " ".join(a.s3_object_key.lower() for a in payload.assets)

        active_cnv = 0.88 if ("active_cnv" in hints or "cnv" in hints or "cnv" in keys) else 0.06
        dme = 0.81 if ("dme" in hints or "dme" in keys) else 0.12
        amd = 0.79 if ("amd" in hints or "amd" in keys or active_cnv > 0.6) else 0.15
        glaucoma_rnfl = "glaucoma" in hints or "glaucoma" in keys

        rnfl_um = 68.0 if glaucoma_rnfl else 96.0
        irf_nl = 145.0 if (dme > 0.6 or active_cnv > 0.6) else 0.0
        srf_nl = 92.0 if active_cnv > 0.6 else 0.0
        ped_present = 1.0 if amd > 0.6 else 0.0
        has_octa = any(a.declared_modality == "octa" for a in payload.assets)
        octa_density = 0.44 if has_octa else 0.51

        eye_fa = "چشم راست" if payload.eye_laterality == "OD" else "چشم چپ"
        return SpecialistOutput(
            specialist_id="oct",
            backbone_id="monai_unet_apache2",
            eye_laterality=payload.eye_laterality,
            probabilities={
                "amd": amd,
                "dme": dme,
                "active_cnv": active_cnv,
            },
            biomarkers={
                "rnfl_um": rnfl_um,
                "irf_volume_nl": irf_nl,
                "srf_volume_nl": srf_nl,
                "ped_present": ped_present,
                "octa_vessel_density": octa_density,
            },
            summary_fa=f"سگمنتیشن لایه‌ها و مایع در OCT/OCT-A ({eye_fa}) تکمیل شد.",
        )
