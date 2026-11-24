from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import onnxruntime as ort
from pydantic import BaseModel, ConfigDict


class ArtifactValidationError(RuntimeError):
    """Raised when an exported ONNX artifact or metric report fails integrity/license checks."""


class ArtifactCheckResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    artifact_path: str
    size_mb: float
    inputs: list[str]
    outputs: list[str]


def verify_onnx_artifact(onnx_path: str | Path) -> ArtifactCheckResult:
    p = Path(onnx_path)
    if not p.exists():
        raise ArtifactValidationError(f"Missing ONNX model file: {p}")
    sess = ort.InferenceSession(str(p), providers=["CPUExecutionProvider"])
    return ArtifactCheckResult(
        artifact_path=str(p),
        size_mb=round(p.stat().st_size / (1024 * 1024), 4),
        inputs=[i.name for i in sess.get_inputs()],
        outputs=[o.name for o in sess.get_outputs()],
    )


def verify_gathered_kernel_dir(
    artifact_dir: str | Path,
    expected_onnx_files: list[str],
    metrics_filename: str,
) -> dict[str, Any]:
    root = Path(artifact_dir)
    if not root.exists():
        raise ArtifactValidationError(f"Artifact directory does not exist: {root}")

    metrics_file = root / metrics_filename
    if not metrics_file.exists():
        raise ArtifactValidationError(f"Missing metrics report: {metrics_file}")

    metrics: dict[str, Any] = json.loads(metrics_file.read_text(encoding="utf-8"))
    if metrics.get("commercial_license_compliant") is not True:
        raise ArtifactValidationError("Metrics report failed commercial_license_compliant=True gate (ADR-051).")
    if metrics.get("retfound_bundled") is True:
        raise ArtifactValidationError("RETFound (CC BY-NC 4.0) MUST NOT be bundled in commercial artifacts.")

    checked: list[dict[str, Any]] = []
    for filename in expected_onnx_files:
        res = verify_onnx_artifact(root / filename)
        checked.append(res.model_dump())

    return {
        "metrics": metrics,
        "verified_onnx": checked,
    }
