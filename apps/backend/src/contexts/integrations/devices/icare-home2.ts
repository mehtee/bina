import crypto from "node:crypto";
import { evaluateEwmaCusumShift } from "../../../packages/clinical-rules/index.js";
import type { DbTx } from "../../../packages/db/index.js";
import type { EyeLaterality, UrgencyTier } from "../../../packages/domain-kernel/index.js";

export interface IcareHome2ReadingInput {
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly deviceSerial: string;
  readonly eyeLaterality: EyeLaterality;
  readonly iopMmHg: number;
  readonly qualityScore: number;
  readonly measuredAtIso: string;
}

export interface IcareHome2IngestResult {
  readonly readingId: string;
  readonly accepted: boolean;
  readonly alertTier: UrgencyTier;
  readonly ewmaIopMmHg: number;
  readonly summaryFa: string;
}

export class IcareHome2Service {
  async ingestReading(
    tx: DbTx,
    input: IcareHome2ReadingInput
  ): Promise<IcareHome2IngestResult> {
    const serialHash = crypto.createHash("sha256").update(input.deviceSerial.trim()).digest("hex");
    const accepted = input.qualityScore >= 0.7 && input.iopMmHg >= 3 && input.iopMmHg <= 80;

    const inserted = await tx.query<{ id: string }>(
      `INSERT INTO external_tonometry_readings (
         tenant_id, clinic_id, patient_id, device_vendor, device_serial_hash,
         eye_laterality, iop_mm_hg, quality_score, accepted, measured_at
       ) VALUES ($1, $2, $3, 'iCare_HOME2', $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        input.tenantId,
        input.clinicId,
        input.patientId,
        serialHash,
        input.eyeLaterality,
        input.iopMmHg,
        input.qualityScore,
        accepted,
        input.measuredAtIso,
      ]
    );
    const readingId = inserted.rows[0]!.id;
    const eyeFa = input.eyeLaterality === "OD" ? "چشم راست" : "چشم چپ";

    if (!accepted) {
      return {
        readingId,
        accepted: false,
        alertTier: "routine",
        ewmaIopMmHg: input.iopMmHg,
        summaryFa: `اندازه‌گیری فشار ${eyeFa} کیفیت کافی نداشت و ثبت تحلیلی نشد.`,
      };
    }

    const recent = await tx.query<{ iop_mm_hg: number }>(
      `SELECT iop_mm_hg
       FROM external_tonometry_readings
       WHERE patient_id = $1 AND eye_laterality = $2 AND accepted = true
       ORDER BY measured_at ASC
       LIMIT 20`,
      [input.patientId, input.eyeLaterality]
    );
    const iops = recent.rows.map((r) => r.iop_mm_hg);
    const shift = evaluateEwmaCusumShift(iops, 16.0, 2.5);

    let alertTier: UrgencyTier = "routine";
    if (input.iopMmHg >= 30) {
      alertTier = "urgent";
    } else if (input.iopMmHg >= 24 || shift.shifted) {
      alertTier = "followup_3_6m";
    }

    const summaryFa =
      alertTier === "urgent"
        ? `افزایش شدید فشار داخل چشم (${input.iopMmHg} mmHg) در ${eyeFa} ثبت شد؛ ارزیابی فوری لازم است.`
        : alertTier === "followup_3_6m"
          ? `فشار چشم بالاتر از حد پایه (${input.iopMmHg} mmHg) در ${eyeFa} ثبت شد؛ پیگیری کلینیک توصیه می‌شود.`
          : `فشار چشم ثبت‌شده برای ${eyeFa} (${input.iopMmHg} mmHg) در محدوده پایدار است.`;

    return {
      readingId,
      accepted: true,
      alertTier,
      ewmaIopMmHg: shift.ewma,
      summaryFa,
    };
  }
}
