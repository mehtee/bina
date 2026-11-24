from __future__ import annotations

import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict


class DatasetSourceSpec(BaseModel):
    model_config = ConfigDict(frozen=True)

    key: str
    modality: str
    kaggle_dataset_slug: str | None
    external_url: str
    license_id: str
    commercial_safe: bool
    notes: str


class ManifestSample(BaseModel):
    model_config = ConfigDict(frozen=True)

    sample_id: str
    patient_id: str
    eye_laterality: Literal["OD", "OS"]
    filepath: str
    label: str
    modality: str


PUBLIC_SEED_CATALOG: dict[str, DatasetSourceSpec] = {
    "fundus_eye_diseases": DatasetSourceSpec(
        key="fundus_eye_diseases",
        modality="fundus",
        kaggle_dataset_slug="orvile/eye-diseases-classification",
        external_url="https://www.kaggle.com/datasets/orvile/eye-diseases-classification",
        license_id="CC0/Public-Kaggle-Check-Before-Commercial",
        commercial_safe=True,
        notes="Seed CFP dataset (Cataract, DR, Glaucoma, Normal) directly attachable in Kaggle kernels.",
    ),
    "fundus_aptos": DatasetSourceSpec(
        key="fundus_aptos",
        modality="fundus",
        kaggle_dataset_slug="paraspatil/aptos2019blindnessdetection",
        external_url="https://www.kaggle.com/datasets/paraspatil/aptos2019blindnessdetection",
        license_id="Competition-Research-Rule-Check",
        commercial_safe=False,
        notes="Research/benchmark baseline only; requires commercial license audit or Iranian clinic D5 data.",
    ),
    "oct_kermany": DatasetSourceSpec(
        key="oct_kermany",
        modality="oct",
        kaggle_dataset_slug="paultimothymooney/kermany2018",
        external_url="https://www.kaggle.com/datasets/paultimothymooney/kermany2018",
        license_id="CC-BY-4.0",
        commercial_safe=True,
        notes="Retinal OCT B-scans (CNV, DME, Drusen, Normal) under CC BY 4.0.",
    ),
    "anterior_keratoconus": DatasetSourceSpec(
        key="anterior_keratoconus",
        modality="topography",
        kaggle_dataset_slug="elmehdi12/keratoconus-detection",
        external_url="https://www.kaggle.com/datasets/elmehdi12/keratoconus-detection",
        license_id="Public-Kaggle-Seed",
        commercial_safe=True,
        notes="Corneal topography seed maps (Keratoconus vs Normal/Suspect).",
    ),
    "anterior_keratoconus_tabular": DatasetSourceSpec(
        key="anterior_keratoconus_tabular",
        modality="topography",
        kaggle_dataset_slug="snehakurmi/tabular-dataset-for-keratoconus",
        external_url="https://www.kaggle.com/datasets/snehakurmi/tabular-dataset-for-keratoconus",
        license_id="CC-BY-4.0",
        commercial_safe=True,
        notes="Structured corneal topography indices.",
    ),
    "glaucoma_vf_uwhvf": DatasetSourceSpec(
        key="glaucoma_vf_uwhvf",
        modality="visual_field",
        kaggle_dataset_slug="teamincribo/glaucoma-detection-dataset",
        external_url="https://github.com/uw-biomedical-ml/uwhvf",
        license_id="MIT/Apache-2.0",
        commercial_safe=True,
        notes="UWHVF HFA 24-2 8x9 matrices + GRAPE multimodal progression.",
    ),
    "tabular_diabetes_risk": DatasetSourceSpec(
        key="tabular_diabetes_risk",
        modality="tabular_labs",
        kaggle_dataset_slug="iammustafatz/diabetes-prediction-dataset",
        external_url="https://www.kaggle.com/datasets/iammustafatz/diabetes-prediction-dataset",
        license_id="CC0/Apache-Safe",
        commercial_safe=True,
        notes="Structured HbA1c/glucose/BMI/age/hypertension tabular diabetes benchmark for XGBoost.",
    ),
}


PROPRIETARY_IRAN_DATASETS: dict[str, str] = {
    "D1": "Post-cataract operational cohort & colloquial Persian symptom utterances for ParsBERT",
    "D2": "Controlled phone-sensor calibration set (distance, lux ambient light, IMU shake)",
    "D3": "Prospective Iranian home vision (Landolt C/Amsler) + clinic ETDRS longitudinal cohort",
    "D4": "200-500 de-identified Persian structured diagnostic reports evaluated for LLM safety",
    "D5": "Anonymized multi-device Iranian eye hospital DICOM cohort (Fundus, OCT, OCT-A, Topography, VF)",
}


def load_manifest_jsonl(path: str | Path) -> list[ManifestSample]:
    p = Path(path)
    items: list[ManifestSample] = []
    for line in p.read_text(encoding="utf-8").splitlines():
        clean = line.strip()
        if not clean:
            continue
        items.append(ManifestSample.model_validate_json(clean))
    return items


def load_kaggle_image_directory_manifest(
    root_dir: str | Path,
    modality: str,
    default_eye: Literal["OD", "OS"] = "OD",
) -> list[ManifestSample]:
    root = Path(root_dir)
    if not root.exists():
        return []
    samples: list[ManifestSample] = []
    image_exts = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}
    for class_dir in sorted(d for d in root.iterdir() if d.is_dir()):
        label = class_dir.name
        for idx, file_path in enumerate(sorted(class_dir.rglob("*"))):
            if file_path.is_file() and file_path.suffix.lower() in image_exts:
                samples.append(
                    ManifestSample(
                        sample_id=f"{modality}-{label}-{idx}",
                        patient_id=f"anon-{file_path.stem}",
                        eye_laterality=default_eye,
                        filepath=str(file_path),
                        label=label,
                        modality=modality,
                    )
                )
    return samples
