from __future__ import annotations

from .models import AbilityResult, Candidate, EducationResult, Job, MatchResult
from .policy import ScoringPolicy
from .resolver import resolve_task
from .enums import AbilityLevel, EffectiveFeasibility, RequirementLevel


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
        ability_results = self._evaluate_abilities(candidate, job)

        exclusion_reasons: list[str] = []
        if education.requirement is RequirementLevel.REQUIRED and not education.meets_requirement:
            exclusion_reasons.append(education.explanation)

        exclusion_reasons.extend(
            result.explanation
            for result in ability_results
            if result.requirement is RequirementLevel.REQUIRED and not result.meets_requirement
        )

        exclusion_reasons.extend(
            f"Mandatory task cannot be performed: {result.task_name}. {result.explanation}"
            for result in task_results
            if result.mandatory and result.effective_feasibility is EffectiveFeasibility.AVOID
        )

        maximum_points = sum(result.adjusted_weight for result in task_results)
        earned_points = sum(result.earned_points for result in task_results)
        eligible = not exclusion_reasons
        task_score = earned_points / maximum_points
        practical_share = self.policy.practical_abilities_share if ability_results else 0.0
        education_share = self.policy.education_share if education.requirement is not RequirementLevel.NOT_REQUIRED else 0.0
        task_share = 1.0 - practical_share - education_share
        practical_score = sum(result.factor for result in ability_results) / len(ability_results) if ability_results else 0.0
        education_score = 1.0 if education.meets_requirement else 0.5
        combined_score = task_score * task_share + practical_score * practical_share + education_score * education_share
        score = round(combined_score * 100, 2) if eligible else None

        return MatchResult(
            candidate_id=candidate.candidate_id,
            job_id=job.job_id,
            job_title=job.title,
            eligible=eligible,
            score=score,
            earned_points=round(earned_points, 4),
            maximum_points=round(maximum_points, 4),
            task_score=round(task_score * 100, 2),
            practical_ability_score=round(practical_score * 100, 2) if ability_results else None,
            education_score=round(education_score * 100, 2) if education.requirement is not RequirementLevel.NOT_REQUIRED else None,
            education=education,
            ability_results=ability_results,
            task_results=task_results,
            exclusion_reasons=tuple(exclusion_reasons),
            summary=self._summary(eligible, score, task_results, ability_results, exclusion_reasons),
        )

    @staticmethod
    def _evaluate_education(candidate: Candidate, job: Job) -> EducationResult:
        if job.education_requirement is RequirementLevel.NOT_REQUIRED:
            return EducationResult(
                candidate_level=candidate.education_level,
                required_level=job.minimum_education_level,
                meets_requirement=True,
                explanation="The employer did not specify an education requirement, so education is excluded from matching.",
                requirement=job.education_requirement,
            )
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
            requirement=job.education_requirement,
        )

    def _evaluate_abilities(self, candidate: Candidate, job: Job) -> tuple[AbilityResult, ...]:
        configured = (
            ("reading", candidate.reading_ability, job.reading_requirement),
            ("writing", candidate.writing_ability, job.writing_requirement),
            ("counting", candidate.numeracy_ability, job.numeracy_requirement),
        )
        if candidate.position_knowledge is not None:
            configured += (("basic position knowledge", candidate.position_knowledge, job.position_knowledge_requirement),)

        return tuple(
            self._evaluate_ability(name, level, requirement, job.assistance_available)
            for name, level, requirement in configured
            if requirement is not RequirementLevel.NOT_REQUIRED
        )

    def _evaluate_ability(
        self,
        name: str,
        level: AbilityLevel,
        requirement: RequirementLevel,
        assistance_available: bool,
    ) -> AbilityResult:
        if level is AbilityLevel.INDEPENDENT:
            meets, factor, detail = True, 1.0, "can perform independently"
        elif level is AbilityLevel.WITH_SUPPORT and assistance_available:
            meets, factor, detail = True, self.policy.supported_ability_factor, "can perform with the assistance offered"
        elif level is AbilityLevel.WITH_SUPPORT:
            meets, factor, detail = False, self.policy.unsupported_ability_factor, "needs support that this vacancy does not currently offer"
        else:
            meets, factor, detail = False, 0.0, "cannot currently perform this skill"

        requirement_label = "required" if requirement is RequirementLevel.REQUIRED else "preferred"
        return AbilityResult(
            ability=name,
            candidate_level=level,
            requirement=requirement,
            assistance_available=assistance_available,
            meets_requirement=meets,
            factor=factor,
            explanation=f"{name.capitalize()} is {requirement_label}; the candidate {detail}.",
        )

    @staticmethod
    def _summary(eligible, score, task_results, ability_results, exclusion_reasons) -> str:
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
        supported_abilities = sum(result.candidate_level is AbilityLevel.WITH_SUPPORT and result.meets_requirement for result in ability_results)
        return (
            f"Candidate is eligible with a {score:.2f}% compatibility score. "
            f"{assisted} task(s) require employer assistance and "
            f"{supported_abilities} practical requirement(s) are met with support; "
            f"{avoided_optional} optional task(s) should be avoided."
        )
