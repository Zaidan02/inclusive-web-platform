from __future__ import annotations

from dataclasses import asdict
from enum import Enum
from typing import Any

from .enums import EducationLevel
from .models import MatchResult


def result_to_dict(result: MatchResult) -> dict[str, Any]:
    """Convert a result to values that can be returned as JSON later."""

    return _serialize(asdict(result))


def _serialize(value: Any) -> Any:
    if isinstance(value, EducationLevel):
        return value.name.lower()
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {key: _serialize(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_serialize(item) for item in value]
    return value
