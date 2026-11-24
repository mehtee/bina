from __future__ import annotations

from fastapi import FastAPI

from bina_ai_engine.config import AiEngineSettings
from bina_ai_engine.core.pipeline import MultimodalDiagnosticPipeline, build_default_pipeline
from bina_ai_engine.onnx_runtime import OnnxHomeRiskR2, OnnxPersianNlpTriage, OnnxSessionHolder
from bina_ai_engine.schemas import (
    AnalyzeStudyRequest,
    AnalyzeStudyResponse,
    HealthResponse,
    HomeRiskR2Request,
    HomeRiskR2Response,
    PersianSymptomTriageRequest,
    PersianSymptomTriageResponse,
    QcBatchResponse,
    QcRequest,
)


def create_app(settings: AiEngineSettings | None = None) -> FastAPI:
    pipeline: MultimodalDiagnosticPipeline = build_default_pipeline(settings)
    holder = OnnxSessionHolder(artifacts_dir=pipeline.settings.AI_ARTIFACTS_DIR)
    nlp_triage = OnnxPersianNlpTriage(holder)
    home_risk = OnnxHomeRiskR2(holder)
    app = FastAPI(title="Bina AI Engine", version="0.1.0")

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(
            engine_mode=pipeline.settings.AI_ENGINE_MODE,
            foundation_backbone=pipeline.settings.FOUNDATION_BACKBONE,
            registered_specialists=pipeline.registry.specialist_ids(),
        )

    @app.post("/v1/qc", response_model=QcBatchResponse)
    def run_qc(payload: QcRequest) -> QcBatchResponse:
        return pipeline.run_qc(payload.assets)

    @app.post("/v1/analyze-study", response_model=AnalyzeStudyResponse)
    def analyze_study(payload: AnalyzeStudyRequest) -> AnalyzeStudyResponse:
        return pipeline.analyze(payload)

    @app.post("/v1/nlp/symptom-triage", response_model=PersianSymptomTriageResponse)
    def symptom_triage(payload: PersianSymptomTriageRequest) -> PersianSymptomTriageResponse:
        return nlp_triage.evaluate(payload.text_fa)

    @app.post("/v1/r2/home-risk", response_model=HomeRiskR2Response)
    def r2_home_risk(payload: HomeRiskR2Request) -> HomeRiskR2Response:
        return home_risk.evaluate(payload)

    return app


app = create_app()
