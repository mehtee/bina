import type { DbTx } from "../../../packages/db/index.js";
import type { EyeLaterality } from "../../../packages/domain-kernel/index.js";

export type AdherenceState = "taken" | "missed_with_reason" | "unavailable" | "no_response";

export interface DropItem {
  readonly drugNameFa: string;
  readonly genericName: string;
  readonly bottleCapColorFa: string;
  readonly frequencyPerDay: number;
  readonly durationDays: number;
  readonly instructionsFa?: string | undefined;
}

export interface CareEpisodeRecord {
  readonly episodeId: string;
  readonly tenantId: string;
  readonly clinicId: string;
  readonly patientId: string;
  readonly protocolType: string;
  readonly eyeLaterality: EyeLaterality;
  readonly eyeLabelFa: string;
  readonly surgeonId: string;
  readonly accessMode: "app" | "caregiver" | "print_phone";
  readonly activePrescriptionVersion: number;
  readonly status: "active" | "completed" | "cancelled";
  readonly anchorAt: Date;
}

export interface PrescriptionVersionRecord {
  readonly prescriptionId: string;
  readonly tenantId: string;
  readonly episodeId: string;
  readonly version: number;
  readonly eyeLaterality: EyeLaterality;
  readonly eyeLabelFa: string;
  readonly items: DropItem[];
  readonly reasonFa: string;
  readonly publishedByUserId: string;
  readonly publishedAt: Date;
}

export interface AdherenceEventRecord {
  readonly eventId: string;
  readonly episodeId: string;
  readonly eyeLaterality: EyeLaterality;
  readonly prescriptionVersion: number;
  readonly state: AdherenceState;
  readonly reasonFa?: string | undefined;
  readonly deduplicated: boolean;
  readonly recordedAt: Date;
}

export interface PatientTodayDropCard {
  readonly episodeId: string;
  readonly prescriptionVersion: number;
  readonly eyeLaterality: EyeLaterality;
  readonly eyeLabelFa: string;
  readonly drugNameFa: string;
  readonly bottleCapColorFa: string;
  readonly scheduledTimeJalali: string;
  readonly instructionsFa: string;
  readonly taken: boolean;
}

export interface PatientTodayPlan {
  readonly todayJalali: string;
  readonly emergencyHotlinePhone: string;
  readonly clinicStaffedHoursFa: string;
  readonly scheduleItems: PatientTodayDropCard[];
}

export interface CareEpisodeRepoPort {
  createEpisode(
    tx: DbTx,
    input: {
      tenantId: string;
      clinicId: string;
      patientId: string;
      protocolType: string;
      eyeLaterality: EyeLaterality;
      surgeonId: string;
      accessMode: "app" | "caregiver" | "print_phone";
      anchorAt: Date;
    }
  ): Promise<CareEpisodeRecord>;
  findEpisodeById(tx: DbTx, episodeId: string): Promise<CareEpisodeRecord | null>;
  listActiveEpisodesWithLatestRx(
    tx: DbTx,
    patientId: string
  ): Promise<Array<{ episode: CareEpisodeRecord; prescription: PrescriptionVersionRecord | null }>>;
  insertPrescriptionVersion(
    tx: DbTx,
    input: {
      tenantId: string;
      episodeId: string;
      eyeLaterality: EyeLaterality;
      version: number;
      items: DropItem[];
      reasonFa: string;
      publishedByUserId: string;
    }
  ): Promise<PrescriptionVersionRecord>;
  insertAdherenceIdempotent(
    tx: DbTx,
    input: {
      tenantId: string;
      episodeId: string;
      eyeLaterality: EyeLaterality;
      prescriptionVersion: number;
      state: AdherenceState;
      reasonFa?: string | undefined;
      idempotencyKey: string;
      occurredAt: Date;
    }
  ): Promise<AdherenceEventRecord>;
  listAdherenceEvents(tx: DbTx, episodeId: string, limit: number): Promise<AdherenceEventRecord[]>;
}
