import type { DbTx } from "../../../packages/db/index.js";
import type {
  EyeLaterality,
  StudyLaterality,
  UrgencyTier,
} from "../../../packages/domain-kernel/index.js";

export type StudyStatus = "ingested" | "qc_failed" | "queued" | "analyzed" | "pending_hitl" | "signed_off";
export type SignoffAction = "approved" | "edited_approved" | "rejected";

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
  readonly qcDecisions: QcDecisionView[];
  readonly specialistOutputs: SpecialistOutputView[];
  readonly fusionResult?: FusionResultView | undefined;
  readonly explainability?: ExplainabilityView | undefined;
  readonly persianReportDraft?: PersianReportDraftView | undefined;
  readonly signoff?: ClinicianSignoffView | undefined;
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
  listSignedPatientSummaries(tx: DbTx, patientId: string): Promise<Array<{
    studyId: string;
    eyeLaterality: StudyLaterality;
    finalUrgency: UrgencyTier;
    finalReportTextFa: string;
    signedAt: Date;
  }>>;
}
