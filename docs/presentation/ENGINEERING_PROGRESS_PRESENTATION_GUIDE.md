# Engineering Progress Presentation Guide

Presentation: 15 minutes  
Demonstration: 5 minutes  
Presenters: Zaidan Mansour and Charbel Rizk

## Recommended two-member split

| Time | Slides | Presenter | Focus |
|---:|---:|---|---|
| 0:00–6:50 | 1–6 | Member 1 | Purpose, requirements, completed features, architecture, and scoring decision |
| 6:50–7:00 | — | Both | Short transition |
| 7:00–15:00 | 7–12 | Member 2 | Localization, cloud AI, evidence, current work, performance, and roadmap |
| 15:00–20:00 | Demo | Both | Candidate, employer, admin, language, keyboard, and security flow |

Members may exchange sections to match actual implementation ownership.

## Slide timing

| Slide | Topic | Time |
|---:|---|---:|
| 1 | Introduction | 35 seconds |
| 2 | Platform purpose | 1 minute |
| 3 | Functional and non-functional requirements | 1 minute 10 seconds |
| 4 | Implemented feature summary | 1 minute 15 seconds |
| 5 | Architecture and security boundaries | 1 minute 15 seconds |
| 6 | Deterministic scoring decision | 1 minute 35 seconds |
| 7 | i18next localization decision | 1 minute 15 seconds |
| 8 | Cloud Whisper/OpenAI decision | 1 minute 25 seconds |
| 9 | Implemented evidence and tests | 1 minute |
| 10 | Current improvement work | 1 minute 15 seconds |
| 11 | Response-time improvement plan | 1 minute 35 seconds |
| 12 | Remaining work and demo transition | 1 minute 30 seconds |

## Core speaking script

### Slide 1 — Introduction

“The Inclusive Web Platform is a practical digital bridge connecting persons with disabilities to real hospitality jobs, training, employers, and support.”

### Slide 2 — Purpose

“The platform does not invent jobs, diagnose disability, or automatically hire and reject. People and businesses already exist. Our engineering role is to make opportunities easier to discover, structure useful information, explain compatibility, and support communication while humans remain responsible.”

### Slide 3 — Requirements

“Functional requirements describe what users can do. Non-functional requirements describe how accessibly, securely, privately, clearly, and efficiently those operations must work.”

### Slide 4 — Implemented features

“The prototype contains an AI-assisted profile, authorized candidate verification, backend security controls, deterministic matching, applications, employer tools, admin and verifier workflows, keyboard and optional voice navigation, and English, French, and Arabic interfaces.”

### Slide 5 — Architecture and security

“React renders the interface. Symfony confirms the session and role, validates inputs, protects private evidence, and controls business workflows. PostgreSQL stores relational data. Separate Python services provide profile AI and deterministic scoring. Frontend checks improve usability, but backend authorization is decisive.”

### Slide 6 — Scoring decision

“Task compatibility is the weighted sum of task feasibility divided by total task weight. Feasible contributes 1.00, feasible with offered assistance contributes 0.75, and avoid contributes 0.00. Highlighted tasks receive a 1.5 weight multiplier. Practical abilities contribute 25 percent and education contributes 10 percent only when configured. Required conditions remain explicit eligibility gates.”

“We selected deterministic rules because the source is a controlled expert catalogue and every factor must be explainable. Machine learning would require representative labelled employment outcomes that we do not currently possess and could reproduce historical hiring bias.”

### Slide 7 — Localization decision

“Duplicating pages would triple maintenance and create drift. A custom React context would require us to rebuild fallbacks, plural rules, namespaces, and missing-key controls. i18next with react-i18next supports gradual migration, runtime switching, fallbacks, interpolation, and pluralization. The implementation now has three locales and seven namespaces, Arabic RTL behavior, and locale-parity tests.”

### Slide 8 — Cloud speech and AI decision

“A browser-only speech API varies by browser and device. A self-hosted Whisper model provides more infrastructure control but requires CPU or GPU capacity, model operations, updates, and load testing. Cloud Whisper-1 gave the prototype consistent multilingual transcription without maintaining model infrastructure.”

“The trade-offs are network dependency, provider cost, and latency. The service remains isolated so it can be replaced later. Voice actions are schema constrained and must pass deterministic registry authorization before the interface executes them.”

### Slide 9 — Evidence

“These are connected running screens, not mock-ups. The current automated evidence includes 23 API integration checks, 26 browser end-to-end scenarios, 17 scoring tests, and translation parity across three locales and seven namespaces.”

### Slide 10 — Current work

“We are correcting workflow issues, retesting protected access, modernizing the dashboards, improving responsive and accessible behavior, validating the expanded catalogue, preserving Personal Education hierarchy, and enriching candidate and company profiles.”

### Slide 11 — Response-time objective

“We will measure every stage before optimizing: recording, upload, transcription, classification, registry execution, speech generation, backend API, database query, and rendering. We will report p50 and p95 before and after each change.”

“Planned actions include trimming silence and payloads, bounding context, cancelling stale requests, keeping clients warm, using deterministic shortcuts where safe, profiling queries, pagination, route splitting, asset optimization, and database indexes. A cache will be introduced only if measurement proves that safe repeated data creates a real bottleneck.”

### Slide 12 — Roadmap and conclusion

“The next phase adds job, training, or both selection; safe public opportunity and company browsing; assistance for each individual task; richer company, candidate, and employer profiles; the complete fifteen-role catalogue; final accessibility evidence; monitoring; capacity testing; and deployment.”

Closing statement:

“The platform connects people to real businesses and supports human decisions instead of replacing them.”

## Five-minute demo

### 00:00–01:00 — Candidate profile

- Sign in as the verified candidate.
- Show the editable AI profile transcript and explicit consent.
- State that AI suggestions are not saved automatically.

### 01:00–02:00 — Matching

- Run or open a compatibility result.
- Expand a task-level explanation.
- State that the result is deterministic and AI does not calculate it.

### 02:00–03:00 — Employer

- Show vacancy requirements, important tasks, education and practical abilities, and the current general assistance option.
- Mention that task-specific assistance is the planned upgrade.

### 03:00–04:00 — Administration

- Open the dataset catalogue.
- Show active job descriptions, tasks, assessments, and source inspection.

### 04:00–05:00 — Cross-cutting proof

- Switch language once.
- Use the keyboard to show visible focus.
- Attempt or describe one wrong-role route rejection.

## Engineering claims to keep precise

- Deterministic scoring is not machine learning.
- OpenAI assists transcription, intent interpretation, speech, and profile suggestions; it does not authorize backend access or make hiring decisions.
- `whisper-1` is the current configurable transcription default, not an irreversible dependency.
- i18next localizes presentation while stable codes, IDs, roles, permissions, and scoring inputs remain unchanged.
- WCAG 2.1 AA remains a target until final manual assistive-technology evidence is complete.
- Do not claim faster AI response until a baseline, optimization, and repeatable retest are documented.
