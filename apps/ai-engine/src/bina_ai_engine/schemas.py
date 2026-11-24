from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(snake: str) -> str:
    parts = snake.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class BinaEngineModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="ignore",
    )


EyeLaterality = Literal["OD", "OS"]
StudyLaterality = Literal["OD", "OS", "OU"]
DiagnosticModality = Literal[
    "fundus",
    "oct",
    "octa",
    "slit_lamp",
    "topography",
    "visual_field",
    "tabular_labs",
    "unknown",
]
SpecialistId = Literal["fundus", "oct", "anterior", "visual_field", "tabular_xgb"]
UrgencyTier = Literal["routine", "followup_3_6m", "urgent"]
SeverityGrade = Literal["mild", "moderate", "severe", "urgent"]
QcRejectionCode = Literal["blur", "lighting", "wrong_eye", "modality_mismatch"]
AiEngineMode = Literal["cpu_stub", "onnx_cpu", "gpu_full"]


class StudyAssetInput(BinaEngineModel):
    asset_id: str
    s3_object_key: str
    declared_modality: DiagnosticModality
    declared_eye: EyeLaterality
    dicom_study_uid: str | None = None
    blur_score_hint: float | None = None
    lighting_score_hint: float | None = None
    detected_eye_hint: str | None = None
    condition_hints: list[str] = Field(default_factory=list)
    raw_metrics: dict[str, Any] = Field(default_factory=dict)


class ClinicalLabsInput(BinaEngineModel):
    age_years: int | None = None
    hba1c_percent: float | None = None
    iop_mm_hg: float | None = None
    central_corneal_thickness_um: float | None = None
    diabetes_duration_years: int | None = None
    systolic_bp_mm_hg: int | None = None
    kmax_diopters: float | None = None
    thinnest_pachymetry_um: float | None = None
    vf_md_db: float | None = None
    vf_md_slope_db_per_year: float | None = None
    clinical_notes_fa: str | None = None


class QcRequest(BinaEngineModel):
    assets: list[StudyAssetInput]


class ModalityPrediction(BinaEngineModel):
    asset_id: str
    declared_modality: DiagnosticModality
    detected_modality: DiagnosticModality
    confidence: float
    matches_declared: bool


class QcDecision(BinaEngineModel):
    asset_id: str
    modality_prediction: ModalityPrediction
    passed: bool
    rejection_codes: list[QcRejectionCode] = Field(default_factory=list)
    rejection_reasons_fa: list[str] = Field(default_factory=list)
    recapture_instruction_fa: str | None = None


class QcBatchResponse(BinaEngineModel):
    passed: bool
    qc_decisions: list[QcDecision]


class AnalyzeStudyRequest(BinaEngineModel):
    study_id: str
    job_id: str
    eye_laterality: StudyLaterality
    assets: list[StudyAssetInput]
    labs: ClinicalLabsInput | None = None


class SpecialistInput(BinaEngineModel):
    study_id: str
    eye_laterality: EyeLaterality
    assets: list[StudyAssetInput] = Field(default_factory=list)
    labs: ClinicalLabsInput | None = None
    backbone_override: str | None = None


class SpecialistOutput(BinaEngineModel):
    specialist_id: SpecialistId
    backbone_id: str
    eye_laterality: EyeLaterality
    probabilities: dict[str, float]
    biomarkers: dict[str, float]
    summary_fa: str


class DifferentialItem(BinaEngineModel):
    condition_code: str
    condition_name_fa: str
    confidence: float
    confidence_interval_lower: float
    confidence_interval_upper: float
    severity: SeverityGrade
    supporting_modalities: list[DiagnosticModality]


class FusionResult(BinaEngineModel):
    eye_laterality: EyeLaterality
    available_modalities: list[DiagnosticModality]
    missing_modalities: list[DiagnosticModality]
    missing_modality_notice_fa: str
    differential: list[DifferentialItem]
    discordance_flags_fa: list[str]
    recommended_urgency: UrgencyTier
    recommended_urgency_label_fa: str


class SegmentationMaskOverlay(BinaEngineModel):
    overlay_id: str
    asset_id: str
    anatomical_structure_fa: str
    mask_s3_key: str
    quantitative_metric_name: str
    quantitative_value: float
    quantitative_unit: str
    is_primary_explainability: Literal[True] = True


class AuxiliaryGradCamOverlay(BinaEngineModel):
    overlay_id: str
    asset_id: str
    target_condition_code: str
    heatmap_s3_key: str
    is_auxiliary_only: Literal[True] = True
    warning_fa: str = "راهنمای توجه مدل — غیرقابل استفاده به‌جای سگمنتیشن دقیق"


class ExplainabilityOutput(BinaEngineModel):
    primary_segmentation_masks: list[SegmentationMaskOverlay]
    auxiliary_grad_cams: list[AuxiliaryGradCamOverlay]


class AnalyzeStudyResponse(BinaEngineModel):
    study_id: str
    job_id: str
    engine_mode: AiEngineMode
    status: Literal["qc_failed", "analyzed"]
    qc_decisions: list[QcDecision]
    specialist_outputs: list[SpecialistOutput]
    fusion_result: FusionResult | None = None
    explainability: ExplainabilityOutput | None = None


class HealthResponse(BinaEngineModel):
    status: Literal["ok"] = "ok"
    service: str = "bina-ai-engine"
    engine_mode: AiEngineMode
    foundation_backbone: str
    registered_specialists: list[SpecialistId]


class PersianSymptomTriageRequest(BinaEngineModel):
    text_fa: str


class PersianSymptomTriageResponse(BinaEngineModel):
    risk_class: Literal["routine", "moderate", "red_flag"]
    urgency_tier: UrgencyTier
    red_flag_probability: float
    model_used: str


class HomeRiskR2Request(BinaEngineModel):
    va_delta_logmar: float
    amsler_distortion_score: float
    adherence_7d_ratio: float
    iop_mmhg: float
    days_since_surgery: float
    consecutive_worsening_count: int


class HomeRiskR2Response(BinaEngineModel):
    risk_score: float
    high_risk: bool
    model_used: str
