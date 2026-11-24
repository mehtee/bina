import type { DbTx } from "../../packages/db/index.js";

export interface BillingAdherenceEvidence {
  readonly patientId: string;
  readonly periodStartJalali: string;
  readonly periodEndJalali: string;
  readonly acceptedHomeVisionTestCount: number;
  readonly confirmedAdherenceEventCount: number;
  readonly disclaimerFa: string;
}

/**
 * Generates strictly non-diagnostic telemonitoring & adherence evidence packets
 * suitable for optional supplementary insurance reimbursement reviews.
 */
export class BillingEvidenceService {
  async generatePatientEvidence(
    tx: DbTx,
    input: {
      tenantId: string;
      patientId: string;
      periodStartJalali: string;
      periodEndJalali: string;
    }
  ): Promise<BillingAdherenceEvidence> {
    const r2Res = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt
       FROM home_vision_tests
       WHERE tenant_id = $1 AND patient_id = $2 AND quality_status = 'accepted'`,
      [input.tenantId, input.patientId]
    );

    const adhRes = await tx.query<{ cnt: string }>(
      `SELECT count(*)::text AS cnt
       FROM medication_adherence_events ae
       JOIN care_episodes ce ON ce.id = ae.episode_id
       WHERE ce.tenant_id = $1 AND ce.patient_id = $2 AND ae.state = 'taken'`,
      [input.tenantId, input.patientId]
    );

    return {
      patientId: input.patientId,
      periodStartJalali: input.periodStartJalali,
      periodEndJalali: input.periodEndJalali,
      acceptedHomeVisionTestCount: Number(r2Res.rows[0]?.cnt ?? "0"),
      confirmedAdherenceEventCount: Number(adhRes.rows[0]?.cnt ?? "0"),
      disclaimerFa:
        "این گزارش صرفاً مستندسازی پیگیری و پایبندی بیمار به برنامه مراقبتی است و جایگزین تشخیص بالینی پزشک نیست.",
    };
  }
}
