from __future__ import annotations

import unittest

from scoring_engine import Candidate, Job, ScoringEngine, Task, result_to_dict
from scoring_engine.enums import EffectiveFeasibility


class ScoringEngineTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = ScoringEngine()
        self.candidate = Candidate(1, "high_school", ("ankle",))

    def job(self, *tasks: Task, assistance: bool = False, education: str = "none") -> Job:
        return Job(10, "Test Job", education, assistance, tasks)

    def test_all_feasible_tasks_score_one_hundred(self) -> None:
        result = self.engine.evaluate(
            self.candidate,
            self.job(Task(1, "Task", assessments={"ankle": "feasible"})),
        )
        self.assertTrue(result.eligible)
        self.assertEqual(100.0, result.score)

    def test_needs_assistance_without_help_becomes_avoid(self) -> None:
        result = self.engine.evaluate(
            self.candidate,
            self.job(Task(1, "Mandatory task", mandatory=True, assessments={"ankle": "needs_assistance"})),
        )
        self.assertFalse(result.eligible)
        self.assertIsNone(result.score)
        self.assertEqual(EffectiveFeasibility.AVOID, result.task_results[0].effective_feasibility)

    def test_needs_assistance_with_help_earns_seventy_five_percent(self) -> None:
        result = self.engine.evaluate(
            self.candidate,
            self.job(
                Task(1, "Assisted task", mandatory=True, assessments={"ankle": "needs_assistance"}),
                assistance=True,
            ),
        )
        self.assertTrue(result.eligible)
        self.assertEqual(75.0, result.score)

    def test_explicit_avoid_is_not_rescued_by_assistance(self) -> None:
        result = self.engine.evaluate(
            self.candidate,
            self.job(Task(1, "Unsafe task", mandatory=True, assessments={"ankle": "avoid"}), assistance=True),
        )
        self.assertFalse(result.eligible)

    def test_optional_avoid_scores_zero_without_exclusion(self) -> None:
        result = self.engine.evaluate(
            self.candidate,
            self.job(
                Task(1, "Possible", assessments={"ankle": "feasible"}),
                Task(2, "Avoid", assessments={"ankle": "avoid"}),
            ),
        )
        self.assertTrue(result.eligible)
        self.assertEqual(50.0, result.score)

    def test_missing_assessment_defaults_to_feasible_and_is_explained(self) -> None:
        result = self.engine.evaluate(self.candidate, self.job(Task(1, "Unrecorded")))
        self.assertEqual(100.0, result.score)
        self.assertTrue(result.task_results[0].assumed_from_missing_data)

    def test_most_restrictive_disability_wins(self) -> None:
        candidate = Candidate(1, "high_school", ("ankle", "arm"))
        task = Task(1, "Mixed task", assessments={"ankle": "feasible", "arm": "avoid"})
        result = self.engine.evaluate(candidate, self.job(task))
        self.assertEqual(0.0, result.score)
        self.assertEqual(EffectiveFeasibility.AVOID, result.task_results[0].effective_feasibility)

    def test_education_failure_excludes_candidate(self) -> None:
        result = self.engine.evaluate(
            Candidate(1, "primary", ("ankle",)),
            self.job(Task(1, "Task"), education="high_school"),
        )
        self.assertFalse(result.eligible)
        self.assertIsNone(result.score)
        self.assertFalse(result.education.meets_requirement)

    def test_highlighted_multiplier_changes_weighted_score(self) -> None:
        result = self.engine.evaluate(
            self.candidate,
            self.job(
                Task(1, "Highlighted avoid", highlighted=True, assessments={"ankle": "avoid"}),
                Task(2, "Normal feasible", assessments={"ankle": "feasible"}),
            ),
        )
        self.assertEqual(40.0, result.score)
        self.assertEqual(2.5, result.maximum_points)

    def test_result_serializes_to_json_friendly_values(self) -> None:
        result = self.engine.evaluate(self.candidate, self.job(Task(1, "Task")))
        serialized = result_to_dict(result)
        self.assertEqual("high_school", serialized["education"]["candidate_level"])
        self.assertEqual("feasible", serialized["task_results"][0]["effective_feasibility"])

    def test_invalid_task_weight_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            Task(1, "Invalid", weight=0)


if __name__ == "__main__":
    unittest.main()
