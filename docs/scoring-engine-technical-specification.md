# Deterministic Job Compatibility Scoring Engine

## Complete Technical and Mathematical Specification

Status: implemented proof of concept  
Last updated: July 2026

This is the authoritative specification of the current scoring engine. It documents the implemented equations, business decisions, data contract, runtime call path, validation, ordering, tests, assumptions, and limitations.

The engine is deterministic. It is not machine learning, generative AI, a statistical predictor, or a trained model. Identical inputs always produce identical outputs.

---

## Table of contents

1. [Questions answered](#1-questions-answered)
   - [Critical interpretation: highest-ranked does not mean strongly compatible](#critical-interpretation-highest-ranked-does-not-mean-strongly-compatible)
2. [Runtime architecture](#2-runtime-architecture)
3. [Mathematical notation](#3-mathematical-notation)
   - [Base weight](#31-base-weight)
   - [Highlighting](#32-highlighting)
   - [Effective feasibility factor](#33-effective-feasibility-factor)
   - [Task points](#34-task-points)
   - [Job totals](#35-job-totals)
4. [Education gate](#4-education-gate)
5. [Raw disability/task assessments](#5-raw-disabilitytask-assessments)
6. [Missing assessment decision](#6-missing-assessment-decision)
7. [Multiple disabilities: most restrictive wins](#7-multiple-disabilities-most-restrictive-wins)
8. [Employer assistance transformation](#8-employer-assistance-transformation)
9. [Mandatory task gate](#9-mandatory-task-gate)
10. [Complete eligibility rule](#10-complete-eligibility-rule)
11. [Fully worked example](#11-fully-worked-example)
12. [Python domain validation](#12-python-domain-validation)
    - [Candidate](#candidate)
    - [Task](#task)
    - [Job](#job)
    - [Policy](#policy)
13. [Symfony call sequence](#13-symfony-call-sequence)
14. [Python HTTP contract](#14-python-http-contract)
15. [Output contract](#15-output-contract)
16. [Ranking](#16-ranking)
17. [React behavior](#17-react-behavior)
18. [Fixture coverage](#18-fixture-coverage)
19. [Complexity and performance](#19-complexity-and-performance)
20. [Determinism](#20-determinism)
21. [Tests](#21-tests)
22. [Current decisions and limitations](#22-current-decisions-and-limitations)
    - [Generic assistance](#generic-assistance)
    - [Explicit avoid is absolute](#explicit-avoid-is-absolute)
    - [Missing means feasible](#missing-means-feasible)
    - [Linear education](#linear-education)
    - [Most restrictive wins](#most-restrictive-wins)
    - [Equal default weights](#equal-default-weights)
    - [Mostly optional tasks](#mostly-optional-tasks)
    - [Assisted factor is policy](#assisted-factor-is-policy)
    - [No threshold](#no-threshold)
    - [Large explanation payload](#large-explanation-payload)
    - [Development server](#development-server)
23. [Central policy values](#23-central-policy-values)
24. [Exact algorithm](#24-exact-algorithm)
25. [Correct interpretation](#25-correct-interpretation)

---

## 1. Questions answered

The engine answers two questions in strict order:

1. **Eligibility:** does a hard rule exclude this candidate from this offer?
2. **Compatibility:** if eligible, what percentage of the weighted work is feasible?

A percentage never overrides a hard exclusion. An excluded result has `score = null`, not `0`. Zero means an eligible result earned no task points; null means an eligibility gate failed.

### Critical interpretation: highest-ranked does not mean strongly compatible

> **Important:** the first result is only the highest-scoring offer in the returned pool. It is not automatically a strong match, a recommendation, or proof that the candidate should apply. Relative rank and absolute compatibility answer different questions.

For eligible offers `J`, the first result is determined by:

```text
first result = arg max score(j), for j in J
```

This statement compares offers with one another. It imposes no minimum value on the winning score. If the available scores are `55.87`, `44.13`, and `36.44`, then `55.87` is the highest-ranked offer, but it still represents only `55.87%` of the adjusted task weight under the current rules. Calling it the "best match" would wrongly convert a relative ordering into an absolute quality claim.

The candidate interface therefore uses two separate signals:

| Signal | Meaning |
|---|---|
| `Highest-ranked offer` | This eligible offer has the largest score in this particular returned pool. |
| `Strong compatibility` | Absolute score is in `[80, 100]`. |
| `Moderate compatibility` | Absolute score is in `[60, 80)`. |
| `Limited compatibility` | Absolute score is in `[40, 60)`. |
| `Low compatibility` | Absolute score is in `[0, 40)`. |
| `Not eligible` | A hard gate failed and the official score is `null`. |

These bands are presentation labels, not additional scoring terms or eligibility gates. They do not alter points, percentages, sorting, or application authorization.

High-looking or low-looking percentages must not be cosmetically adjusted. The result follows from the current task catalog and policy: imported tasks generally have equal default weights, most tasks are optional, highlighted tasks receive their configured multiplier, and employer assistance may transform `needs_help` assessments. Changing the formula merely to make displayed values feel lower would conceal those data assumptions. Any future calibration should instead use expert-reviewed candidate/job examples with expected outcomes, then adjust documented weights, task importance, assistance rules, mandatory flags, or band thresholds against that benchmark set.

---

## 2. Runtime architecture

```text
React candidate dashboard
  → GET /api/candidate/matches with X-Auth-Token
Symfony CandidateMatchController
  → authenticates candidate
  → loads authoritative PostgreSQL data
  → POST http://scoring-engine:5001/score
Python scoring service
  → validates, resolves, scores, explains, sorts
Symfony
  → adds company presentation metadata
React
  → renders ranked results and explanations
```

Responsibilities:

- React triggers and displays; it does not calculate the official score.
- Symfony owns authentication, authorization, database access, and input assembly.
- Python owns mathematical rules.
- PostgreSQL owns candidate, disability, education, job, task, assessment, weight, mandatory, highlighted, and assistance data.

The browser does not send scoring facts. Changing browser state cannot alter the authoritative inputs unless the candidate first saves a profile change through the backend.

Key files:

```text
scoring_engine/enums.py
scoring_engine/models.py
scoring_engine/policy.py
scoring_engine/resolver.py
scoring_engine/engine.py
scoring_engine/serialization.py
scoring_engine/api.py
scoring_engine/tests/test_engine.py
backend/src/Controller/CandidateMatchController.php
frontend/src/pages/CandidateDashboard.jsx
```

---

## 3. Mathematical notation

For a job with tasks indexed by `i = 1...n`:

```text
w_i = base importance weight of task i
h_i = highlighting multiplier of task i
a_i = adjusted weight of task i
f_i = effective feasibility factor for the candidate on task i
p_i = points earned on task i
```

### 3.1 Base weight

```text
w_i > 0
```

Imported tasks currently default to `w_i = 1.0`. This is importance, not earned score. A zero or negative weight is rejected.

### 3.2 Highlighting

```text
h_i = 1.5  if task i is highlighted by the employer
h_i = 1.0  otherwise
```

Highlighting makes a task more influential. It does not make it mandatory.

```text
a_i = w_i × h_i
```

### 3.3 Effective feasibility factor

```text
f_i = 1.00  if feasible independently
f_i = 0.75  if feasible with employer assistance
f_i = 0.00  if the task should be avoided
```

The `0.75` value is a changeable proof-of-concept policy, not a probability, medical constant, or learned value.

### 3.4 Task points

```text
p_i = a_i × f_i
p_i = w_i × h_i × f_i
```

### 3.5 Job totals

```text
P_max     = Σ(i=1 to n) a_i
P_earned  = Σ(i=1 to n) p_i
```

For an eligible candidate:

```text
Score = round(100 × P_earned / P_max, 2)
```

Every job must contain at least one task and every weight is positive, therefore `P_max > 0` and division by zero is impossible for a valid domain object.

Earned and maximum totals are returned rounded to four decimal places. The percentage is rounded to two.

---

## 4. Education gate

Education is currently a totally ordered integer scale:

| Value | Rank |
|---|---:|
| `none` | 0 |
| `primary` | 1 |
| `middle_school` | 2 |
| `high_school` | 3 |
| `vocational` | 4 |
| `university` | 5 |

Let `E_c` be the candidate rank and `E_j` the job minimum.

```text
EducationPass = (E_c ≥ E_j)
```

If `E_c < E_j`, the candidate is excluded regardless of task points.

Fixture requirements:

```text
Chocolate / Confectionery Worker → middle_school
Ice Cream Maker                  → high_school
Bakery / Pastry Worker           → vocational
```

The fixture candidate has `high_school`, so bakery offers are excluded while the first two definitions pass.

Limitation: real education paths are not always linear. Certificates, equivalent experience, and incomparable vocational/academic paths are not modeled yet.

---

## 5. Raw disability/task assessments

For task `i` and disability `d`, the catalogue may contain:

```text
r(i,d) ∈ {feasible, needs_assistance, avoid}
```

Assessment maps sent to Python look like:

```json
{
  "ankle": "feasible",
  "both-hands": "needs_assistance",
  "wheelchair": "avoid"
}
```

Disability slugs are trimmed, lowercased, and deduplicated. Unknown feasibility values are rejected.

---

## 6. Missing assessment decision

Current policy:

```text
missing assessment → feasible
```

A blank dataset cell is interpreted as no recorded restriction, not an explicit prohibition. This assumption maximizes inclusion but can overestimate compatibility if the dataset is incomplete.

The assumption is exposed:

- Each disability/task result has `assumed_from_missing_data`.
- The aggregate task flag becomes true only when all candidate disability assessments for that task were missing.
- If one assessment exists and another is missing, the individual missing flag remains available, while the aggregate flag is false.

The default is centralized as `ScoringPolicy.missing_assessment_default` and can be changed without redesigning the engine.

---

## 7. Multiple disabilities: most restrictive wins

Restriction ranks are:

```text
rank(feasible)         = 0
rank(needs_assistance) = 1
rank(avoid)            = 2
```

For candidate disability set `D`, raw task outcome is:

```text
R_i = arg max over d ∈ D of rank(r(i,d))
```

Decision table:

```text
feasible + feasible                 → feasible
feasible + needs_assistance         → needs_assistance
feasible + avoid                    → avoid
needs_assistance + avoid            → avoid
needs_assistance + needs_assistance → needs_assistance
```

Assessments are not averaged. Averaging `feasible = 1` and `avoid = 0` into `0.5` could hide a serious restriction, so the most restrictive assessment controls the task.

---

## 8. Employer assistance transformation

Each job offer stores one Boolean:

```text
assistanceAvailable ∈ {false, true}
```

Complete transformation table:

| Raw outcome | Assistance off | Assistance on |
|---|---|---|
| `feasible` | `feasible` | `feasible` |
| `needs_assistance` | `avoid` | `feasible_with_assistance` |
| `avoid` | `avoid` | `avoid` |

Therefore:

```text
needs_assistance + no help → avoid
needs_assistance + help    → feasible_with_assistance
```

Generic assistance never rescues explicit `avoid`. The Boolean does not identify support type, so claiming that arbitrary support resolves an explicit prohibition would be unsupported.

---

## 9. Mandatory task gate

After assistance is applied:

```text
MandatoryPass = not exists task i where
                mandatory_i = true
                and effective_i = avoid
```

An avoided optional task earns zero but does not exclude the candidate.

Current imported tasks mostly have `mandatory = false`. The gate is implemented and tested but will become more significant after administrators identify essential duties.

---

## 10. Complete eligibility rule

```text
Eligible = EducationPass AND MandatoryPass
```

All education and mandatory-task failures are collected in `exclusion_reasons`.

If excluded:

```text
score = null
```

The engine still resolves tasks and calculates diagnostic point totals, but it does not publish their ratio as an official compatibility score.

---

## 11. Fully worked example

| Task | `w_i` | Highlighted | `h_i` | `a_i` | Effective result | `f_i` | `p_i` |
|---|---:|---:|---:|---:|---|---:|---:|
| Read labels | 3 | Yes | 1.5 | 4.5 | feasible | 1.00 | 4.50 |
| Handle payments | 3 | No | 1.0 | 3.0 | feasible | 1.00 | 3.00 |
| Clean counter | 1 | No | 1.0 | 1.0 | assisted | 0.75 | 0.75 |
| Carry boxes | 1 | No | 1.0 | 1.0 | avoid | 0.00 | 0.00 |

```text
P_max = 4.5 + 3.0 + 1.0 + 1.0 = 9.5
P_earned = 4.50 + 3.00 + 0.75 + 0.00 = 8.25
Score = round(100 × 8.25 / 9.5, 2)
Score = 86.84%
```

If `Carry boxes` is optional, the candidate remains eligible at `86.84%`. If mandatory, eligibility fails and score becomes null.

Highlighting affects numerator and denominator. Highlighting a feasible task raises both proportionally; highlighting an avoided task raises only the denominator and lowers compatibility more strongly.

---

## 12. Python domain validation

### Candidate

- Education must be recognized.
- Disability slugs are trimmed and lowercased.
- Empty slugs are removed.
- Duplicates are removed while preserving first-seen order.

### Task

- Name cannot be empty.
- Weight must be greater than zero.
- Assessment slugs are normalized.
- Feasibility must be one of the three raw values.

### Job

- Title cannot be empty.
- At least one task is required.
- Minimum education must be recognized.

### Policy

- Highlight multiplier must be positive.
- Every effective feasibility state needs a factor.
- Every factor must satisfy `0 ≤ factor ≤ 1`.

The Flask endpoint converts input `KeyError`, `TypeError`, and `ValueError` failures into HTTP 400 responses.

---

## 13. Symfony call sequence

React sends:

```http
GET /api/candidate/matches
X-Auth-Token: <candidate JWT>
```

Symfony then:

1. Requires `X-Auth-Token`.
2. Decodes the JWT.
3. Finds the user by email, then username.
4. Rejects employer/admin roles.
5. Requires profile, education, and at least one disability.
6. Loads every published job post, newest ID first.
7. Loads each job definition and all its tasks.
8. Marks tasks highlighted when linked through `job_post_highlighted_task`.
9. Builds an assessment map from `disability_task_assessment`.
10. Sends JSON to `http://scoring-engine:5001/score` with a 15-second timeout.
11. Converts service transport failure to HTTP 503.
12. Converts scoring-service rejection to HTTP 502.
13. Adds company name and assistance flag to returned results.
14. Returns results to React.

Company, location, website, deadline, and description do not enter the equation.

---

## 14. Python HTTP contract

Health:

```http
GET /health
```

```json
{"status":"ok","engine":"deterministic-scoring"}
```

Docker waits for this health check before PHP starts.

Scoring request:

```http
POST /score
Content-Type: application/json
```

```json
{
  "candidate": {
    "id": 43,
    "educationLevel": "high_school",
    "disabilities": ["both-hands"]
  },
  "jobs": [{
    "id": 7,
    "title": "Chocolate / Confectionery Worker",
    "minimumEducationLevel": "middle_school",
    "assistanceAvailable": true,
    "tasks": [{
      "id": 3259,
      "name": "Read",
      "weight": 1.0,
      "mandatory": false,
      "highlighted": true,
      "assessments": {"both-hands":"needs_assistance"}
    }]
  }]
}
```

---

## 15. Output contract

Each job result contains:

```text
candidate_id
job_id
job_title
eligible
score
earned_points
maximum_points
education
task_results
exclusion_reasons
summary
companyName                 added by Symfony
assistanceAvailable         added by Symfony
```

Each task result contains:

```text
task_id
task_name
mandatory
highlighted
base_weight
adjusted_weight
raw_feasibility
effective_feasibility
feasibility_factor
earned_points
assumed_from_missing_data
disability_assessments
explanation
```

Internal education ranks serialize as names such as `high_school`, never numeric rank `3`.

---

## 16. Ranking

Python sorts on:

```text
(not eligible, negative score or zero, job title)
```

Thus:

1. Eligible offers come first.
2. Higher scores come first.
3. Equal scores use alphabetical job title.
4. Excluded offers follow eligible offers.

Company and assistance are not tie-breakers. Python sorting is stable, so completely equal offers retain Symfony's initial descending-ID order.

---

## 17. React behavior

On button press:

1. React checks that profile state has a disability.
2. Clears old results and errors.
3. Enables loading animation.
4. Calls `getCandidateMatches()`.
5. Stores `data.results`.
6. Stops loading.
7. Displays percentage, eligibility, relative rank, absolute compatibility band, title, company, accommodation, summary, and expandable task explanations.
8. When the candidate selects `View job & apply`, React resolves the returned `job_id` against the loaded published jobs and opens that exact job's existing detail/application view.

The result card does not submit an application by itself. It navigates to the selected job view, where the candidate can review the full listing, attach the required documents, and deliberately submit the application. If the returned job is no longer in the loaded published-job collection, the dashboard shows an availability error instead of opening a different offer.

React does not recompute the official number.

Some old, unused helper functions remain in the component. They are not called by the current matching action or results. The authoritative displayed result comes only from the Symfony endpoint.

---

## 18. Fixture coverage

Fixtures create exactly:

- One admin
- One candidate
- Four employer/company accounts
- Three job definitions
- Six published offers

The offer set is:

```text
{three job definitions} × {assistance false, assistance true}
```

This permits direct comparison of otherwise equivalent job definitions with help on and off.

Measured Both Hands example:

```text
Ice Cream Maker, help on:       55.87%
Ice Cream Maker, help off:      44.13%
Confectionery, help on:         53.11%
Confectionery, help off:        34.46%
Bakery: excluded by education in both offers
```

---

## 19. Complexity and performance

Let:

```text
J   = published offers
T_j = tasks in offer j's definition
D   = candidate disabilities
```

Task resolution is `O(D)`. One job is `O(T_j × D)`. All jobs are:

```text
O(D × Σ T_j)
```

Sorting is:

```text
O(J log J)
```

The six-offer fixture returned full explanations in approximately `0.35 seconds` locally. Payload size was approximately `310 KB`, largely because every task result is returned.

---

## 20. Determinism

The result depends only on:

```text
candidate education
candidate disabilities
job minimum education
assistance Boolean
task weights
mandatory flags
highlighted flags
disability/task assessments
ScoringPolicy values
```

There is no randomness, training, inference, timestamp input, external web data, or browser-side official calculation. Company name, location, website, deadline, and prose description cannot change the score.

---

## 21. Tests

Eleven unit tests cover:

1. All feasible equals 100%.
2. Needs-assistance without help becomes avoid.
3. Mandatory avoid excludes.
4. Needs-assistance with help earns 75% in isolation.
5. Explicit avoid cannot be rescued.
6. Optional avoid earns zero without exclusion.
7. Missing assessment defaults feasible and is flagged.
8. Most restrictive disability wins.
9. Education failure excludes and score is null.
10. Highlighting changes weighted score correctly.
11. Serialization is API-safe and zero weight is rejected.

Run from repository root:

```powershell
py -3.12 -m unittest discover -s scoring_engine/tests -v
```

Run in Docker:

```powershell
cd backend
docker compose exec scoring-engine python -m unittest discover -s scoring_engine/tests -v
```

---

## 22. Current decisions and limitations

### Generic assistance

The Boolean does not identify type, capacity, schedule, or task relevance. Future typed accommodations should resolve only applicable tasks.

### Explicit avoid is absolute

The generic checkbox never overrides avoid. This is conservative and intentional.

### Missing means feasible

This inclusive assumption can overestimate compatibility. The output preserves assumption flags for review.

### Linear education

Alternative qualifications and incomparable education paths are not represented.

### Most restrictive wins

This prevents masking serious restrictions but does not model disability interactions or compensating abilities.

### Equal default weights

Most tasks currently have weight one. This is mathematically valid but means unhighlighted tasks contribute equally until administrators configure evidence-based weights.

### Mostly optional tasks

The mandatory gate exists but needs administrator data to become broadly meaningful.

### Assisted factor is policy

`0.75` requires domain/jury review. A future policy may treat fully effective accommodation as `1.00`.

### No threshold

Low-scoring eligible jobs remain eligible. The engine does not hide them or label them good/bad.

### Large explanation payload

Every task is returned. Future versions may return summaries and lazy-load details.

### Development server

The POC runs Flask directly. Production should use an appropriate WSGI server and operational controls.

---

## 23. Central policy values

```text
missing assessment default      = feasible
highlight multiplier            = 1.5
feasible factor                 = 1.0
assisted factor                 = 0.75
avoid factor                    = 0.0
```

Any policy change should include a reason, updated tests, worked recalculation, domain review, and eventually a policy version so historical results remain reproducible.

---

## 24. Exact algorithm

```text
for each published offer:
    validate candidate, job, tasks, and policy
    education_pass = candidate_rank >= required_rank

    for each task:
        for each candidate disability:
            load recorded assessment
            if missing, use feasible and flag assumption

        raw = most restrictive assessment
        effective = apply assistance decision table
        adjusted_weight = base_weight × highlight_multiplier
        factor = policy factor for effective result
        earned = adjusted_weight × factor
        generate explanation

    mandatory_pass = no mandatory task resolved to avoid
    eligible = education_pass and mandatory_pass
    maximum = sum adjusted weights
    earned = sum task points

    if eligible:
        score = round(100 × earned / maximum, 2)
    else:
        score = null

sort eligible first, then descending score, then title
```

---

## 25. Correct interpretation

The percentage means:

> Under the current POC policy, this is the percentage of the offer's adjusted task weight the candidate can perform independently or with the generic assistance promised by that offer, after education and mandatory-task eligibility rules are applied.

It is not:

- Probability of being hired
- Prediction of performance
- Medical diagnosis
- Measure of personal worth
- Universal claim about a disability
- Replacement for individualized accommodation discussion

It is an explainable compatibility calculation between one saved candidate profile and one specific published offer under explicit, reviewable rules.
