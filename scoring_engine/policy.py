from __future__ import annotations

from dataclasses import dataclass, field

from .enums import EffectiveFeasibility, Feasibility


@dataclass(frozen=True, slots=True)
class ScoringPolicy:
    """All adjustable proof-of-concept choices live in one place."""

    missing_assessment_default: Feasibility = Feasibility.FEASIBLE
    highlighted_task_multiplier: float = 1.5
    feasibility_factors: dict[EffectiveFeasibility, float] = field(
        default_factory=lambda: {
            EffectiveFeasibility.FEASIBLE: 1.0,
            EffectiveFeasibility.FEASIBLE_WITH_ASSISTANCE: 0.75,
            EffectiveFeasibility.AVOID: 0.0,
        }
    )

    def __post_init__(self) -> None:
        if self.highlighted_task_multiplier <= 0:
            raise ValueError("Highlighted task multiplier must be greater than zero.")
        missing = set(EffectiveFeasibility) - set(self.feasibility_factors)
        if missing:
            names = ", ".join(item.value for item in sorted(missing, key=lambda item: item.value))
            raise ValueError(f"Missing feasibility factors for: {names}.")
        for feasibility, factor in self.feasibility_factors.items():
            if not 0 <= factor <= 1:
                raise ValueError(f"Factor for {feasibility.value} must be between zero and one.")
