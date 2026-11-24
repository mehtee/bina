import type { DbTx } from "../../../packages/db/index.js";
import type { StudyLaterality, UrgencyTier } from "../../../packages/domain-kernel/index.js";
import type { TriageStatus } from "../domain/sla.js";

export type TriageSourcePillar = "pillar1_care" | "pillar2_diagnostic";

export interface TriageCaseRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly sourcePillar: TriageSourcePillar;
  readonly sourceRefId?: string | undefined;
  readonly eyeLaterality: StudyLaterality;
  readonly eyeLabelFa: string;
  readonly status: TriageStatus;
  readonly urgencyTier: UrgencyTier;
  readonly urgencyLabelFa: string;
  readonly ownerId: string | null;
  readonly slaDueAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ReferralRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly caseId: string;
  readonly destinationHospitalFa: string;
  readonly reasonFa: string;
  readonly urgent: boolean;
  readonly status: "dispatched" | "attended" | "missed";
  readonly missReasonFa?: string | undefined;
  readonly createdAt: Date;
}

export interface CreateOrEscalateTriageInput {
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly sourcePillar: TriageSourcePillar;
  readonly sourceRefId?: string | undefined;
  readonly eyeLaterality: StudyLaterality;
  readonly urgencyTier: UrgencyTier;
  readonly ruleCode: string;
  readonly summaryFa: string;
  readonly now?: Date | undefined;
}

export interface TriageCaseCreatorPort {
  createOrEscalateCase(tx: DbTx, input: CreateOrEscalateTriageInput): Promise<TriageCaseRecord>;
}

export interface TriageRepoPort extends TriageCaseCreatorPort {
  findById(tx: DbTx, caseId: string): Promise<TriageCaseRecord | null>;
  listCases(tx: DbTx): Promise<TriageCaseRecord[]>;
  claimCase(tx: DbTx, caseId: string, staffUserId: string, now: Date): Promise<TriageCaseRecord | null>;
  handoffCase(
    tx: DbTx,
    caseId: string,
    fromStaffId: string,
    targetStaffUserId: string,
    noteFa: string,
    now: Date
  ): Promise<TriageCaseRecord | null>;
  createReferral(
    tx: DbTx,
    input: {
      tenantId: string;
      caseId: string;
      destinationHospitalFa: string;
      reasonFa: string;
      urgent: boolean;
    }
  ): Promise<ReferralRecord>;
  updateReferralStatus(
    tx: DbTx,
    referralId: string,
    status: "dispatched" | "attended" | "missed",
    missReasonFa?: string | undefined
  ): Promise<ReferralRecord | null>;
}
