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
    todayJalali: str | None = Field(default=None)
    currentlyStaffed: bool | None = Field(default=None)


class StaffStepUpRequest(BinaContractModel):
    stepUpCode: str


class StaffStepUpResponse(BinaContractModel):
    accessToken: str
    stepUpVerified: bool


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
    tenantId: str | None = Field(default=None)


class OtpDispatchResponse(BinaContractModel):
    challengeId: str
    expiresInSeconds: int
    maskedPhone: str


class PatientOtpVerifyRequest(BinaContractModel):
    challengeId: str
    otpCode: str
    consentAccepted: bool
    consentVersion: str
    phoneNumber: str
    tenantId: str | None = Field(default=None)


class PatientSessionResponse(BinaContractModel):
    accessToken: str
    patientId: str
    tenantId: str
    clinicId: str | None = Field(default=None)
    locale: str
    calendarMode: str


class CaregiverOtpVerifyRequest(BinaContractModel):
    challengeId: str
    otpCode: str
    tenantId: str | None = Field(default=None)
    patientId: str | None = Field(default=None)


class CaregiverPatientLink(BinaContractModel):
    grantId: str
    patientId: str
    patientNameFa: str
    relationshipFa: str
    scopes: list[str]
    clinicId: str
    active: bool
    createdAt: str


class CaregiverSessionResponse(BinaContractModel):
    accessToken: str
    grantId: str
    patientId: str
    tenantId: str
    clinicId: str
    locale: str
    calendarMode: str
    patients: list[CaregiverPatientLink]


class CaregiverPatientListResponse(BinaContractModel):
    items: list[CaregiverPatientLink]


class CaregiverGrantListResponse(BinaContractModel):
    items: list[CaregiverGrant]


class ConsentRecord(BinaContractModel):
    consentId: str
    consentVersion: str
    locale: str
    acceptedAt: str


class PatientProfileResponse(BinaContractModel):
    patientId: str
    tenantId: str
    clinicId: str
    fullNameFa: str
    phoneMasked: str
    preferredLocale: str
    accessMode: AccessMode
    consents: list[ConsentRecord]


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


class PatientEpisodeWithPrescription(BinaContractModel):
    episode: CareEpisode
    activePrescription: PrescriptionVersion | None = Field(default=None)


class PatientEpisodeListResponse(BinaContractModel):
    items: list[PatientEpisodeWithPrescription]


class AdherenceEventListResponse(BinaContractModel):
    items: list[AdherenceEventResponse]


class SymptomReportRequest(BinaContractModel):
    eyeLaterality: EyeLaterality
    severePain: bool
    suddenVisionLoss: bool
    purulentDischarge: bool
    flashesOrCurtain: bool | None = Field(default=None)
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
    draftVersion: int | None = Field(default=None)
    editedByUserId: str | None = Field(default=None)
    updatedAtIso: str | None = Field(default=None)


class ClinicianSignoffRequest(BinaContractModel):
    action: SignoffAction
    finalUrgency: UrgencyTier
    finalReportTextFa: str
    overrideReasonFa: str | None = Field(default=None)
    expectedDraftVersion: int | None = Field(default=None)


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
    urgentFloorActive: bool | None = Field(default=None)
    urgentFloorRuleCodes: list[str] | None = Field(default=None)
    createdAtIso: str | None = Field(default=None)
    updatedAtIso: str | None = Field(default=None)
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


class CalibrationProfileRequest(BinaContractModel):
    patientId: str
    clinicId: str | None = Field(default=None)
    deviceFingerprintSha256: str
    screenWidthMm: float
    viewingDistanceCm: float
    calibratedBy: str
    verified: bool | None = Field(default=None)


class CalibrationProfileResponse(BinaContractModel):
    calibrationProfileId: str
    patientId: str
    screenWidthMm: float
    viewingDistanceCm: float
    calibratedBy: str
    verified: bool
    createdAt: str


class HomeVisionTestRequest(BinaContractModel):
    patientId: str | None = Field(default=None)
    calibrationProfileId: str | None = Field(default=None)
    eyeLaterality: EyeLaterality
    testType: str
    vaLogmar: float | None = Field(default=None)
    amslerDistortionScore: float | None = Field(default=None)
    amslerCentralScotoma: bool | None = Field(default=None)
    viewingDistanceCm: float
    ambientLux: float
    deviceTiltDeg: float
    glareDetected: bool | None = Field(default=None)
    deviceModelCode: str | None = Field(default=None)
    rawTrials: list[HomeVisionTestTrialInput] | None = Field(default=None)


class HomeVisionTestResponse(BinaContractModel):
    testId: str
    eyeLaterality: EyeLaterality
    eyeLabelFa: str
    testType: str
    qualityPassed: bool
    qualityIssuesFa: list[str]
    triggeredTriageCaseId: str | None = Field(default=None)
    guidanceFa: str


class VisionTrendPoint(BinaContractModel):
    testId: str
    testType: str
    eyeLaterality: EyeLaterality
    vaLogmar: float | None = Field(default=None)
    amslerDistortionScore: float | None = Field(default=None)
    recordedAt: str


class PatientVisionTrendsResponse(BinaContractModel):
    patientId: str
    od: list[VisionTrendPoint]
    os: list[VisionTrendPoint]


class IcareHome2ReadingRequest(BinaContractModel):
    patientId: str | None = Field(default=None)
    deviceSerial: str
    eyeLaterality: EyeLaterality
    iopMmHg: float
    qualityScore: float
    measuredAtIso: str


class IcareHome2ReadingResponse(BinaContractModel):
    readingId: str
    accepted: bool
    alertTier: UrgencyTier
    summaryFa: str


class ReportSectionInput(BinaContractModel):
    headingFa: str
    linesFa: list[str]


class CreateReportRequest(BinaContractModel):
    reportType: str
    patientId: str
    sourceRefId: str
    titleFa: str
    sections: list[ReportSectionInput]


class CreateReportResponse(BinaContractModel):
    reportId: str
    reportType: str
    sourceSha256: str
    pdfSha256: str


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


class AuthorizedClinicMembership(BinaContractModel):
    membershipId: str
    tenantId: str
    clinicId: str
    clinicNameFa: str
    role: StaffRole
    emergencyPhone: str
    calendarMode: str


class AuthorizedClinicListResponse(BinaContractModel):
    items: list[AuthorizedClinicMembership]


class FeatureFlagRecord(BinaContractModel):
    flagKey: str
    labelFa: str
    descriptionFa: str
    enabled: bool
    config: dict[str, Any]
    updatedAtIso: str | None = Field(default=None)


class FeatureFlagListResponse(BinaContractModel):
    items: list[FeatureFlagRecord]


class ClinicFeatureFlagRecord(BinaContractModel):
    id: str
    tenantId: str
    clinicId: str
    flagKey: str
    enabled: bool
    config: dict[str, Any]
    updatedByUserId: str
    updatedAtIso: str


class UpsertFeatureFlagRequest(BinaContractModel):
    flagKey: str
    enabled: bool
    config: dict[str, Any] | None = Field(default=None)


class StaffMeResponse(BinaContractModel):
    userId: str
    tenantId: str
    clinicId: str
    role: StaffRole
    mfaVerified: bool
    stepUpVerified: bool
    capabilities: dict[str, bool]
    clinic: ClinicProfile | None = Field(default=None)
    authorizedClinics: list[AuthorizedClinicMembership]
    featureFlags: list[FeatureFlagRecord]


class OverviewDashboardResponse(BinaContractModel):
    todayJalali: str
    activeEpisodesOd: int
    activeEpisodesOs: int
    printPhoneCohortCount: int
    urgentTriageCount: int
    overdueSlaCount: int
    openTriageCount: int
    pendingHitlStudies: int
    qcFailedStudies: int
    r2AlertCount: int
    activeOutagesCount: int
    queueUrgentItems: list[dict[str, Any]]
    pendingHitlItems: list[dict[str, Any]]


class WorkspaceSearchResponse(BinaContractModel):
    query: str
    patients: list[dict[str, Any]]
    studies: list[dict[str, Any]]
    episodes: list[dict[str, Any]]
    reports: list[dict[str, Any]]


class RecentActivityItem(BinaContractModel):
    activityId: str
    action: str
    actorRole: str
    resourceType: str
    resourceId: str
    breakGlass: bool
    reasonFa: str | None = Field(default=None)
    occurredAtIso: str
    occurredAtJalali: str


class RecentActivityListResponse(BinaContractModel):
    items: list[RecentActivityItem]


class PatientListItem(BinaContractModel):
    patientId: str
    clinicId: str
    fullNameFa: str
    phoneMasked: str
    nationalIdMasked: str | None = Field(default=None)
    accessMode: AccessMode
    preferredLocale: str
    activeEpisodeCount: int
    openTriageCount: int
    createdAtIso: str


class PatientListResponse(BinaContractModel):
    items: list[PatientListItem]
    total: int


class StaffEnrollPatientRequest(BinaContractModel):
    fullNameFa: str
    phoneNumber: str
    accessMode: AccessMode
    nationalIdMasked: str | None = Field(default=None)
    birthYearJalali: int | None = Field(default=None)
    notesFa: str | None = Field(default=None)
    consentVersion: str | None = Field(default=None)
    mlTrainingConsentFlag: bool | None = Field(default=None)


class StaffEnrolledPatientResponse(BinaContractModel):
    patientId: str
    tenantId: str
    clinicId: str
    fullNameFa: str
    phoneMasked: str
    nationalIdMasked: str | None = Field(default=None)
    birthYearJalali: int | None = Field(default=None)
    notesFa: str | None = Field(default=None)
    accessMode: AccessMode
    preferredLocale: str
    mlTrainingConsentFlag: bool
    consents: list[ConsentRecord]


class Patient360Response(BinaContractModel):
    patient: dict[str, Any]
    odEpisodes: list[dict[str, Any]]
    osEpisodes: list[dict[str, Any]]
    recentStudies: list[dict[str, Any]]
    r2Summary: dict[str, Any]
    openTriageCases: list[dict[str, Any]]
    pendingFollowUpTasks: list[dict[str, Any]]
    clinicalHistories: list[dict[str, Any]]
    consents: list[dict[str, Any]]


class PatientClinicalHistoryItem(BinaContractModel):
    historyId: str
    tenantId: str
    clinicId: str
    patientId: str
    recordedByUserId: str
    summaryFa: str
    conditions: list[str]
    allergies: list[str]
    medications: list[str]
    riskFactors: dict[str, Any]
    labs: dict[str, Any]
    createdAtIso: str


class PatientClinicalHistoryListResponse(BinaContractModel):
    items: list[PatientClinicalHistoryItem]


class AddClinicalHistoryRequest(BinaContractModel):
    summaryFa: str
    conditions: list[str] | None = Field(default=None)
    allergies: list[str] | None = Field(default=None)
    medications: list[str] | None = Field(default=None)
    riskFactors: dict[str, Any] | None = Field(default=None)
    labs: dict[str, Any] | None = Field(default=None)


class PatientTimelineEvent(BinaContractModel):
    category: str
    refId: str
    eyeLaterality: StudyLaterality | None = Field(default=None)
    eyeLabelFa: str | None = Field(default=None)
    titleFa: str
    summaryFa: str
    occurredAtIso: str
    occurredAtJalali: str


class PatientTimelineResponse(BinaContractModel):
    items: list[PatientTimelineEvent]


class UpdatePatientConsentRequest(BinaContractModel):
    consentVersion: str
    action: str
    mlTrainingConsentFlag: bool | None = Field(default=None)
    noteFa: str | None = Field(default=None)


class CareEpisodeWorklistItem(BinaContractModel):
    episodeId: str
    clinicId: str
    patientId: str
    patientNameFa: str
    phoneMasked: str
    protocolType: str
    eyeLaterality: EyeLaterality
    eyeLabelFa: str
    surgeonId: str
    accessMode: AccessMode
    activePrescriptionVersion: int
    status: str
    anchorAtIso: str
    anchorAtJalali: str


class CareEpisodeWorklistResponse(BinaContractModel):
    items: list[CareEpisodeWorklistItem]
    total: int


class CloseEpisodeRequest(BinaContractModel):
    status: str | None = Field(default=None)
    reasonFa: str


class PrescriptionHistoryListResponse(BinaContractModel):
    items: list[PrescriptionVersion]


class EpisodeSymptomHistoryItem(BinaContractModel):
    reportId: str
    episodeId: str
    eyeLaterality: EyeLaterality
    eyeLabelFa: str
    severePain: bool
    suddenVisionLoss: bool
    purulentDischarge: bool
    flashesOrCurtain: bool
    freeTextFa: str
    urgencyTier: UrgencyTier
    urgencyLabelFa: str
    signals: list[dict[str, Any]] | None = Field(default=None)
    createdAtIso: str
    createdAtJalali: str


class EpisodeSymptomListResponse(BinaContractModel):
    items: list[EpisodeSymptomHistoryItem]


class PrintPhoneQueueItem(BinaContractModel):
    episodeId: str
    patientId: str
    patientNameFa: str
    phoneMasked: str
    eyeLaterality: EyeLaterality
    eyeLabelFa: str
    activePrescriptionVersion: int
    pendingTaskCount: int
    lastOutreachAtIso: str | None = Field(default=None)
    lastOutreachOutcomeFa: str | None = Field(default=None)


class PrintPhoneQueueResponse(BinaContractModel):
    items: list[PrintPhoneQueueItem]
    total: int


class PrintPhoneOutreachRequest(BinaContractModel):
    status: str | None = Field(default=None)
    outcomeFa: str


class PrintPhoneOutreachRecord(BinaContractModel):
    taskId: str
    episodeId: str
    patientId: str
    status: str
    outcomeFa: str
    recordedAtIso: str


class TriageCaseDetailResponse(BinaContractModel):
    triageCase: TriageCase
    triggers: list[dict[str, Any]]
    contactLogs: list[dict[str, Any]]
    referrals: list[ReferralRecord]
    followUpTasks: list[FollowUpTaskRecord]


class TriageContactRequest(BinaContractModel):
    outcome: str
    channel: str | None = Field(default=None)
    noteFa: str


class CloseTriageCaseRequest(BinaContractModel):
    resolutionNoteFa: str
    resolutionType: str | None = Field(default=None)


class ClinicOutageRecord(BinaContractModel):
    outageId: str
    tenantId: str
    clinicId: str
    titleFa: str
    status: str
    severity: str
    affectedChannel: str
    mitigationNoteFa: str
    startedAtIso: str
    resolvedAtIso: str | None = Field(default=None)
    createdByUserId: str
    createdAtIso: str


class ClinicOutageListResponse(BinaContractModel):
    items: list[ClinicOutageRecord]


class CreateClinicOutageRequest(BinaContractModel):
    titleFa: str
    severity: str | None = Field(default=None)
    affectedChannel: str
    mitigationNoteFa: str | None = Field(default=None)


class UpdateClinicOutageRequest(BinaContractModel):
    status: str | None = Field(default=None)
    severity: str | None = Field(default=None)
    mitigationNoteFa: str | None = Field(default=None)


class ReferralListResponse(BinaContractModel):
    items: list[ReferralRecord]
    total: int


class UpdateReferralOutcomeRequest(BinaContractModel):
    status: str
    missReasonFa: str | None = Field(default=None)


class FollowUpTaskRecord(BinaContractModel):
    taskId: str
    tenantId: str
    clinicId: str
    patientId: str
    patientNameFa: str | None = Field(default=None)
    episodeId: str | None = Field(default=None)
    triageCaseId: str | None = Field(default=None)
    eyeLaterality: StudyLaterality | None = Field(default=None)
    eyeLabelFa: str | None = Field(default=None)
    taskType: str
    dueAtIso: str
    dueAtJalali: str
    status: str
    assignedUserId: str | None = Field(default=None)
    outcomeFa: str | None = Field(default=None)
    completedAtIso: str | None = Field(default=None)
    createdAtIso: str
    updatedAtIso: str


class FollowUpTaskListResponse(BinaContractModel):
    items: list[FollowUpTaskRecord]
    total: int


class CreateFollowUpTaskRequest(BinaContractModel):
    patientId: str
    episodeId: str | None = Field(default=None)
    triageCaseId: str | None = Field(default=None)
    eyeLaterality: StudyLaterality | None = Field(default=None)
    taskType: str
    dueAt: str
    assignedUserId: str | None = Field(default=None)
    outcomeFa: str | None = Field(default=None)


class UpdateFollowUpTaskRequest(BinaContractModel):
    status: str | None = Field(default=None)
    assignedUserId: str | None = Field(default=None)
    outcomeFa: str | None = Field(default=None)


class DiagnosticStudyWorklistItem(BinaContractModel):
    studyId: str
    patientId: str
    patientNameFa: str
    clinicId: str
    eyeLaterality: StudyLaterality
    eyeLabelFa: str
    status: StudyStatus
    urgencyTier: UrgencyTier | None = Field(default=None)
    urgencyLabelFa: str | None = Field(default=None)
    urgentFloorActive: bool
    modalities: list[str]
    topConditionNameFa: str | None = Field(default=None)
    createdAtIso: str
    createdAtJalali: str
    signedAtIso: str | None = Field(default=None)


class DiagnosticStudyWorklistResponse(BinaContractModel):
    items: list[DiagnosticStudyWorklistItem]
    total: int


class AddRecaptureAssetsRequest(BinaContractModel):
    assets: list[StudyAssetInput]


class StudyInferenceJobRecord(BinaContractModel):
    jobId: str
    studyId: str
    engineMode: str
    modelVersions: dict[str, Any]
    status: str
    startedAtIso: str | None = Field(default=None)
    completedAtIso: str | None = Field(default=None)
    errorCode: str | None = Field(default=None)
    createdAtIso: str


class StudyInferenceJobListResponse(BinaContractModel):
    items: list[StudyInferenceJobRecord]


class SaveReportDraftRequest(BinaContractModel):
    expectedDraftVersion: int
    titleFa: str
    modalityFindingsFa: str
    differentialSummaryFa: str
    crossModalCorrelationFa: str
    followUpPlanFa: str
    urgencyTier: UrgencyTier
    evidenceIds: list[str] | None = Field(default=None)


class ClinicianFeedbackRecord(BinaContractModel):
    feedbackId: str
    studyId: str
    clinicianUserId: str
    targetLayer: str
    agreementState: str
    correctedLabelCode: str | None = Field(default=None)
    noteFa: str
    createdAtIso: str


class ClinicianFeedbackListResponse(BinaContractModel):
    items: list[ClinicianFeedbackRecord]


class CreateClinicianFeedbackRequest(BinaContractModel):
    targetLayer: str
    agreementState: str
    correctedLabelCode: str | None = Field(default=None)
    noteFa: str | None = Field(default=None)


class BiomarkerDelta(BinaContractModel):
    metricKey: str
    currentValue: float
    priorValue: float
    delta: float


class StudyComparisonResponse(BinaContractModel):
    currentStudy: DiagnosticStudyDetail
    priorStudies: list[DiagnosticStudyDetail]
    biomarkerDeltas: list[BiomarkerDelta]


class FhirBundleResponse(BinaContractModel):
    resourceType: str
    id: str
    type: str
    timestamp: str
    entry: list[dict[str, Any]]


class DicomRawTags(BinaContractModel):
    patientName: str | None = Field(default=None)
    patientId: str | None = Field(default=None)
    patientBirthDate: str | None = Field(default=None)
    patientTelephone: str | None = Field(default=None)
    institutionName: str | None = Field(default=None)
    performingPhysicianName: str | None = Field(default=None)
    referringPhysicianName: str | None = Field(default=None)
    studyInstanceUid: str | None = Field(default=None)
    seriesInstanceUid: str | None = Field(default=None)
    sopInstanceUid: str | None = Field(default=None)
    modality: str | None = Field(default=None)
    imageLaterality: str | None = Field(default=None)
    studyDate: str | None = Field(default=None)


class DicomIngestItem(BinaContractModel):
    assetId: str
    s3ObjectKey: str
    declaredModalityHint: DiagnosticModality | None = Field(default=None)
    rawTags: DicomRawTags


class DicomIngestRequest(BinaContractModel):
    patientId: str
    eyeLaterality: StudyLaterality
    dicomItems: list[DicomIngestItem]
    labs: ClinicalLabsInput | None = Field(default=None)


class AnonymizedDicomSnapshot(BinaContractModel):
    pseudonymId: str
    sha256: str
    scrubbedTags: dict[str, Any]


class DicomIngestResponse(BinaContractModel):
    study: DiagnosticStudyDetail
    anonymizedSnapshots: list[AnonymizedDicomSnapshot]


class HomeVisionTestTrialInput(BinaContractModel):
    trialIndex: int
    stimulus: dict[str, Any]
    response: dict[str, Any]
    reactionMs: int | None = Field(default=None)
    correct: bool | None = Field(default=None)


class HomeVisionTestTrialRecord(BinaContractModel):
    trialId: str
    testId: str
    trialIndex: int
    stimulus: dict[str, Any]
    response: dict[str, Any]
    reactionMs: int | None = Field(default=None)
    correct: bool | None = Field(default=None)
    createdAtIso: str


class VisionTrendAlert(BinaContractModel):
    id: str
    patientId: str
    eyeLaterality: EyeLaterality
    ruleCode: str
    severity: UrgencyTier
    summaryFa: str
    ewmaValue: float
    cusumValue: float
    triageCaseId: str | None = Field(default=None)
    createdAtIso: str


class R2MonitoringOverviewResponse(BinaContractModel):
    activePlanCount: int
    enrolledPatientCount: int
    acceptedTestCount: int
    rejectedTestCount: int
    activeAlertCount: int
    killedDeviceCount: int
    latestAlerts: list[VisionTrendAlert]


class HomeVisionTestRecord(BinaContractModel):
    id: str
    tenantId: str
    clinicId: str
    patientId: str
    calibrationProfileId: str | None = Field(default=None)
    eyeLaterality: EyeLaterality
    testType: str
    vaLogmar: float | None = Field(default=None)
    amslerDistortionScore: float
    amslerCentralScotoma: bool
    qualityStatus: str
    rejectionCodes: list[str]
    measuredAtIso: str


class R2SessionListResponse(BinaContractModel):
    items: list[HomeVisionTestRecord]
    total: int


class R2SessionDetailResponse(BinaContractModel):
    session: HomeVisionTestRecord
    trials: list[HomeVisionTestTrialRecord]
    calibrationProfile: CalibrationProfileResponse | None = Field(default=None)
    alerts: list[VisionTrendAlert]


class IopReadingRecord(BinaContractModel):
    readingId: str
    patientId: str
    deviceVendor: str
    deviceSerialHash: str
    eyeLaterality: EyeLaterality
    eyeLabelFa: str
    iopMmHg: float
    qualityScore: float
    accepted: bool
    measuredAtIso: str


class PatientIopListResponse(BinaContractModel):
    items: list[IopReadingRecord]
    od: list[IopReadingRecord]
    os: list[IopReadingRecord]


class MonitoringPlanRecord(BinaContractModel):
    planId: str
    tenantId: str
    clinicId: str
    patientId: str
    eyeLaterality: EyeLaterality
    eyeLabelFa: str
    testTypes: list[str]
    cadenceDays: int
    alertThresholdLogmar: float
    active: bool
    createdByUserId: str
    createdAtIso: str
    updatedAtIso: str


class MonitoringPlanListResponse(BinaContractModel):
    items: list[MonitoringPlanRecord]


class CreateMonitoringPlanRequest(BinaContractModel):
    eyeLaterality: EyeLaterality
    testTypes: list[str]
    cadenceDays: int | None = Field(default=None)
    alertThresholdLogmar: float | None = Field(default=None)
    active: bool | None = Field(default=None)


class DeviceQualificationRecord(BinaContractModel):
    deviceId: str
    tenantId: str
    clinicId: str
    modelCode: str
    manufacturer: str
    displayPpi: float | None = Field(default=None)
    verifiedStatus: str
    killSwitchReasonFa: str | None = Field(default=None)
    updatedByUserId: str
    createdAtIso: str
    updatedAtIso: str


class DeviceQualificationListResponse(BinaContractModel):
    items: list[DeviceQualificationRecord]


class UpsertDeviceQualificationRequest(BinaContractModel):
    modelCode: str
    manufacturer: str
    displayPpi: float | None = Field(default=None)
    verifiedStatus: str | None = Field(default=None)
    killSwitchReasonFa: str | None = Field(default=None)


class UpdateDeviceStatusRequest(BinaContractModel):
    verifiedStatus: str
    killSwitchReasonFa: str | None = Field(default=None)


class ReportListItem(BinaContractModel):
    reportId: str
    reportType: str
    patientId: str
    patientNameFa: str
    sourceRefId: str
    titleFa: str
    issuedAtJalali: str
    sourceSha256: str
    pdfSha256: str
    createdAtIso: str


class ReportListResponse(BinaContractModel):
    items: list[ReportListItem]
    total: int


class ReportDetailResponse(BinaContractModel):
    reportId: str
    clinicId: str
    reportType: str
    patientId: str
    patientNameFa: str
    sourceRefId: str
    titleFa: str
    issuedAtJalali: str
    sourceSha256: str
    pdfSha256: str
    payload: dict[str, Any]
    createdAtIso: str


class KpiRatio(BinaContractModel):
    numerator: int
    denominator: int
    rate: float | None = Field(default=None)


class ClinicAnalyticsResponse(BinaContractModel):
    episodeCountsByStatus: dict[str, int]
    episodeCountsByEye: dict[str, int]
    cohortCountsByAccessMode: dict[str, int]
    adherenceDistribution: dict[str, int]
    triageSlaCompliance: KpiRatio
    referralAttendance: KpiRatio


class PilotScorecardResponse(BinaContractModel):
    generatedAtIso: str
    generatedAtJalali: str
    kpis: dict[str, Any]
    noticeFa: str


class AiQualityAnalyticsResponse(BinaContractModel):
    onlineOperationalMetrics: dict[str, Any]
    offlineBenchmarkNoticeFa: str


class ResearchExportRequest(BinaContractModel):
    irbProtocolCode: str
    reasonFa: str
    limit: int | None = Field(default=None)


class ResearchExportResponse(BinaContractModel):
    irbProtocolCode: str
    exportedAtIso: str
    recordCount: int
    records: list[dict[str, Any]]
    manifestSha256: str


class BillingEvidenceRequest(BinaContractModel):
    patientId: str
    periodStartJalali: str
    periodEndJalali: str


class BillingEvidenceResponse(BinaContractModel):
    patientId: str
    periodStartJalali: str
    periodEndJalali: str
    acceptedHomeVisionTestCount: int
    confirmedAdherenceEventCount: int
    disclaimerFa: str


class StaffedHoursWindow(BinaContractModel):
    open: str
    close: str


class StaffedHoursInput(BinaContractModel):
    satToWed: StaffedHoursWindow | None = Field(default=None)
    thursday: StaffedHoursWindow | None = Field(default=None)
    fridayClosed: bool | None = Field(default=None)


class UpdateClinicProfileRequest(BinaContractModel):
    nameFa: str | None = Field(default=None)
    emergencyPhone: str | None = Field(default=None)
    calendarMode: str | None = Field(default=None)
    dicomAeTitle: str | None = Field(default=None)
    staffedHours: StaffedHoursInput | None = Field(default=None)


class StaffMembershipRecord(BinaContractModel):
    id: str
    tenantId: str
    clinicId: str
    userId: str
    role: StaffRole
    active: bool
    fullNameFa: str | None = Field(default=None)
    email: str | None = Field(default=None)
    mfaVerifiedAtIso: str | None = Field(default=None)
    createdAtIso: str | None = Field(default=None)


class StaffMembershipListResponse(BinaContractModel):
    items: list[StaffMembershipRecord]


class UpsertStaffMemberRequest(BinaContractModel):
    userId: str
    role: StaffRole
    fullNameFa: str | None = Field(default=None)
    email: str | None = Field(default=None)
    active: bool | None = Field(default=None)
    mfaVerified: bool | None = Field(default=None)


class UpdateStaffMemberRequest(BinaContractModel):
    role: StaffRole | None = Field(default=None)
    active: bool | None = Field(default=None)
    fullNameFa: str | None = Field(default=None)
    email: str | None = Field(default=None)


class ProtocolTemplateRecord(BinaContractModel):
    id: str
    tenantId: str
    clinicId: str
    protocolType: str
    version: int
    schema: dict[str, Any]
    approvedBy: str | None = Field(default=None)
    createdAtIso: str


class AdminProtocolListResponse(BinaContractModel):
    builtInTypes: list[str]
    versions: list[ProtocolTemplateRecord]


class CreateProtocolVersionRequest(BinaContractModel):
    protocolType: str
    schema: dict[str, Any]


class MessageTemplateRecord(BinaContractModel):
    templateId: str
    tenantId: str
    clinicId: str
    templateKey: str
    version: int
    bodyTemplateFa: str
    channel: str
    active: bool
    updatedByUserId: str
    createdAtIso: str


class MessageTemplateListResponse(BinaContractModel):
    items: list[MessageTemplateRecord]


class CreateMessageTemplateRequest(BinaContractModel):
    templateKey: str
    bodyTemplateFa: str
    channel: str | None = Field(default=None)
    active: bool | None = Field(default=None)


class ConsentTemplateRecord(BinaContractModel):
    consentTemplateId: str
    tenantId: str
    clinicId: str
    consentType: str
    version: str
    titleFa: str
    bodyFa: str
    active: bool
    updatedByUserId: str
    createdAtIso: str


class ConsentTemplateListResponse(BinaContractModel):
    items: list[ConsentTemplateRecord]


class CreateConsentTemplateRequest(BinaContractModel):
    consentType: str
    version: str
    titleFa: str
    bodyFa: str
    active: bool | None = Field(default=None)


class IntegrationEndpointRecord(BinaContractModel):
    endpointId: str
    tenantId: str
    clinicId: str
    integrationType: str
    nameFa: str
    endpointUrl: str
    aeTitle: str | None = Field(default=None)
    authMode: str
    secretMasked: str | None = Field(default=None)
    enabled: bool
    lastTestedAtIso: str | None = Field(default=None)
    lastTestStatus: str | None = Field(default=None)
    createdAtIso: str
    updatedAtIso: str


class IntegrationEndpointListResponse(BinaContractModel):
    items: list[IntegrationEndpointRecord]


class CreateIntegrationEndpointRequest(BinaContractModel):
    integrationType: str
    nameFa: str
    endpointUrl: str
    aeTitle: str | None = Field(default=None)
    authMode: str | None = Field(default=None)
    secret: str | None = Field(default=None)
    enabled: bool | None = Field(default=None)


class UpdateIntegrationEndpointRequest(BinaContractModel):
    nameFa: str | None = Field(default=None)
    endpointUrl: str | None = Field(default=None)
    aeTitle: str | None = Field(default=None)
    authMode: str | None = Field(default=None)
    secret: str | None = Field(default=None)
    enabled: bool | None = Field(default=None)


class IntegrationDeliveryRecord(BinaContractModel):
    deliveryId: str
    clinicId: str
    endpointId: str | None = Field(default=None)
    endpointNameFa: str | None = Field(default=None)
    direction: str
    payloadType: str
    referenceId: str | None = Field(default=None)
    status: str
    httpStatus: int | None = Field(default=None)
    errorCode: str | None = Field(default=None)
    errorMessageFa: str | None = Field(default=None)
    attemptCount: int
    createdAtIso: str
    updatedAtIso: str


class TestIntegrationEndpointResponse(BinaContractModel):
    endpoint: IntegrationEndpointRecord
    delivery: IntegrationDeliveryRecord


class IntegrationDeliveryListResponse(BinaContractModel):
    items: list[IntegrationDeliveryRecord]
    total: int


class OpsHealthResponse(BinaContractModel):
    status: str
    service: str
    aiEngineMode: AiEngineMode | None = Field(default=None)
    database: dict[str, Any]
    queues: dict[str, Any]


class OpsJobsResponse(BinaContractModel):
    aiInferenceJobs: list[dict[str, Any]]
    outboxEvents: list[dict[str, Any]]
    workflowRuns: list[dict[str, Any]]


class AuditLogEntry(BinaContractModel):
    id: str
    tenantId: str
    actorUserId: str
    actorRole: str
    action: str
    resourceType: str
    resourceId: str
    reasonFa: str | None = Field(default=None)
    breakGlass: bool | None = Field(default=None)
    metadata: dict[str, Any] | None = Field(default=None)
    occurredAtIso: str


class AuditLogListResponse(BinaContractModel):
    items: list[AuditLogEntry]
    total: int


class BreakGlassSessionRecord(BinaContractModel):
    sessionId: str
    tenantId: str
    clinicId: str
    actorUserId: str
    actorRole: str
    patientId: str
    reasonFa: str
    expiresAtIso: str
    revokedAtIso: str | None = Field(default=None)
    revokedByUserId: str | None = Field(default=None)
    active: bool
    createdAtIso: str


class BreakGlassSessionListResponse(BinaContractModel):
    items: list[BreakGlassSessionRecord]
    total: int


class OpenBreakGlassRequest(BinaContractModel):
    patientId: str
    reasonFa: str
    durationMinutes: int | None = Field(default=None)


class RevokeBreakGlassRequest(BinaContractModel):
    reasonFa: str | None = Field(default=None)


class ModelArtifactSummary(BinaContractModel):
    modelName: str
    hasMetricsJson: bool
    hasModelCard: bool
    metrics: dict[str, Any] | None = Field(default=None)


class OpsModelsResponse(BinaContractModel):
    aiEngineMode: str
    foundationBackbone: str
    commercialLicensePolicyFa: str
    llmProvider: str
    llmModel: str
    artifacts: list[ModelArtifactSummary]

