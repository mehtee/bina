import { randomUUID } from "node:crypto";
import { authorizeStaffAction, type StaffPrincipal } from "../../../packages/authz/index.js";
import { validateEyePrescriptionInput } from "../../../packages/clinical-rules/index.js";
import { insertOutboxEvent, type DbTx } from "../../../packages/db/index.js";
import {
  assertSingleEyeLaterality,
  formatLateralityFa,
  type EyeLaterality,
} from "../../../packages/domain-kernel/index.js";
import type { AuditLogPort } from "../../audit-compliance/ports/index.js";
import type { ProtocolRegistry } from "../../protocols/index.js";
import { formatJalaliDate, type TenancyRepoPort } from "../../tenancy/index.js";
import type { TriageCaseCreatorPort } from "../../triage-operations/ports/index.js";
import type {
  AdherenceEventRecord,
  AdherenceState,
  CareEpisodeRecord,
  CareEpisodeRepoPort,
  CareEpisodeWorklistFilter,
  CareEpisodeWorklistItem,
  DropItem,
  PatientTodayDropCard,
  PatientTodayPlan,
  PrescriptionVersionRecord,
  PrintPhoneOutreachRecord,
  PrintPhoneQueueItem,
} from "../ports/index.js";

export class CareEpisodeError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    messageFa: string
  ) {
    super(messageFa);
    this.name = "CareEpisodeError";
  }
}

export class CareEpisodeService {
  constructor(
    private readonly repo: CareEpisodeRepoPort,
    private readonly protocols: ProtocolRegistry,
    private readonly tenancyRepo: TenancyRepoPort,
    private readonly triageCreator: TriageCaseCreatorPort,
    private readonly auditLog: AuditLogPort
  ) {}

  async createEpisode(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      patientId: string;
      protocolType: string;
      eyeLaterality: string;
      surgeonId: string;
      accessMode: "app" | "caregiver" | "print_phone";
      anchorAtIso: string;
    }
  ): Promise<CareEpisodeRecord> {
    const decision = authorizeStaffAction(principal, "episode:create", principal.tenantId);
    if (!decision.allowed) {
      throw new CareEpisodeError(403, decision.code, decision.reasonFa);
    }

    let eye: EyeLaterality;
    try {
      eye = assertSingleEyeLaterality(input.eyeLaterality);
    } catch (err) {
      throw new CareEpisodeError(
        400,
        "INVALID_EYE_LATERALITY",
        err instanceof Error ? err.message : "تعیین صریح چشم راست (OD) یا چشم چپ (OS) الزامی است."
      );
    }

    if (!this.protocols.has(input.protocolType)) {
      throw new CareEpisodeError(400, "UNKNOWN_PROTOCOL", `پروتکل درمانی '${input.protocolType}' ثبت نشده است.`);
    }

    const episode = await this.repo.createEpisode(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      patientId: input.patientId,
      protocolType: input.protocolType,
      eyeLaterality: eye,
      surgeonId: input.surgeonId,
      accessMode: input.accessMode,
      anchorAt: new Date(input.anchorAtIso),
    });

    if (input.accessMode === "print_phone") {
      await this.triageCreator.createOrEscalateCase(tx, {
        tenantId: principal.tenantId,
        clinicId: principal.clinicId,
        patientId: input.patientId,
        sourcePillar: "pillar1_care",
        sourceRefId: episode.episodeId,
        eyeLaterality: eye,
        urgencyTier: "followup_3_6m",
        ruleCode: "PRINT_PHONE_COORDINATOR_CHECKIN",
        summaryFa: `پیگیری تلفنی هم‌ارز (Print+Phone) برای بیمار بدون گوشی هوشمند — ${episode.eyeLabelFa}.`,
      });
    }

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "care_episode_created",
      resourceType: "care_episode",
      resourceId: episode.episodeId,
      metadata: { eyeLaterality: eye, accessMode: input.accessMode },
    });

    return episode;
  }

  async listClinicEpisodes(
    tx: DbTx,
    principal: StaffPrincipal,
    filter: CareEpisodeWorklistFilter
  ): Promise<{ items: CareEpisodeWorklistItem[]; total: number }> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new CareEpisodeError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listClinicEpisodes(tx, {
      ...filter,
      clinicId: filter.clinicId ?? principal.clinicId,
      limit: Math.min(100, Math.max(1, filter.limit)),
      offset: Math.max(0, filter.offset),
    });
  }

  async getEpisode(tx: DbTx, episodeId: string): Promise<CareEpisodeRecord> {
    const episode = await this.repo.findEpisodeById(tx, episodeId);
    if (!episode) {
      throw new CareEpisodeError(404, "EPISODE_NOT_FOUND", "اپیزود مراقبتی یافت نشد.");
    }
    return episode;
  }

  async closeEpisode(
    tx: DbTx,
    principal: StaffPrincipal,
    episodeId: string,
    input: { status?: "completed" | "cancelled" | undefined; reasonFa: string }
  ): Promise<CareEpisodeRecord> {
    const decision = authorizeStaffAction(principal, "episode:create", principal.tenantId);
    if (!decision.allowed) {
      throw new CareEpisodeError(403, decision.code, decision.reasonFa);
    }
    const existing = await this.repo.findEpisodeById(tx, episodeId);
    if (!existing) {
      throw new CareEpisodeError(404, "EPISODE_NOT_FOUND", "اپیزود مراقبتی یافت نشد.");
    }
    const nextStatus = input.status ?? "completed";
    const updated = await this.repo.closeEpisode(tx, episodeId, nextStatus);
    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "care_episode_closed",
      resourceType: "care_episode",
      resourceId: episodeId,
      reasonFa: input.reasonFa,
      metadata: { status: nextStatus },
    });
    return updated!;
  }

  async listPrescriptionHistory(tx: DbTx, episodeId: string): Promise<PrescriptionVersionRecord[]> {
    const episode = await this.repo.findEpisodeById(tx, episodeId);
    if (!episode) {
      throw new CareEpisodeError(404, "EPISODE_NOT_FOUND", "اپیزود مراقبتی یافت نشد.");
    }
    return this.repo.listPrescriptionHistory(tx, episodeId);
  }

  async publishPrescription(
    tx: DbTx,
    principal: StaffPrincipal,
    input: {
      episodeId: string;
      eyeLaterality: string;
      items: DropItem[];
      reasonFa: string;
    }
  ): Promise<PrescriptionVersionRecord> {
    const decision = authorizeStaffAction(principal, "prescription:publish", principal.tenantId);
    if (!decision.allowed) {
      throw new CareEpisodeError(403, decision.code, decision.reasonFa);
    }

    const episode = await this.repo.findEpisodeById(tx, input.episodeId);
    if (!episode) {
      throw new CareEpisodeError(404, "EPISODE_NOT_FOUND", "اپیزود مراقبتی یافت نشد.");
    }

    let eye: EyeLaterality;
    try {
      eye = assertSingleEyeLaterality(input.eyeLaterality);
    } catch {
      throw new CareEpisodeError(400, "INVALID_EYE_LATERALITY", "تعیین دقیق چشم راست یا چشم چپ الزامی است.");
    }

    if (eye !== episode.eyeLaterality) {
      throw new CareEpisodeError(
        400,
        "EYE_LATERALITY_MISMATCH",
        `عدم تطابق چشم: این اپیزود متعلق به ${episode.eyeLabelFa} است و امکان انتشار نسخه برای ${formatLateralityFa(eye)} وجود ندارد.`
      );
    }

    const validation = validateEyePrescriptionInput({ eyeLaterality: eye, items: input.items });
    if (!validation.valid) {
      throw new CareEpisodeError(400, "INVALID_PRESCRIPTION", validation.errors.join(" "));
    }

    const nextVersion = episode.activePrescriptionVersion + 1;
    const rx = await this.repo.insertPrescriptionVersion(tx, {
      tenantId: principal.tenantId,
      episodeId: episode.episodeId,
      eyeLaterality: eye,
      version: nextVersion,
      items: input.items,
      reasonFa: input.reasonFa,
      publishedByUserId: principal.userId,
    });

    await insertOutboxEvent(tx, {
      tenantId: principal.tenantId,
      eventType: "episode.prescription-published.v1",
      correlationId: randomUUID(),
      idempotencyKey: `${episode.episodeId}:rx:v${nextVersion}`,
      payload: {
        episodeId: episode.episodeId,
        patientId: episode.patientId,
        prescriptionVersion: nextVersion,
        eyeLaterality: eye,
        publishedByUserId: principal.userId,
        itemCount: input.items.length,
      },
    });

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "prescription_published",
      resourceType: "prescription_version",
      resourceId: rx.prescriptionId,
      metadata: { episodeId: episode.episodeId, eyeLaterality: eye, version: nextVersion },
    });

    return rx;
  }

  async getPatientTodayPlan(
    tx: DbTx,
    patientId: string,
    clinicId: string,
    now: Date = new Date()
  ): Promise<PatientTodayPlan> {
    const clinic = await this.tenancyRepo.findClinicById(tx, clinicId);
    const todayJalali = formatJalaliDate(now, clinic?.timezone ?? "Asia/Tehran");
    const pairs = await this.repo.listActiveEpisodesWithLatestRx(tx, patientId);

    const scheduleItems: PatientTodayDropCard[] = [];
    for (const { episode, prescription } of pairs) {
      if (!prescription) continue;
      for (const item of prescription.items) {
        scheduleItems.push({
          episodeId: episode.episodeId,
          prescriptionVersion: prescription.version,
          eyeLaterality: episode.eyeLaterality,
          eyeLabelFa: episode.eyeLabelFa,
          drugNameFa: item.drugNameFa,
          bottleCapColorFa: item.bottleCapColorFa,
          scheduledTimeJalali: `${todayJalali} — ۱۴:۰۰`,
          instructionsFa:
            item.instructionsFa ?? `یک قطره در ${episode.eyeLabelFa} (${item.frequencyPerDay} بار در روز)`,
          taken: false,
        });
      }
    }

    return {
      todayJalali,
      emergencyHotlinePhone: clinic?.emergencyPhone ?? "+982182400000",
      clinicStaffedHoursFa: "همه‌روزه ۸ تا ۲۰؛ در ساعات غیرکاری با اورژانس چشم تماس بگیرید",
      scheduleItems,
    };
  }

  async listPatientEpisodes(
    tx: DbTx,
    patientId: string
  ): Promise<Array<{ episode: CareEpisodeRecord; prescription: PrescriptionVersionRecord | null }>> {
    return this.repo.listActiveEpisodesWithLatestRx(tx, patientId);
  }

  async listEpisodeAdherence(
    tx: DbTx,
    episodeId: string,
    limit = 50
  ): Promise<AdherenceEventRecord[]> {
    const episode = await this.repo.findEpisodeById(tx, episodeId);
    if (!episode) {
      throw new CareEpisodeError(404, "EPISODE_NOT_FOUND", "اپیزود مراقبتی یافت نشد.");
    }
    return this.repo.listAdherenceEvents(tx, episodeId, Math.max(1, Math.min(limit, 200)));
  }

  async recordAdherence(
    tx: DbTx,
    input: {
      tenantId: string;
      episodeId: string;
      eyeLaterality: string;
      prescriptionVersion: number;
      state: AdherenceState;
      reasonFa?: string | undefined;
      idempotencyKey: string;
      occurredAtIso: string;
    }
  ): Promise<AdherenceEventRecord> {
    const episode = await this.repo.findEpisodeById(tx, input.episodeId);
    if (!episode) {
      throw new CareEpisodeError(404, "EPISODE_NOT_FOUND", "اپیزود مراقبتی یافت نشد.");
    }
    const eye = assertSingleEyeLaterality(input.eyeLaterality);
    if (eye !== episode.eyeLaterality) {
      throw new CareEpisodeError(400, "EYE_LATERALITY_MISMATCH", "عدم تطابق چشم راست/چپ با اپیزود.");
    }
    return this.repo.insertAdherenceIdempotent(tx, {
      tenantId: input.tenantId,
      episodeId: input.episodeId,
      eyeLaterality: eye,
      prescriptionVersion: input.prescriptionVersion,
      state: input.state,
      reasonFa: input.reasonFa,
      idempotencyKey: input.idempotencyKey,
      occurredAt: new Date(input.occurredAtIso),
    });
  }

  async listPrintPhoneQueue(tx: DbTx, principal: StaffPrincipal): Promise<PrintPhoneQueueItem[]> {
    const decision = authorizeStaffAction(principal, "clinic:read", principal.tenantId);
    if (!decision.allowed) {
      throw new CareEpisodeError(403, decision.code, decision.reasonFa);
    }
    return this.repo.listPrintPhoneQueue(tx, principal.clinicId);
  }

  async recordPrintPhoneOutreach(
    tx: DbTx,
    principal: StaffPrincipal,
    episodeId: string,
    input: { status: "completed" | "pending" | "missed"; outcomeFa: string }
  ): Promise<PrintPhoneOutreachRecord> {
    const decision = authorizeStaffAction(principal, "triage:manage", principal.tenantId);
    if (!decision.allowed) {
      throw new CareEpisodeError(403, decision.code, decision.reasonFa);
    }
    const episode = await this.repo.findEpisodeById(tx, episodeId);
    if (!episode) {
      throw new CareEpisodeError(404, "EPISODE_NOT_FOUND", "اپیزود مراقبتی یافت نشد.");
    }

    const record = await this.repo.recordPrintPhoneOutreach(tx, {
      tenantId: principal.tenantId,
      clinicId: principal.clinicId,
      patientId: episode.patientId,
      episodeId: episode.episodeId,
      eyeLaterality: episode.eyeLaterality,
      staffUserId: principal.userId,
      status: input.status,
      outcomeFa: input.outcomeFa.trim(),
    });

    await this.auditLog.append(tx, {
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      actorRole: principal.role,
      action: "care.print-phone-outreach-logged",
      resourceType: "follow_up_task",
      resourceId: record.taskId,
      metadata: { episodeId, status: input.status },
    });

    return record;
  }
}
