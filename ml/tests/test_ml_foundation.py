from __future__ import annotations

from datetime import datetime
from pathlib import Path

import numpy as np
import pydicom
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid
import pytest

from bina_ml.datasets import (
    PUBLIC_SEED_CATALOG,
    DataLeakageError,
    DicomPhiViolationError,
    SampleRecord,
    anonymize_dicom_file,
    assert_dicom_phi_free,
    build_leakage_safe_splits,
    verify_zero_leakage,
)
from bina_ml.kaggle import KaggleKernelSpec, KaggleRunnerError, check_host_disk_safe, write_kernel_metadata


def _rec(
    sid: str,
    pid: str,
    eye: str = "OD",
    clinic: str = "clinic-1",
    ts: str = "2026-10-01T10:00:00Z",
) -> SampleRecord:
    return SampleRecord(
        sample_id=sid,
        patient_id=pid,
        eye_laterality=eye,  # type: ignore[arg-type]
        clinic_id=clinic,
        device_model="Topcon-TRC50",
        captured_at_iso=ts,
        label="normal",
        modality="fundus",
    )


def test_split_verifier_builds_clean_splits_and_catches_all_leakage_types() -> None:
    records = [
        _rec("s1", "p1", "OD", "c1", "2026-10-01T08:00:00Z"),
        _rec("s2", "p1", "OS", "c1", "2026-10-02T08:00:00Z"),
        _rec("s3", "p2", "OD", "c1", "2026-10-03T08:00:00Z"),
        _rec("s4", "p3", "OD", "c1", "2026-10-04T08:00:00Z"),
        _rec("s5", "p4", "OS", "c2", "2026-10-10T08:00:00Z"),
        _rec("s6", "p5", "OD", "c1", "2026-10-15T08:00:00Z"),
        _rec("s7", "p6", "OD", "c1", "2026-10-20T08:00:00Z"),
    ]
    train, val, test = build_leakage_safe_splits(records, holdout_clinic_ids=["c2"])
    verify_zero_leakage(train, val, test, enforce_temporal=False, holdout_clinic_ids=["c2"])
    assert {r.patient_id for r in train}.isdisjoint({r.patient_id for r in test})

    # Catch patient overlap
    with pytest.raises(DataLeakageError, match="Patient leakage"):
        verify_zero_leakage([_rec("s1", "p1")], [], [_rec("s2", "p1")], enforce_temporal=False)

    # Catch clinic holdout leak
    with pytest.raises(DataLeakageError, match="Holdout clinic"):
        verify_zero_leakage(
            [_rec("s1", "p1", clinic="c2")],
            [],
            [_rec("s2", "p2", clinic="c2")],
            enforce_temporal=False,
            holdout_clinic_ids=["c2"],
        )

    # Catch temporal leak (newer train sample than test sample)
    with pytest.raises(DataLeakageError, match="Temporal leakage"):
        verify_zero_leakage(
            [_rec("s1", "p1", ts="2026-11-10T00:00:00Z")],
            [],
            [_rec("s2", "p2", ts="2026-10-01T00:00:00Z")],
            enforce_temporal=True,
        )


def test_dicom_anonymizer_strips_phi_tags_while_preserving_ophthalmic_metadata(tmp_path: Path) -> None:
    src = tmp_path / "raw_patient.dcm"
    dst = tmp_path / "scrubbed.dcm"

    meta = FileMetaDataset()
    meta.MediaStorageSOPClassUID = pydicom.uid.SecondaryCaptureImageStorage
    meta.MediaStorageSOPInstanceUID = generate_uid()
    meta.TransferSyntaxUID = ExplicitVRLittleEndian
    meta.ImplementationClassUID = generate_uid()

    ds = FileDataset(str(src), {}, file_meta=meta, preamble=b"\x00" * 128)
    ds.is_little_endian = True
    ds.is_implicit_VR = False
    ds.PatientName = "Ali Rezaei"
    ds.PatientID = "0012345678"
    ds.PatientBirthDate = "19600101"
    ds.PatientTelephoneNumbers = "+989123456789"
    ds.InstitutionName = "Farabi Eye Hospital"
    ds.PerformingPhysicianName = "Dr. Ahmadi"
    ds.Modality = "OP"
    ds.ImageLaterality = "OD"
    ds.StudyInstanceUID = generate_uid()
    ds.SeriesInstanceUID = generate_uid()
    ds.SOPInstanceUID = meta.MediaStorageSOPInstanceUID
    ds.Rows = 8
    ds.Columns = 8
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.BitsAllocated = 8
    ds.BitsStored = 8
    ds.HighBit = 7
    ds.PixelRepresentation = 0
    ds.PixelData = np.zeros((8, 8), dtype=np.uint8).tobytes()
    ds.save_as(src, enforce_file_format=True)

    raw_loaded = pydicom.dcmread(src)
    with pytest.raises(DicomPhiViolationError):
        assert_dicom_phi_free(raw_loaded)

    anonymize_dicom_file(src, dst, salt="bina-test-salt-2026")
    scrubbed = pydicom.dcmread(dst)
    assert_dicom_phi_free(scrubbed)

    assert scrubbed.Modality == "OP"
    assert scrubbed.ImageLaterality == "OD"
    assert scrubbed.PatientIdentityRemoved == "YES"
    assert "PatientName" not in scrubbed
    assert "PatientID" not in scrubbed
    assert "InstitutionName" not in scrubbed
    assert str(scrubbed.StudyInstanceUID).startswith("2.25.")
    assert str(scrubbed.StudyInstanceUID) != str(raw_loaded.StudyInstanceUID)


def test_kaggle_runner_enforces_private_kernels_phi_guard_disk_guard_and_catalog(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="is_private"):
        KaggleKernelSpec(
            id="u/slug",
            title="Test",
            code_file="train.py",
            is_private=False,  # type: ignore[arg-type]
        )

    with pytest.raises(KaggleRunnerError, match="PHI"):
        KaggleKernelSpec(
            id="u/slug",
            title="Test",
            code_file="train.py",
            dataset_sources=["owner/raw_phi_eye_images"],
        )

    spec = KaggleKernelSpec(
        id="mahdirasouli00778/bina-router-qc",
        title="Bina Router QC",
        code_file="train.py",
        dataset_sources=[PUBLIC_SEED_CATALOG["fundus_eye_diseases"].kaggle_dataset_slug or ""],
    )
    meta_path = write_kernel_metadata(tmp_path / "k1", spec)
    assert meta_path.exists()
    assert '"is_private": true' in meta_path.read_text(encoding="utf-8")

    assert check_host_disk_safe(min_free_gb=1.0) >= 1.0
    with pytest.raises(KaggleRunnerError):
        check_host_disk_safe(min_free_gb=999_999.0)

    assert PUBLIC_SEED_CATALOG["fundus_aptos"].commercial_safe is False
    assert PUBLIC_SEED_CATALOG["oct_kermany"].commercial_safe is True
