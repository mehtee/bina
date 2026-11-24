from __future__ import annotations

import logging
import signal
from typing import Any

import redis

from bina_ai_engine.config import load_settings
from bina_ai_engine.core.pipeline import MultimodalDiagnosticPipeline, build_default_pipeline
from bina_ai_engine.schemas import AnalyzeStudyRequest

logger = logging.getLogger("bina_ai_engine.worker")


def process_job_payload(
    raw_json: str | bytes,
    pipeline: MultimodalDiagnosticPipeline | None = None,
) -> tuple[str, str]:
    active_pipeline = pipeline or build_default_pipeline()
    req = AnalyzeStudyRequest.model_validate_json(raw_json)
    result = active_pipeline.analyze(req)
    return req.job_id, result.model_dump_json(by_alias=True)


def run_worker_once(
    redis_client: Any,
    queue_key: str = "bina:ai:jobs",
    result_prefix: str = "bina:ai:result:",
    ttl_seconds: int = 3600,
    pipeline: MultimodalDiagnosticPipeline | None = None,
) -> bool:
    raw = redis_client.lpop(queue_key)
    if raw is None:
        return False
    job_id, out_json = process_job_payload(raw, pipeline=pipeline)
    redis_client.setex(f"{result_prefix}{job_id}", ttl_seconds, out_json)
    return True


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    settings = load_settings()
    pipeline = build_default_pipeline(settings)
    client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    running = True

    def _stop(*_: object) -> None:
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    logger.info("Bina AI Engine Redis worker started (mode=%s)", settings.AI_ENGINE_MODE)
    while running:
        item = client.blpop([settings.AI_QUEUE_KEY], timeout=2)
        if not item:
            continue
        _, raw_payload = item
        job_id, out_json = process_job_payload(raw_payload, pipeline=pipeline)
        client.setex(f"{settings.AI_RESULT_PREFIX}{job_id}", settings.AI_RESULT_TTL_SECONDS, out_json)


if __name__ == "__main__":
    main()
