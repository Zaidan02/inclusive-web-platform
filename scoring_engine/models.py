from __future__ import annotations

from dataclasses import dataclass, field

from .enums import EducationLevel, EffectiveFeasibility, Feasibility


@dataclass(frozen=True, slots=True)
class Candidate:
    candidate_id: int | str
    education_level: EducationLevel | str
    disability_slugs: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        normalized = tuple(dict.fromkeys(slug.strip().lower() for slug in self.disability_slugs if slug.strip()))
        object.__setattr__(self, "disability_slugs", normalized)
        object.__setattr__(self, "education_level", EducationLevel.from_value(self.education_level))


@dataclass(frozen=True, slots=True)
class Task:
    task_id: int | str
    name: str
    weight: float = 1.0
    mandatory: bool = False
    highlighted: bool = False
    assessments: dict[str, Feasibility | str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise ValueError("Task name cannot be empty.")
        if self.weight <= 0:
            raise ValueError(f"Task weight must be greater than zero for {self.name!r}.")
        normalized = {
            slug.strip().lower(): Feasibility.from_value(feasibility)
            for slug, feasibility in self.assessments.items()
            if slug.strip()
        }
        object.__setattr__(self, "assessments", normalized)


@dataclass(frozen=True, slots=True)
class Job:
    job_id: int | str
    title: str
    minimum_education_level: EducationLevel | str
    assistance_available: bool
    tasks: tuple[Task, ...]

    def __post_init__(self) -> None:
        if not self.title.strip():
            raise ValueError("Job title cannot be empty.")
        if not self.tasks:
            raise ValueError("A job must contain at least one task before it can be scored.")
        object.__setattr__(
            self,
            "minimum_education_level",
            EducationLevel.from_value(self.minimum_education_level),
        )


@dataclass(frozen=True, slots=True)
class DisabilityAssessment:
    disability_slug: str
    feasibility: Feasibility
    assumed_from_missing_data: bool


@dataclass(frozen=True, slots=True)
class TaskResult:
    task_id: int | str
    task_name: str
    mandatory: bool
    highlighted: bool
    base_weight: float
    adjusted_weight: float
    raw_feasibility: Feasibility
    effective_feasibility: EffectiveFeasibility
    feasibility_factor: float
    earned_points: float
    assumed_from_missing_data: bool
    disability_assessments: tuple[DisabilityAssessment, ...]
    explanation: str


@dataclass(frozen=True, slots=True)
class EducationResult:
    candidate_level: EducationLevel
    required_level: EducationLevel
    meets_requirement: bool
    explanation: str


@dataclass(frozen=True, slots=True)
class MatchResult:
    candidate_id: int | str
    job_id: int | str
    job_title: str
    eligible: bool
    score: float | None
    earned_points: float
    maximum_points: float
    education: EducationResult
    task_results: tuple[TaskResult, ...]
    exclusion_reasons: tuple[str, ...]
    summary: str
