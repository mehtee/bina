import {
  roleCapabilities,
  SYNTHETIC_CONSTANTS,
  SYNTHETIC_DEMO_ACCOUNTS,
} from "~/core/fixtures/staff-web-fixtures";

interface MockDbState {
  clinicNameFa: string;
  dicomAeTitle: string;
  patients: Array<Record<string, unknown>>;
  histories: Record<string, Array<Record<string, unknown>>>;
  caregivers: Record<string, Array<Record<string, unknown>>>;
  consents: Record<string, Array<Record<string, unknown>>>;
  episodes: Array<Record<string, unknown>>;
  prescriptions: Record<string, Array<Record<string, unknown>>>;
  adherence: Record<string, Array<Record<string, unknown>>>;
  symptoms: Record<string, Array<Record<string, unknown>>>;
  printOutreach: Array<Record<string, unknown>>;
  studies: Array<Record<string, unknown>>;
  feedbackByStudy: Record<string, Array<Record<string, unknown>>>;
  jobsByStudy: Record<string, Array<Record<string, unknown>>>;
  triageCases: Array<Record<string, unknown>>;
  referrals: Array<Record<string, unknown>>;
  outages: Array<Record<string, unknown>>;
  followUps: Array<Record<string, unknown>>;
  devices: Array<Record<string, unknown>>;
  plans: Record<string, Array<Record<string, unknown>>>;
  sessions: Array<Record<string, unknown>>;
  iopReadings: Array<Record<string, unknown>>;
  reports: Array<Record<string, unknown>>;
  staffMembers: Array<Record<string, unknown>>;
  protocols: Array<Record<string, unknown>>;
  messageTemplates: Array<Record<string, unknown>>;
  consentTemplates: Array<Record<string, unknown>>;
  featureFlags: Array<Record<string, unknown>>;
  endpoints: Array<Record<string, unknown>>;
  deliveries: Array<Record<string, unknown>>;
  breakGlassSessions: Array<Record<string, unknown>>;
  auditLogs: Array<Record<string, unknown>>;
}

function createInitialMockState(): MockDbState {
  const nowIso = "2026-11-26T10:30:00.000Z";
  const earlierIso = "2026-11-20T09:15:00.000Z";

  return {
    clinicNameFa: "کلینیک فوق‌تخصصی چشم بینا (مرکز تهران)",
    dicomAeTitle: "BINA_PACS_TEH",
    patients: [
      {
        patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        fullNameFa: "مهدی احمدی",
        phoneMasked: "+98912***4510",
        nationalIdMasked: "006***8910",
        birthYearJalali: 1337,
        notesFa: "بیمار تحت نظر برای دژنراسیون ماکولا (nAMD) و پیگیری پس از جراحی کاتاراکت",
        accessMode: "app",
        preferredLocale: "fa-IR",
        mlTrainingConsentFlag: true,
        activeEpisodeCount: 1,
        openTriageCount: 1,
        createdAtIso: earlierIso,
      },
      {
        patientId: SYNTHETIC_CONSTANTS.PATIENT_2,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        fullNameFa: "زهرا کریمی",
        phoneMasked: "+98912***8821",
        nationalIdMasked: "045***1123",
        birthYearJalali: 1332,
        notesFa: "نیاز به پیگیری تلفنی و نسخه چاپی درشت‌خط",
        accessMode: "print_phone",
        preferredLocale: "fa-IR",
        mlTrainingConsentFlag: false,
        activeEpisodeCount: 1,
        openTriageCount: 1,
        createdAtIso: earlierIso,
      },
      {
        patientId: SYNTHETIC_CONSTANTS.PATIENT_3,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        fullNameFa: "حسین موسوی",
        phoneMasked: "+98912***3304",
        nationalIdMasked: "004***7702",
        birthYearJalali: 1344,
        notesFa: "پایش گلوکوم زاویه باز با دسترسی همراه",
        accessMode: "caregiver",
        preferredLocale: "fa-IR",
        mlTrainingConsentFlag: true,
        activeEpisodeCount: 0,
        openTriageCount: 0,
        createdAtIso: earlierIso,
      },
    ],
    histories: {
      [SYNTHETIC_CONSTANTS.PATIENT_1]: [
        {
          historyId: "hist-1",
          tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
          clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
          patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
          recordedByUserId: SYNTHETIC_CONSTANTS.USER_OPHTH,
          summaryFa: "سابقه دیابت نوع ۲ کنترل‌شده، جراحی فاکوامولسیفیکاسیون چشم راست در آبان ۱۴۰۵.",
          conditions: ["type2_diabetes", "cataract_pseudophakia_od"],
          allergies: ["ندارد"],
          medications: ["متفورمین ۵۰۰", "لوزارتان ۲۵"],
          riskFactors: { smoking: false, hypertension: true },
          labs: { hba1c: 7.4, creatinine: 1.0 },
          createdAtIso: earlierIso,
        },
      ],
    },
    caregivers: {
      [SYNTHETIC_CONSTANTS.PATIENT_3]: [
        {
          grantId: "cg-grant-1",
          patientId: SYNTHETIC_CONSTANTS.PATIENT_3,
          caregiverPhone: "***",
          relationshipFa: "فرزند بیمار (همراه)",
          scopes: ["view_today", "log_adherence", "report_symptom"],
          active: true,
          createdAt: earlierIso,
        },
      ],
    },
    consents: {
      [SYNTHETIC_CONSTANTS.PATIENT_1]: [
        {
          consentId: "cons-1",
          consentVersion: "fa-ir-v2.1",
          locale: "fa-IR",
          action: "accepted",
          acceptedAtIso: earlierIso,
        },
      ],
      [SYNTHETIC_CONSTANTS.PATIENT_2]: [
        {
          consentId: "cons-2",
          consentVersion: "fa-ir-v2.0",
          locale: "fa-IR",
          action: "accepted",
          acceptedAtIso: earlierIso,
        },
      ],
    },
    episodes: [
      {
        episodeId: SYNTHETIC_CONSTANTS.EPISODE_1_OD,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
        patientNameFa: "مهدی احمدی",
        phoneMasked: "+98912***4510",
        protocolType: "post_cataract",
        eyeLaterality: "OD",
        eyeLabelFa: "چشم راست",
        surgeonId: SYNTHETIC_CONSTANTS.USER_OPHTH,
        accessMode: "app",
        activePrescriptionVersion: 2,
        status: "active",
        anchorAtIso: "2026-11-22T08:00:00.000Z",
        anchorAtJalali: "۱۴۰۵/۰۹/۰۱",
      },
      {
        episodeId: SYNTHETIC_CONSTANTS.EPISODE_2_OS_PP,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        patientId: SYNTHETIC_CONSTANTS.PATIENT_2,
        patientNameFa: "زهرا کریمی",
        phoneMasked: "+98912***8821",
        protocolType: "post_cataract",
        eyeLaterality: "OS",
        eyeLabelFa: "چشم چپ",
        surgeonId: SYNTHETIC_CONSTANTS.USER_OPHTH,
        accessMode: "print_phone",
        activePrescriptionVersion: 1,
        status: "active",
        anchorAtIso: "2026-11-23T08:00:00.000Z",
        anchorAtJalali: "۱۴۰۵/۰۹/۰۲",
      },
    ],
    prescriptions: {
      [SYNTHETIC_CONSTANTS.EPISODE_1_OD]: [
        {
          prescriptionId: "rx-od-v2",
          tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
          episodeId: SYNTHETIC_CONSTANTS.EPISODE_1_OD,
          version: 2,
          eyeLaterality: "OD",
          eyeLabelFa: "چشم راست",
          items: [
            {
              drugNameFa: "بتامتازون ۰.۱٪ چشمی",
              genericName: "betamethasone",
              bottleCapColorFa: "قرمز",
              frequencyPerDay: 4,
              durationDays: 14,
              instructionsFa: "فقط در چشم راست چکانده شود؛ بین دو قطره ۵ دقیقه فاصله باشد.",
            },
            {
              drugNameFa: "لووفلوکساسین چشمی",
              genericName: "levofloxacin",
              bottleCapColorFa: "سفید",
              frequencyPerDay: 4,
              durationDays: 7,
              instructionsFa: "دوره آنتی‌بیوتیک چشم راست کامل شود.",
            },
          ],
          reasonFa: "تنظیم کاهش تدریجی استروئید در ویزیت هفته اول چشم راست",
          publishedByUserId: SYNTHETIC_CONSTANTS.USER_OPHTH,
          publishedAt: nowIso,
        },
        {
          prescriptionId: "rx-od-v1",
          tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
          episodeId: SYNTHETIC_CONSTANTS.EPISODE_1_OD,
          version: 1,
          eyeLaterality: "OD",
          eyeLabelFa: "چشم راست",
          items: [
            {
              drugNameFa: "بتامتازون ۰.۱٪ چشمی",
              genericName: "betamethasone",
              bottleCapColorFa: "قرمز",
              frequencyPerDay: 6,
              durationDays: 7,
              instructionsFa: "شروع برنامه پس از جراحی چشم راست.",
            },
          ],
          reasonFa: "نسخه اولیه ترخیص چشم راست",
          publishedByUserId: SYNTHETIC_CONSTANTS.USER_OPHTH,
          publishedAt: earlierIso,
        },
      ],
      [SYNTHETIC_CONSTANTS.EPISODE_2_OS_PP]: [
        {
          prescriptionId: "rx-os-v1",
          tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
          episodeId: SYNTHETIC_CONSTANTS.EPISODE_2_OS_PP,
          version: 1,
          eyeLaterality: "OS",
          eyeLabelFa: "چشم چپ",
          items: [
            {
              drugNameFa: "بتامتازون ۰.۱٪ چشمی",
              genericName: "betamethasone",
              bottleCapColorFa: "قرمز",
              frequencyPerDay: 4,
              durationDays: 14,
              instructionsFa: "طبق برگه چاپی درشت‌خط فقط در چشم چپ چکانده شود.",
            },
          ],
          reasonFa: "برنامه مراقبت چاپی و تلفنی چشم چپ",
          publishedByUserId: SYNTHETIC_CONSTANTS.USER_OPHTH,
          publishedAt: earlierIso,
        },
      ],
    },
    adherence: {
      [SYNTHETIC_CONSTANTS.EPISODE_1_OD]: [
        {
          eventId: "adh-1",
          episodeId: SYNTHETIC_CONSTANTS.EPISODE_1_OD,
          eyeLaterality: "OD",
          prescriptionVersion: 2,
          state: "taken",
          recordedAt: nowIso,
        },
        {
          eventId: "adh-2",
          episodeId: SYNTHETIC_CONSTANTS.EPISODE_1_OD,
          eyeLaterality: "OD",
          prescriptionVersion: 2,
          state: "missed_with_reason",
          reasonFa: "فراموشی نوبت ظهر",
          recordedAt: earlierIso,
        },
        {
          eventId: "adh-3",
          episodeId: SYNTHETIC_CONSTANTS.EPISODE_1_OD,
          eyeLaterality: "OD",
          prescriptionVersion: 1,
          state: "no_response",
          recordedAt: earlierIso,
        },
      ],
    },
    symptoms: {
      [SYNTHETIC_CONSTANTS.EPISODE_1_OD]: [
        {
          reportId: "sym-1",
          symptomId: "sym-1",
          episodeId: SYNTHETIC_CONSTANTS.EPISODE_1_OD,
          eyeLaterality: "OD",
          eyeLabelFa: "چشم راست",
          severePain: false,
          suddenVisionLoss: false,
          purulentDischarge: false,
          flashesOrCurtain: false,
          createdAtJalali: "۱۴۰۵/۰۹/۰۵ — ۱۱:۲۰",
          freeTextFa: "سوزش خفیف هنگام ریختن قطره که ظرف چند دقیقه برطرف می‌شود.",
          redFlagTriggered: false,
          recordedAtIso: nowIso,
        },
      ],
    },
    printOutreach: [
      {
        taskId: "outreach-pp-1",
        episodeId: SYNTHETIC_CONSTANTS.EPISODE_2_OS_PP,
        patientId: SYNTHETIC_CONSTANTS.PATIENT_2,
        status: "completed",
        outcomeFa: "تماس روز دوم انجام شد؛ بیمار نحوه تشخیص درب قرمز قطره را تایید کرد.",
        recordedAtIso: earlierIso,
      },
    ],
    studies: [
      {
        studyId: SYNTHETIC_CONSTANTS.STUDY_1_CNV,
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
        patientNameFa: "مهدی احمدی",
        eyeLaterality: "OD",
        status: "pending_hitl",
        urgentFloorActive: true,
        urgentFloorRuleCodes: ["PILLAR2_ACTIVE_CNV_URGENT_FLOOR"],
        labs: { hba1c: 7.4, iop_mmhg: 16.5, age: 68, sbp: 132 },
        assets: [
          {
            assetId: "asset-cnv-fundus",
            s3ObjectKey: "s3://bina-dev/studies/cnv-od-fundus.png",
            declaredModality: "fundus",
            detectedModality: "fundus",
            declaredEye: "OD",
            qcStatus: "pass",
            createdAtIso: nowIso,
          },
          {
            assetId: "asset-cnv-oct",
            s3ObjectKey: "s3://bina-dev/studies/cnv-od-oct.dcm",
            declaredModality: "oct",
            detectedModality: "oct",
            declaredEye: "OD",
            qcStatus: "pass",
            createdAtIso: nowIso,
          },
          {
            assetId: "asset-cnv-vf",
            s3ObjectKey: "s3://bina-dev/studies/cnv-od-vf-24-2.json",
            declaredModality: "visual_field",
            detectedModality: "visual_field",
            declaredEye: "OD",
            qcStatus: "pass",
            createdAtIso: nowIso,
          },
          {
            assetId: "asset-cnv-topo",
            s3ObjectKey: "s3://bina-dev/studies/cnv-od-topo.json",
            declaredModality: "topography",
            detectedModality: "topography",
            declaredEye: "OD",
            qcStatus: "pass",
            createdAtIso: nowIso,
          },
        ],
        qcDecisions: [
          {
            assetId: "asset-cnv-fundus",
            modalityPrediction: {
              assetId: "asset-cnv-fundus",
              declaredModality: "fundus",
              detectedModality: "fundus",
              confidence: 0.99,
              matchesDeclared: true,
            },
            passed: true,
            rejectionCodes: [],
            rejectionReasonsFa: [],
            recaptureInstructionFa: null,
          },
          {
            assetId: "asset-cnv-oct",
            modalityPrediction: {
              assetId: "asset-cnv-oct",
              declaredModality: "oct",
              detectedModality: "oct",
              confidence: 0.98,
              matchesDeclared: true,
            },
            passed: true,
            rejectionCodes: [],
            rejectionReasonsFa: [],
            recaptureInstructionFa: null,
          },
        ],
        specialistOutputs: [
          {
            specialistId: "fundus",
            backboneId: "dinov2-vitb14-apache2",
            eyeLaterality: "OD",
            probabilities: { active_cnv: 0.89, dr_moderate: 0.24 },
            biomarkers: { cup_disc_ratio_v: 0.42, dr_severity_score: 0.31 },
            summaryFa:
              "در تصویر فوندوس چشم راست خونریزی کوچک ماکولا و تغییر رنگ مشکوک به CNV فعال مشاهده می‌شود.",
            maskS3Key: "s3://bina-dev/masks/cnv/fundus-mask.png",
            gradcamS3Key: "s3://bina-dev/gradcam/cnv/fundus-cam.png",
          },
          {
            specialistId: "oct",
            backboneId: "monai-unet-apache2",
            eyeLaterality: "OD",
            probabilities: { active_cnv: 0.92, srf_present: 0.88, irf_present: 0.74 },
            biomarkers: { cmt_um: 412, macular_volume_mm3: 10.2, irf_volume_mm3: 2.8, srf_volume_mm3: 0.4, rnfl_um: 78 },
            summaryFa:
              "در مقاطع OCT چشم راست مایع داخل‌شبکیه‌ای (IRF) و زیرشبکیه‌ای (SRF) همراه با افزایش ضخامت مرکزی ماکولا (۴۱۲ میکرومتر) دیده می‌شود.",
            maskS3Key: "s3://bina-dev/masks/cnv/oct-mask.png",
            gradcamS3Key: "s3://bina-dev/gradcam/cnv/oct-cam.png",
          },
          {
            specialistId: "anterior",
            backboneId: "dinov2-anterior-apache2",
            eyeLaterality: "OD",
            probabilities: { keratoconus_suspect: 0.14 },
            biomarkers: { kmax_d: 44.8, k1_d: 42.9, k2_d: 43.9, thinnest_pachymetry_um: 538 },
            summaryFa: "در توپوگرافی قرنیه چشم راست تقارن نسبی حفظ شده و ضخامت قرنیه در محدوده ۵۳۸ میکرومتر است.",
          },
          {
            specialistId: "visual_field",
            backboneId: "vf-progression-net-apache2",
            eyeLaterality: "OD",
            probabilities: { central_scotoma_suspect: 0.48 },
            biomarkers: { md_db: -3.2, psd_db: 2.1, vfi_pct: 94 },
            summaryFa: "در میدان بینایی ۲۴-۲ چشم راست افت خفیف حساسیت مرکزی (-3.2 dB) ثبت شده است.",
          },
          {
            specialistId: "tabular_xgb",
            backboneId: "xgboost-risk-v1",
            eyeLaterality: "OD",
            probabilities: { vision_loss_progression_risk: 0.76 },
            biomarkers: { hba1c: 7.4, age: 68, iop_mmhg: 16.5, cmt_delta_um: 128 },
            summaryFa: "مدل جدولی خطر پیشرفت ادم ماکولا را در حضور ضخامت بالای ماکولا و سن ۶۸ سال بالا برآورد می‌کند.",
          },
        ],
        fusionResult: {
          eyeLaterality: "OD",
          availableModalities: ["fundus", "oct", "topography", "visual_field", "tabular_xgb"],
          missingModalities: ["octa"],
          missingModalityNoticeFa: "تصویر آنژیوگرافی OCT-A در این مطالعه ثبت نشده است.",
          differential: [
            {
              conditionCode: "active_cnv",
              conditionNameFa: "نئوواسکولاریزاسیون فعال کوروئید (nAMD / Active CNV)",
              confidence: 0.92,
              confidenceIntervalLower: 0.85,
              confidenceIntervalUpper: 0.97,
              severity: "urgent",
              supportingModalities: ["fundus", "oct", "tabular_xgb"],
            },
            {
              conditionCode: "dme_moderate",
              conditionNameFa: "ادم ماکولای دیابتی (DME)",
              confidence: 0.28,
              confidenceIntervalLower: 0.19,
              confidenceIntervalUpper: 0.38,
              severity: "moderate",
              supportingModalities: ["oct", "tabular_xgb"],
            },
          ],
          discordanceFlagsFa: [
            "افزایش سریع CMT نسبت به مطالعه قبلی (+۱۲۸ میکرومتر) نیازمند ارزیابی فوری شبکیه است.",
          ],
          rawUrgency: "followup_3_6m",
          recommendedUrgency: "urgent",
          recommendedUrgencyLabelFa: "ارجاع فوری",
        },
        explainability: {
          primarySegmentationMasks: [
            { modality: "oct", layerKey: "irf", labelFa: "مایع داخل‌شبکیه‌ای (IRF)", colorHex: "#8CC4FF" },
            { modality: "oct", layerKey: "srf", labelFa: "مایع زیرشبکیه‌ای (SRF)", colorHex: "#FFD387" },
            { modality: "fundus", layerKey: "optic_disc", labelFa: "دیسک و کاپ عصب بینایی", colorHex: "#77E0CE" },
          ],
          auxiliaryGradCams: [
            {
              modality: "oct",
              auxiliaryLabelFa: "راهنمای توجه مدل — غیرقابل استفاده به‌جای سگمنتیشن دقیق",
            },
          ],
        },
        persianReportDraft: {
          modelProvider: "deterministic_template",
          modelId: "bina-small-llm-v1",
          titleFa: "پیش‌نویس گزارش بالینی چندوجهی — چشم راست (OD)",
          modalityFindingsFa:
            "در بررسی OCT چشم راست تجمع مایع داخل‌شبکیه‌ای و زیرشبکیه‌ای همراه با CMT برابر ۴۱۲ میکرومتر مشاهده شد. تصویر فوندوس چشم راست نیز با فعالیت nAMD همخوانی دارد.",
          differentialSummaryFa:
            "تشخیص محتمل اول: نئوواسکولاریزاسیون فعال کوروئید (Active CNV) در چشم راست با سطح فوریت ارجاع فوری.",
          crossModalCorrelationFa:
            "یافته‌های OCT و فوندوس چشم راست همسو هستند؛ آنژیوگرافی OCT-A در این نوبت ثبت نشده است.",
          followUpPlanFa:
            "ارجاع فوری چشم راست به فوق‌تخصص شبکیه ظرف ۲۴ ساعت جهت بررسی تزریق داخل‌چشمی (تحت تایید نهایی پزشک).",
          urgencyTier: "urgent",
          urgencyLabelFa: "ارجاع فوری",
          evidenceIds: ["spec:fundus", "spec:oct", "diff:active_cnv"],
          validationPassed: true,
          draftVersion: 1,
          updatedAtIso: nowIso,
        },
        signoff: undefined,
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
      },
      {
        studyId: SYNTHETIC_CONSTANTS.STUDY_2_QC_FAIL,
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        patientId: SYNTHETIC_CONSTANTS.PATIENT_2,
        patientNameFa: "زهرا کریمی",
        eyeLaterality: "OS",
        status: "qc_failed",
        urgentFloorActive: false,
        urgentFloorRuleCodes: [],
        assets: [
          {
            assetId: "asset-blur-os",
            s3ObjectKey: "s3://bina-dev/studies/blur-os.png",
            declaredModality: "fundus",
            detectedModality: "fundus",
            declaredEye: "OS",
            qcStatus: "reject",
            createdAtIso: nowIso,
          },
        ],
        qcDecisions: [
          {
            assetId: "asset-blur-os",
            modalityPrediction: {
              assetId: "asset-blur-os",
              declaredModality: "fundus",
              detectedModality: "fundus",
              confidence: 0.91,
              matchesDeclared: true,
            },
            passed: false,
            rejectionCodes: ["blur", "lighting"],
            rejectionReasonsFa: ["تار بودن تصویر به دلیل حرکت چشم", "نور نامناسب در مرکز فوندوس"],
            recaptureInstructionFa: "لطفاً با تثبیت فوکوس و تنظیم نور، تصویربرداری چشم چپ را تکرار کنید.",
          },
        ],
        specialistOutputs: [],
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
      },
      {
        studyId: SYNTHETIC_CONSTANTS.STUDY_3_SIGNED_PRIOR,
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
        patientNameFa: "مهدی احمدی",
        eyeLaterality: "OD",
        status: "signed_off",
        urgentFloorActive: false,
        urgentFloorRuleCodes: [],
        assets: [
          {
            assetId: "asset-prior-oct",
            s3ObjectKey: "s3://bina-dev/studies/prior-oct-od.dcm",
            declaredModality: "oct",
            detectedModality: "oct",
            declaredEye: "OD",
            qcStatus: "pass",
            createdAtIso: earlierIso,
          },
        ],
        qcDecisions: [],
        specialistOutputs: [
          {
            specialistId: "oct",
            backboneId: "monai-unet-apache2",
            eyeLaterality: "OD",
            probabilities: { dme_mild: 0.42 },
            biomarkers: { cmt_um: 284, macular_volume_mm3: 8.6, rnfl_um: 84 },
            summaryFa: "ضخامت مرکزی ماکولا در چشم راست ۲۸۴ میکرومتر ثبت شد.",
          },
        ],
        fusionResult: {
          eyeLaterality: "OD",
          availableModalities: ["oct"],
          missingModalities: ["fundus", "octa", "topography", "visual_field", "tabular_xgb"],
          missingModalityNoticeFa: "سایر مدالیته‌ها در این مطالعه ثبت نشده‌اند.",
          differential: [
            {
              conditionCode: "dme_mild",
              conditionNameFa: "تغییرات خفیف ماکولا",
              confidence: 0.42,
              confidenceIntervalLower: 0.31,
              confidenceIntervalUpper: 0.54,
              severity: "mild",
              supportingModalities: ["oct"],
            },
          ],
          discordanceFlagsFa: [],
          rawUrgency: "followup_3_6m",
          recommendedUrgency: "followup_3_6m",
          recommendedUrgencyLabelFa: "پیگیری ۳ تا ۶ ماه",
        },
        persianReportDraft: {
          modelProvider: "deterministic_template",
          modelId: "bina-small-llm-v1",
          titleFa: "گزارش تاییدشده قبلی — چشم راست (OD)",
          modalityFindingsFa: "ضخامت مرکزی ماکولا در چشم راست ۲۸۴ میکرومتر است.",
          differentialSummaryFa: "پایش دوره‌ای ماکولا در چشم راست توصیه می‌شود.",
          crossModalCorrelationFa: "بر اساس OCT چشم راست ارزیابی شد.",
          followUpPlanFa: "ویزیت پیگیری ۳ تا ۶ ماه آینده.",
          urgencyTier: "followup_3_6m",
          urgencyLabelFa: "پیگیری ۳ تا ۶ ماه",
          evidenceIds: ["spec:oct"],
          validationPassed: true,
          draftVersion: 1,
          updatedAtIso: earlierIso,
        },
        signoff: {
          signoffId: "sign-prior-1",
          studyId: SYNTHETIC_CONSTANTS.STUDY_3_SIGNED_PRIOR,
          ophthalmologistId: SYNTHETIC_CONSTANTS.USER_OPHTH,
          action: "approved",
          finalUrgency: "followup_3_6m",
          finalUrgencyLabelFa: "پیگیری ۳ تا ۶ ماه",
          finalReportTextFa: "مطالعه قبلی چشم راست با CMT 284 µm تایید شد.",
          signedAt: earlierIso,
          signedAtIso: earlierIso,
        },
        createdAtIso: earlierIso,
        updatedAtIso: earlierIso,
      },
    ],
    feedbackByStudy: {},
    jobsByStudy: {
      [SYNTHETIC_CONSTANTS.STUDY_1_CNV]: [
        {
          jobId: "job-cnv-1",
          studyId: SYNTHETIC_CONSTANTS.STUDY_1_CNV,
          engineMode: "cpu_stub",
          modelVersions: { fundus: "dinov2-apache2", oct: "monai-unet-apache2" },
          status: "completed",
          startedAtIso: nowIso,
          completedAtIso: nowIso,
          errorCode: null,
          createdAtIso: nowIso,
        },
      ],
    },
    triageCases: [
      {
        caseId: SYNTHETIC_CONSTANTS.CASE_1_URGENT,
        id: SYNTHETIC_CONSTANTS.CASE_1_URGENT,
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
        patientNameFa: "مهدی احمدی",
        sourcePillar: "pillar2_diagnostic",
        sourceRefId: SYNTHETIC_CONSTANTS.STUDY_1_CNV,
        eyeLaterality: "OD",
        eyeLabelFa: "چشم راست",
        status: "New",
        urgencyTier: "urgent",
        urgencyLabelFa: "ارجاع فوری",
        ownerId: null,
        slaDueAt: new Date(Date.now() + 45 * 60_000).toISOString(),
        contactLog: [],
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        caseId: SYNTHETIC_CONSTANTS.CASE_2_PP,
        id: SYNTHETIC_CONSTANTS.CASE_2_PP,
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        patientId: SYNTHETIC_CONSTANTS.PATIENT_2,
        patientNameFa: "زهرا کریمی",
        sourcePillar: "pillar1_care",
        sourceRefId: SYNTHETIC_CONSTANTS.EPISODE_2_OS_PP,
        eyeLaterality: "OS",
        eyeLabelFa: "چشم چپ",
        status: "OwnerAssigned",
        urgencyTier: "followup_3_6m",
        urgencyLabelFa: "پیگیری ۳ تا ۶ ماه",
        ownerId: SYNTHETIC_CONSTANTS.USER_COORD,
        slaDueAt: new Date(Date.now() + 6 * 3600_000).toISOString(),
        contactLog: [
          {
            actorUserId: SYNTHETIC_CONSTANTS.USER_COORD,
            outcome: "contacted",
            channel: "phone",
            noteFa: "پیگیری نوبت ویزیت چشم چپ انجام شد.",
            createdAtIso: earlierIso,
            occurredAtIso: earlierIso,
          },
        ],
        createdAt: earlierIso,
        updatedAt: nowIso,
      },
    ],
    referrals: [
      {
        referralId: SYNTHETIC_CONSTANTS.REFERRAL_1,
        id: SYNTHETIC_CONSTANTS.REFERRAL_1,
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        caseId: SYNTHETIC_CONSTANTS.CASE_2_PP,
        patientId: SYNTHETIC_CONSTANTS.PATIENT_2,
        patientNameFa: "زهرا کریمی",
        eyeLaterality: "OS",
        eyeLabelFa: "چشم چپ",
        destinationHospitalFa: "بیمارستان تخصصی چشم فارابی",
        reasonFa: "ارزیابی شبکیه چشم چپ در برنامه پیگیری",
        urgent: false,
        status: "dispatched",
        createdAt: earlierIso,
        updatedAt: nowIso,
      },
    ],
    outages: [
      {
        outageId: "outage-1",
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        titleFa: "تاخیر موقت در اپراتور پیامک انبوه",
        status: "mitigated",
        severity: "warning",
        affectedChannel: "sms",
        mitigationNoteFa: "تماس تلفنی جایگزین برای بیماران پرریسک فعال شده است.",
        startedAtIso: earlierIso,
        resolvedAtIso: null,
        createdByUserId: SYNTHETIC_CONSTANTS.USER_COORD,
        createdAtIso: earlierIso,
      },
    ],
    followUps: [
      {
        taskId: "ft-1",
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
        patientNameFa: "مهدی احمدی",
        episodeId: SYNTHETIC_CONSTANTS.EPISODE_1_OD,
        triageCaseId: SYNTHETIC_CONSTANTS.CASE_1_URGENT,
        eyeLaterality: "OD",
        eyeLabelFa: "چشم راست",
        taskType: "referral_followup",
        dueAtIso: new Date(Date.now() + 2 * 3600_000).toISOString(),
        dueAtJalali: "۱۴۰۵/۰۹/۰۵",
        status: "pending",
        assignedUserId: SYNTHETIC_CONSTANTS.USER_COORD,
        outcomeFa: "هماهنگی ویزیت فوری رتین",
        completedAtIso: null,
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
      },
      {
        taskId: "ft-2",
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        patientId: SYNTHETIC_CONSTANTS.PATIENT_2,
        patientNameFa: "زهرا کریمی",
        episodeId: SYNTHETIC_CONSTANTS.EPISODE_2_OS_PP,
        triageCaseId: SYNTHETIC_CONSTANTS.CASE_2_PP,
        eyeLaterality: "OS",
        eyeLabelFa: "چشم چپ",
        taskType: "print_phone_checkin",
        dueAtIso: earlierIso,
        dueAtJalali: "۱۴۰۵/۰۹/۰۲",
        status: "pending",
        assignedUserId: SYNTHETIC_CONSTANTS.USER_COORD,
        outcomeFa: "تماس بررسی قطره بتامتازون چشم چپ",
        completedAtIso: null,
        createdAtIso: earlierIso,
        updatedAtIso: earlierIso,
      },
    ],
    devices: [
      {
        deviceId: SYNTHETIC_CONSTANTS.DEVICE_1,
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        modelCode: "SM-A54-CALIBRATED",
        manufacturer: "Samsung",
        displayPpi: 403,
        verifiedStatus: "qualified",
        killSwitchReasonFa: null,
        updatedByUserId: SYNTHETIC_CONSTANTS.USER_OPHTH,
        createdAtIso: earlierIso,
        updatedAtIso: earlierIso,
      },
      {
        deviceId: SYNTHETIC_CONSTANTS.DEVICE_2_KILLED,
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        modelCode: "LEGACY-PANEL-KILL",
        manufacturer: "GenericVendor",
        displayPpi: 240,
        verifiedStatus: "killed",
        killSwitchReasonFa: "اختلال کالیبراسیون نور پس‌زمینه نمایشگر — مسدودشده",
        updatedByUserId: SYNTHETIC_CONSTANTS.USER_OPHTH,
        createdAtIso: earlierIso,
        updatedAtIso: nowIso,
      },
    ],
    plans: {
      [SYNTHETIC_CONSTANTS.PATIENT_1]: [
        {
          planId: "plan-r2-1",
          tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
          clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
          patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
          eyeLaterality: "OD",
          eyeLabelFa: "چشم راست",
          testTypes: ["landolt_c", "amsler"],
          cadenceDays: 7,
          alertThresholdLogmar: 0.2,
          active: true,
          createdByUserId: SYNTHETIC_CONSTANTS.USER_OPHTH,
          createdAtIso: earlierIso,
          updatedAtIso: earlierIso,
        },
      ],
    },
    sessions: [
      {
        id: SYNTHETIC_CONSTANTS.SESSION_R2_1,
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
        calibrationProfileId: "cal-1",
        eyeLaterality: "OD",
        testType: "landolt_c",
        vaLogmar: 0.14,
        amslerDistortionScore: 0,
        amslerCentralScotoma: false,
        viewingDistanceCm: 36,
        ambientLux: 210,
        deviceTiltDeg: 2.5,
        glareDetected: false,
        qualityStatus: "accepted",
        rejectionCodes: [],
        measuredAtIso: "2026-11-18T08:15:00.000Z",
      },
      {
        id: SYNTHETIC_CONSTANTS.SESSION_R2_2,
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
        calibrationProfileId: "cal-1",
        eyeLaterality: "OD",
        testType: "landolt_c",
        vaLogmar: 0.34,
        amslerDistortionScore: 0.22,
        amslerCentralScotoma: false,
        viewingDistanceCm: 35,
        ambientLux: 195,
        deviceTiltDeg: 3.0,
        glareDetected: false,
        qualityStatus: "accepted",
        rejectionCodes: [],
        measuredAtIso: nowIso,
      },
    ],
    iopReadings: [
      {
        readingId: "iop-1",
        patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
        deviceVendor: "iCare HOME2",
        deviceSerialHash: "hash-home2-01",
        eyeLaterality: "OD",
        eyeLabelFa: "چشم راست",
        iopMmHg: 16.5,
        qualityScore: 0.94,
        accepted: true,
        measuredAtIso: nowIso,
      },
      {
        readingId: "iop-2",
        patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
        deviceVendor: "iCare HOME2",
        deviceSerialHash: "hash-home2-01",
        eyeLaterality: "OS",
        eyeLabelFa: "چشم چپ",
        iopMmHg: 15.0,
        qualityScore: 0.91,
        accepted: true,
        measuredAtIso: nowIso,
      },
    ],
    reports: [
      {
        reportId: SYNTHETIC_CONSTANTS.REPORT_1,
        reportType: "signed_diagnostic",
        patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
        patientNameFa: "مهدی احمدی",
        sourceRefId: SYNTHETIC_CONSTANTS.STUDY_3_SIGNED_PRIOR,
        sourceSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        pdfSha256: "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7",
        titleFa: "گزارش تاییدشده OCT چشم راست — مهدی احمدی",
        issuedAtJalali: "۱۴۰۵/۰۸/۲۹",
        createdAtIso: earlierIso,
        payload: {
          titleFa: "گزارش تاییدشده OCT چشم راست",
          issuedAtJalali: "۱۴۰۵/۰۸/۲۹",
          clinicNameFa: "کلینیک فوق‌تخصصی چشم بینا",
          emergencyHotlinePhone: "+982182401001",
          sections: [
            {
              headingFa: "نتیجه نهایی تاییدشده (چشم راست (OD))",
              linesFa: [
                "اولویت: پیگیری ۳ تا ۶ ماه",
                "ضخامت مرکزی ماکولا در چشم راست ۲۸۴ میکرومتر است و نیاز به ادامه پایش دارد.",
              ],
            },
          ],
        },
      },
    ],
    staffMembers: SYNTHETIC_DEMO_ACCOUNTS.map((acc, idx) => ({
      id: `mem-${idx + 1}`,
      tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
      clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
      userId: acc.userId,
      role: acc.role,
      active: true,
      fullNameFa: acc.nameFa,
      email: `${acc.role}@bina-clinic.ir`,
      mfaVerifiedAtIso: earlierIso,
      createdAtIso: earlierIso,
    })),
    protocols: [
      {
        id: "proto-1",
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        protocolType: "post_cataract",
        version: 1,
        schema: { defaultFollowUpHours: 24, offlineHotlinePhone: "+982182401001" },
        approvedBy: SYNTHETIC_CONSTANTS.USER_OPHTH,
        createdAtIso: earlierIso,
      },
    ],
    messageTemplates: [
      {
        templateId: "tpl-sms-1",
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        templateKey: "daily_check_safe",
        version: 1,
        bodyTemplateFa: "بیمار گرامی، زمان ثبت بررسی روزانه مراقبت چشمی شما در سامانه فرا رسیده است.",
        channel: "sms",
        active: true,
        updatedByUserId: SYNTHETIC_CONSTANTS.USER_ADMIN,
        createdAtIso: earlierIso,
      },
    ],
    consentTemplates: [
      {
        consentTemplateId: "ctpl-1",
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        consentType: "care_enrollment",
        version: "fa-ir-v2.1",
        titleFa: "رضایت‌نامه مراقبت چشمی و پایش از راه دور",
        bodyFa: "بیمار تایید می‌کند که داده‌های درمانی و پایش چشمی صرفاً با تایید پزشک معالج استفاده می‌شود.",
        active: true,
        updatedByUserId: SYNTHETIC_CONSTANTS.USER_ADMIN,
        createdAtIso: earlierIso,
      },
    ],
    featureFlags: [
      {
        flagKey: "r2_home_monitoring",
        labelFa: "پایش بینایی خانگی R2",
        descriptionFa: "فعال‌سازی آزمون‌های کالیبره‌شده لاندولت C و آمسلر",
        enabled: true,
        config: {},
        updatedAtIso: earlierIso,
      },
      {
        flagKey: "icare_home2_iop",
        labelFa: "اتصال فشارسنج خانگی iCare HOME2 [گیت‌شده]",
        descriptionFa: "دریافت داده‌های فشار چشم خانگی از آداپتور مجاز",
        enabled: true,
        config: {},
        updatedAtIso: earlierIso,
      },
      {
        flagKey: "home_vr_vf",
        labelFa: "میدان بینایی خانگی VR [پیشنهادی / غیرفعال]",
        descriptionFa: "در انتظار تایید پروتکل بالینی و صلاحیت سخت‌افزاری",
        enabled: false,
        config: {},
        updatedAtIso: earlierIso,
      },
      {
        flagKey: "staff_web_ai_quality_dashboard",
        labelFa: "داشبورد کیفیت مدل‌های هوش مصنوعی",
        descriptionFa: "نمایش شاخص‌های آنلاین QC و بازخورد پزشکان",
        enabled: true,
        config: {},
        updatedAtIso: earlierIso,
      },
      {
        flagKey: "research_d5_export",
        labelFa: "خروجی پژوهشی با هویت‌زدایی D5 [گیت‌شده]",
        descriptionFa: "نیازمند کد کمیته اخلاق و تایید هویت‌زدایی DICOM",
        enabled: false,
        config: {},
        updatedAtIso: earlierIso,
      },
    ],
    endpoints: [
      {
        endpointId: SYNTHETIC_CONSTANTS.ENDPOINT_1,
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        integrationType: "dicomweb",
        nameFa: "سرور PACS مرکزی کلینیک",
        endpointUrl: "https://pacs.clinic.internal/dicom-web",
        aeTitle: "BINA_PACS_TEH",
        authMode: "mtls",
        secretMasked: "****4920",
        enabled: true,
        lastTestedAtIso: earlierIso,
        lastTestStatus: "ok",
        createdAtIso: earlierIso,
        updatedAtIso: earlierIso,
      },
    ],
    deliveries: [
      {
        deliveryId: "del-1",
        clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
        endpointId: SYNTHETIC_CONSTANTS.ENDPOINT_1,
        endpointNameFa: "سرور PACS مرکزی کلینیک",
        direction: "outbound",
        payloadType: "connectivity_probe:dicomweb",
        referenceId: null,
        status: "delivered",
        httpStatus: 200,
        errorCode: null,
        errorMessageFa: null,
        attemptCount: 1,
        createdAtIso: earlierIso,
        updatedAtIso: earlierIso,
      },
    ],
    breakGlassSessions: [],
    auditLogs: [
      {
        id: "aud-1",
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        actorUserId: SYNTHETIC_CONSTANTS.USER_OPHTH,
        actorRole: "ophthalmologist",
        action: "prescription.published",
        resourceType: "care_episode",
        resourceId: SYNTHETIC_CONSTANTS.EPISODE_1_OD,
        reasonFa: "انتشار نسخه شماره ۲ چشم راست",
        breakGlass: false,
        occurredAtIso: nowIso,
      },
      {
        id: "aud-2",
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        actorUserId: SYNTHETIC_CONSTANTS.USER_OPHTH,
        actorRole: "ophthalmologist",
        action: "diagnostic.urgent-floor-applied",
        resourceType: "diagnostic_study",
        resourceId: SYNTHETIC_CONSTANTS.STUDY_1_CNV,
        reasonFa: "اعمال کف فوریت قطعی برای Active CNV",
        breakGlass: false,
        occurredAtIso: nowIso,
      },
    ],
  };
}

let db = createInitialMockState();

export function resetMockDb(): void {
  db = createInitialMockState();
}

function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function parseBearerContext(headers?: HeadersInit): {
  userId: string;
  role: "ophthalmologist" | "optometrist" | "technician" | "coordinator" | "admin";
  clinicId: string;
  stepUpVerified: boolean;
} {
  const h = new Headers(headers);
  const auth = h.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  // Format issued below: mock-jwt|<userId>|<role>|<clinicId>|<stepUp 0|1>
  const parts = token.split("|");
  if (parts.length >= 5 && parts[0] === "mock-jwt") {
    return {
      userId: parts[1]!,
      role: parts[2]! as "ophthalmologist" | "optometrist" | "technician" | "coordinator" | "admin",
      clinicId: parts[3]!,
      stepUpVerified: parts[4] === "1",
    };
  }
  return {
    userId: SYNTHETIC_CONSTANTS.USER_OPHTH,
    role: "ophthalmologist",
    clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
    stepUpVerified: false,
  };
}

const PHI_SMS_TERMS = ["بتامتازون", "لووفلوکساسین", "کراتیت", "ادم پاپی", "جداشدگی", "گلوکوم", "کاتاراکت", "دیابت"];

export async function handleMockRequest(urlStr: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const u = new URL(urlStr, "http://127.0.0.1");
  const path = u.pathname;
  const body =
    typeof init.body === "string" && init.body.length > 0
      ? (JSON.parse(init.body) as Record<string, unknown>)
      : {};
  const ctx = parseBearerContext(init.headers);

  if (path === "/health") {
    return jsonResponse(200, {
      status: "ok",
      service: "bina-mock",
      locale: "fa-IR",
      calendar: "jalali",
      jurisdiction: "IR",
      aiEngineMode: "cpu_stub",
      llmProvider: "openai_compatible",
      llmModel: "thinkingmachines/inkling-2-mini",
      llmConfigured: false,
      contractVersion: "1.0.0",
    });
  }

  if (method === "POST" && path === "/v1/auth/staff/session") {
    const oidcToken = String(body.oidcToken ?? "");
    const clinicId = String(body.clinicId ?? SYNTHETIC_CONSTANTS.CLINIC_A1);
    const uid = oidcToken.startsWith("dev-oidc:") ? oidcToken.slice("dev-oidc:".length).trim() : SYNTHETIC_CONSTANTS.USER_OPHTH;
    const member = db.staffMembers.find((m) => m.userId === uid) ?? db.staffMembers[0]!;
    const role = member.role as "ophthalmologist" | "optometrist" | "technician" | "coordinator" | "admin";
    return jsonResponse(200, {
      accessToken: `mock-jwt|${uid}|${role}|${clinicId}|0`,
      role,
      mfaVerified: true,
      userId: uid,
      clinicId,
      tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
    });
  }

  if (method === "POST" && path === "/v1/auth/staff/step-up") {
    const code = String(body.stepUpCode ?? "");
    if (code.trim().length < 6) {
      return jsonResponse(401, {
        error: "STEP_UP_VERIFICATION_FAILED",
        messageFa: "کد تایید مجدد باید حداقل ۶ رقم باشد.",
      });
    }
    return jsonResponse(200, {
      accessToken: `mock-jwt|${ctx.userId}|${ctx.role}|${ctx.clinicId}|1`,
      stepUpVerified: true,
    });
  }

  if (method === "GET" && path === "/v1/auth/staff/me") {
    return jsonResponse(200, {
      userId: ctx.userId,
      tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
      clinicId: ctx.clinicId,
      role: ctx.role,
      mfaVerified: true,
      stepUpVerified: ctx.stepUpVerified,
      capabilities: roleCapabilities(ctx.role, ctx.stepUpVerified),
      clinic: {
        clinicId: ctx.clinicId,
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        nameFa: ctx.clinicId === SYNTHETIC_CONSTANTS.CLINIC_A2 ? "شعبه شرق تهران بینا" : db.clinicNameFa,
        locale: "fa-IR",
        calendarMode: "jalali",
        emergencyPhone: "+982182401001",
        staffedHoursFa: "شنبه تا چهارشنبه ۸ تا ۲۰ — پنج‌شنبه ۸ تا ۱۴",
        todayJalali: "۱۴۰۵/۰۹/۰۵",
        currentlyStaffed: true,
      },
      authorizedClinics: [
        {
          membershipId: "mem-clinic-1",
          tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
          clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
          clinicNameFa: db.clinicNameFa,
          role: ctx.role,
          emergencyPhone: "+982182401001",
          calendarMode: "jalali",
        },
        {
          membershipId: "mem-clinic-2",
          tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
          clinicId: SYNTHETIC_CONSTANTS.CLINIC_A2,
          clinicNameFa: "شعبه شرق تهران بینا",
          role: ctx.role,
          emergencyPhone: "+982182401002",
          calendarMode: "jalali",
        },
      ],
      featureFlags: db.featureFlags,
    });
  }

  if (method === "GET" && path === "/v1/auth/staff/clinics") {
    return jsonResponse(200, {
      items: [
        {
          membershipId: "mem-clinic-1",
          tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
          clinicId: SYNTHETIC_CONSTANTS.CLINIC_A1,
          clinicNameFa: db.clinicNameFa,
          role: ctx.role,
          emergencyPhone: "+982182401001",
          calendarMode: "jalali",
        },
        {
          membershipId: "mem-clinic-2",
          tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
          clinicId: SYNTHETIC_CONSTANTS.CLINIC_A2,
          clinicNameFa: "شعبه شرق تهران بینا",
          role: ctx.role,
          emergencyPhone: "+982182401002",
          calendarMode: "jalali",
        },
      ],
    });
  }

  // Overview
  if (method === "GET" && path === "/v1/overview/dashboard") {
    return jsonResponse(200, {
      todayJalali: "۱۴۰۵/۰۹/۰۵",
      activeEpisodesOd: db.episodes.filter((e) => e.status === "active" && e.eyeLaterality === "OD").length,
      activeEpisodesOs: db.episodes.filter((e) => e.status === "active" && e.eyeLaterality === "OS").length,
      printPhoneCohortCount: db.patients.filter((p) => p.accessMode === "print_phone").length,
      urgentTriageCount: db.triageCases.filter((c) => c.urgencyTier === "urgent" && c.status !== "Closed").length,
      overdueSlaCount: 1,
      openTriageCount: db.triageCases.filter((c) => c.status !== "Closed").length,
      pendingHitlStudies: db.studies.filter((s) => s.status === "pending_hitl" || s.status === "analyzed").length,
      qcFailedStudies: db.studies.filter((s) => s.status === "qc_failed").length,
      r2AlertCount: 1,
      activeOutagesCount: db.outages.filter((o) => o.status !== "resolved").length,
      queueUrgentItems: db.triageCases
        .filter((c) => c.status !== "Closed")
        .map((c) => ({
          caseId: c.id,
          patientId: c.patientId,
          patientNameFa: c.patientNameFa,
          eyeLaterality: c.eyeLaterality,
          eyeLabelFa: c.eyeLabelFa,
          status: c.status,
          urgencyTier: c.urgencyTier,
          slaDueAtIso: c.slaDueAt,
        })),
      pendingHitlItems: db.studies
        .filter((s) => s.status === "pending_hitl" || s.status === "analyzed")
        .map((s) => ({
          studyId: s.studyId,
          patientId: s.patientId,
          patientNameFa: s.patientNameFa,
          eyeLaterality: s.eyeLaterality,
          eyeLabelFa: s.eyeLaterality === "OD" ? "چشم راست" : "چشم چپ",
          urgencyTier: (s.fusionResult as { recommendedUrgency?: string } | undefined)?.recommendedUrgency ?? null,
          urgencyLabelFa: (s.fusionResult as { recommendedUrgencyLabelFa?: string } | undefined)?.recommendedUrgencyLabelFa ?? null,
          createdAtIso: s.createdAtIso,
        })),
    });
  }

  if (method === "GET" && path === "/v1/overview/search") {
    const q = (u.searchParams.get("q") ?? "").trim();
    if (q.length < 2) {
      return jsonResponse(400, { error: "SEARCH_QUERY_TOO_SHORT", messageFa: "عبارت جستجو حداقل ۲ کاراکتر باشد." });
    }
    return jsonResponse(200, {
      query: q,
      patients: db.patients.filter((p) => String(p.fullNameFa).includes(q) || String(p.patientId).includes(q)),
      studies: db.studies
        .filter((s) => String(s.patientNameFa).includes(q) || String(s.studyId).includes(q))
        .map((s) => ({ ...s, createdAtJalali: s.createdAtJalali ?? "۱۴۰۵/۰۹/۰۵" })),
      episodes: db.episodes.filter((e) => String(e.patientNameFa).includes(q)),
      reports: db.reports.filter((r) => String(r.titleFa).includes(q)),
    });
  }

  if (method === "GET" && path === "/v1/overview/activity") {
    return jsonResponse(200, {
      items: db.auditLogs.map((a) => ({
        activityId: a.id,
        action: a.action,
        actorRole: a.actorRole,
        resourceType: a.resourceType,
        resourceId: a.resourceId,
        breakGlass: Boolean(a.breakGlass),
        reasonFa: a.reasonFa ?? null,
        occurredAtIso: a.occurredAtIso,
        occurredAtJalali: "۱۴۰۵/۰۹/۰۵",
      })),
    });
  }

  // Patients
  if (method === "GET" && path === "/v1/patients") {
    const q = (u.searchParams.get("q") ?? "").trim();
    const accessMode = u.searchParams.get("accessMode");
    const items = db.patients.filter((p) => {
      if (q && !String(p.fullNameFa).includes(q) && !String(p.patientId).includes(q)) return false;
      if (accessMode && p.accessMode !== accessMode) return false;
      return true;
    });
    return jsonResponse(200, { items, total: items.length });
  }

  if (method === "POST" && path === "/v1/patients") {
    const pid = crypto.randomUUID();
    const phone = String(body.phoneNumber ?? "+989120000000");
    const newPatient = {
      patientId: pid,
      tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
      clinicId: ctx.clinicId,
      fullNameFa: String(body.fullNameFa ?? "بیمار جدید"),
      phoneMasked: `${phone.slice(0, 6)}***${phone.slice(-4)}`,
      nationalIdMasked: body.nationalIdMasked ?? null,
      birthYearJalali: body.birthYearJalali ?? null,
      notesFa: body.notesFa ?? null,
      accessMode: body.accessMode ?? "app",
      preferredLocale: "fa-IR",
      mlTrainingConsentFlag: Boolean(body.mlTrainingConsentFlag),
      activeEpisodeCount: 0,
      openTriageCount: 0,
      createdAtIso: new Date().toISOString(),
    };
    db.patients.unshift(newPatient);
    if (body.consentVersion) {
      db.consents[pid] = [
        {
          consentId: crypto.randomUUID(),
          consentVersion: String(body.consentVersion),
          locale: "fa-IR",
          action: "accepted",
          acceptedAtIso: new Date().toISOString(),
        },
      ];
    }
    return jsonResponse(201, { ...newPatient, consents: db.consents[pid] ?? [] });
  }

  const patientMatch = path.match(/^\/v1\/patients\/([^/]+)$/);
  if (method === "GET" && patientMatch) {
    const pid = patientMatch[1]!;
    const patient = db.patients.find((p) => p.patientId === pid);
    if (!patient) return jsonResponse(404, { error: "PATIENT_NOT_FOUND", messageFa: "پروفایل بیمار یافت نشد." });
    return jsonResponse(200, {
      patient,
      odEpisodes: db.episodes.filter((e) => e.patientId === pid && e.eyeLaterality === "OD"),
      osEpisodes: db.episodes.filter((e) => e.patientId === pid && e.eyeLaterality === "OS"),
      recentStudies: db.studies.filter((s) => s.patientId === pid),
      r2Summary: {
        odBaselineVaLogmar: 0.14,
        osBaselineVaLogmar: null,
        recentAlerts: [],
        latestIopOdMmHg: db.iopReadings.find((r) => r.patientId === pid && r.eyeLaterality === "OD")?.iopMmHg ?? null,
        latestIopOsMmHg: db.iopReadings.find((r) => r.patientId === pid && r.eyeLaterality === "OS")?.iopMmHg ?? null,
      },
      openTriageCases: db.triageCases.filter((c) => c.patientId === pid && c.status !== "Closed"),
      pendingFollowUpTasks: db.followUps.filter((f) => f.patientId === pid && f.status === "pending"),
      clinicalHistories: db.histories[pid] ?? [],
      consents: db.consents[pid] ?? [],
    });
  }

  const patHistMatch = path.match(/^\/v1\/patients\/([^/]+)\/history$/);
  if (patHistMatch) {
    const pid = patHistMatch[1]!;
    if (method === "GET") return jsonResponse(200, { items: db.histories[pid] ?? [] });
    if (method === "POST") {
      const rec = {
        historyId: crypto.randomUUID(),
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: ctx.clinicId,
        patientId: pid,
        recordedByUserId: ctx.userId,
        summaryFa: body.summaryFa,
        conditions: body.conditions ?? [],
        allergies: body.allergies ?? [],
        medications: body.medications ?? [],
        riskFactors: body.riskFactors ?? {},
        labs: body.labs ?? {},
        createdAtIso: new Date().toISOString(),
      };
      db.histories[pid] = [rec, ...(db.histories[pid] ?? [])];
      return jsonResponse(201, rec);
    }
  }

  const patTimelineMatch = path.match(/^\/v1\/patients\/([^/]+)\/timeline$/);
  if (method === "GET" && patTimelineMatch) {
    const pid = patTimelineMatch[1]!;
    const events: Array<Record<string, unknown>> = [];
    for (const st of db.studies.filter((s) => s.patientId === pid)) {
      events.push({
        category: "diagnostic_study",
        refId: st.studyId,
        eyeLaterality: st.eyeLaterality,
        eyeLabelFa: st.eyeLaterality === "OD" ? "چشم راست" : "چشم چپ",
        titleFa: "مطالعه تشخیصی چندوجهی",
        summaryFa: `وضعیت مطالعه: ${String(st.status)}`,
        occurredAtIso: st.createdAtIso,
        occurredAtJalali: "۱۴۰۵/۰۹/۰۵",
      });
    }
    for (const ep of db.episodes.filter((e) => e.patientId === pid)) {
      events.push({
        category: "episode",
        refId: ep.episodeId,
        eyeLaterality: ep.eyeLaterality,
        eyeLabelFa: ep.eyeLabelFa,
        titleFa: "دوره مراقبت جراحی",
        summaryFa: `${String(ep.protocolType)} — نسخه فعال ${String(ep.activePrescriptionVersion)}`,
        occurredAtIso: ep.anchorAtIso,
        occurredAtJalali: ep.anchorAtJalali,
      });
    }
    return jsonResponse(200, { items: events });
  }

  const patConsentMatch = path.match(/^\/v1\/patients\/([^/]+)\/consent$/);
  if (method === "PATCH" && patConsentMatch) {
    const pid = patConsentMatch[1]!;
    const patient = db.patients.find((p) => p.patientId === pid);
    if (!patient) return jsonResponse(404, { error: "PATIENT_NOT_FOUND", messageFa: "بیمار یافت نشد." });
    if (typeof body.mlTrainingConsentFlag === "boolean") {
      patient.mlTrainingConsentFlag = body.mlTrainingConsentFlag;
    }
    const rec = {
      consentId: crypto.randomUUID(),
      consentVersion: String(body.consentVersion ?? "fa-ir-v2.1"),
      locale: "fa-IR",
      action: body.action ?? "accepted",
      acceptedAt: new Date().toISOString(),
    };
    db.consents[pid] = [rec, ...(db.consents[pid] ?? [])];
    return jsonResponse(200, rec);
  }

  const patCgMatch = path.match(/^\/v1\/patients\/([^/]+)\/caregivers$/);
  if (patCgMatch) {
    const pid = patCgMatch[1]!;
    if (method === "GET") return jsonResponse(200, { items: db.caregivers[pid] ?? [] });
    if (method === "POST") {
      const grant = {
        grantId: crypto.randomUUID(),
        patientId: pid,
        caregiverPhone: "***",
        relationshipFa: body.relationshipFa ?? "همراه",
        scopes: body.scopes ?? ["view_today"],
        active: true,
        createdAt: new Date().toISOString(),
      };
      db.caregivers[pid] = [grant, ...(db.caregivers[pid] ?? [])];
      return jsonResponse(201, grant);
    }
  }

  const patCgRevokeMatch = path.match(/^\/v1\/patients\/([^/]+)\/caregivers\/([^/]+)\/revoke$/);
  if (method === "POST" && patCgRevokeMatch) {
    const [, pid, gid] = patCgRevokeMatch;
    const list = db.caregivers[pid!] ?? [];
    const found = list.find((g) => g.grantId === gid);
    if (found) found.active = false;
    return jsonResponse(200, { revoked: true });
  }

  // Diagnostic Studies
  if (method === "GET" && path === "/v1/diagnostic-studies") {
    const status = u.searchParams.get("status");
    const eye = u.searchParams.get("eyeLaterality");
    const items = db.studies
      .filter((s) => (!status || s.status === status) && (!eye || s.eyeLaterality === eye))
      .map((s) => ({
        studyId: s.studyId,
        patientId: s.patientId,
        patientNameFa: s.patientNameFa,
        clinicId: s.clinicId,
        eyeLaterality: s.eyeLaterality,
        eyeLabelFa: s.eyeLaterality === "OD" ? "چشم راست" : s.eyeLaterality === "OS" ? "چشم چپ" : "هر دو چشم",
        status: s.status,
        urgencyTier: (s.fusionResult as { recommendedUrgency?: string } | undefined)?.recommendedUrgency ?? null,
        urgencyLabelFa: (s.fusionResult as { recommendedUrgencyLabelFa?: string } | undefined)?.recommendedUrgencyLabelFa ?? null,
        urgentFloorActive: Boolean(s.urgentFloorActive),
        modalities: Array.from(new Set((s.assets as Array<{ declaredModality: string }>).map((a) => a.declaredModality))),
        topConditionNameFa:
          (s.fusionResult as { differential?: Array<{ conditionNameFa: string }> } | undefined)?.differential?.[0]
            ?.conditionNameFa ?? null,
        createdAtIso: s.createdAtIso,
        createdAtJalali: "۱۴۰۵/۰۹/۰۵",
        signedAtIso: (s.signoff as { signedAtIso?: string } | undefined)?.signedAtIso ?? null,
      }));
    return jsonResponse(200, { items, total: items.length });
  }

  if (method === "POST" && path === "/v1/diagnostic-studies") {
    const studyId = crypto.randomUUID();
    const assets = (body.assets as Array<Record<string, unknown>>) ?? [];
    const hasBlur = assets.some((a) => String(a.s3ObjectKey ?? "").includes("blur") || (Number(a.blurScoreHint ?? 1) < 0.3));
    const eye = (body.eyeLaterality as string) ?? "OD";
    const patient = db.patients.find((p) => p.patientId === body.patientId);
    const created: Record<string, unknown> = hasBlur
      ? {
          studyId,
          tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
          clinicId: ctx.clinicId,
          patientId: body.patientId,
          patientNameFa: patient?.fullNameFa ?? "بیمار",
          eyeLaterality: eye,
          status: "qc_failed",
          urgentFloorActive: false,
          urgentFloorRuleCodes: [],
          assets: assets.map((a) => ({ ...a, qcStatus: "reject", createdAtIso: new Date().toISOString() })),
          qcDecisions: assets.map((a) => ({
            assetId: a.assetId,
            modalityPrediction: {
              assetId: a.assetId,
              declaredModality: a.declaredModality,
              detectedModality: a.declaredModality,
              confidence: 0.9,
              matchesDeclared: true,
            },
            passed: false,
            rejectionCodes: ["blur"],
            rejectionReasonsFa: ["وضوح تصویر برای ارزیابی بالینی کافی نیست."],
            recaptureInstructionFa: "لطفاً با فوکوس دقیق‌تر تصویربرداری را تکرار کنید.",
          })),
          specialistOutputs: [],
          createdAtIso: new Date().toISOString(),
          updatedAtIso: new Date().toISOString(),
        }
      : {
          ...structuredClone(db.studies[0]!),
          studyId,
          patientId: body.patientId,
          patientNameFa: patient?.fullNameFa ?? "بیمار",
          eyeLaterality: eye,
          status: "pending_hitl",
          signoff: undefined,
          createdAtIso: new Date().toISOString(),
          updatedAtIso: new Date().toISOString(),
        };
    db.studies.unshift(created);
    return jsonResponse(202, created);
  }

  const studyDetailMatch = path.match(/^\/v1\/diagnostic-studies\/([^/]+)$/);
  if (method === "GET" && studyDetailMatch) {
    const found = db.studies.find((s) => s.studyId === studyDetailMatch[1]);
    if (!found) return jsonResponse(404, { error: "STUDY_NOT_FOUND", messageFa: "مطالعه تشخیصی یافت نشد." });
    return jsonResponse(200, found);
  }

  const studyAssetsMatch = path.match(/^\/v1\/diagnostic-studies\/([^/]+)\/assets$/);
  if (method === "POST" && studyAssetsMatch) {
    const found = db.studies.find((s) => s.studyId === studyAssetsMatch[1]);
    if (!found) return jsonResponse(404, { error: "STUDY_NOT_FOUND", messageFa: "مطالعه یافت نشد." });
    const newAssets = ((body.assets as Array<Record<string, unknown>>) ?? []).map((a) => ({
      ...a,
      qcStatus: "pass",
      createdAtIso: new Date().toISOString(),
    }));
    found.assets = [...((found.assets as Array<Record<string, unknown>>) ?? []), ...newAssets];
    found.status = "pending_hitl";
    found.urgentFloorActive = true;
    const base = db.studies.find((s) => s.studyId === SYNTHETIC_CONSTANTS.STUDY_1_CNV)!;
    found.specialistOutputs = structuredClone(base.specialistOutputs);
    found.fusionResult = structuredClone(base.fusionResult);
    found.explainability = structuredClone(base.explainability);
    found.persianReportDraft = structuredClone(base.persianReportDraft);
    return jsonResponse(202, found);
  }

  const studyDraftMatch = path.match(/^\/v1\/diagnostic-studies\/([^/]+)\/report-draft$/);
  if (method === "PUT" && studyDraftMatch) {
    const found = db.studies.find((s) => s.studyId === studyDraftMatch[1]);
    if (!found) return jsonResponse(404, { error: "STUDY_NOT_FOUND", messageFa: "مطالعه یافت نشد." });
    const draft = (found.persianReportDraft as Record<string, unknown>) ?? { draftVersion: 1 };
    if (Number(body.expectedDraftVersion) !== Number(draft.draftVersion ?? 1)) {
      return jsonResponse(409, {
        error: "DRAFT_VERSION_CONFLICT",
        messageFa: "نسخه پیش‌نویس تغییر کرده است؛ لطفاً تازه‌سازی کنید.",
      });
    }
    const text = `${String(body.titleFa ?? "")} ${String(body.modalityFindingsFa ?? "")}`;
    if (text.includes("همه‌چیز عادی") || text.includes("مشکلی وجود ندارد")) {
      return jsonResponse(422, {
        error: "REPORT_DRAFT_VALIDATION_FAILED",
        messageFa: "پیش‌نویس گزارش نباید حاوی عبارت غیرعلمی اطمینان مطلق باشد.",
      });
    }
    const nextDraft = {
      ...draft,
      ...body,
      draftVersion: Number(draft.draftVersion ?? 1) + 1,
      updatedAtIso: new Date().toISOString(),
    };
    found.persianReportDraft = nextDraft;
    return jsonResponse(200, nextDraft);
  }

  const studySignoffMatch = path.match(/^\/v1\/diagnostic-studies\/([^/]+)\/signoff$/);
  if (method === "POST" && studySignoffMatch) {
    if (ctx.role !== "ophthalmologist") {
      return jsonResponse(403, { error: "FORBIDDEN_ROLE", messageFa: "امضای نهایی فقط توسط چشم‌پزشک مجاز است." });
    }
    const found = db.studies.find((s) => s.studyId === studySignoffMatch[1]);
    if (!found) return jsonResponse(404, { error: "STUDY_NOT_FOUND", messageFa: "مطالعه یافت نشد." });
    if (found.status === "qc_failed") {
      return jsonResponse(400, { error: "CANNOT_SIGNOFF_QC_FAILED", messageFa: "مطالعه ردشده در QC قابل امضا نیست." });
    }
    if (found.urgentFloorActive && body.finalUrgency !== "urgent") {
      return jsonResponse(422, {
        error: "URGENT_FLOOR_DOWNGRADE_FORBIDDEN",
        messageFa: "کاهش سطح فوریت زیر حد اضطراری قطعی مجاز نیست.",
      });
    }
    const signoff = {
      signoffId: crypto.randomUUID(),
      studyId: found.studyId,
      ophthalmologistId: ctx.userId,
      action: body.action ?? "approved",
      finalUrgency: body.finalUrgency,
      finalUrgencyLabelFa:
        body.finalUrgency === "urgent" ? "ارجاع فوری" : body.finalUrgency === "followup_3_6m" ? "پیگیری ۳ تا ۶ ماه" : "عادی",
      finalReportTextFa: body.finalReportTextFa,
      overrideReasonFa: body.overrideReasonFa,
      signedAtIso: new Date().toISOString(),
    };
    found.status = "signed_off";
    found.signoff = signoff;
    return jsonResponse(200, signoff);
  }

  const studyFeedbackMatch = path.match(/^\/v1\/diagnostic-studies\/([^/]+)\/feedback$/);
  if (studyFeedbackMatch) {
    const sid = studyFeedbackMatch[1]!;
    if (method === "GET") return jsonResponse(200, { items: db.feedbackByStudy[sid] ?? [] });
    if (method === "POST") {
      const rec = {
        feedbackId: crypto.randomUUID(),
        studyId: sid,
        clinicianUserId: ctx.userId,
        ...body,
        createdAtIso: new Date().toISOString(),
      };
      db.feedbackByStudy[sid] = [rec, ...(db.feedbackByStudy[sid] ?? [])];
      return jsonResponse(201, rec);
    }
  }

  const studyCompareMatch = path.match(/^\/v1\/diagnostic-studies\/([^/]+)\/compare$/);
  if (method === "GET" && studyCompareMatch) {
    const currentStudy = db.studies.find((s) => s.studyId === studyCompareMatch[1]) ?? db.studies[0]!;
    const prior = db.studies.filter((s) => s.studyId !== currentStudy.studyId && s.patientId === currentStudy.patientId);
    return jsonResponse(200, {
      currentStudy,
      priorStudies: prior,
      biomarkerDeltas: prior.length > 0 ? [{ metricKey: "oct.cmt_um", currentValue: 412, priorValue: 284, delta: 128 }] : [],
    });
  }

  const studyJobsMatch = path.match(/^\/v1\/diagnostic-studies\/([^/]+)\/jobs$/);
  if (method === "GET" && studyJobsMatch) {
    return jsonResponse(200, { items: db.jobsByStudy[studyJobsMatch[1]!] ?? [] });
  }

  // Care Episodes
  if (method === "GET" && path === "/v1/episodes") {
    return jsonResponse(200, { items: db.episodes, total: db.episodes.length });
  }

  if (method === "POST" && path === "/v1/episodes") {
    const ep = {
      episodeId: crypto.randomUUID(),
      clinicId: ctx.clinicId,
      patientId: body.patientId,
      patientNameFa: db.patients.find((p) => p.patientId === body.patientId)?.fullNameFa ?? "بیمار",
      phoneMasked: "+98912***0000",
      protocolType: body.protocolType ?? "post_cataract",
      eyeLaterality: body.eyeLaterality,
      eyeLabelFa: body.eyeLaterality === "OD" ? "چشم راست" : "چشم چپ",
      surgeonId: body.surgeonId ?? ctx.userId,
      accessMode: body.accessMode ?? "app",
      activePrescriptionVersion: 0,
      status: "active",
      anchorAtIso: body.anchorAt ?? new Date().toISOString(),
      anchorAtJalali: "۱۴۰۵/۰۹/۰۵",
    };
    db.episodes.unshift(ep);
    return jsonResponse(201, ep);
  }

  const epMatch = path.match(/^\/v1\/episodes\/([^/]+)$/);
  if (method === "GET" && epMatch) {
    const ep = db.episodes.find((e) => e.episodeId === epMatch[1]);
    if (!ep) return jsonResponse(404, { error: "EPISODE_NOT_FOUND", messageFa: "اپیزود یافت نشد." });
    return jsonResponse(200, ep);
  }

  const epCloseMatch = path.match(/^\/v1\/episodes\/([^/]+)\/close$/);
  if (method === "PATCH" && epCloseMatch) {
    const ep = db.episodes.find((e) => e.episodeId === epCloseMatch[1]);
    if (!ep) return jsonResponse(404, { error: "EPISODE_NOT_FOUND", messageFa: "اپیزود یافت نشد." });
    ep.status = body.status ?? "completed";
    return jsonResponse(200, ep);
  }

  const epRxMatch = path.match(/^\/v1\/episodes\/([^/]+)\/prescriptions$/);
  if (epRxMatch) {
    const eid = epRxMatch[1]!;
    if (method === "GET") return jsonResponse(200, { items: db.prescriptions[eid] ?? [] });
    if (method === "POST") {
      if (ctx.role !== "ophthalmologist") {
        return jsonResponse(403, { error: "FORBIDDEN_ROLE", messageFa: "انتشار نسخه فقط توسط چشم‌پزشک مجاز است." });
      }
      const ep = db.episodes.find((e) => e.episodeId === eid);
      if (!ep) return jsonResponse(404, { error: "EPISODE_NOT_FOUND", messageFa: "اپیزود یافت نشد." });
      if (body.eyeLaterality !== ep.eyeLaterality) {
        return jsonResponse(400, { error: "EYE_LATERALITY_MISMATCH", messageFa: "عدم تطابق چشم راست و چشم چپ با اپیزود." });
      }
      const nextVer = Number(ep.activePrescriptionVersion ?? 0) + 1;
      ep.activePrescriptionVersion = nextVer;
      const rx = {
        prescriptionId: crypto.randomUUID(),
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        episodeId: eid,
        version: nextVer,
        eyeLaterality: body.eyeLaterality,
        eyeLabelFa: body.eyeLaterality === "OD" ? "چشم راست" : "چشم چپ",
        items: body.items ?? [],
        reasonFa: body.reasonFa,
        publishedByUserId: ctx.userId,
        publishedAt: new Date().toISOString(),
      };
      db.prescriptions[eid] = [rx, ...(db.prescriptions[eid] ?? [])];
      return jsonResponse(201, rx);
    }
  }

  const epAdhMatch = path.match(/^\/v1\/episodes\/([^/]+)\/adherence$/);
  if (method === "GET" && epAdhMatch) {
    return jsonResponse(200, { items: db.adherence[epAdhMatch[1]!] ?? [] });
  }

  const epSymMatch = path.match(/^\/v1\/episodes\/([^/]+)\/symptoms$/);
  if (method === "GET" && epSymMatch) {
    return jsonResponse(200, { items: db.symptoms[epSymMatch[1]!] ?? [] });
  }

  if (method === "GET" && path === "/v1/care/print-phone") {
    const ppEpisodes = db.episodes.filter((e) => e.accessMode === "print_phone").map((e) => ({
      episodeId: e.episodeId,
      patientId: e.patientId,
      patientNameFa: e.patientNameFa,
      phoneMasked: e.phoneMasked,
      eyeLaterality: e.eyeLaterality,
      eyeLabelFa: e.eyeLabelFa,
      activePrescriptionVersion: e.activePrescriptionVersion,
      pendingTaskCount: 1,
      lastOutreachAtIso: db.printOutreach[0]?.recordedAtIso ?? null,
      lastOutreachOutcomeFa: db.printOutreach[0]?.outcomeFa ?? null,
    }));
    return jsonResponse(200, { items: ppEpisodes, total: ppEpisodes.length });
  }

  const ppOutreachMatch = path.match(/^\/v1\/care\/print-phone\/([^/]+)\/outreach$/);
  if (method === "POST" && ppOutreachMatch) {
    const rec = {
      taskId: crypto.randomUUID(),
      episodeId: ppOutreachMatch[1],
      patientId: SYNTHETIC_CONSTANTS.PATIENT_2,
      status: body.status ?? "completed",
      outcomeFa: body.outcomeFa,
      recordedAtIso: new Date().toISOString(),
    };
    db.printOutreach.unshift(rec);
    return jsonResponse(201, rec);
  }

  // Triage, Referrals, Outages, Follow-ups
  if (method === "GET" && path === "/v1/triage/cases") {
    const urgency = u.searchParams.get("urgencyTier");
    const status = u.searchParams.get("status");
    const items = db.triageCases.filter(
      (c) => (!urgency || c.urgencyTier === urgency) && (!status || c.status === status)
    );
    return jsonResponse(200, { items, total: items.length });
  }

  const triageDetailMatch = path.match(/^\/v1\/triage\/cases\/([^/]+)$/);
  if (method === "GET" && triageDetailMatch) {
    const tc = db.triageCases.find((c) => c.caseId === triageDetailMatch[1] || c.id === triageDetailMatch[1]);
    if (!tc) return jsonResponse(404, { error: "TRIAGE_CASE_NOT_FOUND", messageFa: "پرونده تریاژ یافت نشد." });
    const cid = tc.caseId ?? tc.id;
    return jsonResponse(200, {
      triageCase: tc,
      triggers: [
        {
          triggerId: "trig-1",
          caseId: cid,
          ruleCode: tc.urgencyTier === "urgent" ? "PILLAR2_ACTIVE_CNV_URGENT_FLOOR" : "PRINT_PHONE_CHECKIN",
          summaryFa: "ایجاد پرونده بر اساس قواعد بالینی غیرقابل چشم‌پوشی",
          createdAtIso: tc.createdAt,
        },
      ],
      contactLogs: (tc.contactLog as Array<Record<string, unknown>>) ?? [],
      referrals: db.referrals.filter((r) => r.caseId === cid),
      followUpTasks: db.followUps.filter((f) => f.triageCaseId === cid),
    });
  }

  const triageClaimMatch = path.match(/^\/v1\/triage\/cases\/([^/]+)\/claim$/);
  if (method === "POST" && triageClaimMatch) {
    const tc = db.triageCases.find((c) => c.caseId === triageClaimMatch[1] || c.id === triageClaimMatch[1]);
    if (!tc) return jsonResponse(404, { error: "TRIAGE_CASE_NOT_FOUND", messageFa: "یافت نشد." });
    tc.ownerId = ctx.userId;
    if (tc.status === "New") tc.status = "OwnerAssigned";
    return jsonResponse(200, tc);
  }

  const triageContactMatch = path.match(/^\/v1\/triage\/cases\/([^/]+)\/contact$/);
  if (method === "POST" && triageContactMatch) {
    const tc = db.triageCases.find((c) => c.caseId === triageContactMatch[1] || c.id === triageContactMatch[1]);
    if (!tc) return jsonResponse(404, { error: "TRIAGE_CASE_NOT_FOUND", messageFa: "یافت نشد." });
    const nowContactIso = new Date().toISOString();
    const entry = {
      actorUserId: ctx.userId,
      outcome: body.outcome,
      channel: body.channel ?? "phone",
      noteFa: body.noteFa,
      createdAtIso: nowContactIso,
      occurredAtIso: nowContactIso,
    };
    tc.contactLog = [entry, ...((tc.contactLog as Array<Record<string, unknown>>) ?? [])];
    tc.status = body.outcome === "contacted" ? "ContactEstablished" : body.outcome === "escalated" ? "Escalated" : "ContactAttempted";
    return jsonResponse(200, tc);
  }

  const triageCloseMatch = path.match(/^\/v1\/triage\/cases\/([^/]+)\/close$/);
  if (method === "POST" && triageCloseMatch) {
    const tc = db.triageCases.find((c) => c.caseId === triageCloseMatch[1] || c.id === triageCloseMatch[1]);
    if (!tc) return jsonResponse(404, { error: "TRIAGE_CASE_NOT_FOUND", messageFa: "یافت نشد." });
    if (tc.status === "Closed") return jsonResponse(409, { error: "TRIAGE_ALREADY_CLOSED", messageFa: "پرونده قبلاً بسته شده است." });
    const cid = tc.caseId ?? tc.id;
    const hasRef = db.referrals.some((r) => r.caseId === cid);
    if (
      tc.urgencyTier === "urgent" &&
      tc.status !== "ContactEstablished" &&
      tc.status !== "Referred" &&
      !hasRef
    ) {
      return jsonResponse(422, {
        error: "URGENT_CASE_RESOLUTION_REQUIRED",
        messageFa: "بستن پرونده فوری پیش از تماس یا ارجاع مجاز نیست.",
      });
    }
    tc.status = "Closed";
    tc.resolutionNoteFa = body.resolutionNoteFa;
    return jsonResponse(200, tc);
  }

  const triageRefMatch = path.match(/^\/v1\/triage\/cases\/([^/]+)\/referrals$/);
  if (method === "POST" && triageRefMatch) {
    const tc = db.triageCases.find((c) => c.caseId === triageRefMatch[1] || c.id === triageRefMatch[1]);
    if (!tc) return jsonResponse(404, { error: "TRIAGE_CASE_NOT_FOUND", messageFa: "یافت نشد." });
    const newRefId = crypto.randomUUID();
    const ref = {
      referralId: newRefId,
      id: newRefId,
      tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
      caseId: tc.caseId ?? tc.id,
      patientId: tc.patientId,
      patientNameFa: tc.patientNameFa,
      eyeLaterality: tc.eyeLaterality,
      eyeLabelFa: tc.eyeLabelFa,
      destinationHospitalFa: body.destinationHospitalFa,
      reasonFa: body.reasonFa,
      urgent: Boolean(body.urgent),
      status: "dispatched",
      createdAt: new Date().toISOString(),
    };
    db.referrals.unshift(ref);
    tc.status = "Referred";
    return jsonResponse(201, ref);
  }

  if (path === "/v1/triage/outages") {
    if (method === "GET") return jsonResponse(200, { items: db.outages });
    if (method === "POST") {
      const created = {
        outageId: crypto.randomUUID(),
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: ctx.clinicId,
        ...body,
        status: "active",
        startedAtIso: new Date().toISOString(),
        resolvedAtIso: null,
        createdByUserId: ctx.userId,
        createdAtIso: new Date().toISOString(),
      };
      db.outages.unshift(created);
      return jsonResponse(201, created);
    }
  }

  const outagePatch = path.match(/^\/v1\/triage\/outages\/([^/]+)$/);
  if (method === "PATCH" && outagePatch) {
    const found = db.outages.find((o) => o.outageId === outagePatch[1]);
    if (found) Object.assign(found, body);
    return jsonResponse(200, found ?? {});
  }

  if (method === "GET" && path === "/v1/referrals") {
    return jsonResponse(200, { items: db.referrals, total: db.referrals.length });
  }

  const refOutcomeMatch = path.match(/^\/v1\/referrals\/([^/]+)\/outcome$/);
  if (method === "PATCH" && refOutcomeMatch) {
    const found = db.referrals.find((r) => r.referralId === refOutcomeMatch[1] || r.id === refOutcomeMatch[1]);
    if (!found) return jsonResponse(404, { error: "REFERRAL_NOT_FOUND", messageFa: "ارجاع یافت نشد." });
    found.status = body.status;
    found.missReasonFa = body.missReasonFa;
    if (body.status === "attended") {
      const tc = db.triageCases.find((c) => c.caseId === found.caseId || c.id === found.caseId);
      if (tc) tc.status = "Closed";
    }
    return jsonResponse(200, found);
  }

  if (path === "/v1/follow-ups") {
    if (method === "GET") return jsonResponse(200, { items: db.followUps, total: db.followUps.length });
    if (method === "POST") {
      const created = {
        taskId: crypto.randomUUID(),
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: ctx.clinicId,
        ...body,
        patientNameFa: db.patients.find((p) => p.patientId === body.patientId)?.fullNameFa ?? "بیمار",
        eyeLabelFa: body.eyeLaterality === "OD" ? "چشم راست" : body.eyeLaterality === "OS" ? "چشم چپ" : "عمومی",
        dueAtIso: body.dueAt,
        dueAtJalali: "۱۴۰۵/۰۹/۰۶",
        status: "pending",
        createdAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
      };
      db.followUps.unshift(created);
      return jsonResponse(201, created);
    }
  }

  const ftPatch = path.match(/^\/v1\/follow-ups\/([^/]+)$/);
  if (method === "PATCH" && ftPatch) {
    const found = db.followUps.find((f) => f.taskId === ftPatch[1]);
    if (found) Object.assign(found, body);
    return jsonResponse(200, found ?? {});
  }

  // R2 Monitoring
  if (method === "GET" && path === "/v1/r2/monitoring/overview") {
    return jsonResponse(200, {
      activePlanCount: Object.values(db.plans).flat().filter((p) => p.active).length,
      enrolledPatientCount: db.patients.length,
      acceptedTestCount: db.sessions.filter((s) => s.qualityStatus === "accepted").length,
      rejectedTestCount: db.sessions.filter((s) => s.qualityStatus === "rejected").length,
      activeAlertCount: 1,
      killedDeviceCount: db.devices.filter((d) => d.verifiedStatus === "killed").length,
      latestAlerts: [
        {
          id: "r2-alert-1",
          patientId: SYNTHETIC_CONSTANTS.PATIENT_1,
          eyeLaterality: "OD",
          ruleCode: "R2_RELIABLE_VA_CHANGE",
          severity: "followup_3_6m",
          summaryFa: "کاهش حدت بینایی خانگی چشم راست (+۰.۲۰ logMAR) نسبت به خط پایه",
          ewmaValue: 0.28,
          cusumValue: 0.34,
          triageCaseId: SYNTHETIC_CONSTANTS.CASE_1_URGENT,
          createdAtIso: new Date().toISOString(),
        },
      ],
    });
  }

  if (path === "/v1/r2/devices") {
    if (method === "GET") return jsonResponse(200, { items: db.devices });
    if (method === "POST") {
      const rec = {
        deviceId: crypto.randomUUID(),
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: ctx.clinicId,
        ...body,
        updatedByUserId: ctx.userId,
        createdAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
      };
      db.devices.unshift(rec);
      return jsonResponse(201, rec);
    }
  }

  const devPatch = path.match(/^\/v1\/r2\/devices\/([^/]+)$/);
  if (method === "PATCH" && devPatch) {
    const found = db.devices.find((d) => d.deviceId === devPatch[1]);
    if (found) Object.assign(found, body);
    return jsonResponse(200, found ?? {});
  }

  const r2Trends = path.match(/^\/v1\/r2\/patients\/([^/]+)\/trends$/);
  if (method === "GET" && r2Trends) {
    const pid = r2Trends[1]!;
    const patSessions = db.sessions
      .filter((s) => s.patientId === pid)
      .sort((a, b) => String(a.measuredAtIso).localeCompare(String(b.measuredAtIso)));
    const mapPoint = (s: Record<string, unknown>) => ({
      testId: String(s.id),
      testType: String(s.testType),
      eyeLaterality: s.eyeLaterality as "OD" | "OS",
      vaLogmar: s.qualityStatus === "rejected" ? null : (s.vaLogmar as number | null),
      amslerDistortionScore: (s.amslerDistortionScore as number | null) ?? null,
      recordedAt: String(s.measuredAtIso),
    });
    return jsonResponse(200, {
      patientId: pid,
      od: patSessions.filter((s) => s.eyeLaterality === "OD").map(mapPoint),
      os: patSessions.filter((s) => s.eyeLaterality === "OS").map(mapPoint),
    });
  }

  const r2Sessions = path.match(/^\/v1\/r2\/patients\/([^/]+)\/sessions$/);
  if (method === "GET" && r2Sessions) {
    const items = db.sessions.filter((s) => s.patientId === r2Sessions[1]);
    return jsonResponse(200, { items, total: items.length });
  }

  const r2SessionDetail = path.match(/^\/v1\/r2\/sessions\/([^/]+)$/);
  if (method === "GET" && r2SessionDetail) {
    const s = db.sessions.find((x) => x.id === r2SessionDetail[1]) ?? db.sessions[0]!;
    return jsonResponse(200, {
      session: s,
      trials: [
        { trialId: "tr-1", testId: s.id, trialIndex: 0, stimulus: { gapDir: "top", logmar: 0.2 }, response: { gapDir: "top" }, reactionMs: 940, correct: true, createdAtIso: s.measuredAtIso },
        { trialId: "tr-2", testId: s.id, trialIndex: 1, stimulus: { gapDir: "left", logmar: 0.1 }, response: { gapDir: "bottom" }, reactionMs: 1210, correct: false, createdAtIso: s.measuredAtIso },
      ],
      calibrationProfile: {
        id: "cal-1",
        deviceFingerprintSha256: "f1a2b3c4d5e6",
        screenWidthMm: 71,
        viewingDistanceCm: 35,
        calibratedBy: "clinic_staff",
        verified: true,
      },
      alerts: [],
    });
  }

  const r2Iop = path.match(/^\/v1\/r2\/patients\/([^/]+)\/iop$/);
  if (method === "GET" && r2Iop) {
    const items = db.iopReadings.filter((i) => i.patientId === r2Iop[1]);
    return jsonResponse(200, {
      items,
      od: items.filter((i) => i.eyeLaterality === "OD"),
      os: items.filter((i) => i.eyeLaterality === "OS"),
    });
  }

  const r2Plans = path.match(/^\/v1\/r2\/patients\/([^/]+)\/plans$/);
  if (r2Plans) {
    const pid = r2Plans[1]!;
    if (method === "GET") return jsonResponse(200, { items: db.plans[pid] ?? [] });
    if (method === "POST") {
      const rec = {
        planId: crypto.randomUUID(),
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: ctx.clinicId,
        patientId: pid,
        ...body,
        eyeLabelFa: body.eyeLaterality === "OD" ? "چشم راست" : "چشم چپ",
        createdByUserId: ctx.userId,
        createdAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
      };
      db.plans[pid] = [rec, ...(db.plans[pid] ?? [])];
      return jsonResponse(201, rec);
    }
  }

  // Reports
  if (path === "/v1/reports") {
    if (method === "GET") return jsonResponse(200, { items: db.reports, total: db.reports.length });
    if (method === "POST") {
      const rep = {
        reportId: crypto.randomUUID(),
        ...body,
        patientNameFa: db.patients.find((p) => p.patientId === body.patientId)?.fullNameFa ?? "بیمار",
        sourceSha256: "mock-sha256-verifiable",
        pdfSha256: "mock-pdf-sha256",
        issuedAtJalali: "۱۴۰۵/۰۹/۰۵",
        createdAtIso: new Date().toISOString(),
        payload: { ...body, clinicNameFa: db.clinicNameFa, emergencyHotlinePhone: "+982182401001" },
      };
      db.reports.unshift(rep);
      return jsonResponse(201, rep);
    }
  }

  const repDetail = path.match(/^\/v1\/reports\/([^/]+)$/);
  if (method === "GET" && repDetail) {
    const found = db.reports.find((r) => r.reportId === repDetail[1]);
    return found ? jsonResponse(200, found) : jsonResponse(404, { error: "REPORT_NOT_FOUND", messageFa: "گزارش یافت نشد." });
  }

  const repPdf = path.match(/^\/v1\/reports\/([^/]+)\/pdf$/);
  if (method === "GET" && repPdf) {
    const minimalPdf = `%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF`;
    return new Response(minimalPdf, { status: 200, headers: { "Content-Type": "application/pdf" } });
  }

  // Analytics
  if (method === "GET" && path === "/v1/analytics/clinic") {
    return jsonResponse(200, {
      episodeCountsByStatus: { active: db.episodes.filter((e) => e.status === "active").length, completed: db.episodes.filter((e) => e.status === "completed").length },
      episodeCountsByEye: { OD: db.episodes.filter((e) => e.eyeLaterality === "OD").length, OS: db.episodes.filter((e) => e.eyeLaterality === "OS").length },
      cohortCountsByAccessMode: { app: 1, caregiver: 1, print_phone: 1 },
      adherenceDistribution: { taken: 18, missed_with_reason: 2, unavailable: 1, no_response: 1 },
      triageSlaCompliance: { numerator: 11, denominator: 12, rate: 0.9167 },
      referralAttendance: { numerator: 3, denominator: 4, rate: 0.75 },
    });
  }

  if (method === "GET" && path === "/v1/analytics/pilot") {
    return jsonResponse(200, {
      generatedAtIso: new Date().toISOString(),
      generatedAtJalali: "۱۴۰۵/۰۹/۰۵",
      kpis: {
        postopAdherenceConfirmedRate: { numerator: 18, denominator: 22, rate: 0.8182 },
        postopAdherenceByAccessMode: {
          app: { numerator: 11, denominator: 13, rate: 0.846 },
          caregiver: { numerator: 4, denominator: 5, rate: 0.8 },
          print_phone: { numerator: 3, denominator: 4, rate: 0.75 },
        },
        redFlagTriageSlaContactRate: { numerator: 11, denominator: 12, rate: 0.9167 },
        closedLoopReferralAttendanceRate: { numerator: 3, denominator: 4, rate: 0.75 },
        diagnosticQcFirstPassRate: { numerator: 14, denominator: 16, rate: 0.875 },
        hitlSignoffCompletionRate: { numerator: 10, denominator: 12, rate: 0.833 },
        medianHitlTurnaroundMinutes: 28,
        r2ValidTestAcceptanceRate: { numerator: 0, denominator: 0, rate: null },
      },
      noticeFa: "اعداد فوق بر اساس داده‌های آزمایشی محیط نمایشی محاسبه شده و شاخص با مخرج صفر به‌صورت «قابل محاسبه نیست» نمایش داده می‌شود.",
    });
  }

  if (method === "GET" && path === "/v1/analytics/ai-quality") {
    return jsonResponse(200, {
      onlineOperationalMetrics: {
        totalStudies: db.studies.length,
        qcPassedAssets: 5,
        qcRejectedAssets: 1,
        qcRejectionBreakdown: { blur: 1, lighting: 1 },
        signoffBreakdown: { approved: 1, edited_approved: 0, rejected: 0 },
        clinicianFeedbackCounts: { agree: 4, partially_agree: 1, disagree: 0 },
        urgentFloorTriggeredStudies: 1,
      },
      offlineBenchmarkNoticeFa:
        "معیارهای حساسیت، ویژگی و Brier روی مجموعه تست نگهداری‌شده از داده‌های عملیاتی کلینیک تفکیک هستند و صرفاً گزارش رسمی مدل کارت را نمایش می‌دهند.",
    });
  }

  // Admin & Integrations
  if (method === "PATCH" && path === "/v1/admin/clinic") {
    if (ctx.role !== "admin") return jsonResponse(403, { error: "FORBIDDEN_ROLE", messageFa: "فقط مدیر کلینیک مجاز به ویرایش است." });
    if (typeof body.nameFa === "string") db.clinicNameFa = body.nameFa;
    if (typeof body.dicomAeTitle === "string") db.dicomAeTitle = body.dicomAeTitle;
    return jsonResponse(200, {
      clinicId: ctx.clinicId,
      tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
      nameFa: db.clinicNameFa,
      dicomAeTitle: db.dicomAeTitle,
      emergencyPhone: "+982182401001",
      calendarMode: "jalali",
    });
  }

  if (path === "/v1/admin/staff") {
    if (method === "GET") return jsonResponse(200, { items: db.staffMembers });
    if (method === "POST") {
      const m = {
        id: crypto.randomUUID(),
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: ctx.clinicId,
        ...body,
        active: body.active ?? true,
        mfaVerifiedAtIso: new Date().toISOString(),
        createdAtIso: new Date().toISOString(),
      };
      db.staffMembers.push(m);
      return jsonResponse(201, m);
    }
  }

  const staffPatch = path.match(/^\/v1\/admin\/staff\/([^/]+)$/);
  if (method === "PATCH" && staffPatch) {
    const found = db.staffMembers.find((m) => m.id === staffPatch[1]);
    if (!found) return jsonResponse(404, { error: "MEMBERSHIP_NOT_FOUND", messageFa: "عضویت یافت نشد." });
    const activeAdmins = db.staffMembers.filter((m) => m.role === "admin" && m.active);
    if (
      found.role === "admin" &&
      found.active &&
      activeAdmins.length <= 1 &&
      (body.active === false || (body.role && body.role !== "admin"))
    ) {
      return jsonResponse(409, {
        error: "LAST_ACTIVE_ADMIN_FORBIDDEN",
        messageFa: "غیرفعال‌سازی یا تغییر نقش آخرین مدیر فعال کلینیک مجاز نیست.",
      });
    }
    Object.assign(found, body);
    return jsonResponse(200, found);
  }

  if (path === "/v1/admin/protocols") {
    if (method === "GET") return jsonResponse(200, { registeredTypes: ["post_cataract"], versions: db.protocols });
    if (method === "POST") {
      const created = { id: crypto.randomUUID(), ...body, version: db.protocols.length + 1, createdAtIso: new Date().toISOString() };
      db.protocols.unshift(created);
      return jsonResponse(201, created);
    }
  }

  if (path === "/v1/admin/message-templates") {
    if (method === "GET") return jsonResponse(200, { items: db.messageTemplates });
    if (method === "POST") {
      const txt = String(body.bodyTemplateFa ?? "");
      if (PHI_SMS_TERMS.some((term) => txt.includes(term))) {
        return jsonResponse(422, {
          error: "SMS_PHI_VIOLATION",
          messageFa: "قالب پیامک نباید حاوی نام دارو، تشخیص یا اطلاعات بالینی بیمار باشد.",
        });
      }
      const created = {
        templateId: crypto.randomUUID(),
        ...body,
        version: 1,
        createdAtIso: new Date().toISOString(),
      };
      db.messageTemplates.unshift(created);
      return jsonResponse(201, created);
    }
  }

  if (path === "/v1/admin/consents") {
    if (method === "GET") return jsonResponse(200, { items: db.consentTemplates });
    if (method === "POST") {
      const created = { consentTemplateId: crypto.randomUUID(), ...body, createdAtIso: new Date().toISOString() };
      db.consentTemplates.unshift(created);
      return jsonResponse(201, created);
    }
  }

  if (path === "/v1/admin/features") {
    if (method === "GET") return jsonResponse(200, { items: db.featureFlags });
    if (method === "PATCH") {
      const found = db.featureFlags.find((f) => f.flagKey === body.flagKey);
      if (found) found.enabled = Boolean(body.enabled);
      return jsonResponse(200, found ?? body);
    }
  }

  if (path === "/v1/integrations/endpoints") {
    if (method === "GET") return jsonResponse(200, { items: db.endpoints });
    if (method === "POST") {
      const rawSecret = typeof body.secret === "string" ? body.secret : "";
      const created = {
        endpointId: crypto.randomUUID(),
        ...body,
        secret: undefined,
        secretMasked: rawSecret ? `****${rawSecret.slice(-4)}` : null,
        lastTestStatus: null,
        lastTestedAtIso: null,
        createdAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
      };
      db.endpoints.unshift(created);
      return jsonResponse(201, created);
    }
  }

  const epTestMatch = path.match(/^\/v1\/integrations\/endpoints\/([^/]+)\/test$/);
  if (method === "POST" && epTestMatch) {
    const ep = db.endpoints.find((e) => e.endpointId === epTestMatch[1]);
    if (ep) {
      ep.lastTestStatus = "ok";
      ep.lastTestedAtIso = new Date().toISOString();
    }
    const del = {
      deliveryId: crypto.randomUUID(),
      endpointId: ep?.endpointId ?? null,
      endpointNameFa: ep?.nameFa ?? null,
      direction: "outbound",
      payloadType: "connectivity_probe",
      status: "delivered",
      httpStatus: 200,
      attemptCount: 1,
      createdAtIso: new Date().toISOString(),
    };
    db.deliveries.unshift(del);
    return jsonResponse(200, { endpoint: ep, delivery: del });
  }

  if (method === "GET" && path === "/v1/integrations/history") {
    return jsonResponse(200, { items: db.deliveries, total: db.deliveries.length });
  }

  // Ops & Audit
  if (method === "GET" && path === "/v1/ops/health") {
    return jsonResponse(200, {
      status: "ok",
      aiEngineMode: "cpu_stub",
      database: { status: "ok", latencyMs: 3 },
      queues: { unpublishedOutboxEvents: 0, pendingOrFailedAiJobs: 0, activeOutages: db.outages.filter((o) => o.status === "active").length },
    });
  }

  if (method === "GET" && path === "/v1/ops/jobs") {
    return jsonResponse(200, {
      aiInferenceJobs: Object.values(db.jobsByStudy).flat(),
      outboxEvents: [
        { eventId: "out-1", eventType: "diagnostic.study-analyzed.v1", correlationId: SYNTHETIC_CONSTANTS.STUDY_1_CNV, publishedAtIso: new Date().toISOString(), createdAtIso: new Date().toISOString() },
      ],
      workflowRuns: [
        { runId: "wf-1", workflowType: "postop-care-plan-sync", status: "running", nextDueAtIso: new Date(Date.now() + 3600_000).toISOString(), updatedAtIso: new Date().toISOString() },
      ],
    });
  }

  if (method === "GET" && path === "/v1/ops/audit") {
    if (!ctx.stepUpVerified) {
      return jsonResponse(403, { error: "FORBIDDEN_STEP_UP_REQUIRED", messageFa: "برای مشاهده سوابق ممیزی، تایید مجدد امنیتی الزامی است." });
    }
    return jsonResponse(200, { items: db.auditLogs, total: db.auditLogs.length });
  }

  if (path === "/v1/ops/break-glass") {
    if (method === "GET") return jsonResponse(200, { items: db.breakGlassSessions, total: db.breakGlassSessions.length });
    if (method === "POST") {
      if (String(body.reasonFa ?? "").trim().length < 10) {
        return jsonResponse(403, { error: "FORBIDDEN_BREAK_GLASS_REASON_REQUIRED", messageFa: "ثبت دلیل بالینی معتبر (حداقل ۱۰ کاراکتر) الزامی است." });
      }
      const s = {
        sessionId: crypto.randomUUID(),
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        clinicId: ctx.clinicId,
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        patientId: body.patientId,
        reasonFa: body.reasonFa,
        expiresAtIso: new Date(Date.now() + 60 * 60_000).toISOString(),
        revokedAtIso: null,
        active: true,
        createdAtIso: new Date().toISOString(),
      };
      db.breakGlassSessions.unshift(s);
      return jsonResponse(201, s);
    }
  }

  const bgRevoke = path.match(/^\/v1\/ops\/break-glass\/([^/]+)\/revoke$/);
  if (method === "POST" && bgRevoke) {
    const found = db.breakGlassSessions.find((s) => s.sessionId === bgRevoke[1]);
    if (found) {
      found.active = false;
      found.revokedAtIso = new Date().toISOString();
    }
    return jsonResponse(200, found ?? {});
  }

  if (method === "GET" && path === "/v1/ops/models") {
    return jsonResponse(200, {
      aiEngineMode: "cpu_stub",
      foundationBackbone: "dinov2_apache2",
      commercialLicensePolicyFa:
        "بک‌بون‌های تجاری پیش‌فرض تحت مجوز Apache 2.0 (DINOv2 / SigLIP / MONAI / XGBoost) هستند؛ مدل‌های غیرتجاری (RETFound) در مسیر استنتاج تجاری بارگذاری نمی‌شوند.",
      llmProvider: "openai_compatible",
      llmModel: "thinkingmachines/inkling-2-mini",
      artifacts: [
        { modelName: "router_qc_v1", hasMetricsJson: true, hasModelCard: true, metrics: { macro_f1: 0.992 } },
        { modelName: "tabular_xgb_v1", hasMetricsJson: true, hasModelCard: true, metrics: { auroc: 0.89 } },
      ],
    });
  }

  if (method === "POST" && path === "/v1/research/exports") {
    const canRoleExport = ctx.role === "ophthalmologist" || ctx.role === "admin";
    if (!canRoleExport) {
      return jsonResponse(403, {
        error: "FORBIDDEN_ROLE",
        messageFa: "نقش کاربری شما مجوز این عملیات را ندارد.",
      });
    }
    if (!ctx.stepUpVerified) {
      return jsonResponse(403, {
        error: "FORBIDDEN_STEP_UP_REQUIRED",
        messageFa: "برای دسترسی یا خروجی داده‌های حساس، تایید مجدد امنیتی الزامی است.",
      });
    }
    const irb = String(body.irbProtocolCode ?? "").trim();
    const reason = String(body.reasonFa ?? "").trim();
    const rawLimit = body.limit;
    if (irb.length < 4) {
      return jsonResponse(400, {
        error: "IRB_PROTOCOL_REQUIRED",
        messageFa: "کد مصوبه کمیته اخلاق پژوهشی (IRB) الزامی است.",
      });
    }
    if (reason.length < 5) {
      return jsonResponse(400, {
        error: "VALIDATION_ERROR",
        messageFa: "شرح هدف پژوهش (حداقل ۵ کاراکتر) الزامی است.",
      });
    }
    if (
      rawLimit !== undefined &&
      (typeof rawLimit !== "number" || !Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 500)
    ) {
      return jsonResponse(400, {
        error: "VALIDATION_ERROR",
        messageFa: "تعداد رکورد درخواستی باید عددی صحیح بین ۱ تا ۵۰۰ باشد.",
      });
    }
    const rowLimit = Math.min(500, Math.max(1, typeof rawLimit === "number" ? rawLimit : 100));

    const sha256Hex = async (input: string): Promise<string> => {
      if (typeof globalThis.crypto?.subtle?.digest === "function") {
        const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
        return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
      }
      // Deterministic 64-hex fallback when SubtleCrypto is unavailable
      let h1 = 0x811c9dc5;
      let h2 = 0x9e3779b9;
      for (let i = 0; i < input.length; i += 1) {
        const c = input.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
        h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
      }
      return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`.repeat(4);
    };

    const selectedStudies = db.studies.slice(0, rowLimit);
    const records = await Promise.all(
      selectedStudies.map(async (study) => {
        const pseudoHash = await sha256Hex(`bina-mock-salt:${irb}:${String(study.patientId ?? "")}`);
        const fusion = study.fusionResult as
          | { differential?: Array<{ conditionCode?: string }> }
          | undefined;
        const signoff = study.signoff as { finalUrgency?: string } | undefined;
        return {
          subjectPseudonym: `SUBJ-${pseudoHash.slice(0, 14)}`,
          eyeLaterality: String(study.eyeLaterality ?? "OD"),
          studyStatus: String(study.status ?? "pending_hitl"),
          topConditionCode: fusion?.differential?.[0]?.conditionCode ?? null,
          finalUrgency: signoff?.finalUrgency ?? null,
        };
      })
    );

    const exportedAtIso = new Date().toISOString();
    const manifestSha256 = await sha256Hex(
      JSON.stringify({
        irbProtocolCode: irb,
        tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
        records,
      })
    );

    db.auditLogs.unshift({
      id: `aud-export-${Date.now()}`,
      tenantId: SYNTHETIC_CONSTANTS.TENANT_A,
      actorUserId: ctx.userId,
      actorRole: ctx.role,
      action: "research.pseudonymized-cohort-exported",
      resourceType: "research_export",
      resourceId: manifestSha256,
      reasonFa: reason,
      breakGlass: false,
      occurredAtIso: exportedAtIso,
    });

    return jsonResponse(200, {
      irbProtocolCode: irb,
      exportedAtIso,
      recordCount: records.length,
      records,
      manifestSha256,
    });
  }

  return jsonResponse(404, { error: "NOT_FOUND", messageFa: "مسیر درخواستی در حالت نمایشی تعریف نشده است." });
}
