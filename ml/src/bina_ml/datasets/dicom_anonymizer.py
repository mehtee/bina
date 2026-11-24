from __future__ import annotations

import hashlib
from pathlib import Path

import pydicom
from pydicom.dataset import Dataset

STRICT_PHI_KEYWORDS: tuple[str, ...] = (
    "PatientName",
    "PatientID",
    "PatientBirthDate",
    "PatientBirthTime",
    "PatientSex",
    "PatientAge",
    "OtherPatientIDs",
    "OtherPatientNames",
    "PatientAddress",
    "PatientTelephoneNumbers",
    "PatientMotherBirthName",
    "EthnicGroup",
    "InstitutionName",
    "InstitutionAddress",
    "InstitutionalDepartmentName",
    "ReferringPhysicianName",
    "ReferringPhysicianTelephoneNumbers",
    "PerformingPhysicianName",
    "OperatorsName",
    "AccessionNumber",
    "DeviceSerialNumber",
    "StationName",
)


class DicomPhiViolationError(ValueError):
    """Raised when un-scrubbed PHI tags remain in a DICOM dataset (ADR-053)."""


def _salted_dicom_uid(raw_uid: str, salt: str) -> str:
    digest = hashlib.sha256(f"{salt}:{raw_uid}".encode("utf-8")).hexdigest()
    num = int(digest[:30], 16)
    return f"2.25.{num}"


def anonymize_dicom_dataset(ds: Dataset, salt: str) -> Dataset:
    """Strips patient/clinic/physician PHI tags and replaces identifying UIDs deterministically."""
    if not salt or len(salt.strip()) < 4:
        raise ValueError("A non-empty anonymization salt (min 4 chars) is required.")

    # Drop all (0010,xxxx) Patient Identification / Demographic tags
    for elem in list(ds):
        if elem.tag.group == 0x0010:
            del ds[elem.tag]

    for kw in STRICT_PHI_KEYWORDS:
        if kw in ds:
            del ds[kw]

    ds.remove_private_tags()
    ds.PatientIdentityRemoved = "YES"
    ds.DeidentificationMethod = "BinaAI-ADR053-StrictScrub"

    for uid_kw in ("StudyInstanceUID", "SeriesInstanceUID", "SOPInstanceUID"):
        if uid_kw in ds and str(ds.get(uid_kw, "")).strip():
            ds[uid_kw].value = _salted_dicom_uid(str(ds.get(uid_kw)), salt)

    if getattr(ds, "file_meta", None) and "MediaStorageSOPInstanceUID" in ds.file_meta:
        ds.file_meta.MediaStorageSOPInstanceUID = _salted_dicom_uid(
            str(ds.file_meta.MediaStorageSOPInstanceUID),
            salt,
        )

    assert_dicom_phi_free(ds)
    return ds


def assert_dicom_phi_free(ds: Dataset) -> None:
    """Fails closed if any (0010,xxxx) tag or identifying physician/institution PHI tag remains."""
    offending: list[str] = []
    for elem in ds:
        if elem.tag.group == 0x0010 and str(elem.value).strip():
            offending.append(f"(0010,{elem.tag.element:04x}) {elem.keyword}")
    for kw in STRICT_PHI_KEYWORDS:
        if kw in ds and str(ds.get(kw, "")).strip():
            offending.append(kw)
    if offending:
        raise DicomPhiViolationError(f"Residual PHI detected in DICOM dataset: {', '.join(sorted(set(offending)))}")


def anonymize_dicom_file(src_path: str | Path, dst_path: str | Path, salt: str) -> Path:
    src = Path(src_path)
    dst = Path(dst_path)
    dst.parent.mkdir(parents=True, exist_ok=True)
    ds = pydicom.dcmread(src)
    anonymize_dicom_dataset(ds, salt=salt)
    ds.save_as(dst, enforce_file_format=True)
    return dst
