# Deterministic Job Compatibility Engine

This package implements the proof-of-concept candidate/job scoring rules as plain Python. It is intentionally independent from Symfony, PostgreSQL, Flask, and the frontend.

The engine answers two separate questions:

1. Is the candidate eligible for the job?
2. If eligible, what percentage of the weighted work is compatible?

It is a rules engine, not a machine-learning model.

## Current proof-of-concept policy

- Education below the job minimum excludes the candidate.
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

The percentage for an eligible candidate is:

```text
sum(adjusted task weight × feasibility factor)
------------------------------------------------ × 100
sum(adjusted task weight)
```

Task weight describes how important a task is to the job. The feasibility factor describes this candidate's relationship with that task. They are deliberately separate values.

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

The Symfony `GET /api/candidate/matches` endpoint loads the candidate, published jobs, tasks, assessments, highlighted task identifiers, and `assistanceAvailable` value from PostgreSQL. It sends plain JSON to the containerized `POST /score` endpoint and returns the ranked, explainable results to React.

Database access and HTTP concerns should not be added to this package.

The scoring service is started with the backend Docker Compose stack and exposes a health check at `http://localhost:5001/health`.
