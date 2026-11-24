from __future__ import annotations

from datetime import datetime
from typing import Literal, Sequence

from pydantic import BaseModel, ConfigDict


class DataLeakageError(ValueError):
    """Raised whenever patient, eye, clinic/device, or temporal split leakage is detected (ADR-033)."""


class SampleRecord(BaseModel):
    model_config = ConfigDict(frozen=True)

    sample_id: str
    patient_id: str
    eye_laterality: Literal["OD", "OS"]
    clinic_id: str
    device_model: str
    captured_at_iso: str
    label: str
    modality: str


def _parse_iso(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def verify_zero_leakage(
    train: Sequence[SampleRecord],
    val: Sequence[SampleRecord],
    test: Sequence[SampleRecord],
    enforce_temporal: bool = True,
    holdout_clinic_ids: Sequence[str] = (),
) -> None:
    if not train or not test:
        raise DataLeakageError("Both train and test splits must be non-empty.")

    train_patients = {r.patient_id for r in train}
    val_patients = {r.patient_id for r in val}
    test_patients = {r.patient_id for r in test}

    if train_patients & val_patients:
        raise DataLeakageError(f"Patient leakage between train and val: {sorted(train_patients & val_patients)[:3]}")
    if train_patients & test_patients:
        raise DataLeakageError(f"Patient leakage between train and test: {sorted(train_patients & test_patients)[:3]}")
    if val_patients & test_patients:
        raise DataLeakageError(f"Patient leakage between val and test: {sorted(val_patients & test_patients)[:3]}")

    train_eyes = {(r.patient_id, r.eye_laterality) for r in train}
    val_eyes = {(r.patient_id, r.eye_laterality) for r in val}
    test_eyes = {(r.patient_id, r.eye_laterality) for r in test}

    if (train_eyes & val_eyes) or (train_eyes & test_eyes) or (val_eyes & test_eyes):
        raise DataLeakageError("Patient-eye laterality overlap detected across splits.")

    holdout_set = set(holdout_clinic_ids)
    if holdout_set:
        leaked_clinics = {r.clinic_id for r in train} & holdout_set
        if leaked_clinics:
            raise DataLeakageError(f"Holdout clinic/site leaked into train split: {sorted(leaked_clinics)}")

    if enforce_temporal:
        max_train_ts = max(_parse_iso(r.captured_at_iso) for r in train)
        min_test_ts = min(_parse_iso(r.captured_at_iso) for r in test)
        if max_train_ts > min_test_ts:
            raise DataLeakageError(
                f"Temporal leakage: train sample at {max_train_ts.isoformat()} is newer than test sample at {min_test_ts.isoformat()}."
            )


def build_leakage_safe_splits(
    records: Sequence[SampleRecord],
    holdout_clinic_ids: Sequence[str] = (),
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    temporal_holdout: bool = True,
) -> tuple[list[SampleRecord], list[SampleRecord], list[SampleRecord]]:
    if not records:
        raise ValueError("Cannot split an empty dataset.")

    holdout_set = set(holdout_clinic_ids)
    by_patient: dict[str, list[SampleRecord]] = {}
    for rec in records:
        by_patient.setdefault(rec.patient_id, []).append(rec)

    holdout_patients: list[str] = []
    regular_patients: list[str] = []

    for pid, recs in by_patient.items():
        if holdout_set and any(r.clinic_id in holdout_set for r in recs):
            holdout_patients.append(pid)
        else:
            regular_patients.append(pid)

    regular_patients.sort(
        key=lambda pid: max(_parse_iso(r.captured_at_iso) for r in by_patient[pid])
    )

    total_p = len(by_patient)
    target_test_p = max(1, round(total_p * test_ratio))
    target_val_p = max(1, round(total_p * val_ratio)) if total_p >= 3 else 0

    test_pids: set[str] = set(holdout_patients)
    if len(test_pids) < target_test_p and regular_patients:
        need = target_test_p - len(test_pids)
        take = regular_patients[-need:] if temporal_holdout else regular_patients[:need]
        test_pids.update(take)
        regular_patients = [p for p in regular_patients if p not in test_pids]

    val_pids: set[str] = set()
    if target_val_p > 0 and len(regular_patients) > 1:
        val_take = min(target_val_p, len(regular_patients) - 1)
        val_pids.update(regular_patients[-val_take:])
        regular_patients = [p for p in regular_patients if p not in val_pids]

    train_pids = set(regular_patients)

    train = [r for p in train_pids for r in by_patient[p]]
    val = [r for p in val_pids for r in by_patient[p]]
    test = [r for p in test_pids for r in by_patient[p]]

    verify_zero_leakage(
        train,
        val,
        test,
        enforce_temporal=temporal_holdout and not holdout_set,
        holdout_clinic_ids=holdout_clinic_ids,
    )
    return train, val, test
