"""Deterministic and explainable candidate/job compatibility scoring."""

from .engine import ScoringEngine
from .enums import EducationLevel, EffectiveFeasibility, Feasibility
from .models import Candidate, Job, MatchResult, Task
from .policy import ScoringPolicy
from .serialization import result_to_dict

__all__ = [
    "Candidate",
    "EducationLevel",
    "EffectiveFeasibility",
    "Feasibility",
    "Job",
    "MatchResult",
    "ScoringEngine",
    "ScoringPolicy",
    "Task",
    "result_to_dict",
]
