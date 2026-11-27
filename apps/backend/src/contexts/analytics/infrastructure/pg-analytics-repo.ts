import type { DbTx } from "../../../packages/db/index.js";
import {
  formatLateralityFa,
  URGENCY_LABELS_FA,
  type StudyLaterality,
  type UrgencyTier,
} from "../../../packages/domain-kernel/index.js";
import { redactPhiString } from "../../../packages/observability/index.js";
import { formatJalaliDate } from "../../tenancy/index.js";
import type {
  AiQualityAnalyticsData,
  AnalyticsRepoPort,
  ClinicAnalyticsData,
  KpiRatio,
  OpsJobsData,
  OverviewDashboardData,
  Patient360View,
  PatientTimelineEvent,
  PilotScorecardData,
  RecentActivityItem,
  WorkspaceSearchResult,
} from "../ports/index.js";

function makeRatio(numerator: number, denominator: number): KpiRatio {
  return {
    numerator,
    denominator,
    rate: denominator === 0 ? null : Number((numerator / denominator).toFixed(4)),
  };
}

export class PgAnalyticsRepo implements AnalyticsRepoPort {
  async getOverviewDashboard(
    tx: DbTx,
    clinicId: string
  ): Promise<Omit<OverviewDashboardData, "todayJalali">> {
    const countsRes = await tx.query<{
      active_od: string;
      active_os: string;
      print_phone: string;
      urgent_triage: string;
      overdue_sla: string;
      open_triage: string;
      pending_hitl: string;
      qc_failed: string;
      r2_alerts: string;
      active_outages: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM care_episodes WHERE clinic_id = $1 AND status = 'active' AND eye_laterality = 'OD') AS active_od,
         (SELECT count(*)::text FROM care_episodes WHERE clinic_id = $1 AND status = 'active' AND eye_laterality = 'OS') AS active_os,
         (SELECT count(*)::text FROM care_episodes WHERE clinic_id = $1 AND status = 'active' AND access_mode = 'print_phone') AS print_phone,
         (SELECT count(*)::text FROM triage_cases WHERE clinic_id = $1 AND status <> 'Closed' AND urgency_tier = 'urgent') AS urgent_triage,
         (SELECT count(*)::text FROM triage_cases WHERE clinic_id = $1 AND status <> 'Closed' AND sla_due_at < now()) AS overdue_sla,
         (SELECT count(*)::text FROM triage_cases WHERE clinic_id = $1 AND status <> 'Closed') AS open_triage,
         (SELECT count(*)::text FROM diagnostic_studies WHERE clinic_id = $1 AND status = 'pending_hitl') AS pending_hitl,
         (SELECT count(*)::text FROM diagnostic_studies WHERE clinic_id = $1 AND status = 'qc_failed') AS qc_failed,
         (SELECT count(*)::text FROM vision_trend_alerts WHERE clinic_id = $1) AS r2_alerts,
         (SELECT count(*)::text FROM clinic_outages WHERE clinic_id = $1 AND status <> 'resolved') AS active_outages`,
      [clinicId]
    );
    const c = countsRes.rows[0]!;

    const urgentRes = await tx.query<{
      id: string;
      patient_id: string;
      full_name_fa: string;
      eye_laterality: StudyLaterality;
      status: string;
      sla_due_at: Date;
    }>(
      `SELECT tc.id, tc.patient_id, p.full_name_fa, tc.eye_laterality, tc.status, tc.sla_due_at
       FROM triage_cases tc
       JOIN patients p ON p.id = tc.patient_id
       WHERE tc.clinic_id = $1 AND tc.status <> 'Closed'
       ORDER BY CASE tc.urgency_tier WHEN 'urgent' THEN 0 WHEN 'followup_3_6m' THEN 1 ELSE 2 END ASC,
                tc.sla_due_at ASC
       LIMIT 8`,
      [clinicId]
    );

    const hitlRes = await tx.query<{
      id: string;
      patient_id: string;
      full_name_fa: string;
      eye_laterality: StudyLaterality;
      final_urgency: UrgencyTier | null;
      created_at: Date;
    }>(
      `SELECT ds.id, ds.patient_id, p.full_name_fa, ds.eye_laterality,
              (SELECT fa.final_urgency FROM fusion_assessments fa WHERE fa.study_id = ds.id ORDER BY fa.created_at DESC LIMIT 1) AS final_urgency,
              ds.created_at
       FROM diagnostic_studies ds
       JOIN patients p ON p.id = ds.patient_id
       WHERE ds.clinic_id = $1 AND ds.status = 'pending_hitl'
       ORDER BY ds.created_at DESC
       LIMIT 8`,
      [clinicId]
    );

    return {
      activeEpisodesOd: Number(c.active_od),
      activeEpisodesOs: Number(c.active_os),
      printPhoneCohortCount: Number(c.print_phone),
      urgentTriageCount: Number(c.urgent_triage),
      overdueSlaCount: Number(c.overdue_sla),
      openTriageCount: Number(c.open_triage),
      pendingHitlStudies: Number(c.pending_hitl),
      qcFailedStudies: Number(c.qc_failed),
      r2AlertCount: Number(c.r2_alerts),
      activeOutagesCount: Number(c.active_outages),
      queueUrgentItems: urgentRes.rows.map((r) => ({
        caseId: r.id,
        patientId: r.patient_id,
        patientNameFa: r.full_name_fa,
        eyeLaterality: r.eye_laterality,
        eyeLabelFa: formatLateralityFa(r.eye_laterality),
        status: r.status,
        slaDueAtIso: r.sla_due_at.toISOString(),
      })),
      pendingHitlItems: hitlRes.rows.map((r) => ({
        studyId: r.id,
        patientId: r.patient_id,
        patientNameFa: r.full_name_fa,
        eyeLaterality: r.eye_laterality,
        eyeLabelFa: formatLateralityFa(r.eye_laterality),
        urgencyTier: r.final_urgency,
        urgencyLabelFa: r.final_urgency ? URGENCY_LABELS_FA[r.final_urgency] : null,
        createdAtIso: r.created_at.toISOString(),
      })),
    };
  }

  async searchWorkspace(
    tx: DbTx,
    clinicId: string,
    q: string,
    flags: { includePatients: boolean; includeReports: boolean }
  ): Promise<WorkspaceSearchResult> {
    const pattern = `%${q.trim()}%`;

    const patientsPromise = flags.includePatients
      ? tx.query<{
          id: string;
          full_name_fa: string;
          phone_masked: string;
          access_mode: string;
        }>(
          `SELECT id, full_name_fa, phone_masked, access_mode
           FROM patients
           WHERE clinic_id = $1
             AND (full_name_fa ILIKE $2 OR COALESCE(national_id_masked, '') ILIKE $2 OR id::text ILIKE $2)
           ORDER BY created_at DESC
           LIMIT 10`,
          [clinicId, pattern]
        )
      : Promise.resolve({ rows: [] });

    const studiesPromise = tx.query<{
      id: string;
      patient_id: string;
      full_name_fa: string;
      status: string;
      eye_laterality: StudyLaterality;
      created_at: Date;
    }>(
      `SELECT ds.id, ds.patient_id, p.full_name_fa, ds.status, ds.eye_laterality, ds.created_at
       FROM diagnostic_studies ds
       JOIN patients p ON p.id = ds.patient_id
       WHERE ds.clinic_id = $1
         AND (ds.id::text ILIKE $2 OR p.full_name_fa ILIKE $2 OR ds.status ILIKE $2)
       ORDER BY ds.created_at DESC
       LIMIT 10`,
      [clinicId, pattern]
    );

    const episodesPromise = tx.query<{
      id: string;
      patient_id: string;
      full_name_fa: string;
      protocol_type: string;
      eye_laterality: StudyLaterality;
      status: string;
    }>(
      `SELECT ce.id, ce.patient_id, p.full_name_fa, ce.protocol_type, ce.eye_laterality, ce.status
       FROM care_episodes ce
       JOIN patients p ON p.id = ce.patient_id
       WHERE ce.clinic_id = $1
         AND (ce.id::text ILIKE $2 OR p.full_name_fa ILIKE $2 OR ce.protocol_type ILIKE $2)
       ORDER BY ce.created_at DESC
       LIMIT 10`,
      [clinicId, pattern]
    );

    const reportsPromise = flags.includeReports
      ? tx.query<{
          id: string;
          patient_id: string;
          report_type: string;
          payload_json: { titleFa?: string; issuedAtJalali?: string };
        }>(
          `SELECT rv.id, rv.patient_id, rv.report_type, rv.payload_json
           FROM report_versions rv
           JOIN patients p ON p.id = rv.patient_id
           WHERE rv.clinic_id = $1
             AND (rv.id::text ILIKE $2 OR COALESCE(rv.payload_json->>'titleFa', '') ILIKE $2 OR p.full_name_fa ILIKE $2)
           ORDER BY rv.created_at DESC
           LIMIT 10`,
          [clinicId, pattern]
        )
      : Promise.resolve({ rows: [] });

    const [pRes, sRes, eRes, rRes] = await Promise.all([
      patientsPromise,
      studiesPromise,
      episodesPromise,
      reportsPromise,
    ]);

    return {
      query: q.trim(),
      patients: pRes.rows.map((r) => ({
        patientId: r.id,
        fullNameFa: r.full_name_fa,
        phoneMasked: r.phone_masked,
        accessMode: r.access_mode,
      })),
      studies: sRes.rows.map((r) => ({
        studyId: r.id,
        patientId: r.patient_id,
        patientNameFa: r.full_name_fa,
        status: r.status,
        eyeLabelFa: formatLateralityFa(r.eye_laterality),
        createdAtJalali: formatJalaliDate(r.created_at),
      })),
      episodes: eRes.rows.map((r) => ({
        episodeId: r.id,
        patientId: r.patient_id,
        patientNameFa: r.full_name_fa,
        protocolType: r.protocol_type,
        eyeLabelFa: formatLateralityFa(r.eye_laterality),
        status: r.status,
      })),
      reports: rRes.rows.map((r) => ({
        reportId: r.id,
        patientId: r.patient_id,
        reportType: r.report_type,
        titleFa: r.payload_json.titleFa ?? r.report_type,
        issuedAtJalali: r.payload_json.issuedAtJalali ?? "",
      })),
    };
  }

  async listRecentActivity(tx: DbTx, limit: number): Promise<RecentActivityItem[]> {
    const res = await tx.query<{
      id: string;
      action: string;
      actor_role: string;
      resource_type: string;
      resource_id: string;
      break_glass: boolean;
      reason_fa: string | null;
      occurred_at: Date;
    }>(
      `SELECT id, action, actor_role, resource_type, resource_id, break_glass, reason_fa, occurred_at
       FROM audit_logs
       ORDER BY occurred_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows.map((r) => ({
      activityId: r.id,
      action: r.action,
      actorRole: r.actor_role,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      breakGlass: r.break_glass,
      reasonFa: r.reason_fa ? redactPhiString(r.reason_fa) : null,
      occurredAtIso: r.occurred_at.toISOString(),
      occurredAtJalali: formatJalaliDate(r.occurred_at),
    }));
  }

  async getPatient360(tx: DbTx, patientId: string): Promise<Patient360View | null> {
    const pRes = await tx.query<{
      id: string;
      clinic_id: string;
      full_name_fa: string;
      phone_masked: string;
      national_id_masked: string | null;
      birth_year_jalali: number | null;
      notes_fa: string | null;
      preferred_locale: string;
      access_mode: "app" | "caregiver" | "print_phone";
      ml_training_consent_flag: boolean;
    }>(
      `SELECT id, clinic_id, full_name_fa, phone_masked, national_id_masked, birth_year_jalali, notes_fa,
              preferred_locale, access_mode, ml_training_consent_flag
       FROM patients WHERE id = $1`,
      [patientId]
    );
    const p = pRes.rows[0];
    if (!p) return null;

    const [epRes, studyRes, baseRes, alertRes, iopRes, triageRes, taskRes, histRes, consentRes] =
      await Promise.all([
        tx.query<{
          id: string;
          protocol_type: string;
          eye_laterality: "OD" | "OS";
          access_mode: string;
          active_prescription_version: number;
          status: string;
          anchor_at: Date;
          items_json: unknown[] | null;
        }>(
          `SELECT ce.id, ce.protocol_type, ce.eye_laterality, ce.access_mode, ce.active_prescription_version,
                  ce.status, ce.anchor_at,
                  (SELECT pv.items_json FROM prescription_versions pv WHERE pv.episode_id = ce.id AND pv.version = ce.active_prescription_version LIMIT 1) AS items_json
           FROM care_episodes ce
           WHERE ce.patient_id = $1
           ORDER BY ce.created_at DESC`,
          [patientId]
        ),
        tx.query<{
          id: string;
          eye_laterality: StudyLaterality;
          status: string;
          final_urgency: UrgencyTier | null;
          top_condition: string | null;
          created_at: Date;
        }>(
          `SELECT ds.id, ds.eye_laterality, ds.status,
                  COALESCE(
                    (SELECT cs.final_urgency FROM clinician_signoffs cs WHERE cs.study_id = ds.id ORDER BY cs.signed_at DESC LIMIT 1),
                    (SELECT fa.final_urgency FROM fusion_assessments fa WHERE fa.study_id = ds.id ORDER BY fa.created_at DESC LIMIT 1)
                  ) AS final_urgency,
                  (SELECT fa.differential_json->0->>'conditionNameFa' FROM fusion_assessments fa WHERE fa.study_id = ds.id ORDER BY fa.created_at DESC LIMIT 1) AS top_condition,
                  ds.created_at
           FROM diagnostic_studies ds
           WHERE ds.patient_id = $1
           ORDER BY ds.created_at DESC
           LIMIT 10`,
          [patientId]
        ),
        tx.query<{ eye_laterality: "OD" | "OS"; baseline_va_logmar: number }>(
          `SELECT eye_laterality, baseline_va_logmar FROM vision_baselines WHERE patient_id = $1`,
          [patientId]
        ),
        tx.query<{
          id: string;
          eye_laterality: "OD" | "OS";
          rule_code: string;
          severity: UrgencyTier;
          summary_fa: string;
          created_at: Date;
        }>(
          `SELECT id, eye_laterality, rule_code, severity, summary_fa, created_at
           FROM vision_trend_alerts
           WHERE patient_id = $1
           ORDER BY created_at DESC
           LIMIT 10`,
          [patientId]
        ),
        tx.query<{ eye_laterality: "OD" | "OS"; iop_mm_hg: number; measured_at: Date }>(
          `SELECT DISTINCT ON (eye_laterality) eye_laterality, iop_mm_hg, measured_at
           FROM external_tonometry_readings
           WHERE patient_id = $1 AND accepted = true
           ORDER BY eye_laterality, measured_at DESC`,
          [patientId]
        ),
        tx.query<{
          id: string;
          source_pillar: string;
          eye_laterality: StudyLaterality;
          status: string;
          urgency_tier: UrgencyTier;
          sla_due_at: Date;
        }>(
          `SELECT id, source_pillar, eye_laterality, status, urgency_tier, sla_due_at
           FROM triage_cases
           WHERE patient_id = $1 AND status <> 'Closed'
           ORDER BY sla_due_at ASC`,
          [patientId]
        ),
        tx.query<{
          id: string;
          task_type: string;
          eye_laterality: StudyLaterality | null;
          due_at: Date;
          status: string;
        }>(
          `SELECT id, task_type, eye_laterality, due_at, status
           FROM follow_up_tasks
           WHERE patient_id = $1 AND status = 'pending'
           ORDER BY due_at ASC`,
          [patientId]
        ),
        tx.query<{
          id: string;
          summary_fa: string;
          conditions_json: string[];
          allergies_json: string[];
          medications_json: string[];
          created_at: Date;
        }>(
          `SELECT id, summary_fa, conditions_json, allergies_json, medications_json, created_at
           FROM patient_clinical_histories
           WHERE patient_id = $1
           ORDER BY created_at DESC
           LIMIT 10`,
          [patientId]
        ),
        tx.query<{ id: string; consent_version: string; action: string; accepted_at: Date }>(
          `SELECT id, consent_version, action, accepted_at
           FROM consent_acceptances
           WHERE patient_id = $1
           ORDER BY accepted_at DESC`,
          [patientId]
        ),
      ]);

    const mappedEpisodes = epRes.rows.map((e) => ({
      episodeId: e.id,
      protocolType: e.protocol_type,
      eyeLaterality: e.eye_laterality,
      eyeLabelFa: formatLateralityFa(e.eye_laterality),
      accessMode: e.access_mode,
      activePrescriptionVersion: e.active_prescription_version,
      activeItems: e.items_json ?? [],
      status: e.status,
      anchorAtIso: e.anchor_at.toISOString(),
      anchorAtJalali: formatJalaliDate(e.anchor_at),
    }));

    const odBase = baseRes.rows.find((b) => b.eye_laterality === "OD")?.baseline_va_logmar ?? null;
    const osBase = baseRes.rows.find((b) => b.eye_laterality === "OS")?.baseline_va_logmar ?? null;
    const iopOd = iopRes.rows.find((i) => i.eye_laterality === "OD")?.iop_mm_hg ?? null;
    const iopOs = iopRes.rows.find((i) => i.eye_laterality === "OS")?.iop_mm_hg ?? null;

    return {
      patient: {
        patientId: p.id,
        clinicId: p.clinic_id,
        fullNameFa: p.full_name_fa,
        phoneMasked: p.phone_masked,
        nationalIdMasked: p.national_id_masked,
        birthYearJalali: p.birth_year_jalali,
        notesFa: p.notes_fa,
        preferredLocale: p.preferred_locale,
        accessMode: p.access_mode,
        mlTrainingConsentFlag: p.ml_training_consent_flag,
      },
      odEpisodes: mappedEpisodes.filter((e) => e.eyeLaterality === "OD"),
      osEpisodes: mappedEpisodes.filter((e) => e.eyeLaterality === "OS"),
      recentStudies: studyRes.rows.map((s) => ({
        studyId: s.id,
        eyeLaterality: s.eye_laterality,
        eyeLabelFa: formatLateralityFa(s.eye_laterality),
        status: s.status,
        urgencyTier: s.final_urgency,
        urgencyLabelFa: s.final_urgency ? URGENCY_LABELS_FA[s.final_urgency] : null,
        topConditionNameFa: s.top_condition,
        createdAtIso: s.created_at.toISOString(),
        createdAtJalali: formatJalaliDate(s.created_at),
      })),
      r2Summary: {
        odBaselineVaLogmar: odBase,
        osBaselineVaLogmar: osBase,
        recentAlerts: alertRes.rows.map((a) => ({
          alertId: a.id,
          eyeLaterality: a.eye_laterality,
          eyeLabelFa: formatLateralityFa(a.eye_laterality),
          ruleCode: a.rule_code,
          severity: a.severity,
          summaryFa: a.summary_fa,
          createdAtIso: a.created_at.toISOString(),
        })),
        latestIopOdMmHg: iopOd,
        latestIopOsMmHg: iopOs,
      },
      openTriageCases: triageRes.rows.map((t) => ({
        caseId: t.id,
        sourcePillar: t.source_pillar,
        eyeLaterality: t.eye_laterality,
        eyeLabelFa: formatLateralityFa(t.eye_laterality),
        status: t.status,
        urgencyTier: t.urgency_tier,
        urgencyLabelFa: URGENCY_LABELS_FA[t.urgency_tier],
        slaDueAtIso: t.sla_due_at.toISOString(),
      })),
      pendingFollowUpTasks: taskRes.rows.map((tk) => ({
        taskId: tk.id,
        taskType: tk.task_type,
        eyeLaterality: tk.eye_laterality,
        eyeLabelFa: tk.eye_laterality ? formatLateralityFa(tk.eye_laterality) : null,
        dueAtIso: tk.due_at.toISOString(),
        dueAtJalali: formatJalaliDate(tk.due_at),
        status: tk.status,
      })),
      clinicalHistories: histRes.rows.map((h) => ({
        historyId: h.id,
        summaryFa: h.summary_fa,
        conditions: h.conditions_json ?? [],
        allergies: h.allergies_json ?? [],
        medications: h.medications_json ?? [],
        createdAtIso: h.created_at.toISOString(),
        createdAtJalali: formatJalaliDate(h.created_at),
      })),
      consents: consentRes.rows.map((c) => ({
        consentId: c.id,
        consentVersion: c.consent_version,
        action: c.action,
        acceptedAtIso: c.accepted_at.toISOString(),
      })),
    };
  }

  async getPatientTimeline(tx: DbTx, patientId: string): Promise<PatientTimelineEvent[] | null> {
    const pExists = await tx.query<{ id: string }>(`SELECT id FROM patients WHERE id = $1`, [patientId]);
    if ((pExists.rowCount ?? 0) === 0) return null;

    const events: Array<PatientTimelineEvent & { ts: number }> = [];

    const [epRes, rxRes, symRes, stRes, signRes, r2Res, iopRes, triRes, refRes, repRes] =
      await Promise.all([
        tx.query<{ id: string; eye_laterality: "OD" | "OS"; protocol_type: string; created_at: Date }>(
          `SELECT id, eye_laterality, protocol_type, created_at FROM care_episodes WHERE patient_id = $1`,
          [patientId]
        ),
        tx.query<{ id: string; eye_laterality: "OD" | "OS"; version: number; reason_fa: string; published_at: Date }>(
          `SELECT pv.id, pv.eye_laterality, pv.version, pv.reason_fa, pv.published_at
           FROM prescription_versions pv
           JOIN care_episodes ce ON ce.id = pv.episode_id
           WHERE ce.patient_id = $1`,
          [patientId]
        ),
        tx.query<{ id: string; eye_laterality: "OD" | "OS"; urgency_tier: UrgencyTier; free_text_fa: string; created_at: Date }>(
          `SELECT sr.id, sr.eye_laterality, sr.urgency_tier, sr.free_text_fa, sr.created_at
           FROM symptom_reports sr
           JOIN care_episodes ce ON ce.id = sr.episode_id
           WHERE ce.patient_id = $1`,
          [patientId]
        ),
        tx.query<{ id: string; eye_laterality: StudyLaterality; status: string; created_at: Date }>(
          `SELECT id, eye_laterality, status, created_at FROM diagnostic_studies WHERE patient_id = $1`,
          [patientId]
        ),
        tx.query<{ id: string; study_id: string; eye_laterality: StudyLaterality; final_urgency: UrgencyTier; signed_at: Date }>(
          `SELECT cs.id, cs.study_id, ds.eye_laterality, cs.final_urgency, cs.signed_at
           FROM clinician_signoffs cs
           JOIN diagnostic_studies ds ON ds.id = cs.study_id
           WHERE ds.patient_id = $1`,
          [patientId]
        ),
        tx.query<{ id: string; eye_laterality: "OD" | "OS"; test_type: string; quality_status: string; va_logmar: number | null; measured_at: Date }>(
          `SELECT id, eye_laterality, test_type, quality_status, va_logmar, measured_at FROM home_vision_tests WHERE patient_id = $1`,
          [patientId]
        ),
        tx.query<{ id: string; eye_laterality: "OD" | "OS"; iop_mm_hg: number; measured_at: Date }>(
          `SELECT id, eye_laterality, iop_mm_hg, measured_at FROM external_tonometry_readings WHERE patient_id = $1`,
          [patientId]
        ),
        tx.query<{ id: string; eye_laterality: StudyLaterality; urgency_tier: UrgencyTier; status: string; created_at: Date }>(
          `SELECT id, eye_laterality, urgency_tier, status, created_at FROM triage_cases WHERE patient_id = $1`,
          [patientId]
        ),
        tx.query<{ id: string; eye_laterality: StudyLaterality; destination_hospital_fa: string; status: string; created_at: Date }>(
          `SELECT r.id, tc.eye_laterality, r.destination_hospital_fa, r.status, r.created_at
           FROM referrals r
           JOIN triage_cases tc ON tc.id = r.case_id
           WHERE tc.patient_id = $1`,
          [patientId]
        ),
        tx.query<{ id: string; report_type: string; payload_json: { titleFa?: string }; created_at: Date }>(
          `SELECT id, report_type, payload_json, created_at FROM report_versions WHERE patient_id = $1`,
          [patientId]
        ),
      ]);

    for (const r of epRes.rows) {
      events.push({
        ts: r.created_at.getTime(),
        category: "episode",
        refId: r.id,
        eyeLaterality: r.eye_laterality,
        eyeLabelFa: formatLateralityFa(r.eye_laterality),
        titleFa: `شروع اپیزود مراقبتی (${r.protocol_type})`,
        summaryFa: formatLateralityFa(r.eye_laterality),
        occurredAtIso: r.created_at.toISOString(),
        occurredAtJalali: formatJalaliDate(r.created_at),
      });
    }
    for (const r of rxRes.rows) {
      events.push({
        ts: r.published_at.getTime(),
        category: "prescription",
        refId: r.id,
        eyeLaterality: r.eye_laterality,
        eyeLabelFa: formatLateralityFa(r.eye_laterality),
        titleFa: `نسخه قطره نسخه ${r.version}`,
        summaryFa: r.reason_fa,
        occurredAtIso: r.published_at.toISOString(),
        occurredAtJalali: formatJalaliDate(r.published_at),
      });
    }
    for (const r of symRes.rows) {
      events.push({
        ts: r.created_at.getTime(),
        category: "symptom",
        refId: r.id,
        eyeLaterality: r.eye_laterality,
        eyeLabelFa: formatLateralityFa(r.eye_laterality),
        titleFa: `ثبت علائم (${URGENCY_LABELS_FA[r.urgency_tier]})`,
        summaryFa: r.free_text_fa || URGENCY_LABELS_FA[r.urgency_tier],
        occurredAtIso: r.created_at.toISOString(),
        occurredAtJalali: formatJalaliDate(r.created_at),
      });
    }
    for (const r of stRes.rows) {
      events.push({
        ts: r.created_at.getTime(),
        category: "diagnostic_study",
        refId: r.id,
        eyeLaterality: r.eye_laterality,
        eyeLabelFa: formatLateralityFa(r.eye_laterality),
        titleFa: `مطالعه تشخیصی چندوجهی (${r.status})`,
        summaryFa: formatLateralityFa(r.eye_laterality),
        occurredAtIso: r.created_at.toISOString(),
        occurredAtJalali: formatJalaliDate(r.created_at),
      });
    }
    for (const r of signRes.rows) {
      events.push({
        ts: r.signed_at.getTime(),
        category: "signoff",
        refId: r.id,
        eyeLaterality: r.eye_laterality,
        eyeLabelFa: formatLateralityFa(r.eye_laterality),
        titleFa: `امضای چشم‌پزشک (${URGENCY_LABELS_FA[r.final_urgency]})`,
        summaryFa: `مطالعه ${r.study_id.slice(0, 8)}`,
        occurredAtIso: r.signed_at.toISOString(),
        occurredAtJalali: formatJalaliDate(r.signed_at),
      });
    }
    for (const r of r2Res.rows) {
      events.push({
        ts: r.measured_at.getTime(),
        category: "r2_test",
        refId: r.id,
        eyeLaterality: r.eye_laterality,
        eyeLabelFa: formatLateralityFa(r.eye_laterality),
        titleFa: `آزمون خانگی ${r.test_type} (${r.quality_status})`,
        summaryFa: r.va_logmar !== null ? `logMAR ${r.va_logmar}` : formatLateralityFa(r.eye_laterality),
        occurredAtIso: r.measured_at.toISOString(),
        occurredAtJalali: formatJalaliDate(r.measured_at),
      });
    }
    for (const r of iopRes.rows) {
      events.push({
        ts: r.measured_at.getTime(),
        category: "iop",
        refId: r.id,
        eyeLaterality: r.eye_laterality,
        eyeLabelFa: formatLateralityFa(r.eye_laterality),
        titleFa: `فشار چشم خانگی iCare HOME2`,
        summaryFa: `${r.iop_mm_hg} mmHg`,
        occurredAtIso: r.measured_at.toISOString(),
        occurredAtJalali: formatJalaliDate(r.measured_at),
      });
    }
    for (const r of triRes.rows) {
      events.push({
        ts: r.created_at.getTime(),
        category: "triage",
        refId: r.id,
        eyeLaterality: r.eye_laterality,
        eyeLabelFa: formatLateralityFa(r.eye_laterality),
        titleFa: `پرونده تریاژ (${URGENCY_LABELS_FA[r.urgency_tier]})`,
        summaryFa: `وضعیت: ${r.status}`,
        occurredAtIso: r.created_at.toISOString(),
        occurredAtJalali: formatJalaliDate(r.created_at),
      });
    }
    for (const r of refRes.rows) {
      events.push({
        ts: r.created_at.getTime(),
        category: "referral",
        refId: r.id,
        eyeLaterality: r.eye_laterality,
        eyeLabelFa: formatLateralityFa(r.eye_laterality),
        titleFa: `ارجاع به ${r.destination_hospital_fa}`,
        summaryFa: `وضعیت: ${r.status}`,
        occurredAtIso: r.created_at.toISOString(),
        occurredAtJalali: formatJalaliDate(r.created_at),
      });
    }
    for (const r of repRes.rows) {
      events.push({
        ts: r.created_at.getTime(),
        category: "report",
        refId: r.id,
        eyeLaterality: null,
        eyeLabelFa: null,
        titleFa: r.payload_json.titleFa ?? `گزارش PDF (${r.report_type})`,
        summaryFa: r.report_type,
        occurredAtIso: r.created_at.toISOString(),
        occurredAtJalali: formatJalaliDate(r.created_at),
      });
    }

    events.sort((a, b) => b.ts - a.ts);
    return events.map(({ ts: _ts, ...rest }) => rest);
  }

  async getClinicAnalytics(tx: DbTx, clinicId: string): Promise<ClinicAnalyticsData> {
    const [epRes, adhRes, triRes, refRes] = await Promise.all([
      tx.query<{ status: string; eye_laterality: "OD" | "OS"; access_mode: "app" | "caregiver" | "print_phone"; cnt: string }>(
        `SELECT status, eye_laterality, access_mode, count(*)::text AS cnt
         FROM care_episodes WHERE clinic_id = $1
         GROUP BY status, eye_laterality, access_mode`,
        [clinicId]
      ),
      tx.query<{ state: "taken" | "missed_with_reason" | "unavailable" | "no_response"; cnt: string }>(
        `SELECT ae.state, count(*)::text AS cnt
         FROM medication_adherence_events ae
         JOIN care_episodes ce ON ce.id = ae.episode_id
         WHERE ce.clinic_id = $1
         GROUP BY ae.state`,
        [clinicId]
      ),
      tx.query<{ compliant_cnt: string; total_cnt: string }>(
        `SELECT
           count(*) FILTER (
             WHERE status IN ('ContactEstablished', 'Referred', 'Closed')
               AND COALESCE(closed_at, updated_at) <= sla_due_at
           )::text AS compliant_cnt,
           count(*) FILTER (
             WHERE status IN ('ContactEstablished', 'Referred', 'Closed') OR sla_due_at < now()
           )::text AS total_cnt
         FROM triage_cases
         WHERE clinic_id = $1`,
        [clinicId]
      ),
      tx.query<{ attended_cnt: string; total_cnt: string }>(
        `SELECT
           count(*) FILTER (WHERE r.status = 'attended')::text AS attended_cnt,
           count(*)::text AS total_cnt
         FROM referrals r
         JOIN triage_cases tc ON tc.id = r.case_id
         WHERE tc.clinic_id = $1`,
        [clinicId]
      ),
    ]);

    const episodeCountsByStatus: Record<string, number> = { active: 0, completed: 0, cancelled: 0 };
    const episodeCountsByEye = { OD: 0, OS: 0 };
    const cohortCountsByAccessMode = { app: 0, caregiver: 0, print_phone: 0 };

    for (const r of epRes.rows) {
      const cnt = Number(r.cnt);
      episodeCountsByStatus[r.status] = (episodeCountsByStatus[r.status] ?? 0) + cnt;
      episodeCountsByEye[r.eye_laterality] += cnt;
      cohortCountsByAccessMode[r.access_mode] += cnt;
    }

    const adherenceDistribution = {
      taken: 0,
      missed_with_reason: 0,
      unavailable: 0,
      no_response: 0,
    };
    for (const r of adhRes.rows) {
      adherenceDistribution[r.state] = Number(r.cnt);
    }

    const triRow = triRes.rows[0]!;
    const refRow = refRes.rows[0]!;

    return {
      episodeCountsByStatus,
      episodeCountsByEye,
      cohortCountsByAccessMode,
      adherenceDistribution,
      triageSlaCompliance: makeRatio(Number(triRow.compliant_cnt), Number(triRow.total_cnt)),
      referralAttendance: makeRatio(Number(refRow.attended_cnt), Number(refRow.total_cnt)),
    };
  }

  async getPilotScorecard(tx: DbTx, clinicId: string): Promise<PilotScorecardData> {
    const now = new Date();
    const [adhRes, triRes, refRes, qcRes, hitlRes, r2Res] = await Promise.all([
      tx.query<{ access_mode: "app" | "caregiver" | "print_phone"; taken_cnt: string; total_cnt: string }>(
        `SELECT ce.access_mode,
                count(*) FILTER (WHERE ae.state = 'taken')::text AS taken_cnt,
                count(*)::text AS total_cnt
         FROM medication_adherence_events ae
         JOIN care_episodes ce ON ce.id = ae.episode_id
         WHERE ce.clinic_id = $1
         GROUP BY ce.access_mode`,
        [clinicId]
      ),
      tx.query<{ contacted_cnt: string; total_cnt: string }>(
        `SELECT
           count(*) FILTER (WHERE status IN ('ContactEstablished', 'Referred', 'Closed'))::text AS contacted_cnt,
           count(*)::text AS total_cnt
         FROM triage_cases
         WHERE clinic_id = $1 AND urgency_tier = 'urgent'`,
        [clinicId]
      ),
      tx.query<{ attended_cnt: string; total_cnt: string }>(
        `SELECT
           count(*) FILTER (WHERE r.status = 'attended')::text AS attended_cnt,
           count(*)::text AS total_cnt
         FROM referrals r
         JOIN triage_cases tc ON tc.id = r.case_id
         WHERE tc.clinic_id = $1`,
        [clinicId]
      ),
      tx.query<{ pass_cnt: string; total_cnt: string }>(
        `SELECT
           count(*) FILTER (WHERE sa.qc_status = 'pass')::text AS pass_cnt,
           count(*) FILTER (WHERE sa.qc_status IN ('pass', 'reject'))::text AS total_cnt
         FROM study_assets sa
         JOIN diagnostic_studies ds ON ds.id = sa.study_id
         WHERE ds.clinic_id = $1`,
        [clinicId]
      ),
      tx.query<{ signed_cnt: string; total_cnt: string; median_min: number | null }>(
        `SELECT
           count(*) FILTER (WHERE ds.status = 'signed_off')::text AS signed_cnt,
           count(*) FILTER (WHERE ds.status IN ('pending_hitl', 'analyzed', 'signed_off'))::text AS total_cnt,
           percentile_cont(0.5) WITHIN GROUP (
             ORDER BY EXTRACT(EPOCH FROM (cs.signed_at - ds.created_at)) / 60.0
           ) AS median_min
         FROM diagnostic_studies ds
         LEFT JOIN clinician_signoffs cs ON cs.study_id = ds.id
         WHERE ds.clinic_id = $1`,
        [clinicId]
      ),
      tx.query<{ accepted_cnt: string; total_cnt: string }>(
        `SELECT
           count(*) FILTER (WHERE quality_status = 'accepted')::text AS accepted_cnt,
           count(*)::text AS total_cnt
         FROM home_vision_tests
         WHERE clinic_id = $1`,
        [clinicId]
      ),
    ]);

    const byMode: Record<"app" | "caregiver" | "print_phone", { num: number; den: number }> = {
      app: { num: 0, den: 0 },
      caregiver: { num: 0, den: 0 },
      print_phone: { num: 0, den: 0 },
    };
    let totalAdhNum = 0;
    let totalAdhDen = 0;
    for (const r of adhRes.rows) {
      const n = Number(r.taken_cnt);
      const d = Number(r.total_cnt);
      byMode[r.access_mode] = { num: n, den: d };
      totalAdhNum += n;
      totalAdhDen += d;
    }

    const triRow = triRes.rows[0]!;
    const refRow = refRes.rows[0]!;
    const qcRow = qcRes.rows[0]!;
    const hitlRow = hitlRes.rows[0]!;
    const r2Row = r2Res.rows[0]!;

    return {
      generatedAtIso: now.toISOString(),
      generatedAtJalali: formatJalaliDate(now),
      kpis: {
        postopAdherenceConfirmedRate: makeRatio(totalAdhNum, totalAdhDen),
        postopAdherenceByAccessMode: {
          app: makeRatio(byMode.app.num, byMode.app.den),
          caregiver: makeRatio(byMode.caregiver.num, byMode.caregiver.den),
          print_phone: makeRatio(byMode.print_phone.num, byMode.print_phone.den),
        },
        redFlagTriageSlaContactRate: makeRatio(Number(triRow.contacted_cnt), Number(triRow.total_cnt)),
        closedLoopReferralAttendanceRate: makeRatio(Number(refRow.attended_cnt), Number(refRow.total_cnt)),
        diagnosticQcFirstPassRate: makeRatio(Number(qcRow.pass_cnt), Number(qcRow.total_cnt)),
        hitlSignoffCompletionRate: makeRatio(Number(hitlRow.signed_cnt), Number(hitlRow.total_cnt)),
        medianHitlTurnaroundMinutes:
          hitlRow.median_min === null || hitlRow.median_min === undefined
            ? null
            : Number(Number(hitlRow.median_min).toFixed(2)),
        r2ValidTestAcceptanceRate: makeRatio(Number(r2Row.accepted_cnt), Number(r2Row.total_cnt)),
      },
      noticeFa:
        "تمامی نسبت‌های پایلوت در صورت صفر بودن مخرج به‌صورت null گزارش می‌شوند تا هیچ نرخ ساختگی نمایش داده نشود؛ گروه Print+Phone به‌طور صریح لحاظ شده است.",
    };
  }

  async getAiQualityAnalytics(tx: DbTx, clinicId: string): Promise<AiQualityAnalyticsData> {
    const [studyRes, assetRes, signRes, fbRes, floorRes] = await Promise.all([
      tx.query<{ cnt: string }>(`SELECT count(*)::text AS cnt FROM diagnostic_studies WHERE clinic_id = $1`, [clinicId]),
      tx.query<{ qc_status: string; qc_reasons_json: { rejectionCodes?: string[] } | unknown[] }>(
        `SELECT sa.qc_status, sa.qc_reasons_json
         FROM study_assets sa
         JOIN diagnostic_studies ds ON ds.id = sa.study_id
         WHERE ds.clinic_id = $1`,
        [clinicId]
      ),
      tx.query<{ action: "approved" | "edited_approved" | "rejected"; cnt: string }>(
        `SELECT cs.action, count(*)::text AS cnt
         FROM clinician_signoffs cs
         JOIN diagnostic_studies ds ON ds.id = cs.study_id
         WHERE ds.clinic_id = $1
         GROUP BY cs.action`,
        [clinicId]
      ),
      tx.query<{ agreement_state: "agree" | "partially_agree" | "disagree"; cnt: string }>(
        `SELECT cf.agreement_state, count(*)::text AS cnt
         FROM clinician_feedback cf
         JOIN diagnostic_studies ds ON ds.id = cf.study_id
         WHERE ds.clinic_id = $1
         GROUP BY cf.agreement_state`,
        [clinicId]
      ),
      tx.query<{ cnt: string }>(
        `SELECT count(DISTINCT fa.study_id)::text AS cnt
         FROM fusion_assessments fa
         JOIN diagnostic_studies ds ON ds.id = fa.study_id
         WHERE ds.clinic_id = $1 AND fa.final_urgency = 'urgent' AND fa.raw_urgency <> 'urgent'`,
        [clinicId]
      ),
    ]);

    let qcPassedAssets = 0;
    let qcRejectedAssets = 0;
    const qcRejectionBreakdown: Record<string, number> = {};
    for (const r of assetRes.rows) {
      if (r.qc_status === "pass") qcPassedAssets += 1;
      if (r.qc_status === "reject") {
        qcRejectedAssets += 1;
        if (r.qc_reasons_json && !Array.isArray(r.qc_reasons_json)) {
          for (const code of r.qc_reasons_json.rejectionCodes ?? []) {
            qcRejectionBreakdown[code] = (qcRejectionBreakdown[code] ?? 0) + 1;
          }
        }
      }
    }

    const signoffBreakdown = { approved: 0, edited_approved: 0, rejected: 0 };
    for (const r of signRes.rows) {
      signoffBreakdown[r.action] = Number(r.cnt);
    }

    const clinicianFeedbackCounts = { agree: 0, partially_agree: 0, disagree: 0 };
    for (const r of fbRes.rows) {
      clinicianFeedbackCounts[r.agreement_state] = Number(r.cnt);
    }

    return {
      onlineOperationalMetrics: {
        totalStudies: Number(studyRes.rows[0]?.cnt ?? "0"),
        qcPassedAssets,
        qcRejectedAssets,
        qcRejectionBreakdown,
        signoffBreakdown,
        clinicianFeedbackCounts,
        urgentFloorTriggeredStudies: Number(floorRes.rows[0]?.cnt ?? "0"),
      },
      offlineBenchmarkNoticeFa:
        "شاخص‌های حساسیت، ویژگی و AUC صرفاً از ارزیابی آفلاین روی دیتاست‌های برچسب‌گذاری‌شده مرجع (Model Cards) استخراج می‌شوند و با آمار عملیاتی آنلاین جایگزین نمی‌شوند.",
    };
  }

  async probeDatabase(
    tx: DbTx
  ): Promise<{ dbLatencyMs: number; failedOutboxCount: number; runningAiJobsCount: number; activeOutagesCount: number }> {
    const start = Date.now();
    await tx.query("SELECT 1");
    const dbLatencyMs = Date.now() - start;

    const res = await tx.query<{
      unpublished_outbox: string;
      running_ai: string;
      active_outages: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM outbox_events WHERE published_at IS NULL) AS unpublished_outbox,
         (SELECT count(*)::text FROM ai_inference_jobs WHERE status IN ('queued', 'running', 'failed')) AS running_ai,
         (SELECT count(*)::text FROM clinic_outages WHERE status <> 'resolved') AS active_outages`
    );
    const r = res.rows[0]!;
    return {
      dbLatencyMs,
      failedOutboxCount: Number(r.unpublished_outbox),
      runningAiJobsCount: Number(r.running_ai),
      activeOutagesCount: Number(r.active_outages),
    };
  }

  async listOpsJobs(tx: DbTx, clinicId: string, limit: number): Promise<OpsJobsData> {
    const [aiRes, outRes, wfRes] = await Promise.all([
      tx.query<{
        id: string;
        study_id: string;
        engine_mode: string;
        status: string;
        error_code: string | null;
        created_at: Date;
        completed_at: Date | null;
      }>(
        `SELECT aj.id, aj.study_id, aj.engine_mode, aj.status, aj.error_code, aj.created_at, aj.completed_at
         FROM ai_inference_jobs aj
         JOIN diagnostic_studies ds ON ds.id = aj.study_id
         WHERE ds.clinic_id = $1
         ORDER BY aj.created_at DESC
         LIMIT $2`,
        [clinicId, limit]
      ),
      tx.query<{
        id: string;
        event_type: string;
        correlation_id: string;
        published_at: Date | null;
        created_at: Date;
      }>(
        `SELECT id, event_type, correlation_id, published_at, created_at
         FROM outbox_events
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      ),
      tx.query<{
        id: string;
        workflow_type: string;
        status: string;
        next_run_at: Date | null;
        updated_at: Date;
      }>(
        `SELECT id, workflow_type, status, next_run_at, updated_at
         FROM workflow_executions
         ORDER BY updated_at DESC
         LIMIT $1`,
        [limit]
      ),
    ]);

    return {
      aiInferenceJobs: aiRes.rows.map((r) => ({
        jobId: r.id,
        studyId: r.study_id,
        engineMode: r.engine_mode,
        status: r.status,
        errorCode: r.error_code,
        createdAtIso: r.created_at.toISOString(),
        completedAtIso: r.completed_at ? r.completed_at.toISOString() : null,
      })),
      outboxEvents: outRes.rows.map((r) => ({
        eventId: r.id,
        eventType: r.event_type,
        correlationId: r.correlation_id,
        publishedAtIso: r.published_at ? r.published_at.toISOString() : null,
        createdAtIso: r.created_at.toISOString(),
      })),
      workflowRuns: wfRes.rows.map((r) => ({
        runId: r.id,
        workflowType: r.workflow_type,
        status: r.status,
        nextDueAtIso: r.next_run_at ? r.next_run_at.toISOString() : null,
        updatedAtIso: r.updated_at.toISOString(),
      })),
    };
  }
}
