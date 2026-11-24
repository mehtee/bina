import type { ClinicId, EpisodeId, JobId, PatientId, StudyId, TenantId, UserId } from "./branded.js";
import type { EyeLaterality, StudyLaterality } from "./laterality.js";
import type { UrgencyTier } from "./urgency.js";

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface CareEpisodeContext {
  readonly episodeId: EpisodeId;
  readonly tenantId: TenantId;
  readonly clinicId: ClinicId;
  readonly patientId: PatientId;
  readonly eyeLaterality: EyeLaterality;
  readonly anchorAtIso: string;
}

export interface EvaluationContext {
  readonly episode: CareEpisodeContext;
  readonly evaluatedAtIso: string;
}

export interface ClinicalSignal {
  readonly ruleCode: string;
  readonly urgencyFloor: UrgencyTier;
  readonly eyeLaterality: StudyLaterality;
  readonly summaryFa: string;
}

export interface CareProtocolPlugin<TConfig, TPlanSnapshot, TCheckInInput> {
  readonly protocolType: string;
  validateTemplateConfig(config: TConfig): ValidationResult;
  buildActivePlan(config: TConfig, episode: CareEpisodeContext): TPlanSnapshot;
  evaluateCheckIn(input: TCheckInInput, context: EvaluationContext): Promise<ClinicalSignal[]>;
}

export interface DeviceRequirement {
  readonly requirementKey: string;
  readonly descriptionFa: string;
  readonly mandatory: boolean;
}

export interface ScoringContext {
  readonly tenantId: TenantId;
  readonly patientId: PatientId;
  readonly eyeLaterality: EyeLaterality;
  readonly evaluatedAtIso: string;
}

export interface VersionedMeasurement<TMeasurement> {
  readonly measurementVersion: number;
  readonly scoredAtIso: string;
  readonly payload: TMeasurement;
}

export interface VisionTestDefinition<TProtocol, TRawEvidence, TMeasurement> {
  readonly testType: string;
  validateProtocol(protocol: TProtocol): ValidationResult;
  deviceRequirements(protocol: TProtocol): DeviceRequirement[];
  score(evidence: TRawEvidence, context: ScoringContext): Promise<VersionedMeasurement<TMeasurement>>;
}

export interface QualifiedPatientEvidence {
  readonly patientId: PatientId;
  readonly eyeLaterality: StudyLaterality;
  readonly symptoms?: Record<string, unknown> | undefined;
  readonly specialistFindings?: readonly Record<string, unknown>[] | undefined;
  readonly clinicalContext?: Record<string, unknown> | undefined;
}

export interface ClinicalSignalEvaluator {
  readonly evaluatorId: string;
  evaluate(input: QualifiedPatientEvidence): ClinicalSignal[];
}

export interface DiagnosticAnalysisRequest {
  readonly studyId: StudyId;
  readonly jobId: JobId;
  readonly tenantId: TenantId;
  readonly eyeLaterality: StudyLaterality;
  readonly assets: readonly Record<string, unknown>[];
  readonly labs?: Record<string, unknown> | undefined;
}

export interface InferenceJobReceipt {
  readonly jobId: JobId;
  readonly acceptedAtIso: string;
  readonly engineMode: "cpu_stub" | "onnx_cpu" | "gpu_full";
}

export interface MultimodalDiagnosticResult {
  readonly studyId: StudyId;
  readonly jobId: JobId;
  readonly status: "qc_failed" | "analyzed";
  readonly payload: Record<string, unknown>;
}

export interface DiagnosticInferenceGatewayPort {
  submitStudyAnalysis(job: DiagnosticAnalysisRequest): Promise<InferenceJobReceipt>;
  getJobResult(jobId: JobId): Promise<MultimodalDiagnosticResult>;
}

export interface StructuredGenerationRequest<T> {
  readonly promptVersion: string;
  readonly systemInstruction: string;
  readonly evidencePacketJson: Record<string, unknown>;
  readonly schemaName: string;
  readonly parseOutput: (rawJson: unknown) => T;
}

export interface StructuredGenerationResult<T> {
  readonly modelProvider: string;
  readonly modelId: string;
  readonly output: T;
  readonly usedFallback: boolean;
}

export interface StructuredLanguageModel {
  generate<T>(request: StructuredGenerationRequest<T>): Promise<StructuredGenerationResult<T>>;
}

export interface MultimodalReportModelPort extends StructuredLanguageModel {
  readonly supportsVisualContext: boolean;
}

export interface TemplatedNotification {
  readonly tenantId: TenantId;
  readonly clinicId: ClinicId;
  readonly recipientPhoneE164: string;
  readonly templateKey: string;
  readonly paramsFa: Readonly<Record<string, string>>;
}

export interface NotificationDeliveryReceipt {
  readonly providerMessageId: string;
  readonly accepted: boolean;
  readonly sentAtIso: string;
}

export interface NotificationTransportPort {
  send(msg: TemplatedNotification): Promise<NotificationDeliveryReceipt>;
}

export interface VersionedClinicalReport {
  readonly reportId: string;
  readonly tenantId: TenantId;
  readonly studyId?: StudyId | undefined;
  readonly episodeId?: EpisodeId | undefined;
  readonly signedByUserId: UserId;
  readonly sourceSha256: string;
  readonly payload: Record<string, unknown>;
}

export interface ExternalExportReceipt {
  readonly externalId: string;
  readonly exportedAtIso: string;
}

export interface EhrIntegrationAdapter {
  readonly adapterId: string;
  exportReport(doc: VersionedClinicalReport): Promise<ExternalExportReceipt>;
}
