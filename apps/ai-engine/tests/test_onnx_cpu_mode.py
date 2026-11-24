from __future__ import annotations

from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

from bina_ai_engine.api.main import create_app
from bina_ai_engine.config import AiEngineSettings

ARTIFACTS_ROOT = Path(__file__).resolve().parents[3] / "ml" / "registry" / "artifacts"


def _write_fundus_png(path: Path, disc_right: bool = False) -> Path:
    img = Image.new("RGB", (224, 224), (0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse((15, 15, 209, 209), fill=(190, 85, 35))
    disc_box = (135, 95, 165, 125) if disc_right else (55, 95, 85, 125)
    draw.ellipse(disc_box, fill=(245, 205, 110))
    img.save(path)
    return path


def _write_oct_png(path: Path) -> Path:
    arr = np.zeros((128, 128), dtype=np.uint8)
    for x in range(128):
        y = int(64 + 8 * np.sin(x / 18.0))
        arr[y - 6 : y + 6, x] = 220
        arr[y - 14 : y - 9, x] = 150
    Image.fromarray(arr).convert("RGB").save(path)
    return path


def _write_topography_png(path: Path) -> Path:
    img = Image.new("RGB", (160, 160), (245, 245, 245))
    draw = ImageDraw.Draw(img)
    for r, col in [
        (70, (30, 80, 220)),
        (55, (20, 190, 180)),
        (40, (60, 210, 60)),
        (25, (240, 210, 30)),
        (14, (235, 50, 30)),
    ]:
        draw.ellipse((80 - r, 80 - r, 80 + r, 80 + r), fill=col)
    img.save(path)
    return path


def test_onnx_cpu_runs_gathered_persian_nlp_and_home_risk_models() -> None:
    if not (ARTIFACTS_ROOT / "kernel3" / "artifacts" / "persian_symptom_nlp.onnx").is_file():
        return

    client = TestClient(
        create_app(
            AiEngineSettings(
                AI_ENGINE_MODE="onnx_cpu",
                AI_ARTIFACTS_DIR=str(ARTIFACTS_ROOT),
            )
        )
    )
    nlp_res = client.post("/v1/nlp/symptom-triage", json={"textFa": "کاهش ناگهانی دید و درد شدید چشم دارم"})
    assert nlp_res.status_code == 200
    nlp_body = nlp_res.json()
    assert nlp_body["riskClass"] == "red_flag"
    assert nlp_body["urgencyTier"] == "urgent"
    assert nlp_body["modelUsed"] == "persian_symptom_nlp.onnx"

    r2_res = client.post(
        "/v1/r2/home-risk",
        json={
            "vaDeltaLogmar": 0.35,
            "amslerDistortionScore": 0.82,
            "adherence7dRatio": 0.4,
            "iopMmhg": 27.0,
            "daysSinceSurgery": 7.0,
            "consecutiveWorseningCount": 2,
        },
    )
    assert r2_res.status_code == 200
    r2_body = r2_res.json()
    assert r2_body["highRisk"] is True
    assert r2_body["modelUsed"] == "home_risk_r2.onnx"


def test_onnx_cpu_multimodal_pipeline_executes_real_onnx_artifacts(tmp_path: Path) -> None:
    required = [
        ARTIFACTS_ROOT / "kernel1" / "artifacts" / "modality_router.onnx",
        ARTIFACTS_ROOT / "kernel1" / "artifacts" / "qc_gate.onnx",
        ARTIFACTS_ROOT / "kernel1" / "artifacts" / "fundus_dinov2.onnx",
        ARTIFACTS_ROOT / "kernel2" / "artifacts" / "oct_monai.onnx",
        ARTIFACTS_ROOT / "kernel2" / "artifacts" / "anterior_vision.onnx",
        ARTIFACTS_ROOT / "kernel2" / "artifacts" / "visual_field_prog.onnx",
        ARTIFACTS_ROOT / "kernel2" / "artifacts" / "tabular_diabetes.onnx",
        ARTIFACTS_ROOT / "kernel2" / "artifacts" / "masked_fusion.onnx",
    ]
    assert all(p.is_file() for p in required), "Expected all gathered ONNX artifacts to exist"

    fundus_img = _write_fundus_png(tmp_path / "fundus_os.png", disc_right=True)
    oct_img = _write_oct_png(tmp_path / "oct_os.png")
    ant_img = _write_topography_png(tmp_path / "ant_os.png")

    client = TestClient(
        create_app(
            AiEngineSettings(
                AI_ENGINE_MODE="onnx_cpu",
                FOUNDATION_BACKBONE="dinov2_apache2",
                AI_ARTIFACTS_DIR=str(ARTIFACTS_ROOT),
            )
        )
    )
    res = client.post(
        "/v1/analyze-study",
        json={
            "studyId": "11111111-1111-4111-8111-111111111111",
            "jobId": "22222222-2222-4222-8222-222222222222",
            "eyeLaterality": "OS",
            "assets": [
                {
                    "assetId": "33333333-3333-4333-8333-333333333331",
                    "s3ObjectKey": "studies/onnx/fundus_os.png",
                    "declaredModality": "fundus",
                    "declaredEye": "OS",
                    "rawMetrics": {"local_file_path": str(fundus_img)},
                },
                {
                    "assetId": "33333333-3333-4333-8333-333333333332",
                    "s3ObjectKey": "studies/onnx/oct_os.png",
                    "declaredModality": "oct",
                    "declaredEye": "OS",
                    "rawMetrics": {"local_file_path": str(oct_img)},
                },
                {
                    "assetId": "33333333-3333-4333-8333-333333333333",
                    "s3ObjectKey": "studies/onnx/ant_os.png",
                    "declaredModality": "topography",
                    "declaredEye": "OS",
                    "conditionHints": ["infectious_keratitis"],
                    "rawMetrics": {"local_file_path": str(ant_img)},
                },
                {
                    "assetId": "33333333-3333-4333-8333-333333333334",
                    "s3ObjectKey": "studies/onnx/vf_os.png",
                    "declaredModality": "visual_field",
                    "declaredEye": "OS",
                },
            ],
            "labs": {
                "ageYears": 63,
                "hba1cPercent": 8.9,
                "iopMmHg": 25.0,
                "centralCornealThicknessUm": 510.0,
                "vfMdDb": -7.5,
                "vfMdSlopeDbPerYear": -1.5,
            },
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["engineMode"] == "onnx_cpu"
    assert body["status"] == "analyzed", f"Unexpected QC rejection: {body['qcDecisions']}"
    assert len(body["specialistOutputs"]) == 5
    by_id = {s["specialistId"]: s for s in body["specialistOutputs"]}
    assert by_id["oct"]["backboneId"] == "monai_unet_onnx_apache2"
    assert by_id["anterior"]["backboneId"] == "mobilenetv3_anterior_onnx"
    assert by_id["visual_field"]["backboneId"] == "vf_prog_onnx_v1"
    assert by_id["tabular_xgb"]["backboneId"] == "gbdt_tabular_onnx_v1"
    assert body["fusionResult"]["recommendedUrgency"] == "urgent"
