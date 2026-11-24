from __future__ import annotations

from bina_ai_engine.schemas import (
    DiagnosticModality,
    ModalityPrediction,
    QcDecision,
    QcRejectionCode,
    StudyAssetInput,
)

EYE_LABELS_FA: dict[str, str] = {
    "OD": "چشم راست",
    "OS": "چشم چپ",
}


class StubModalityRouter:
    """Deterministic Wave 0 Modality Router stub honoring ModalityRouterPort."""

    def detect(self, asset: StudyAssetInput) -> ModalityPrediction:
        key_lower = asset.s3_object_key.lower()
        detected: DiagnosticModality = asset.declared_modality
        confidence = 0.99

        if "unknown_modality" in key_lower:
            detected = "unknown"
            confidence = 0.42
        elif "mismatch_oct" in key_lower:
            detected = "oct"
            confidence = 0.94
        elif "mismatch_fundus" in key_lower:
            detected = "fundus"
            confidence = 0.95

        return ModalityPrediction(
            asset_id=asset.asset_id,
            declared_modality=asset.declared_modality,
            detected_modality=detected,
            confidence=confidence,
            matches_declared=(detected == asset.declared_modality),
        )


class StubQualityControlGate:
    """Deterministic Wave 0 Layer-1 QC Gate catching blur, lighting, modality mismatch, and OD/OS mismatch."""

    def evaluate(
        self,
        asset: StudyAssetInput,
        modality_prediction: ModalityPrediction,
    ) -> QcDecision:
        key_lower = asset.s3_object_key.lower()
        codes: list[QcRejectionCode] = []
        reasons_fa: list[str] = []

        if (asset.blur_score_hint is not None and asset.blur_score_hint < 0.45) or "blur" in key_lower:
            codes.append("blur")
            reasons_fa.append("تار بودن تصویر")

        if (
            (asset.lighting_score_hint is not None and (asset.lighting_score_hint < 0.4 or asset.lighting_score_hint > 0.95))
            or "dark" in key_lower
            or "glare" in key_lower
        ):
            codes.append("lighting")
            reasons_fa.append("نور نامناسب")

        detected_eye = asset.detected_eye_hint.strip().upper() if asset.detected_eye_hint else None
        if (detected_eye in ("OD", "OS") and detected_eye != asset.declared_eye) or "wrong_eye" in key_lower:
            codes.append("wrong_eye")
            reasons_fa.append("عدم تطابق چشم راست و چپ")

        if not modality_prediction.matches_declared:
            codes.append("modality_mismatch")
            reasons_fa.append("عدم تطابق نوع تصویر با برچسب ثبت‌شده")

        passed = len(codes) == 0
        eye_fa = EYE_LABELS_FA[asset.declared_eye]
        instruction_fa = (
            None
            if passed
            else f"تصویر {eye_fa} کیفیت لازم را ندارد ({'، '.join(reasons_fa)}). لطفاً تصویربرداری را مجدداً تکرار کنید."
        )

        return QcDecision(
            asset_id=asset.asset_id,
            modality_prediction=modality_prediction,
            passed=passed,
            rejection_codes=codes,
            rejection_reasons_fa=reasons_fa,
            recapture_instruction_fa=instruction_fa,
        )
