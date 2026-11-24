from __future__ import annotations

from dataclasses import dataclass, field

from bina_ai_engine.core.ports import (
    ExplainabilityPort,
    FusionEnginePort,
    ModalityRouterPort,
    QualityControlGatePort,
    SpecialistModelPlugin,
)
from bina_ai_engine.schemas import SpecialistId


@dataclass
class PluginRegistry:
    router: ModalityRouterPort
    qc_gate: QualityControlGatePort
    fusion_engine: FusionEnginePort
    explainability: ExplainabilityPort
    specialists: dict[str, SpecialistModelPlugin] = field(default_factory=dict)

    def register_specialist(self, plugin: SpecialistModelPlugin) -> None:
        self.specialists[plugin.plugin_id] = plugin

    def specialist_ids(self) -> list[SpecialistId]:
        return list(self.specialists.keys())  # type: ignore[return-value]
