import { getAppBrand } from "../../../packages/domain-kernel/index.js";
import {
  anonymizeDicomTags,
  normalizeDicomLaterality,
  type AnonymizedDicomSnapshot,
  type DicomTagBag,
} from "./dicom-anonymizer.js";

export type NormalizedDiagnosticModality =
  | "fundus"
  | "oct"
  | "octa"
  | "slit_lamp"
  | "topography"
  | "visual_field";

export interface DicomIngestAssetInput {
  readonly assetId: string;
  readonly s3ObjectKey: string;
  readonly rawTags: DicomTagBag;
  readonly declaredModalityHint?: NormalizedDiagnosticModality | undefined;
}

export interface NormalizedDicomStudyIngest {
  readonly dicomStudyUid: string;
  readonly assets: readonly {
    readonly assetId: string;
    readonly s3ObjectKey: string;
    readonly declaredModality: NormalizedDiagnosticModality;
    readonly declaredEye: "OD" | "OS";
    readonly dicomStudyUid: string;
    readonly anonymizedSnapshot: AnonymizedDicomSnapshot;
  }[];
}

export class DicomIngestValidationError extends Error {
  readonly statusCode = 400;
  readonly code: string;

  constructor(code: string, messageFa: string) {
    super(messageFa);
    this.code = code;
  }
}

export function mapDicomModality(
  dicomModality: string | undefined,
  hint?: NormalizedDiagnosticModality
): NormalizedDiagnosticModality {
  if (hint) return hint;
  const upper = dicomModality?.trim().toUpperCase();
  if (upper === "OPT" || upper === "OCT") return "oct";
  if (upper === "OCTA") return "octa";
  if (upper === "OP" || upper === "CFP") return "fundus";
  if (upper === "OPV" || upper === "HFA") return "visual_field";
  if (upper === "OPM" || upper === "CTO") return "topography";
  if (upper === "XC" || upper === "ES") return "slit_lamp";
  throw new DicomIngestValidationError(
    "UNSUPPORTED_DICOM_MODALITY",
    `مودالیتی تصویر DICOM برای ارزیابی چشم‌پزشکی ${getAppBrand().nameFa} پشتیبانی نمی‌شود.`
  );
}

/**
 * Normalizes STOW-RS / C-STORE metadata bundles into Bina StudyAsset inputs while generating
 * strict anonymized D5 snapshots for non-PHI research/evaluation use.
 */
export function normalizeDicomIngestBatch(
  items: readonly DicomIngestAssetInput[],
  pseudonymSalt: string
): NormalizedDicomStudyIngest {
  if (items.length === 0) {
    throw new DicomIngestValidationError("EMPTY_DICOM_BATCH", "حداقل یک تصویر DICOM برای پذیرش لازم است.");
  }

  const assets = items.map((item) => {
    const eye = normalizeDicomLaterality(item.rawTags.imageLaterality);
    if (!eye) {
      throw new DicomIngestValidationError(
        "MISSING_DICOM_EYE_LATERALITY",
        "تگ چشم راست یا چپ (0020,0062 ImageLaterality) در فایل DICOM مشخص نیست."
      );
    }
    const modality = mapDicomModality(item.rawTags.modality, item.declaredModalityHint);
    const studyUid = item.rawTags.studyInstanceUid?.trim();
    if (!studyUid) {
      throw new DicomIngestValidationError(
        "MISSING_STUDY_UID",
        "شناسه مطالعه (0020,000D StudyInstanceUID) در متادیتای DICOM الزامی است."
      );
    }
    const snapshot = anonymizeDicomTags(item.rawTags, pseudonymSalt);
    return {
      assetId: item.assetId,
      s3ObjectKey: item.s3ObjectKey,
      declaredModality: modality,
      declaredEye: eye,
      dicomStudyUid: studyUid,
      anonymizedSnapshot: snapshot,
    };
  });

  return {
    dicomStudyUid: assets[0]!.dicomStudyUid,
    assets,
  };
}
