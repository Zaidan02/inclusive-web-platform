from __future__ import annotations

from .models import Candidate, EducationResult, Job, MatchResult
from .policy import ScoringPolicy
from .resolver import resolve_task
from .enums import EffectiveFeasibility


class ScoringEngine:
    """Apply eligibility gates and calculate an explainable weighted score."""

    def __init__(self, policy: ScoringPolicy | None = None) -> None:
        self.policy = policy or ScoringPolicy()

    def evaluate(self, candidate: Candidate, job: Job) -> MatchResult:
        education = self._evaluate_education(candidate, job)
        task_results = tuple(
            resolve_task(candidate, task, job.assistance_available, self.policy)
            for task in job.tasks
        )

        exclusion_reasons: list[str] = []
        if not education.meets_requirement:
            exclusion_reasons.append(education.explanation)

        exclusion_reasons.extend(
            f"Mandatory task cannot be performed: {result.task_name}. {result.explanation}"
            for result in task_results
            if result.mandatory and result.effective_feasibility is EffectiveFeasibility.AVOID
        )

        maximum_points = sum(result.adjusted_weight for result in task_results)
        earned_points = sum(result.earned_points for result in task_results)
        eligible = not exclusion_reasons
        score = round((earned_points / maximum_points) * 100, 2) if eligible else None

        return MatchResult(
            candidate_id=candidate.candidate_id,
            job_id=job.job_id,
            job_title=job.title,
            eligible=eligible,
            score=score,
            earned_points=round(earned_points, 4),
            maximum_points=round(maximum_points, 4),
            education=education,
            task_results=task_results,
            exclusion_reasons=tuple(exclusion_reasons),
            summary=self._summary(eligible, score, task_results, exclusion_reasons),
        )

    @staticmethod
    def _evaluate_education(candidate: Candidate, job: Job) -> EducationResult:
        meets = candidate.education_level >= job.minimum_education_level
        if meets:
            explanation = (
                f"Candidate education ({candidate.education_level.name.lower()}) meets the "
                f"job requirement ({job.minimum_education_level.name.lower()})."
            )
        else:
            explanation = (
                f"Candidate education ({candidate.education_level.name.lower()}) is below the "
                f"job requirement ({job.minimum_education_level.name.lower()})."
            )
        return EducationResult(
            candidate_level=candidate.education_level,
            required_level=job.minimum_education_level,
            meets_requirement=meets,
            explanation=explanation,
        )

    @staticmethod
    def _summary(eligible, score, task_results, exclusion_reasons) -> str:
        if not eligible:
            return "Candidate is not eligible. " + " ".join(exclusion_reasons)
        assisted = sum(
            result.effective_feasibility is EffectiveFeasibility.FEASIBLE_WITH_ASSISTANCE
            for result in task_results
        )
        avoided_optional = sum(
            result.effective_feasibility is EffectiveFeasibility.AVOID and not result.mandatory
            for result in task_results
        )
        return (
            f"Candidate is eligible with a {score:.2f}% compatibility score. "
            f"{assisted} task(s) require employer assistance and "
            f"{avoided_optional} optional task(s) should be avoided."
        )
