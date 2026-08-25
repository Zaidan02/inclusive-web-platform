# Deterministic Job Compatibility Engine

This package implements the proof-of-concept candidate/job scoring rules as plain Python. It is intentionally independent from Symfony, PostgreSQL, Flask, and the frontend.

The engine answers two separate questions:

1. Is the candidate eligible for the job?
2. If eligible, what percentage of the weighted work is compatible?

It is a rules engine, not a machine-learning model.

## Current proof-of-concept policy

- Education is excluded by default. HR may mark a minimum level as `preferred` or `required`; only an unmet `required` level affects eligibility.
- Personal education is a grouped HR concept with four child skills: reading, writing, counting, and basic position knowledge.
- A child skill marked `not_required` is excluded from the calculation.
- A preferred child skill influences ranking without excluding the candidate.
- A required child skill affects eligibility when it is not currently feasible.
- `with_support` receives factor `0.75` when the employer offers assistance. Without offered assistance it receives factor `0.25` and does not satisfy a required skill.
- The operational-task component uses 75% of the score when personal-education requirements are active; the grouped personal-education component uses 25%.
- An active education preference/requirement uses 10%, reducing the operational-task component accordingly. With no configured education or personal-education requirements, operational tasks remain 100% of the score.
- A missing disability/task assessment is treated as feasible, but recorded as an assumption.
- For multiple disabilities, the most restrictive assessment wins for each task.
- `needs_assistance` becomes `feasible_with_assistance` when the employer offers assistance.
- `needs_assistance` becomes `avoid` when assistance is unavailable.
- An explicit `avoid` is never rescued by the generic assistance checkbox.
- An avoided mandatory task excludes the candidate.
- An avoided optional task earns zero points without excluding the candidate.
- Feasible work has factor `1.0`.
- Work feasible with assistance has factor `0.75`.
- Highlighted tasks multiply their configured weight by `1.5`.

The operational-task component for an eligible candidate is:

```text
sum(adjusted task weight × feasibility factor)
------------------------------------------------ × 100
sum(adjusted task weight)
```

Task weight describes how important a task is to the job. The feasibility factor describes this candidate's relationship with that task. They are deliberately separate values.

The final result combines only active components. “Personal education” source headings and their Write/Read/Count/Basic knowledge child rows are removed from ordinary task scoring; otherwise those concepts would be counted twice through both disability assessments and HR requirements.

## Package layout

```text
scoring_engine/
  enums.py          Allowed education and feasibility values
  models.py         Input and result data structures
  policy.py         Changeable proof-of-concept weights and defaults
  resolver.py       Per-task disability and assistance rules
  engine.py         Eligibility gates and final weighted calculation
  serialization.py  JSON/dictionary-friendly result conversion
  example.py        Small executable example
  tests/            Unit tests for the business rules
```

## Run the example

From the repository root:

```powershell
py -3.12 -m scoring_engine.example
```

## Run the tests

```powershell
py -3.12 -m unittest discover -s scoring_engine/tests -v
```

The package uses only the Python standard library.

## Current integration boundary

The Symfony `GET /api/candidate/matches` endpoint loads the candidate, employer-configured requirements, published jobs, operational tasks, assessments, highlighted task identifiers, and `assistanceAvailable` value from PostgreSQL. It sends plain JSON to the containerized `POST /score` endpoint and returns the ranked, explainable results to React. Application submission adds the position-specific knowledge answer and stores a compact compatibility snapshot for authorized HR review.

Database access and HTTP concerns should not be added to this package.

The scoring service is started with the backend Docker Compose stack and exposes a health check at `http://localhost:5001/health`.
