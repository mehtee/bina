from __future__ import annotations

import json
from pathlib import Path

from bina_ml.kaggle import KaggleKernelSpec, write_kernel_metadata
from bina_ml.training import ArtifactValidationError, verify_gathered_kernel_dir


def test_kaggle_kernel_metadata_is_private_and_gpu_ready(tmp_path: Path) -> None:
    k1 = KaggleKernelSpec(
        id="mahdirasouli00778/bina-ai-l1-router-qc-and-fundus-dinov2",
        title="Bina AI L1 Router QC and Fundus DINOv2",
        code_file="train.py",
        is_private=True,
        enable_gpu=True,
        enable_internet=True,
        machine_shape="NvidiaTeslaT4",
        dataset_sources=[
            "gunavenkatdoddi/preprocessed-eye-diseases-fundus-images",
            "paultimothymooney/kermany2018",
            "elmehdi12/keratoconus-detection",
            "orvile/eye-diseases-classification",
        ],
    )
    meta = write_kernel_metadata(tmp_path, k1)
    parsed = json.loads(meta.read_text(encoding="utf-8"))
    assert parsed["is_private"] is True
    assert parsed["enable_gpu"] is True
    assert parsed["machine_shape"] == "NvidiaTeslaT4"
    assert "gpu" in parsed["keywords"]

    cpu_spec = KaggleKernelSpec(
        id="mahdirasouli00778/bina-ai-cpu-test",
        title="Bina AI CPU Test",
        code_file="train.py",
        enable_gpu=False,
    )
    assert cpu_spec.machine_shape is None


def test_artifact_verifier_rejects_retfound_commercial_violation(tmp_path: Path) -> None:
    metrics = tmp_path / "metrics.json"
    metrics.write_text(
        json.dumps({"commercial_license_compliant": True, "retfound_bundled": True}),
        encoding="utf-8",
    )
    import pytest

    with pytest.raises(ArtifactValidationError, match="RETFound"):
        verify_gathered_kernel_dir(tmp_path, [], "metrics.json")
