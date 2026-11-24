# GENERATED FROM packages/contracts-openapi/openapi.yaml — DO NOT EDIT BY HAND
from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class BinaContractModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

class EyeLaterality(StrEnum):
    OD = "OD"
    OS = "OS"


class StudyLaterality(StrEnum):
    OD = "OD"
    OS = "OS"
    OU = "OU"


class AccessMode(StrEnum):
    APP = "app"
    CAREGIVER = "caregiver"
    PRINT_PHONE = "print_phone"


class StaffRole(StrEnum):
    OPHTHALMOLOGIST = "ophthalmologist"
    OPTOMETRIST = "optometrist"
    TECHNICIAN = "technician"
    COORDINATOR = "coordinator"
    ADMIN = "admin"


class UrgencyTier(StrEnum):
    ROUTINE = "routine"
    FOLLOWUP_3_6M = "followup_3_6m"
    URGENT = "urgent"


class SeverityGrade(StrEnum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    URGENT = "urgent"


class DiagnosticModality(StrEnum):
    FUNDUS = "fundus"
    OCT = "oct"
    OCTA = "octa"
    SLIT_LAMP = "slit_lamp"
    TOPOGRAPHY = "topography"
    VISUAL_FIELD = "visual_field"
    TABULAR_LABS = "tabular_labs"
    UNKNOWN = "unknown"


class AdherenceState(StrEnum):
    TAKEN = "taken"
    MISSED_WITH_REASON = "missed_with_reason"
    UNAVAILABLE = "unavailable"
    NO_RESPONSE = "no_response"


class StudyStatus(StrEnum):
    INGESTED = "ingested"
    QC_FAILED = "qc_failed"
    QUEUED = "queued"
    ANALYZED = "analyzed"
    PENDING_HITL = "pending_hitl"
    SIGNED_OFF = "signed_off"


class SignoffAction(StrEnum):
    APPROVED = "approved"
    EDITED_APPROVED = "edited_approved"
    REJECTED = "rejected"


class QcRejectionCode(StrEnum):
    BLUR = "blur"
    LIGHTING = "lighting"
    WRONG_EYE = "wrong_eye"
    MODALITY_MISMATCH = "modality_mismatch"


class AiEngineMode(StrEnum):
    CPU_STUB = "cpu_stub"
    ONNX_CPU = "onnx_cpu"
    GPU_FULL = "gpu_full"


class HealthStatus(BinaContractModel):
    status: str
    service: str
    locale: str
    calendar: str
    jurisdiction: str
    aiEngineMode: AiEngineMode
    llmProvider: str
    llmModel: str
    llmConfigured: bool
    timestamp: str


class ClinicProfile(BinaContractModel):
    clinicId: str
    tenantId: str
    nameFa: str
    locale: str
    calendarMode: str
    emergencyPhone: str
    staffedHoursFa: str


class StaffSessionRequest(BinaContractModel):
    oidcToken: str
    clinicId: str
    mfaCode: str | None = Field(default=None)


class StaffSessionResponse(BinaContractModel):
    accessToken: str
    role: StaffRole
    mfaVerified: bool
    userId: str
    clinicId: str
    tenantId: str


class PatientOtpRequest(BinaContractModel):
    phoneNumber: str
    clinicId: str


class OtpDispatchResponse(BinaContractModel):
    challengeId: str
    expiresInSeconds: int
    maskedPhone: str


class PatientOtpVerifyRequest(BinaContractModel):
    challengeId: str
    otpCode: str
    consentAccepted: bool
    consentVersion: str


class PatientSessionResponse(BinaContractModel):
    accessToken: str
    patientId: str
    tenantId: str
    locale: str
    calendarMode: str


class CaregiverGrantRequest(BinaContractModel):
    caregiverPhone: str
    relationshipFa: str
    scopes: list[str]


class CaregiverGrant(BinaContractModel):
    grantId: str
    patientId: str
    caregiverPhone: str
    relationshipFa: str
    scopes: list[str]
    active: bool
    createdAt: str


class CreateEpisodeRequest(BinaContractModel):
    patientId: str
    protocolType: str
    eyeLaterality: EyeLaterality
    surgeonId: str
    accessMode: AccessMode
    anchorAt: str


class CareEpisode(BinaContractModel):
    episodeId: str
    tenantId: str
    patientId: str
    protocolType: str
    eyeLaterality: EyeLaterality
    eyeLabelFa: str
    accessMode: AccessMode
    activePrescriptionVersion: int
    status: str
    anchorAt: str


class DropItemInput(BinaContractModel):
    drugNameFa: str
    genericName: str
    bottleCapColorFa: str
    frequencyPerDay: int
    durationDays: int
    instructionsFa: str | None = Field(default=None)


class PublishPrescriptionRequest(BinaContractModel):
    eyeLaterality: EyeLaterality
    items: list[DropItemInput]
    reasonFa: str


class PrescriptionVersion(BinaContractModel):
    prescriptionId: str
    episodeId: str
    version: int
    eyeLaterality: EyeLaterality
    eyeLabelFa: str
    items: list[DropItemInput]
    publishedAt: str


class PatientTodayDropCard(BinaContractModel):
    episodeId: str
    prescriptionVersion: int
    eyeLaterality: EyeLaterality
    eyeLabelFa: str
    drugNameFa: str
    bottleCapColorFa: str
    scheduledTimeJalali: str
    instructionsFa: str
    taken: bool


class PatientTodayResponse(BinaContractModel):
    todayJalali: str
    emergencyHotlinePhone: str
    clinicStaffedHoursFa: str
    scheduleItems: list[PatientTodayDropCard]


class AdherenceEventRequest(BinaContractModel):
    eyeLaterality: EyeLaterality
    prescriptionVersion: int
    state: AdherenceState
    reasonFa: str | None = Field(default=None)
    occurredAt: str


class AdherenceEventResponse(BinaContractModel):
    eventId: str
    episodeId: str
    state: AdherenceState
    deduplicated: bool
    recordedAt: str


class SymptomReportRequest(BinaContractModel):
    eyeLaterality: EyeLaterality
    severePain: bool
    suddenVisionLoss: bool
    purulentDischarge: bool
    freeTextFa: str


class SymptomReportResponse(BinaContractModel):
    reportId: str
    urgencyTier: UrgencyTier
    urgencyLabelFa: str
    triggeredTriageCaseId: str | None
    guidanceFa: str


class TriageCase(BinaContractModel):
    caseId: str
    sourcePillar: str
    patientId: str
    eyeLaterality: StudyLaterality
    eyeLabelFa: str
    status: str
    urgencyTier: UrgencyTier
    urgencyLabelFa: str
    slaDueAt: str
    ownerId: str | None


class TriageCaseListResponse(BinaContractModel):
    items: list[TriageCase]
    total: int


class ClaimTriageCaseRequest(BinaContractModel):
    noteFa: str | None = Field(default=None)


class ShiftHandoffRequest(BinaContractModel):
    targetStaffUserId: str
    handoffNoteFa: str


class ReferralRequest(BinaContractModel):
    destinationHospitalFa: str
    reasonFa: str
    urgent: bool


class ReferralRecord(BinaContractModel):
    referralId: str
    caseId: str
    destinationHospitalFa: str
    status: str
    createdAt: str


class StudyAssetInput(BinaContractModel):
    assetId: str
    s3ObjectKey: str
    declaredModality: DiagnosticModality
    declaredEye: EyeLaterality
    dicomStudyUid: str | None = Field(default=None)
    blurScoreHint: float | None = Field(default=None)
    lightingScoreHint: float | None = Field(default=None)
    detectedEyeHint: str | None = Field(default=None)
    conditionHints: list[str] | None = Field(default=None)


class ClinicalLabsInput(BinaContractModel):
    ageYears: int | None = Field(default=None)
    hba1cPercent: float | None = Field(default=None)
    iopMmHg: float | None = Field(default=None)
    centralCornealThicknessUm: float | None = Field(default=None)
    diabetesDurationYears: int | None = Field(default=None)
    systolicBpMmHg: int | None = Field(default=None)
    kmaxDiopters: float | None = Field(default=None)
    thinnestPachymetryUm: float | None = Field(default=None)
    vfMdDb: float | None = Field(default=None)
    vfMdSlopeDbPerYear: float | None = Field(default=None)
    clinicalNotesFa: str | None = Field(default=None)


class SubmitDiagnosticStudyRequest(BinaContractModel):
    patientId: str
    clinicId: str
    eyeLaterality: StudyLaterality
    assets: list[StudyAssetInput]
    labs: ClinicalLabsInput | None = Field(default=None)


class SubmitDiagnosticStudyResponse(BinaContractModel):
    studyId: str
    jobId: str
    status: StudyStatus
    acceptedAt: str


class ModalityPrediction(BinaContractModel):
    assetId: str
    declaredModality: DiagnosticModality
    detectedModality: DiagnosticModality
    confidence: float
    matchesDeclared: bool


class QcDecision(BinaContractModel):
    assetId: str
    modalityPrediction: ModalityPrediction
    passed: bool
    rejectionCodes: list[QcRejectionCode]
    rejectionReasonsFa: list[str]
    recaptureInstructionFa: str | None = Field(default=None)


class SpecialistOutput(BinaContractModel):
    specialistId: str
    backboneId: str
    eyeLaterality: EyeLaterality
    probabilities: dict[str, float]
    biomarkers: dict[str, float]
    summaryFa: str


class DifferentialItem(BinaContractModel):
    conditionCode: str
    conditionNameFa: str
    confidence: float
    confidenceIntervalLower: float
    confidenceIntervalUpper: float
    severity: SeverityGrade
    supportingModalities: list[DiagnosticModality]


class FusionResult(BinaContractModel):
    eyeLaterality: EyeLaterality
    availableModalities: list[DiagnosticModality]
    missingModalities: list[DiagnosticModality]
    missingModalityNoticeFa: str
    differential: list[DifferentialItem]
    discordanceFlagsFa: list[str]
    recommendedUrgency: UrgencyTier
    recommendedUrgencyLabelFa: str


class SegmentationMaskOverlay(BinaContractModel):
    overlayId: str
    assetId: str
    anatomicalStructureFa: str
    maskS3Key: str
    quantitativeMetricName: str
    quantitativeValue: float
    quantitativeUnit: str
    isPrimaryExplainability: bool


class AuxiliaryGradCamOverlay(BinaContractModel):
    overlayId: str
    assetId: str
    targetConditionCode: str
    heatmapS3Key: str
    isAuxiliaryOnly: bool
    warningFa: str


class ExplainabilityOutput(BinaContractModel):
    primarySegmentationMasks: list[SegmentationMaskOverlay]
    auxiliaryGradCams: list[AuxiliaryGradCamOverlay]


class PersianReportDraft(BinaContractModel):
    modelProvider: str
    modelId: str
    titleFa: str
    modalityFindingsFa: str
    differentialSummaryFa: str
    crossModalCorrelationFa: str
    followUpPlanFa: str
    urgencyTier: UrgencyTier
    urgencyLabelFa: str
    evidenceIds: list[str]
    validationPassed: bool


class ClinicianSignoffRequest(BinaContractModel):
    action: SignoffAction
    finalUrgency: UrgencyTier
    finalReportTextFa: str
    overrideReasonFa: str | None = Field(default=None)


class ClinicianSignoffResponse(BinaContractModel):
    signoffId: str
    studyId: str
    ophthalmologistId: str
    action: SignoffAction
    finalUrgency: UrgencyTier
    finalUrgencyLabelFa: str
    signedAt: str


class DiagnosticStudyDetail(BinaContractModel):
    studyId: str
    patientId: str
    clinicId: str
    eyeLaterality: StudyLaterality
    status: StudyStatus
    qcDecisions: list[QcDecision]
    specialistOutputs: list[SpecialistOutput]
    fusionResult: FusionResult | None = Field(default=None)
    explainability: ExplainabilityOutput | None = Field(default=None)
    persianReportDraft: PersianReportDraft | None = Field(default=None)
    signoff: ClinicianSignoffResponse | None = Field(default=None)


class PatientDiagnosticSummary(BinaContractModel):
    studyId: str
    signedAtJalali: str
    eyeLabelFa: str
    urgencyTier: UrgencyTier
    urgencyLabelFa: str
    patientGuidanceFa: str
    nextStepFa: str


class PatientDiagnosticSummaryList(BinaContractModel):
    items: list[PatientDiagnosticSummary]


class AiEngineQcRequest(BinaContractModel):
    assets: list[StudyAssetInput]


class AiEngineAnalyzeRequest(BinaContractModel):
    studyId: str
    jobId: str
    eyeLaterality: StudyLaterality
    assets: list[StudyAssetInput]
    labs: ClinicalLabsInput | None = Field(default=None)


class AiEngineAnalyzeResponse(BinaContractModel):
    studyId: str
    jobId: str
    engineMode: AiEngineMode
    status: str
    qcDecisions: list[QcDecision]
    specialistOutputs: list[SpecialistOutput]
    fusionResult: FusionResult | None = Field(default=None)
    explainability: ExplainabilityOutput | None = Field(default=None)

