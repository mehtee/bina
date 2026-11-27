import type { DbTx } from "../../../packages/db/index.js";
import type { StudyLaterality, UrgencyTier } from "../../../packages/domain-kernel/index.js";

export interface KpiRatio {
  readonly numerator: number;
  readonly denominator: number;
  readonly rate: number | null;
}

export interface OverviewDashboardData {
  readonly todayJalali: string;
  readonly activeEpisodesOd: number;
  readonly activeEpisodesOs: number;
  readonly printPhoneCohortCount: number;
  readonly urgentTriageCount: number;
  readonly overdueSlaCount: number;
  readonly openTriageCount: number;
  readonly pendingHitlStudies: number;
  readonly qcFailedStudies: number;
  readonly r2AlertCount: number;
  readonly activeOutagesCount: number;
  readonly queueUrgentItems: Array<{
    readonly caseId: string;
    readonly patientId: string;
    readonly patientNameFa: string;
    readonly eyeLaterality: StudyLaterality;
    readonly eyeLabelFa: string;
    readonly status: string;
    readonly slaDueAtIso: string;
  }>;
  readonly pendingHitlItems: Array<{
    readonly studyId: string;
    readonly patientId: string;
    readonly patientNameFa: string;
    readonly eyeLaterality: StudyLaterality;
    readonly eyeLabelFa: string;
    readonly urgencyTier: UrgencyTier | null;
    readonly urgencyLabelFa: string | null;
    readonly createdAtIso: string;
  }>;
}

export interface WorkspaceSearchResult {
  readonly query: string;
  readonly patients: Array<{
    readonly patientId: string;
    readonly fullNameFa: string;
    readonly phoneMasked: string;
    readonly accessMode: string;
  }>;
  readonly studies: Array<{
    readonly studyId: string;
    readonly patientId: string;
    readonly patientNameFa: string;
    readonly status: string;
    readonly eyeLabelFa: string;
    readonly createdAtJalali: string;
  }>;
  readonly episodes: Array<{
    readonly episodeId: string;
    readonly patientId: string;
    readonly patientNameFa: string;
    readonly protocolType: string;
    readonly eyeLabelFa: string;
    readonly status: string;
  }>;
  readonly reports: Array<{
    readonly reportId: string;
    readonly patientId: string;
    readonly reportType: string;
    readonly titleFa: string;
    readonly issuedAtJalali: string;
  }>;
}

export interface RecentActivityItem {
  readonly activityId: string;
  readonly action: string;
  readonly actorRole: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly breakGlass: boolean;
  readonly reasonFa: string | null;
  readonly occurredAtIso: string;
  readonly occurredAtJalali: string;
}

export interface Patient360View {
  readonly patient: {
    readonly patientId: string;
    readonly clinicId: string;
    readonly fullNameFa: string;
    readonly phoneMasked: string;
    readonly nationalIdMasked: string | null;
    readonly birthYearJalali: number | null;
    readonly notesFa: string | null;
    readonly preferredLocale: string;
    readonly accessMode: "app" | "caregiver" | "print_phone";
    readonly mlTrainingConsentFlag: boolean;
  };
  readonly odEpisodes: Array<Record<string, unknown>>;
  readonly osEpisodes: Array<Record<string, unknown>>;
  readonly recentStudies: Array<Record<string, unknown>>;
  readonly r2Summary: {
    readonly odBaselineVaLogmar: number | null;
    readonly osBaselineVaLogmar: number | null;
    readonly recentAlerts: Array<Record<string, unknown>>;
    readonly latestIopOdMmHg: number | null;
    readonly latestIopOsMmHg: number | null;
  };
  readonly openTriageCases: Array<Record<string, unknown>>;
  readonly pendingFollowUpTasks: Array<Record<string, unknown>>;
  readonly clinicalHistories: Array<Record<string, unknown>>;
  readonly consents: Array<{
    readonly consentId: string;
    readonly consentVersion: string;
    readonly action: string;
    readonly acceptedAtIso: string;
  }>;
}

export interface PatientTimelineEvent {
  readonly category:
    | "episode"
    | "prescription"
    | "symptom"
    | "diagnostic_study"
    | "signoff"
    | "r2_test"
    | "iop"
    | "triage"
    | "referral"
    | "report";
  readonly refId: string;
  readonly eyeLaterality: StudyLaterality | null;
  readonly eyeLabelFa: string | null;
  readonly titleFa: string;
  readonly summaryFa: string;
  readonly occurredAtIso: string;
  readonly occurredAtJalali: string;
}

export interface ClinicAnalyticsData {
  readonly episodeCountsByStatus: Record<string, number>;
  readonly episodeCountsByEye: { readonly OD: number; readonly OS: number };
  readonly cohortCountsByAccessMode: {
    readonly app: number;
    readonly caregiver: number;
    readonly print_phone: number;
  };
  readonly adherenceDistribution: {
    readonly taken: number;
    readonly missed_with_reason: number;
    readonly unavailable: number;
    readonly no_response: number;
  };
  readonly triageSlaCompliance: KpiRatio;
  readonly referralAttendance: KpiRatio;
}

export interface PilotScorecardData {
  readonly generatedAtIso: string;
  readonly generatedAtJalali: string;
  readonly kpis: {
    readonly postopAdherenceConfirmedRate: KpiRatio;
    readonly postopAdherenceByAccessMode: {
      readonly app: KpiRatio;
      readonly caregiver: KpiRatio;
      readonly print_phone: KpiRatio;
    };
    readonly redFlagTriageSlaContactRate: KpiRatio;
    readonly closedLoopReferralAttendanceRate: KpiRatio;
    readonly diagnosticQcFirstPassRate: KpiRatio;
    readonly hitlSignoffCompletionRate: KpiRatio;
    readonly medianHitlTurnaroundMinutes: number | null;
    readonly r2ValidTestAcceptanceRate: KpiRatio;
  };
  readonly noticeFa: string;
}

export interface AiQualityAnalyticsData {
  readonly onlineOperationalMetrics: {
    readonly totalStudies: number;
    readonly qcPassedAssets: number;
    readonly qcRejectedAssets: number;
    readonly qcRejectionBreakdown: Record<string, number>;
    readonly signoffBreakdown: {
      readonly approved: number;
      readonly edited_approved: number;
      readonly rejected: number;
    };
    readonly clinicianFeedbackCounts: {
      readonly agree: number;
      readonly partially_agree: number;
      readonly disagree: number;
    };
    readonly urgentFloorTriggeredStudies: number;
  };
  readonly offlineBenchmarkNoticeFa: string;
}

export interface OpsJobsData {
  readonly aiInferenceJobs: Array<{
    readonly jobId: string;
    readonly studyId: string;
    readonly engineMode: string;
    readonly status: string;
    readonly errorCode: string | null;
    readonly createdAtIso: string;
    readonly completedAtIso: string | null;
  }>;
  readonly outboxEvents: Array<{
    readonly eventId: string;
    readonly eventType: string;
    readonly correlationId: string;
    readonly publishedAtIso: string | null;
    readonly createdAtIso: string;
  }>;
  readonly workflowRuns: Array<{
    readonly runId: string;
    readonly workflowType: string;
    readonly status: string;
    readonly nextDueAtIso: string | null;
    readonly updatedAtIso: string;
  }>;
}

export interface AnalyticsRepoPort {
  getOverviewDashboard(tx: DbTx, clinicId: string): Promise<Omit<OverviewDashboardData, "todayJalali">>;
  searchWorkspace(
    tx: DbTx,
    clinicId: string,
    q: string,
    flags: { includePatients: boolean; includeReports: boolean }
  ): Promise<WorkspaceSearchResult>;
  listRecentActivity(tx: DbTx, limit: number): Promise<RecentActivityItem[]>;
  getPatient360(tx: DbTx, patientId: string): Promise<Patient360View | null>;
  getPatientTimeline(tx: DbTx, patientId: string): Promise<PatientTimelineEvent[] | null>;
  getClinicAnalytics(tx: DbTx, clinicId: string): Promise<ClinicAnalyticsData>;
  getPilotScorecard(tx: DbTx, clinicId: string): Promise<PilotScorecardData>;
  getAiQualityAnalytics(tx: DbTx, clinicId: string): Promise<AiQualityAnalyticsData>;
  probeDatabase(tx: DbTx): Promise<{ dbLatencyMs: number; failedOutboxCount: number; runningAiJobsCount: number; activeOutagesCount: number }>;
  listOpsJobs(tx: DbTx, clinicId: string, limit: number): Promise<OpsJobsData>;
}
