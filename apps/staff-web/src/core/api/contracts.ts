import type { components } from "@bina/contracts-openapi/api";

export type Schemas = components["schemas"];

export type EyeLaterality = Schemas["EyeLaterality"];
export type StudyLaterality = Schemas["StudyLaterality"];
export type AccessMode = Schemas["AccessMode"];
export type StaffRole = Schemas["StaffRole"];
export type UrgencyTier = Schemas["UrgencyTier"];
export type SeverityGrade = Schemas["SeverityGrade"];
export type DiagnosticModality = Schemas["DiagnosticModality"];
export type AdherenceState = Schemas["AdherenceState"];
export type StudyStatus = Schemas["StudyStatus"];
export type SignoffAction = Schemas["SignoffAction"];
export type AiEngineMode = Schemas["AiEngineMode"];

export type HealthStatus = Schemas["HealthStatus"];
export type ClinicProfile = Schemas["ClinicProfile"];
export type StaffSessionRequest = Schemas["StaffSessionRequest"];
export type StaffSessionResponse = Schemas["StaffSessionResponse"];
export type StaffStepUpResponse = Schemas["StaffStepUpResponse"];
export type AuthorizedClinicMembership = Schemas["AuthorizedClinicMembership"];
export type FeatureFlagRecord = Schemas["FeatureFlagRecord"];
export type StaffMeResponse = Schemas["StaffMeResponse"];

export type OverviewDashboardResponse = Schemas["OverviewDashboardResponse"];
export type WorkspaceSearchResponse = Schemas["WorkspaceSearchResponse"];
export type RecentActivityItem = Schemas["RecentActivityItem"];

export type PatientListItem = Schemas["PatientListItem"];
export type PatientListResponse = Schemas["PatientListResponse"];
export type StaffEnrollPatientRequest = Schemas["StaffEnrollPatientRequest"];
export type StaffEnrolledPatientResponse = Schemas["StaffEnrolledPatientResponse"];
export type Patient360Response = Schemas["Patient360Response"];
export type PatientClinicalHistoryItem = Schemas["PatientClinicalHistoryItem"];
export type AddClinicalHistoryRequest = Schemas["AddClinicalHistoryRequest"];
export type PatientTimelineEvent = Schemas["PatientTimelineEvent"];
export type CaregiverGrant = Schemas["CaregiverGrant"];

export type CareEpisode = Schemas["CareEpisode"];
export type CareEpisodeWorklistItem = Schemas["CareEpisodeWorklistItem"];
export type CareEpisodeWorklistResponse = Schemas["CareEpisodeWorklistResponse"];
export type CreateEpisodeRequest = Schemas["CreateEpisodeRequest"];
export type DropItemInput = Schemas["DropItemInput"];
export type PublishPrescriptionRequest = Schemas["PublishPrescriptionRequest"];
export type PrescriptionVersion = Schemas["PrescriptionVersion"];
export type AdherenceEventResponse = Schemas["AdherenceEventResponse"];
export type EpisodeSymptomHistoryItem = Schemas["EpisodeSymptomHistoryItem"];
export type PrintPhoneQueueItem = Schemas["PrintPhoneQueueItem"];
export type PrintPhoneOutreachRecord = Schemas["PrintPhoneOutreachRecord"];

export type TriageCase = Schemas["TriageCase"];
export type TriageCaseDetailResponse = Schemas["TriageCaseDetailResponse"];
export type ReferralRecord = Schemas["ReferralRecord"];
export type ClinicOutageRecord = Schemas["ClinicOutageRecord"];
export type FollowUpTaskRecord = Schemas["FollowUpTaskRecord"];

export type StudyAssetInput = Schemas["StudyAssetInput"];
export type QcDecision = Schemas["QcDecision"];
export type SpecialistOutput = Schemas["SpecialistOutput"];
export type DifferentialItem = Schemas["DifferentialItem"];
export type FusionResult = Schemas["FusionResult"];
export type PersianReportDraft = Schemas["PersianReportDraft"];
export type ClinicianSignoffRequest = Schemas["ClinicianSignoffRequest"];
export type ClinicianSignoffResponse = Schemas["ClinicianSignoffResponse"];
export type DiagnosticStudyDetail = Schemas["DiagnosticStudyDetail"];
export type DiagnosticStudyWorklistItem = Schemas["DiagnosticStudyWorklistItem"];
export type DiagnosticStudyWorklistResponse = Schemas["DiagnosticStudyWorklistResponse"];
export type StudyInferenceJobRecord = Schemas["StudyInferenceJobRecord"];
export type SaveReportDraftRequest = Schemas["SaveReportDraftRequest"];
export type ClinicianFeedbackRecord = Schemas["ClinicianFeedbackRecord"];
export type StudyComparisonResponse = Schemas["StudyComparisonResponse"];

export type R2MonitoringOverviewResponse = Schemas["R2MonitoringOverviewResponse"];
export type CalibrationProfileResponse = Schemas["CalibrationProfileResponse"];
export type HomeVisionTestRecord = Schemas["HomeVisionTestRecord"];
export type HomeVisionTestTrialRecord = Schemas["HomeVisionTestTrialRecord"];
export type R2SessionDetailResponse = Schemas["R2SessionDetailResponse"];
export type PatientVisionTrendsResponse = Schemas["PatientVisionTrendsResponse"];
export type VisionTrendAlert = Schemas["VisionTrendAlert"];
export type IopReadingRecord = Schemas["IopReadingRecord"];
export type PatientIopListResponse = Schemas["PatientIopListResponse"];
export type MonitoringPlanRecord = Schemas["MonitoringPlanRecord"];
export type DeviceQualificationRecord = Schemas["DeviceQualificationRecord"];

export type ReportListItem = Schemas["ReportListItem"];
export type ReportDetailResponse = Schemas["ReportDetailResponse"];
export type CreateReportRequest = Schemas["CreateReportRequest"];
export type CreateReportResponse = Schemas["CreateReportResponse"];

export type KpiRatio = Schemas["KpiRatio"];
export type ClinicAnalyticsResponse = Schemas["ClinicAnalyticsResponse"];
export type PilotScorecardResponse = Schemas["PilotScorecardResponse"];
export type AiQualityAnalyticsResponse = Schemas["AiQualityAnalyticsResponse"];

export type StaffMembershipRecord = Schemas["StaffMembershipRecord"];
export type ProtocolTemplateRecord = Schemas["ProtocolTemplateRecord"];
export type MessageTemplateRecord = Schemas["MessageTemplateRecord"];
export type ConsentTemplateRecord = Schemas["ConsentTemplateRecord"];
export type IntegrationEndpointRecord = Schemas["IntegrationEndpointRecord"];
export type IntegrationDeliveryRecord = Schemas["IntegrationDeliveryRecord"];
export type OpsHealthResponse = Schemas["OpsHealthResponse"];
export type OpsJobsResponse = Schemas["OpsJobsResponse"];
export type AuditLogEntry = Schemas["AuditLogEntry"];
export type BreakGlassSessionRecord = Schemas["BreakGlassSessionRecord"];
export type OpsModelsResponse = Schemas["OpsModelsResponse"];
export type ResearchExportRequest = Schemas["ResearchExportRequest"];
export type ResearchExportResponse = Schemas["ResearchExportResponse"];
