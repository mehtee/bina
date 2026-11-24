from __future__ import annotations

from bina_ai_engine.schemas import (
    AuxiliaryGradCamOverlay,
    ExplainabilityOutput,
    FusionResult,
    SegmentationMaskOverlay,
    SpecialistOutput,
    StudyAssetInput,
)


class StubExplainabilityGenerator:
    """Layer 4a Visual Explainability: primary pixel segmentation masks + strictly auxiliary Grad-CAM."""

    def explain(
        self,
        assets: list[StudyAssetInput],
        specialist_outputs: list[SpecialistOutput],
        fusion_result: FusionResult,
    ) -> ExplainabilityOutput:
        masks: list[SegmentationMaskOverlay] = []
        gradcams: list[AuxiliaryGradCamOverlay] = []
        out_by_id = {o.specialist_id: o for o in specialist_outputs}

        top_condition = (
            fusion_result.differential[0].condition_code if fusion_result.differential else "within_normal_limits"
        )

        for asset in assets:
            if asset.declared_modality in ("oct", "octa") and "oct" in out_by_id:
                irf_val = out_by_id["oct"].biomarkers.get("irf_volume_nl", 0.0)
                masks.append(
                    SegmentationMaskOverlay(
                        overlay_id=f"mask-{asset.asset_id}-oct",
                        asset_id=asset.asset_id,
                        anatomical_structure_fa="لایه‌های شبکیه (RNFL/RPE) و مایع داخل‌شبکیه‌ای (IRF)",
                        mask_s3_key=f"masks/{asset.asset_id}_oct_seg.png",
                        quantitative_metric_name="irf_volume_nl",
                        quantitative_value=float(irf_val),
                        quantitative_unit="nL",
                    )
                )
            elif asset.declared_modality == "fundus" and "fundus" in out_by_id:
                cd_ratio = out_by_id["fundus"].biomarkers.get("cup_to_disc_ratio", 0.42)
                masks.append(
                    SegmentationMaskOverlay(
                        overlay_id=f"mask-{asset.asset_id}-fundus",
                        asset_id=asset.asset_id,
                        anatomical_structure_fa="حاشیه دیسک بینایی و کاپ (Optic Cup/Disc)",
                        mask_s3_key=f"masks/{asset.asset_id}_cup_disc_seg.png",
                        quantitative_metric_name="cup_to_disc_ratio",
                        quantitative_value=float(cd_ratio),
                        quantitative_unit="ratio",
                    )
                )
            elif asset.declared_modality in ("slit_lamp", "topography") and "anterior" in out_by_id:
                kmax = out_by_id["anterior"].biomarkers.get("kmax_d", 43.8)
                masks.append(
                    SegmentationMaskOverlay(
                        overlay_id=f"mask-{asset.asset_id}-anterior",
                        asset_id=asset.asset_id,
                        anatomical_structure_fa="زون کانونی قرنیه و انفیلتراسیون قدامی",
                        mask_s3_key=f"masks/{asset.asset_id}_cornea_seg.png",
                        quantitative_metric_name="kmax_d",
                        quantitative_value=float(kmax),
                        quantitative_unit="D",
                    )
                )

            if asset.declared_modality in ("fundus", "oct", "octa", "slit_lamp", "topography"):
                gradcams.append(
                    AuxiliaryGradCamOverlay(
                        overlay_id=f"gradcam-{asset.asset_id}",
                        asset_id=asset.asset_id,
                        target_condition_code=top_condition,
                        heatmap_s3_key=f"gradcam/{asset.asset_id}_aux_heatmap.png",
                    )
                )

        return ExplainabilityOutput(
            primary_segmentation_masks=masks,
            auxiliary_grad_cams=gradcams,
        )
