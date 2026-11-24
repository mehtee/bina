from __future__ import annotations

import json
import os
import shutil
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

FORBIDDEN_PHI_PATH_MARKERS = ("raw_phi", "unscrubbed", "un_anonymized", "national_id", "0010_")
KAGGLE_API_BASE = "https://www.kaggle.com/api/v1"


class KaggleRunnerError(RuntimeError):
    """Raised on privacy violation, disk safety violation, or Kaggle CLI/API failure."""


class KaggleKernelSpec(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    title: str
    code_file: str
    language: Literal["python"] = "python"
    kernel_type: Literal["script", "notebook"] = "script"
    is_private: Literal[True] = True
    enable_gpu: bool = True
    enable_tpu: bool = False
    enable_internet: bool = True
    machine_shape: str | None = "NvidiaTeslaT4"
    keywords: list[str] = Field(default_factory=list)
    dataset_sources: list[str] = Field(default_factory=list)
    competition_sources: list[str] = Field(default_factory=list)
    kernel_sources: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_privacy_and_accelerator(self) -> "KaggleKernelSpec":
        if self.is_private is not True:
            raise ValueError("AGENTS.md / ADR-047 requires ALL Bina AI Kaggle kernels to set is_private=True.")
        for src in self.dataset_sources:
            lower = src.lower()
            if any(marker in lower for marker in FORBIDDEN_PHI_PATH_MARKERS):
                raise KaggleRunnerError(
                    f"Blocked potential PHI dataset source '{src}' from Kaggle submission."
                )
        if not self.enable_gpu and self.machine_shape is not None:
            object.__setattr__(self, "machine_shape", None)
        if self.enable_gpu and "gpu" not in self.keywords:
            object.__setattr__(self, "keywords", [*self.keywords, "gpu"])
        return self


def resolve_kaggle_bin() -> str:
    found = shutil.which("kaggle")
    if found:
        return found
    fallback = Path.home() / ".local/bin/kaggle"
    if fallback.exists():
        return str(fallback)
    raise KaggleRunnerError("Kaggle CLI binary not found in PATH or ~/.local/bin/kaggle.")


def _resolve_bearer_token() -> str:
    env_tok = os.environ.get("KAGGLE_API_TOKEN", "").strip()
    if env_tok:
        return env_tok
    token_path = Path.home() / ".kaggle" / "access_token"
    if token_path.is_file():
        tok = token_path.read_text(encoding="utf-8").strip()
        if tok:
            return tok
    raise KaggleRunnerError("Missing Kaggle API bearer token in KAGGLE_API_TOKEN or ~/.kaggle/access_token.")


def _kaggle_rest_get(path_and_query: str) -> dict[str, Any]:
    token = _resolve_bearer_token()
    url = f"{KAGGLE_API_BASE}{path_and_query}"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "Kaggle/1.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        raise KaggleRunnerError(f"Kaggle REST GET {path_and_query} failed: {exc}") from exc


def rest_get_quota() -> dict[str, Any]:
    return _kaggle_rest_get("/kernels/quota")


def rest_get_kernel_status(owner: str, slug: str) -> dict[str, Any]:
    qs = urllib.parse.urlencode({"userName": owner, "kernelSlug": slug})
    return _kaggle_rest_get(f"/kernels/status?{qs}")


def rest_get_kernel_output(owner: str, slug: str) -> dict[str, Any]:
    qs = urllib.parse.urlencode({"userName": owner, "kernelSlug": slug})
    return _kaggle_rest_get(f"/kernels/output?{qs}")


def check_host_disk_safe(min_free_gb: float = 3.0, path: str = "/") -> float:
    usage = shutil.disk_usage(path)
    free_gb = usage.free / (1024**3)
    if free_gb < min_free_gb:
        raise KaggleRunnerError(
            f"Critical low host disk ({free_gb:.2f} GiB < {min_free_gb:.2f} GiB). Aborting Kaggle artifact gather."
        )
    return free_gb


def write_kernel_metadata(kernel_dir: str | Path, spec: KaggleKernelSpec) -> Path:
    target = Path(kernel_dir)
    target.mkdir(parents=True, exist_ok=True)
    for item in target.rglob("*"):
        if item.is_file() and any(marker in item.name.lower() for marker in FORBIDDEN_PHI_PATH_MARKERS):
            raise KaggleRunnerError(f"Refusing to bundle suspected PHI file '{item.name}' into Kaggle kernel dir.")
    meta_path = target / "kernel-metadata.json"
    meta_path.write_text(json.dumps(spec.model_dump(exclude_none=True), indent=2), encoding="utf-8")
    return meta_path


def _kaggle_env() -> dict[str, str]:
    env = os.environ.copy()
    local_bin = str(Path.home() / ".local/bin")
    env["PATH"] = f"{local_bin}:{env.get('PATH', '')}"
    return env


def push_kernel(kernel_dir: str | Path) -> str:
    kaggle_bin = resolve_kaggle_bin()
    target = Path(kernel_dir)
    cmd = [kaggle_bin, "kernels", "push", "-p", str(target)]
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        env=_kaggle_env(),
        check=False,
    )
    if proc.returncode != 0:
        raise KaggleRunnerError(f"kaggle kernels push failed: {proc.stderr or proc.stdout}")
    return proc.stdout.strip()


def get_kernel_status(kernel_slug: str) -> str:
    kaggle_bin = resolve_kaggle_bin()
    proc = subprocess.run(
        [kaggle_bin, "kernels", "status", kernel_slug],
        capture_output=True,
        text=True,
        env=_kaggle_env(),
        check=False,
    )
    if proc.returncode != 0:
        raise KaggleRunnerError(f"kaggle kernels status failed: {proc.stderr or proc.stdout}")
    return proc.stdout.strip()


def gather_outputs(kernel_slug: str, target_dir: str | Path, min_free_gb: float = 3.0) -> Path:
    check_host_disk_safe(min_free_gb=min_free_gb)
    out_dir = Path(target_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    kaggle_bin = resolve_kaggle_bin()
    proc = subprocess.run(
        [kaggle_bin, "kernels", "output", kernel_slug, "-p", str(out_dir)],
        capture_output=True,
        text=True,
        env=_kaggle_env(),
        check=False,
    )
    if proc.returncode != 0:
        raise KaggleRunnerError(f"kaggle kernels output failed: {proc.stderr or proc.stdout}")
    return out_dir
