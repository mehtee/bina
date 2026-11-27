import type { DbTx } from "../../../packages/db/index.js";
import type {
  EyeLaterality,
  StudyLaterality,
  UrgencyTier,
} from "../../../packages/domain-kernel/index.js";

export type StudyStatus = "ingested" | "qc_failed" | "queued" | "analyzed" | "pending_hitl" | "signed_off";
export type SignoffAction = "approved" | "edited_approved" | "rejected";
export type ClinicianFeedbackLayer =
  | "qc"
  | "specialist"
  | "fusion"
  | "segmentation"
  | "gradcam"
  | "report_draft"
  | "urgency";
export type ClinicianFeedbackAgreement = "agree" | "partially_agree" | "disagree";

export interface StudyAssetSubmission {
  readonly assetId: string;
  readonly s3ObjectKey: string;
  readonly declaredModality: string;
  readonly declaredEye: EyeLaterality;
  readonly dicomStudyUid?: string | undefined;
  readonly blurScoreHint?: number | undefined;
  readonly lightingScoreHint?: number | undefined;
  readonly detectedEyeHint?: string | undefined;
  readonly conditionHints?: string[] | undefined;
}

export interface StudyAssetDetailView {
  readonly assetId: string;
  readonly s3ObjectKey: string;
  readonly declaredModality: string;
  readonly detectedModality?: string | null | undefined;
  readonly declaredEye: EyeLaterality;
  readonly qcStatus: "pending" | "pass" | "reject";
  readonly createdAtIso: string;
}

export interface QcDecisionView {
  readonly assetId: string;
  readonly modalityPrediction: {
    readonly assetId: string;
    readonly declaredModality: string;
    readonly detectedModality: string;
    readonly confidence: number;
    readonly matchesDeclared: boolean;
  };
  readonly passed: boolean;
  readonly rejectionCodes: string[];
  readonly rejectionReasonsFa: string[];
  readonly recaptureInstructionFa: string | null;
}

export interface SpecialistOutputView {
  readonly specialistId: "fundus" | "oct" | "anterior" | "visual_field" | "tabular_xgb";
  readonly backboneId: string;
  readonly eyeLaterality: EyeLaterality;
  readonly probabilities: Record<string, number>;
  readonly biomarkers: Record<string, number>;
  readonly summaryFa: string;
  readonly maskS3Key?: string | undefined;
  readonly gradcamS3Key?: string | undefined;
}

export interface DifferentialItemView {
  readonly conditionCode: string;
  readonly conditionNameFa: string;
  readonly confidence: number;
  readonly confidenceIntervalLower: number;
  readonly confidenceIntervalUpper: number;
  readonly severity: "mild" | "moderate" | "severe" | "urgent";
  readonly supportingModalities: string[];
}

export interface FusionResultView {
  readonly eyeLaterality: EyeLaterality;
  readonly availableModalities: string[];
  readonly missingModalities: string[];
  readonly missingModalityNoticeFa: string;
  readonly differential: DifferentialItemView[];
  readonly discordanceFlagsFa: string[];
  readonly rawUrgency: UrgencyTier;
  readonly recommendedUrgency: UrgencyTier;
  readonly recommendedUrgencyLabelFa: string;
}

export interface ExplainabilityView {
  readonly primarySegmentationMasks: Array<Record<string, unknown>>;
  readonly auxiliaryGradCams: Array<Record<string, unknown>>;
}

export interface PersianReportDraftView {
  readonly modelProvider: string;
  readonly modelId: string;
  readonly titleFa: string;
  readonly modalityFindingsFa: string;
  readonly differentialSummaryFa: string;
  readonly crossModalCorrelationFa: string;
  readonly followUpPlanFa: string;
  readonly urgencyTier: UrgencyTier;
  readonly urgencyLabelFa: string;
  readonly evidenceIds: string[];
  readonly validationPassed: boolean;
  readonly draftVersion?: number | undefined;
  readonly editedByUserId?: string | undefined;
  readonly updatedAtIso?: string | undefined;
}

export interface ClinicianSignoffView {
  readonly signoffId: string;
  readonly studyId: string;
  readonly ophthalmologistId: string;
  readonly action: SignoffAction;
  readonly finalUrgency: UrgencyTier;
  readonly finalUrgencyLabelFa: string;
  readonly finalReportTextFa: string;
  readonly overrideReasonFa?: string | undefined;
  readonly signedAtIso: string;
}

export interface DiagnosticStudyDetailView {
  readonly studyId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly eyeLaterality: StudyLaterality;
  readonly status: StudyStatus;
  readonly assets?: StudyAssetDetailView[] | undefined;
  readonly labs?: Record<string, unknown> | null | undefined;
  readonly urgentFloorActive?: boolean | undefined;
  readonly urgentFloorRuleCodes?: string[] | undefined;
  readonly qcDecisions: QcDecisionView[];
  readonly specialistOutputs: SpecialistOutputView[];
  readonly fusionResult?: FusionResultView | undefined;
  readonly explainability?: ExplainabilityView | undefined;
  readonly persianReportDraft?: PersianReportDraftView | undefined;
  readonly signoff?: ClinicianSignoffView | undefined;
  readonly createdAtIso?: string | undefined;
  readonly updatedAtIso?: string | undefined;
}

export interface DiagnosticStudyWorklistItem {
  readonly studyId: string;
  readonly patientId: string;
  readonly patientNameFa: string;
  readonly clinicId: string;
  readonly eyeLaterality: StudyLaterality;
  readonly eyeLabelFa: string;
  readonly status: StudyStatus;
  readonly urgencyTier: UrgencyTier | null;
  readonly urgencyLabelFa: string | null;
  readonly urgentFloorActive: boolean;
  readonly modalities: string[];
  readonly topConditionNameFa: string | null;
  readonly createdAtIso: string;
  readonly createdAtJalali: string;
  readonly signedAtIso: string | null;
}

export interface StudyInferenceJobRecord {
  readonly jobId: string;
  readonly studyId: string;
  readonly engineMode: string;
  readonly modelVersions: Record<string, unknown>;
  readonly status: "queued" | "running" | "qc_failed" | "completed" | "failed";
  readonly startedAtIso: string | null;
  readonly completedAtIso: string | null;
  readonly errorCode: string | null;
  readonly createdAtIso: string;
}

export interface ClinicianFeedbackRecord {
  readonly feedbackId: string;
  readonly studyId: string;
  readonly clinicianUserId: string;
  readonly targetLayer: ClinicianFeedbackLayer;
  readonly agreementState: ClinicianFeedbackAgreement;
  readonly correctedLabelCode?: string | undefined;
  readonly noteFa: string;
  readonly createdAtIso: string;
}

export interface StudyComparisonView {
  readonly currentStudy: DiagnosticStudyDetailView;
  readonly priorStudies: DiagnosticStudyDetailView[];
  readonly biomarkerDeltas: Array<{
    readonly metricKey: string;
    readonly currentValue: number;
    readonly priorValue: number;
    readonly delta: number;
  }>;
}

export interface PatientSignedDiagnosticSummary {
  readonly studyId: string;
  readonly signedAtJalali: string;
  readonly eyeLabelFa: string;
  readonly urgencyTier: UrgencyTier;
  readonly urgencyLabelFa: string;
  readonly patientGuidanceFa: string;
  readonly nextStepFa: string;
}

export interface DiagnosticWorklistFilter {
  readonly clinicId?: string | undefined;
  readonly status?: StudyStatus | undefined;
  readonly urgencyTier?: UrgencyTier | undefined;
  readonly eyeLaterality?: StudyLaterality | undefined;
  readonly patientId?: string | undefined;
  readonly modality?: string | undefined;
  readonly signedOnly?: boolean | undefined;
  readonly limit: number;
  readonly offset: number;
}

export interface DiagnosticStudyRepoPort {
  createStudyWithAssetsAndJob(
    tx: DbTx,
    input: {
      studyId: string;
      jobId: string;
      tenantId: string;
      clinicId: string;
      patientId: string;
      eyeLaterality: StudyLaterality;
      engineMode: string;
      assets: StudyAssetSubmission[];
      labs?: Record<string, unknown> | undefined;
    }
  ): Promise<void>;
  appendAssetsAndJob(
    tx: DbTx,
    input: {
      tenantId: string;
      studyId: string;
      jobId: string;
      engineMode: string;
      assets: StudyAssetSubmission[];
    }
  ): Promise<void>;
  markQcFailed(
    tx: DbTx,
    studyId: string,
    jobId: string,
    qcDecisions: QcDecisionView[]
  ): Promise<void>;
  persistAnalysisAndDraft(
    tx: DbTx,
    input: {
      tenantId: string;
      studyId: string;
      jobId: string;
      qcDecisions: QcDecisionView[];
      specialistOutputs: SpecialistOutputView[];
      fusionResult: FusionResultView;
      explainability: ExplainabilityView;
      reportDraft: PersianReportDraftView;
    }
  ): Promise<void>;
  updateReportDraftVersioned(
    tx: DbTx,
    input: {
      studyId: string;
      expectedDraftVersion: number;
      editedByUserId: string;
      reportDraft: PersianReportDraftView;
    }
  ): Promise<PersianReportDraftView | null>;
  saveSignoff(
    tx: DbTx,
    input: {
      tenantId: string;
      studyId: string;
      ophthalmologistId: string;
      action: SignoffAction;
      finalDifferential: DifferentialItemView[];
      finalUrgency: UrgencyTier;
      finalReportTextFa: string;
      overrideReasonFa?: string | undefined;
      signedAt: Date;
    }
  ): Promise<ClinicianSignoffView>;
  getStudyDetail(tx: DbTx, studyId: string): Promise<DiagnosticStudyDetailView | null>;
  listStudies(
    tx: DbTx,
    filter: DiagnosticWorklistFilter
  ): Promise<{ items: DiagnosticStudyWorklistItem[]; total: number }>;
  listStudyJobs(tx: DbTx, studyId: string): Promise<StudyInferenceJobRecord[]>;
  insertFeedback(
    tx: DbTx,
    input: {
      tenantId: string;
      studyId: string;
      clinicianUserId: string;
      targetLayer: ClinicianFeedbackLayer;
      agreementState: ClinicianFeedbackAgreement;
      correctedLabelCode?: string | undefined;
      noteFa: string;
    }
  ): Promise<ClinicianFeedbackRecord>;
  listFeedback(tx: DbTx, studyId: string): Promise<ClinicianFeedbackRecord[]>;
  listPriorStudiesForPatientEye(
    tx: DbTx,
    patientId: string,
    eyeLaterality: StudyLaterality,
    excludeStudyId: string,
    limit?: number
  ): Promise<DiagnosticStudyDetailView[]>;
  listSignedPatientSummaries(tx: DbTx, patientId: string): Promise<Array<{
    studyId: string;
    eyeLaterality: StudyLaterality;
    finalUrgency: UrgencyTier;
    finalReportTextFa: string;
    signedAt: Date;
  }>>;
}
