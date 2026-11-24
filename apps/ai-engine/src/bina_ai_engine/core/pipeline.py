from __future__ import annotations

from bina_ai_engine.config import AiEngineSettings, load_settings
from bina_ai_engine.core.registry import PluginRegistry
from bina_ai_engine.layer1_router_qc.stub import StubModalityRouter, StubQualityControlGate
from bina_ai_engine.layer2_specialists import (
    StubAnteriorSpecialist,
    StubFundusSpecialist,
    StubOctSpecialist,
    StubTabularXgbSpecialist,
    StubVisualFieldSpecialist,
)
from bina_ai_engine.layer3_fusion.stub import StubMaskedFusionEngine
from bina_ai_engine.layer4_explainability.stub import StubExplainabilityGenerator
from bina_ai_engine.schemas import (
    AnalyzeStudyRequest,
    AnalyzeStudyResponse,
    EyeLaterality,
    QcBatchResponse,
    QcDecision,
    SpecialistInput,
    SpecialistOutput,
    StudyAssetInput,
)


class MultimodalDiagnosticPipeline:
    """Executes Layers 1 -> 4a with hard Layer-1 QC block."""

    def __init__(self, settings: AiEngineSettings, registry: PluginRegistry) -> None:
        self._settings = settings
        self._registry = registry

    @property
    def registry(self) -> PluginRegistry:
        return self._registry

    @property
    def settings(self) -> AiEngineSettings:
        return self._settings

    def run_qc(self, assets: list[StudyAssetInput]) -> QcBatchResponse:
        decisions: list[QcDecision] = []
        for asset in assets:
            modality_pred = self._registry.router.detect(asset)
            decisions.append(self._registry.qc_gate.evaluate(asset, modality_pred))
        return QcBatchResponse(
            passed=all(d.passed for d in decisions),
            qc_decisions=decisions,
        )

    def analyze(self, request: AnalyzeStudyRequest) -> AnalyzeStudyResponse:
        qc_batch = self.run_qc(request.assets)
        if not qc_batch.passed:
            # Strict REQ-AI-L1-004 enforcement: blocked from entering Layer 2
            return AnalyzeStudyResponse(
                study_id=request.study_id,
                job_id=request.job_id,
                engine_mode=self._settings.AI_ENGINE_MODE,
                status="qc_failed",
                qc_decisions=qc_batch.qc_decisions,
                specialist_outputs=[],
                fusion_result=None,
                explainability=None,
            )

        eyes_to_run: list[EyeLaterality] = (
            ["OD", "OS"] if request.eye_laterality == "OU" else [request.eye_laterality]
        )

        specialist_outputs: list[SpecialistOutput] = []
        backbone_override = (
            self._settings.FOUNDATION_BACKBONE
            if self._settings.ALLOW_RESEARCH_BACKBONE
            else "dinov2_apache2"
        )

        for eye in eyes_to_run:
            eye_assets = [a for a in request.assets if a.declared_eye == eye]
            if not eye_assets and request.labs is None:
                continue
            for plugin in self._registry.specialists.values():
                matching_assets = [
                    a for a in eye_assets if a.declared_modality in plugin.supported_modalities
                ]
                should_run_tabular = plugin.plugin_id == "tabular_xgb" and (
                    request.labs is not None or len(matching_assets) > 0
                )
                if matching_assets or should_run_tabular:
                    specialist_outputs.append(
                        plugin.predict(
                            SpecialistInput(
                                study_id=request.study_id,
                                eye_laterality=eye,
                                assets=matching_assets,
                                labs=request.labs,
                                backbone_override=backbone_override if plugin.plugin_id == "fundus" else None,
                            )
                        )
                    )

        primary_eye: EyeLaterality = "OD" if request.eye_laterality == "OU" else request.eye_laterality
        primary_outputs = [o for o in specialist_outputs if o.eye_laterality == primary_eye]
        if not primary_outputs:
            primary_outputs = specialist_outputs
            if primary_outputs:
                primary_eye = primary_outputs[0].eye_laterality

        fusion_result = self._registry.fusion_engine.fuse(
            eye_laterality=primary_eye,
            specialist_outputs=primary_outputs,
            labs=request.labs,
        )
        explainability = self._registry.explainability.explain(
            assets=request.assets,
            specialist_outputs=specialist_outputs,
            fusion_result=fusion_result,
        )

        return AnalyzeStudyResponse(
            study_id=request.study_id,
            job_id=request.job_id,
            engine_mode=self._settings.AI_ENGINE_MODE,
            status="analyzed",
            qc_decisions=qc_batch.qc_decisions,
            specialist_outputs=specialist_outputs,
            fusion_result=fusion_result,
            explainability=explainability,
        )


def build_default_pipeline(settings: AiEngineSettings | None = None) -> MultimodalDiagnosticPipeline:
    resolved = settings or load_settings()
    if resolved.AI_ENGINE_MODE in ("onnx_cpu", "gpu_full"):
        from bina_ai_engine.onnx_runtime import (
            OnnxAnteriorSpecialist,
            OnnxFundusSpecialist,
            OnnxMaskedFusionEngine,
            OnnxModalityRouter,
            OnnxOctSpecialist,
            OnnxQualityControlGate,
            OnnxSessionHolder,
            OnnxTabularXgbSpecialist,
            OnnxVisualFieldSpecialist,
        )

        holder = OnnxSessionHolder(artifacts_dir=resolved.AI_ARTIFACTS_DIR)
        registry = PluginRegistry(
            router=OnnxModalityRouter(holder),
            qc_gate=OnnxQualityControlGate(holder),
            fusion_engine=OnnxMaskedFusionEngine(holder),
            explainability=StubExplainabilityGenerator(),
        )
        registry.register_specialist(OnnxFundusSpecialist(holder, backbone_id=resolved.FOUNDATION_BACKBONE))
        registry.register_specialist(OnnxOctSpecialist(holder))
        registry.register_specialist(OnnxAnteriorSpecialist(holder))
        registry.register_specialist(OnnxVisualFieldSpecialist(holder))
        registry.register_specialist(OnnxTabularXgbSpecialist(holder))
        return MultimodalDiagnosticPipeline(settings=resolved, registry=registry)

    registry = PluginRegistry(
        router=StubModalityRouter(),
        qc_gate=StubQualityControlGate(),
        fusion_engine=StubMaskedFusionEngine(),
        explainability=StubExplainabilityGenerator(),
    )
    registry.register_specialist(StubFundusSpecialist(backbone_id=resolved.FOUNDATION_BACKBONE))
    registry.register_specialist(StubOctSpecialist())
    registry.register_specialist(StubAnteriorSpecialist())
    registry.register_specialist(StubVisualFieldSpecialist())
    registry.register_specialist(StubTabularXgbSpecialist())
    return MultimodalDiagnosticPipeline(settings=resolved, registry=registry)
