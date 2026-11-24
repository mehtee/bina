from __future__ import annotations

import json
import pytest
from fastapi.testclient import TestClient

from bina_ai_engine.api.main import create_app
from bina_ai_engine.config import AiEngineSettings
from bina_ai_engine.worker.consumer import process_job_payload


def test_health_returns_cpu_stub_and_all_5_specialists() -> None:
    client = TestClient(create_app(AiEngineSettings()))
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["engineMode"] == "cpu_stub"
    assert body["foundationBackbone"] == "dinov2_apache2"
    assert body["registeredSpecialists"] == [
        "fundus",
        "oct",
        "anterior",
        "visual_field",
        "tabular_xgb",
    ]


def test_commercial_license_guard_blocks_retfound_without_research_flag() -> None:
    with pytest.raises(ValueError, match="ADR-051"):
        AiEngineSettings(FOUNDATION_BACKBONE="retfound_research_only", ALLOW_RESEARCH_BACKBONE=False)

    allowed = AiEngineSettings(FOUNDATION_BACKBONE="retfound_research_only", ALLOW_RESEARCH_BACKBONE=True)
    assert allowed.FOUNDATION_BACKBONE == "retfound_research_only"


@pytest.mark.parametrize(
    ("s3_key", "expected_code", "expected_fa"),
    [
        ("studies/s1/fundus_blur_od.png", "blur", "تار بودن تصویر"),
        ("studies/s1/fundus_dark_od.png", "lighting", "نور نامناسب"),
        ("studies/s1/fundus_wrong_eye_od.png", "wrong_eye", "عدم تطابق چشم راست و چپ"),
    ],
)
def test_qc_gate_rejects_bad_scans_and_blocks_layer2(
    s3_key: str,
    expected_code: str,
    expected_fa: str,
) -> None:
    client = TestClient(create_app(AiEngineSettings()))
    payload = {
        "studyId": "11111111-1111-4111-8111-111111111111",
        "jobId": "22222222-2222-4222-8222-222222222222",
        "eyeLaterality": "OD",
        "assets": [
            {
                "assetId": "33333333-3333-4333-8333-333333333333",
                "s3ObjectKey": s3_key,
                "declaredModality": "fundus",
                "declaredEye": "OD",
            }
        ],
    }

    qc_res = client.post("/v1/qc", json={"assets": payload["assets"]})
    assert qc_res.status_code == 200
    assert qc_res.json()["passed"] is False

    res = client.post("/v1/analyze-study", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "qc_failed"
    assert body["specialistOutputs"] == []
    assert body["fusionResult"] is None
    assert body["explainability"] is None
    assert expected_code in body["qcDecisions"][0]["rejectionCodes"]
    assert expected_fa in body["qcDecisions"][0]["rejectionReasonsFa"]


def test_single_modality_study_handles_missing_modalities_gracefully() -> None:
    client = TestClient(create_app(AiEngineSettings()))
    res = client.post(
        "/v1/analyze-study",
        json={
            "studyId": "11111111-1111-4111-8111-111111111111",
            "jobId": "22222222-2222-4222-8222-222222222222",
            "eyeLaterality": "OD",
            "assets": [
                {
                    "assetId": "33333333-3333-4333-8333-333333333333",
                    "s3ObjectKey": "studies/s1/fundus_dr_clean_od.png",
                    "declaredModality": "fundus",
                    "declaredEye": "OD",
                    "conditionHints": ["dr"],
                }
            ],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "analyzed"
    assert [o["specialistId"] for o in body["specialistOutputs"]] == ["fundus"]
    fusion = body["fusionResult"]
    assert fusion["availableModalities"] == ["fundus"]
    assert "oct" in fusion["missingModalities"]
    assert "موجود نبود" in fusion["missingModalityNoticeFa"]
    assert len(fusion["differential"]) >= 1


def test_full_multimodal_study_runs_all_specialists_masks_aux_gradcam_and_urgent_floor() -> None:
    client = TestClient(create_app(AiEngineSettings()))
    res = client.post(
        "/v1/analyze-study",
        json={
            "studyId": "11111111-1111-4111-8111-111111111111",
            "jobId": "22222222-2222-4222-8222-222222222222",
            "eyeLaterality": "OD",
            "assets": [
                {
                    "assetId": "a1111111-1111-4111-8111-111111111111",
                    "s3ObjectKey": "studies/s2/fundus_glaucoma_od.png",
                    "declaredModality": "fundus",
                    "declaredEye": "OD",
                    "conditionHints": ["glaucoma"],
                },
                {
                    "assetId": "a2222222-2222-4222-8222-222222222222",
                    "s3ObjectKey": "studies/s2/oct_glaucoma_od.dcm",
                    "declaredModality": "oct",
                    "declaredEye": "OD",
                    "conditionHints": ["glaucoma", "active_cnv"],
                },
                {
                    "assetId": "a3333333-3333-4333-8333-333333333333",
                    "s3ObjectKey": "studies/s2/slitlamp_keratitis_od.png",
                    "declaredModality": "slit_lamp",
                    "declaredEye": "OD",
                    "conditionHints": ["infectious_keratitis"],
                },
                {
                    "assetId": "a4444444-4444-4444-8444-444444444444",
                    "s3ObjectKey": "studies/s2/hfa_24_2_od.json",
                    "declaredModality": "visual_field",
                    "declaredEye": "OD",
                },
            ],
            "labs": {
                "hba1cPercent": 7.8,
                "iopMmHg": 26.0,
                "vfMdSlopeDbPerYear": -0.2,
            },
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "analyzed"
    assert len(body["specialistOutputs"]) == 5

    fusion = body["fusionResult"]
    assert fusion["recommendedUrgency"] == "urgent"
    assert fusion["recommendedUrgencyLabelFa"] == "ارجاع فوری"
    assert len(fusion["discordanceFlagsFa"]) == 1

    explain = body["explainability"]
    assert len(explain["primarySegmentationMasks"]) == 3
    assert all(m["isPrimaryExplainability"] is True for m in explain["primarySegmentationMasks"])
    assert len(explain["auxiliaryGradCams"]) == 3
    assert all(g["isAuxiliaryOnly"] is True for g in explain["auxiliaryGradCams"])
    assert all("غیرقابل استفاده" in g["warningFa"] for g in explain["auxiliaryGradCams"])


def test_worker_process_job_payload() -> None:
    job_id, out_json = process_job_payload(
        json.dumps(
            {
                "studyId": "11111111-1111-4111-8111-111111111111",
                "jobId": "22222222-2222-4222-8222-222222222222",
                "eyeLaterality": "OS",
                "assets": [
                    {
                        "assetId": "33333333-3333-4333-8333-333333333333",
                        "s3ObjectKey": "studies/s3/fundus_os_papilledema.png",
                        "declaredModality": "fundus",
                        "declaredEye": "OS",
                        "conditionHints": ["papilledema"],
                    }
                ],
            }
        )
    )
    assert job_id == "22222222-2222-4222-8222-222222222222"
    parsed = json.loads(out_json)
    assert parsed["status"] == "analyzed"
    assert parsed["fusionResult"]["recommendedUrgency"] == "urgent"
