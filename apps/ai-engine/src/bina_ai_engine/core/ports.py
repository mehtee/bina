from __future__ import annotations

from typing import Literal, Protocol

from bina_ai_engine.schemas import (
    ClinicalLabsInput,
    ExplainabilityOutput,
    FusionResult,
    ModalityPrediction,
    QcDecision,
    SpecialistInput,
    SpecialistOutput,
    StudyAssetInput,
)


class ModalityRouterPort(Protocol):
    def detect(self, asset: StudyAssetInput) -> ModalityPrediction: ...


class QualityControlGatePort(Protocol):
    def evaluate(
        self,
        asset: StudyAssetInput,
        modality_prediction: ModalityPrediction,
    ) -> QcDecision: ...


class SpecialistModelPlugin(Protocol):
    plugin_id: str
    supported_modalities: tuple[str, ...]

    def predict(self, payload: SpecialistInput) -> SpecialistOutput: ...


class FusionEnginePort(Protocol):
    def fuse(
        self,
        eye_laterality: Literal["OD", "OS"],
        specialist_outputs: list[SpecialistOutput],
        labs: ClinicalLabsInput | None,
    ) -> FusionResult: ...


class ExplainabilityPort(Protocol):
    def explain(
        self,
        assets: list[StudyAssetInput],
        specialist_outputs: list[SpecialistOutput],
        fusion_result: FusionResult,
    ) -> ExplainabilityOutput: ...
