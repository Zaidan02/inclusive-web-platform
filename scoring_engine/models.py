from __future__ import annotations

from dataclasses import dataclass, field

from .enums import AbilityLevel, EducationLevel, EffectiveFeasibility, Feasibility, RequirementLevel


@dataclass(frozen=True, slots=True)
class Candidate:
    candidate_id: int | str
    education_level: EducationLevel | str
    disability_slugs: tuple[str, ...] = ()
    reading_ability: AbilityLevel | str = AbilityLevel.NOT_YET
    writing_ability: AbilityLevel | str = AbilityLevel.NOT_YET
    numeracy_ability: AbilityLevel | str = AbilityLevel.NOT_YET
    position_knowledge: AbilityLevel | str | None = None

    def __post_init__(self) -> None:
        normalized = tuple(dict.fromkeys(slug.strip().lower() for slug in self.disability_slugs if slug.strip()))
        object.__setattr__(self, "disability_slugs", normalized)
        object.__setattr__(self, "education_level", EducationLevel.from_value(self.education_level))
        object.__setattr__(self, "reading_ability", AbilityLevel.from_value(self.reading_ability))
        object.__setattr__(self, "writing_ability", AbilityLevel.from_value(self.writing_ability))
        object.__setattr__(self, "numeracy_ability", AbilityLevel.from_value(self.numeracy_ability))
        if self.position_knowledge is not None:
            object.__setattr__(self, "position_knowledge", AbilityLevel.from_value(self.position_knowledge))


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
    education_requirement: RequirementLevel | str = RequirementLevel.NOT_REQUIRED
    reading_requirement: RequirementLevel | str = RequirementLevel.NOT_REQUIRED
    writing_requirement: RequirementLevel | str = RequirementLevel.NOT_REQUIRED
    numeracy_requirement: RequirementLevel | str = RequirementLevel.NOT_REQUIRED
    position_knowledge_requirement: RequirementLevel | str = RequirementLevel.NOT_REQUIRED

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
        for field_name in (
            "education_requirement",
            "reading_requirement",
            "writing_requirement",
            "numeracy_requirement",
            "position_knowledge_requirement",
        ):
            object.__setattr__(self, field_name, RequirementLevel.from_value(getattr(self, field_name)))


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
    requirement: RequirementLevel = RequirementLevel.NOT_REQUIRED


@dataclass(frozen=True, slots=True)
class AbilityResult:
    ability: str
    candidate_level: AbilityLevel
    requirement: RequirementLevel
    assistance_available: bool
    meets_requirement: bool
    factor: float
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
    task_score: float
    practical_ability_score: float | None
    education_score: float | None
    education: EducationResult
    ability_results: tuple[AbilityResult, ...]
    task_results: tuple[TaskResult, ...]
    exclusion_reasons: tuple[str, ...]
    summary: str
