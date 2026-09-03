from __future__ import annotations

from enum import Enum, IntEnum


class EducationLevel(IntEnum):
    """Ordered education levels used by the proof-of-concept gate."""

    NONE = 0
    PRIMARY = 1
    MIDDLE_SCHOOL = 2
    HIGH_SCHOOL = 3
    VOCATIONAL = 4
    UNIVERSITY = 5

    @classmethod
    def from_value(cls, value: EducationLevel | str) -> EducationLevel:
        if isinstance(value, cls):
            return value
        try:
            return cls[str(value).strip().upper()]
        except KeyError as error:
            allowed = ", ".join(level.name.lower() for level in cls)
            raise ValueError(f"Unknown education level {value!r}. Expected one of: {allowed}.") from error


class Feasibility(str, Enum):
    """Raw assessment values stored in the catalogue."""

    FEASIBLE = "feasible"
    NEEDS_ASSISTANCE = "needs_assistance"
    AVOID = "avoid"

    @classmethod
    def from_value(cls, value: Feasibility | str) -> Feasibility:
        if isinstance(value, cls):
            return value
        try:
            return cls(str(value).strip().lower())
        except ValueError as error:
            allowed = ", ".join(item.value for item in cls)
            raise ValueError(f"Unknown feasibility {value!r}. Expected one of: {allowed}.") from error


class EffectiveFeasibility(str, Enum):
    """Assessment after employer assistance has been applied."""

    FEASIBLE = "feasible"
    FEASIBLE_WITH_ASSISTANCE = "feasible_with_assistance"
    AVOID = "avoid"


class AbilityLevel(str, Enum):
    INDEPENDENT = "independent"
    WITH_SUPPORT = "with_support"
    NOT_YET = "not_yet"

    @classmethod
    def from_value(cls, value: AbilityLevel | str) -> AbilityLevel:
        if isinstance(value, cls):
            return value
        try:
            return cls(str(value).strip().lower())
        except ValueError as error:
            allowed = ", ".join(item.value for item in cls)
            raise ValueError(f"Unknown ability level {value!r}. Expected one of: {allowed}.") from error


class RequirementLevel(str, Enum):
    NOT_REQUIRED = "not_required"
    PREFERRED = "preferred"
    REQUIRED = "required"

    @classmethod
    def from_value(cls, value: RequirementLevel | str) -> RequirementLevel:
        if isinstance(value, cls):
            return value
        try:
            return cls(str(value).strip().lower())
        except ValueError as error:
            allowed = ", ".join(item.value for item in cls)
            raise ValueError(f"Unknown requirement level {value!r}. Expected one of: {allowed}.") from error
