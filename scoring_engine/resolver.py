from __future__ import annotations

from .enums import EffectiveFeasibility, Feasibility
from .models import Candidate, DisabilityAssessment, Task, TaskResult
from .policy import ScoringPolicy


_RESTRICTION_RANK = {
    Feasibility.FEASIBLE: 0,
    Feasibility.NEEDS_ASSISTANCE: 1,
    Feasibility.AVOID: 2,
}


def resolve_task(
    candidate: Candidate,
    task: Task,
    assistance_available: bool,
    policy: ScoringPolicy,
) -> TaskResult:
    """Resolve all disability assessments into one effective task outcome."""

    disability_assessments = tuple(
        _assessment_for_disability(task, disability_slug, policy)
        for disability_slug in candidate.disability_slugs
    )

    if disability_assessments:
        raw = max(
            (assessment.feasibility for assessment in disability_assessments),
            key=_RESTRICTION_RANK.__getitem__,
        )
        assumed = all(assessment.assumed_from_missing_data for assessment in disability_assessments)
    else:
        raw = policy.missing_assessment_default
        assumed = True

    effective = _apply_assistance(raw, assistance_available)
    adjusted_weight = task.weight * (policy.highlighted_task_multiplier if task.highlighted else 1.0)
    factor = policy.feasibility_factors[effective]

    return TaskResult(
        task_id=task.task_id,
        task_name=task.name,
        mandatory=task.mandatory,
        highlighted=task.highlighted,
        base_weight=task.weight,
        adjusted_weight=adjusted_weight,
        raw_feasibility=raw,
        effective_feasibility=effective,
        feasibility_factor=factor,
        earned_points=adjusted_weight * factor,
        assumed_from_missing_data=assumed,
        disability_assessments=disability_assessments,
        explanation=_explain(task, raw, effective, assumed, assistance_available),
    )


def _assessment_for_disability(
    task: Task,
    disability_slug: str,
    policy: ScoringPolicy,
) -> DisabilityAssessment:
    recorded = task.assessments.get(disability_slug)
    return DisabilityAssessment(
        disability_slug=disability_slug,
        feasibility=recorded or policy.missing_assessment_default,
        assumed_from_missing_data=recorded is None,
    )


def _apply_assistance(raw: Feasibility, assistance_available: bool) -> EffectiveFeasibility:
    if raw is Feasibility.AVOID:
        return EffectiveFeasibility.AVOID
    if raw is Feasibility.NEEDS_ASSISTANCE:
        return (
            EffectiveFeasibility.FEASIBLE_WITH_ASSISTANCE
            if assistance_available
            else EffectiveFeasibility.AVOID
        )
    return EffectiveFeasibility.FEASIBLE


def _explain(
    task: Task,
    raw: Feasibility,
    effective: EffectiveFeasibility,
    assumed: bool,
    assistance_available: bool,
) -> str:
    if assumed:
        return f"{task.name}: no recorded restriction was found, so the task is treated as feasible."
    if raw is Feasibility.NEEDS_ASSISTANCE and assistance_available:
        return f"{task.name}: feasible because the employer offers task assistance."
    if raw is Feasibility.NEEDS_ASSISTANCE:
        return f"{task.name}: assistance is required but this job does not offer it."
    if effective is EffectiveFeasibility.AVOID:
        return f"{task.name}: an explicit assessment says this task should be avoided."
    return f"{task.name}: feasible independently."
