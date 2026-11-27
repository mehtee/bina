import fs from "node:fs";
import path from "node:path";
import { authorizeStaffAction, type StaffPrincipal } from "../../../packages/authz/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import { formatJalaliDate } from "../../tenancy/index.js";
import type {
  AiQualityAnalyticsData,
  AnalyticsRepoPort,
  ClinicAnalyticsData,
  OpsJobsData,
  OverviewDashboardData,
  Patient360View,
  PatientTimelineEvent,
  PilotScorecardData,
  RecentActivityItem,
  WorkspaceSearchResult,
} from "../ports/index.js";

export class AnalyticsError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    messageFa: string
  ) {
    super(messageFa);
    this.name = "AnalyticsError";
  }
}

export interface ModelArtifactSummary {
  readonly modelName: string;
  readonly hasMetricsJson: boolean;
  readonly hasModelCard: boolean;
  readonly metrics: Record<string, unknown> | null;
}

export class AnalyticsService {
  constructor(private readonly repo: AnalyticsRepoPort) {}

  async getOverviewDashboard(tx: DbTx, principal: StaffPrincipal): Promise<OverviewDashboardData> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new AnalyticsError(403, decision.code, decision.reasonFa);
    }
    const raw = await this.repo.getOverviewDashboard(tx, principal.clinicId);
    return {
      todayJalali: formatJalaliDate(new Date()),
      ...raw,
    };
  }

  async searchWorkspace(
    tx: DbTx,
    principal: StaffPrincipal,
    query: string
  ): Promise<WorkspaceSearchResult> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new AnalyticsError(403, decision.code, decision.reasonFa);
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      throw new AnalyticsError(400, "SEARCH_QUERY_TOO_SHORT", "عبارت جستجو باید حداقل ۲ کاراکتر باشد.");
    }
    const includePatients = authorizeStaffAction(principal, "patient:read", principal.tenantId).allowed;
    const includeReports = authorizeStaffAction(principal, "report:read", principal.tenantId).allowed;

    return this.repo.searchWorkspace(tx, principal.clinicId, trimmed, {
      includePatients,
      includeReports,
    });
  }

  async listRecentActivity(
    tx: DbTx,
    principal: StaffPrincipal,
    limit = 20
  ): Promise<RecentActivityItem[]> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new AnalyticsError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listRecentActivity(tx, Math.min(50, Math.max(1, limit)));
  }

  async getPatient360(
    tx: DbTx,
    principal: StaffPrincipal,
    patientId: string
  ): Promise<Patient360View> {
    const decision = authorizeStaffAction(principal, "patient:read", principal.tenantId);
    if (!decision.allowed) {
      throw new AnalyticsError(403, decision.code, decision.reasonFa);
    }
    const view = await this.repo.getPatient360(tx, patientId);
    if (!view) {
      throw new AnalyticsError(404, "PATIENT_NOT_FOUND", "پروفایل بیمار یافت نشد.");
    }
    return view;
  }

  async getPatientTimeline(
    tx: DbTx,
    principal: StaffPrincipal,
    patientId: string
  ): Promise<PatientTimelineEvent[]> {
    const decision = authorizeStaffAction(principal, "patient:read", principal.tenantId);
    if (!decision.allowed) {
      throw new AnalyticsError(403, decision.code, decision.reasonFa);
    }
    const events = await this.repo.getPatientTimeline(tx, patientId);
    if (!events) {
      throw new AnalyticsError(404, "PATIENT_NOT_FOUND", "پروفایل بیمار یافت نشد.");
    }
    return events;
  }

  async getClinicAnalytics(tx: DbTx, principal: StaffPrincipal): Promise<ClinicAnalyticsData> {
    const decision = authorizeStaffAction(principal, "analytics:read", principal.tenantId);
    if (!decision.allowed) {
      throw new AnalyticsError(403, decision.code, decision.reasonFa);
    }
    return this.repo.getClinicAnalytics(tx, principal.clinicId);
  }

  async getPilotScorecard(tx: DbTx, principal: StaffPrincipal): Promise<PilotScorecardData> {
    const decision = authorizeStaffAction(principal, "analytics:read", principal.tenantId);
    if (!decision.allowed) {
      throw new AnalyticsError(403, decision.code, decision.reasonFa);
    }
    return this.repo.getPilotScorecard(tx, principal.clinicId);
  }

  async getAiQualityAnalytics(tx: DbTx, principal: StaffPrincipal): Promise<AiQualityAnalyticsData> {
    const decision = authorizeStaffAction(principal, "analytics:read", principal.tenantId);
    if (!decision.allowed) {
      throw new AnalyticsError(403, decision.code, decision.reasonFa);
    }
    return this.repo.getAiQualityAnalytics(tx, principal.clinicId);
  }

  async getOpsHealth(
    tx: DbTx,
    principal: StaffPrincipal,
    runtimeSummary: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const decision = authorizeStaffAction(principal, "ops:read", principal.tenantId);
    if (!decision.allowed) {
      throw new AnalyticsError(403, decision.code, decision.reasonFa);
    }
    const probe = await this.repo.probeDatabase(tx);
    return {
      ...runtimeSummary,
      database: { status: "ok", latencyMs: probe.dbLatencyMs },
      queues: {
        unpublishedOutboxEvents: probe.failedOutboxCount,
        pendingOrFailedAiJobs: probe.runningAiJobsCount,
        activeOutages: probe.activeOutagesCount,
      },
    };
  }

  async listOpsJobs(tx: DbTx, principal: StaffPrincipal, limit = 25): Promise<OpsJobsData> {
    const decision = authorizeStaffAction(principal, "ops:read", principal.tenantId);
    if (!decision.allowed) {
      throw new AnalyticsError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listOpsJobs(tx, principal.clinicId, Math.min(100, Math.max(1, limit)));
  }

  listModelRegistry(
    principal: StaffPrincipal,
    runtime: {
      aiEngineMode: string;
      foundationBackbone: string;
      llmProvider: string;
      llmModel: string;
    }
  ): {
    aiEngineMode: string;
    foundationBackbone: string;
    commercialLicensePolicyFa: string;
    llmProvider: string;
    llmModel: string;
    artifacts: ModelArtifactSummary[];
  } {
    const decision = authorizeStaffAction(principal, "ops:read", principal.tenantId);
    if (!decision.allowed) {
      throw new AnalyticsError(403, decision.code, decision.reasonFa);
    }

    const candidates = [
      path.resolve(process.cwd(), "ml/registry/artifacts"),
      path.resolve(process.cwd(), "../../ml/registry/artifacts"),
    ];
    const artifactsDir = candidates.find((p) => fs.existsSync(p));
    const artifacts: ModelArtifactSummary[] = [];

    if (artifactsDir) {
      for (const entry of fs.readdirSync(artifactsDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const modelDir = path.join(artifactsDir, entry.name);
        const metricsPath = path.join(modelDir, "metrics.json");
        const cardPath = path.join(modelDir, "model_card.md");
        let metrics: Record<string, unknown> | null = null;
        if (fs.existsSync(metricsPath)) {
          try {
            metrics = JSON.parse(fs.readFileSync(metricsPath, "utf8")) as Record<string, unknown>;
          } catch {
            metrics = null;
          }
        }
        artifacts.push({
          modelName: entry.name,
          hasMetricsJson: fs.existsSync(metricsPath),
          hasModelCard: fs.existsSync(cardPath),
          metrics,
        });
      }
      artifacts.sort((a, b) => a.modelName.localeCompare(b.modelName));
    }

    return {
      aiEngineMode: runtime.aiEngineMode,
      foundationBackbone: runtime.foundationBackbone,
      commercialLicensePolicyFa:
        "بک‌بون‌های تجاری پیش‌فرض تحت مجوز Apache 2.0 (DINOv2 / SigLIP / MONAI / XGBoost) هستند؛ مدل‌های غیرتجاری (RETFound) در مسیر استنتاج تجاری بارگذاری نمی‌شوند.",
      llmProvider: runtime.llmProvider,
      llmModel: runtime.llmModel,
      artifacts,
    };
  }
}
