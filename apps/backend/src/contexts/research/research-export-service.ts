import crypto from "node:crypto";
import { authorizeStaffAction, type StaffPrincipal } from "../../packages/authz/index.js";
import type { DbTx } from "../../packages/db/index.js";
import type { AuditLogPort } from "../audit-compliance/ports/index.js";

export class ResearchExportError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    messageFa: string
  ) {
    super(messageFa);
  }
}

export interface PseudonymizedStudyRow {
  readonly subjectPseudonym: string;
  readonly eyeLaterality: string;
  readonly studyStatus: string;
  readonly topConditionCode: string | null;
  readonly finalUrgency: string | null;
}

export interface ResearchCohortExportBundle {
  readonly irbProtocolCode: string;
  readonly exportedAtIso: string;
  readonly recordCount: number;
  readonly records: readonly PseudonymizedStudyRow[];
  readonly manifestSha256: string;
}

export class ResearchExportService {
  constructor(
    private readonly auditLog: AuditLogPort,
    private readonly pseudonymSalt: string
  ) {}

  async exportPseudonymizedCohort(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      irbProtocolCode: string;
      reasonFa: string;
      limit?: number | undefined;
    }
  ): Promise<ResearchCohortExportBundle> {
    const decision = authorizeStaffAction(principal, "export:phi", principal.tenantId, {
      reasonFa: input.reasonFa,
    });
    if (!decision.allowed) {
      throw new ResearchExportError(403, decision.code, decision.reasonFa);
    }
    if (input.irbProtocolCode.trim().length < 4) {
      throw new ResearchExportError(400, "IRB_PROTOCOL_REQUIRED", "کد مصوبه کمیته اخلاق پژوهشی (IRB) الزامی است.");
    }

    const rowLimit = Math.min(500, Math.max(1, input.limit ?? 100));
    const res = await tx.query<{
      patient_id: string;
      eye_laterality: string;
      status: string;
      top_condition_code: string | null;
      final_urgency: string | null;
    }>(
      `SELECT ds.patient_id,
              ds.eye_laterality,
              ds.status,
              (fa.differential_json->0->>'conditionCode') AS top_condition_code,
              cs.final_urgency
       FROM diagnostic_studies ds
       LEFT JOIN fusion_assessments fa ON fa.study_id = ds.id
       LEFT JOIN clinician_signoffs cs ON cs.study_id = ds.id
       WHERE ds.tenant_id = $1
       ORDER BY ds.created_at DESC
       LIMIT $2`,
      [principal.tenantId, rowLimit]
    );

    const records: PseudonymizedStudyRow[] = res.rows.map((r) => ({
      subjectPseudonym: `SUBJ-${crypto
        .createHmac("sha256", `${this.pseudonymSalt}:${input.irbProtocolCode}`)
        .update(r.patient_id)
        .digest("hex")
        .slice(0, 14)}`,
      eyeLaterality: r.eye_laterality,
      studyStatus: r.status,
      topConditionCode: r.top_condition_code,
      finalUrgency: r.final_urgency,
    }));

    const exportedAtIso = new Date().toISOString();
    const manifestSha256 = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          irbProtocolCode: input.irbProtocolCode,
          tenantId: principal.tenantId,
          records,
        })
      )
      .digest("hex");

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "research.pseudonymized-cohort-exported",
      resourceType: "research_export",
      resourceId: manifestSha256,
      reasonFa: input.reasonFa,
      metadata: {
        irbProtocolCode: input.irbProtocolCode,
        recordCount: records.length,
      },
    });

    return {
      irbProtocolCode: input.irbProtocolCode,
      exportedAtIso,
      recordCount: records.length,
      records,
      manifestSha256,
    };
  }
}
