from __future__ import annotations

from bina_ai_engine.schemas import SpecialistInput, SpecialistOutput


class StubAnteriorSpecialist:
    """Layer 2 Anterior & Corneal Topography specialist (Keratoconus, Cataract, Keratitis, Pterygium)."""

    plugin_id = "anterior"
    supported_modalities = ("slit_lamp", "topography")

    def predict(self, payload: SpecialistInput) -> SpecialistOutput:
        hints = {h.lower() for a in payload.assets for h in a.condition_hints}
        keys = " ".join(a.s3_object_key.lower() for a in payload.assets)

        keratitis = 0.93 if ("infectious_keratitis" in hints or "keratitis" in keys) else 0.02
        kc_manifest = 0.85 if ("keratoconus" in hints or "keratoconus" in keys) else 0.08
        kc_subclinical = 0.67 if ("subclinical_kc" in hints or "forme_fruste" in hints) else 0.11
        cataract = 0.77 if ("cataract" in hints or "cataract" in keys) else 0.14
        pterygium = 0.75 if ("pterygium" in hints or "pterygium" in keys) else 0.05

        kmax_d = payload.labs.kmax_diopters if (payload.labs and payload.labs.kmax_diopters is not None) else (
            51.4 if kc_manifest > 0.6 else 43.8
        )
        pachy_um = (
            payload.labs.thinnest_pachymetry_um
            if (payload.labs and payload.labs.thinnest_pachymetry_um is not None)
            else (432.0 if kc_manifest > 0.6 else 535.0)
        )

        eye_fa = "چشم راست" if payload.eye_laterality == "OD" else "چشم چپ"
        return SpecialistOutput(
            specialist_id="anterior",
            backbone_id="dinov2_convnext_apache2",
            eye_laterality=payload.eye_laterality,
            probabilities={
                "keratoconus_manifest": kc_manifest,
                "keratoconus_subclinical": kc_subclinical,
                "cataract": cataract,
                "infectious_keratitis": keratitis,
                "pterygium": pterygium,
            },
            biomarkers={
                "kmax_d": float(kmax_d),
                "thinnest_pachymetry_um": float(pachy_um),
            },
            summary_fa=f"ارزیابی سگمان قدامی و توپوگرافی قرنیه ({eye_fa}) انجام شد.",
        )
