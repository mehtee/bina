from __future__ import annotations

from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AiEngineSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    AI_ENGINE_MODE: Literal["cpu_stub", "onnx_cpu", "gpu_full"] = "cpu_stub"
    FOUNDATION_BACKBONE: Literal["dinov2_apache2", "retfound_research_only"] = "dinov2_apache2"
    ALLOW_RESEARCH_BACKBONE: bool = False
    AI_ARTIFACTS_DIR: str = ""
    REDIS_URL: str = "redis://127.0.0.1:16379"
    AI_QUEUE_KEY: str = "bina:ai:jobs"
    AI_RESULT_PREFIX: str = "bina:ai:result:"
    AI_RESULT_TTL_SECONDS: int = 3600

    @model_validator(mode="after")
    def enforce_commercial_backbone_license(self) -> "AiEngineSettings":
        if (
            self.FOUNDATION_BACKBONE == "retfound_research_only"
            and not self.ALLOW_RESEARCH_BACKBONE
        ):
            raise ValueError(
                "ADR-051 license violation: 'retfound_research_only' (CC BY-NC 4.0) "
                "cannot run without explicit ALLOW_RESEARCH_BACKBONE=true."
            )
        return self


def load_settings() -> AiEngineSettings:
    return AiEngineSettings()
