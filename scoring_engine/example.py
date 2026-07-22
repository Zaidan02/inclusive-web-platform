from __future__ import annotations

import json

from .engine import ScoringEngine
from .models import Candidate, Job, Task
from .serialization import result_to_dict


def main() -> None:
    candidate = Candidate(
        candidate_id=1,
        education_level="high_school",
        disability_slugs=("ankle",),
    )
    job = Job(
        job_id=10,
        title="Cashier",
        minimum_education_level="middle_school",
        assistance_available=True,
        tasks=(
            Task(1, "Read product labels", weight=3, mandatory=True, assessments={"ankle": "feasible"}),
            Task(2, "Handle payments", weight=3, mandatory=True, assessments={"ankle": "feasible"}),
            Task(3, "Clean the counter", weight=1, assessments={"ankle": "needs_assistance"}),
            Task(4, "Carry products", weight=1, highlighted=True, assessments={"ankle": "avoid"}),
        ),
    )

    result = ScoringEngine().evaluate(candidate, job)
    print(json.dumps(result_to_dict(result), indent=2))


if __name__ == "__main__":
    main()
