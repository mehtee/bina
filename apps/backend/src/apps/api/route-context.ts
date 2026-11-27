import type { FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import type { AnalyticsService } from "../../contexts/analytics/index.js";
import type { AuditComplianceService, PgAuditLogRepo } from "../../contexts/audit-compliance/index.js";
import type { BillingEvidenceService } from "../../contexts/billing-evidence/index.js";
import type { CareEpisodeService } from "../../contexts/care-episodes/index.js";
import type { DiagnosticStudyService } from "../../contexts/diagnostic-studies/index.js";
import {
  EnrollmentHttpError,
  type EnrollmentService,
} from "../../contexts/enrollment-consent/index.js";
import {
  verifySessionToken,
  type SessionTokenClaims,
  type StaffAuthService,
} from "../../contexts/identity-access/index.js";
import type { IcareHome2Service, IntegrationsService } from "../../contexts/integrations/index.js";
import type { ProtocolRegistry } from "../../contexts/protocols/index.js";
import type { R2MonitoringService } from "../../contexts/r2-monitoring/index.js";
import type { ReportingService } from "../../contexts/reporting/index.js";
import type { ResearchExportService } from "../../contexts/research/index.js";
import type { SymptomService } from "../../contexts/symptoms/index.js";
import type { PgTenancyRepo, TenancyService } from "../../contexts/tenancy/index.js";
import type { PgTriageRepo, TriageService } from "../../contexts/triage-operations/index.js";
import type { StaffPrincipal, StaffRole } from "../../packages/authz/index.js";
import type { AppConfig } from "./config.js";

export class HttpUnauthorizedError extends Error {
  readonly statusCode = 401;
  readonly code = "UNAUTHORIZED";
  constructor(messageFa = "احراز هویت نامعتبر یا منقضی است.") {
    super(messageFa);
  }
}

export interface ApiRouteContext {
  readonly config: AppConfig;
  readonly appPool: Pool;
  readonly auditRepo: PgAuditLogRepo;
  readonly auditComplianceService: AuditComplianceService;
  readonly tenancyRepo: PgTenancyRepo;
  readonly tenancyService: TenancyService;
  readonly staffAuthService: StaffAuthService;
  readonly enrollmentService: EnrollmentService;
  readonly protocolRegistry: ProtocolRegistry;
  readonly triageRepo: PgTriageRepo;
  readonly triageService: TriageService;
  readonly careEpisodeService: CareEpisodeService;
  readonly symptomService: SymptomService;
  readonly r2MonitoringService: R2MonitoringService;
  readonly icareHome2Service: IcareHome2Service;
  readonly researchExportService: ResearchExportService;
  readonly billingEvidenceService: BillingEvidenceService;
  readonly diagnosticStudyService: DiagnosticStudyService;
  readonly reportingService: ReportingService;
  readonly integrationsService: IntegrationsService;
  readonly analyticsService: AnalyticsService;
  resolveTenantIdForPublicClinicCall(
    req: FastifyRequest,
    bodyTenantId: string | undefined,
    clinicId: string
  ): Promise<string>;
}

export function requireClaims(req: FastifyRequest, signingSecret: string): SessionTokenClaims {
  const auth = req.headers.authorization ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (!match?.[1]) {
    throw new HttpUnauthorizedError();
  }
  const claims = verifySessionToken(match[1].trim(), signingSecret);
  if (!claims) {
    throw new HttpUnauthorizedError();
  }
  return claims;
}

export function asStaffPrincipal(claims: SessionTokenClaims): StaffPrincipal {
  if (claims.actorType !== "staff" || !claims.role) {
    throw new EnrollmentHttpError(403, "STAFF_TOKEN_REQUIRED", "این مسیر مخصوص کادر درمان است.");
  }
  return {
    userId: claims.sub,
    tenantId: claims.tenantId,
    clinicId: claims.clinicId,
    role: claims.role as StaffRole,
    mfaVerified: Boolean(claims.mfaVerified),
    stepUpVerified: Boolean(claims.stepUpVerified),
  };
}

export function requireHeaderUuid(req: FastifyRequest, headerName: string): string {
  const raw = req.headers[headerName.toLowerCase()];
  const value = typeof raw === "string" ? raw.trim() : "";
  return z.string().uuid().parse(value);
}

export function parsePagination(query: unknown): { limit: number; offset: number } {
  const parsed = z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(25),
      offset: z.coerce.number().int().min(0).default(0),
    })
    .parse(query ?? {});
  return { limit: parsed.limit, offset: parsed.offset };
}
