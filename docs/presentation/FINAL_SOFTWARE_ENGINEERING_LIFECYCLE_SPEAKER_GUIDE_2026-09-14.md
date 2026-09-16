# JoIn Hospitality - Final Software Engineering Presentation Guide

Presentation date: 14 September 2026  
Presenters: Zaidan Mansour and Charbel Rizk  
Formal presentation: 15 minutes  
Live demonstration: 5 minutes

## Presentation logic

The deck follows the software-engineering lifecycle taught in the course while remaining specific to the implemented project:

1. Business need and background research
2. Software lifecycle and requirements elicitation
3. Software specification: FR, NFR and WCAG target
4. Software design: architecture, patterns and security
5. Programming: implementation, integration and deployment
6. Tests and debugging: verification, validation, metrics and defects
7. Cost estimation and maintenance
8. Documentation
9. Conclusion and demonstration

The selected process is evolutionary prototyping with iterative increments. Requirement-to-test traceability is inspired by the V-model inside each iteration. Do not describe the project as a pure waterfall process.

## Timing

- Zaidan: slides 1-15, approximately 6 minutes 40 seconds.
- Charbel: slides 16-31, approximately 6 minutes 50 seconds.
- Slides 32 is used for questions.
- Slides 33-37 are hidden technical appendices.
- Planned spoken content is approximately 13 minutes 30 seconds, leaving about 90 seconds for speaker transition, pauses and minor delays.
- State each slide's conclusion and strongest proof point. Do not read every bullet.

## Zaidan - business need, requirements, specification and design

| Slide | Time | Essential speech |
|---|---:|---|
| 1. Title | 0:15 | Present JoIn Hospitality as a complete software-engineering project: accessible interaction, protected workflows, deterministic matching, controlled AI, deployment and evidence. |
| 2. Problem and urgency | 0:25 | Explain that persons with disabilities face barriers that disconnect ability from opportunity. The platform reduces this distance; it does not claim to solve unemployment by itself. |
| 3. Background evolution | 0:20 | Recruitment moved from physical and document-heavy processes to portals and AI assistance, improving reach but creating accessibility, privacy and opacity risks. |
| 4. Research gap | 0:25 | Existing categories address parts of the problem. The gap is their integration: accessible interaction, task evidence, explainability and human control. |
| 5. Lifecycle | 0:30 | Name the course lifecycle stages. Explain the iterative/evolutionary process and V-model-style traceability used within each increment. |
| 6. Requirements elicitation | 0:30 | Identify stakeholders, documents and techniques. Explain that wants were refined into needs using prototypes, observation, standards and domain sources. |
| 7. Delivered objectives | 0:25 | Give the implemented scale: four roles, three languages, 15 positions, 923 tasks, 14,453 assessments and 74 staging opportunities. |
| 8. SRS quality and traceability | 0:30 | Requirements were written to be unambiguous, complete, consistent, verifiable, modifiable, traceable and maintainable. Trace one need through design and evidence. |
| 9. Functional requirements | 0:25 | Describe the four actor responsibilities and stress that Symfony controls protected transitions and rejected-role paths. |
| 10. Non-functional requirements | 0:25 | Explain that accessibility, security, privacy, performance, reliability, maintainability and explainability were expressed as measurable constraints. |
| 11. WCAG 2.1 Level AA target | 0:35 | Define POUR and show labels, keyboard flows, focus, validation, RTL, reflow and screen-reader status. Retain the contrast and high-zoom findings; do not claim certification. |
| 12. Architecture | 0:35 | React presents; Symfony authenticates, authorises and validates; PostgreSQL and object storage persist data; Python services isolate scoring and assistance. |
| 13. Design patterns | 0:25 | Connect layered architecture, adapters, policy strategy, command registry, state transitions and snapshots to low coupling, high cohesion and localised change. |
| 14. Security and privacy | 0:30 | Explain JWT/RBAC, server-side controls, consent, private evidence and auditability. Mention the retained oversized-upload defect. |
| 15. Programming and refactoring | 0:25 | Explain that programming included components, integration, configuration and regression-safe refactoring, not only source-code production. Hand over to Charbel. |

Transition: "Charbel will now present the deployed implementation and the evidence produced through verification and validation."

## Charbel - implementation, verification, cost, documentation and conclusion

| Slide | Time | Essential speech |
|---|---:|---|
| 16. Cloud staging | 0:20 | Render hosts the static frontend and three Docker services; Supabase provides SSL PostgreSQL and separated storage. The Blueprint is infrastructure as code. |
| 17. AI profile workflow | 0:25 | Text is editable, consent is explicit, suggestions are schema-constrained and unselected, and only candidate-confirmed values pass Symfony validation. |
| 18. Multilingual AI evidence | 0:20 | Sixty English, French and Arabic cases produced 53 passes and seven retained extraction defects, with no unsafe automatic persistence. |
| 19. Voice architecture | 0:30 | Separate transcription quality from action safety. The bounded command registry authorises actions; noise and character sequences sometimes require correction. |
| 20. Deterministic matching | 0:35 | Matching uses a versioned formula and explicit gates, not an LLM. All 45 staging decisions matched the expected oracle. |
| 21. Employer modelling | 0:20 | Employers configure actual role requirements, important tasks and available assistance for a job or training program. |
| 22. Integrated workflow | 0:20 | Trace candidate, compatibility, application, employer decision and immutable evidence history. |
| 23. Verification and validation | 0:30 | Verification asks whether the specification was implemented correctly. Validation asks whether the right system works for users and context. Show the evidence layers. |
| 24. Final 310 cases | 0:30 | All 310 cases were executed: 274 first passes, 15 noisy partials corrected through repetition or editing, 21 retained failures and 289 final passes, or 93.2 percent. |
| 25. Results by area | 0:25 | Seven areas reached 100 percent. AI, security and especially performance define the remaining priorities. |
| 26. Debugging lessons | 0:20 | Testing exposed extraction, contrast, zoom, upload, acoustic and latency problems. Link findings to correction and non-regression retesting. |
| 27. Human validation | 0:30 | Distinguish the 20-person Arc en Ciel session from Noelle Marie Gabrielle's JAWS workflow. This validates tested contexts, not universal accessibility. |
| 28. Metrics and performance | 0:25 | Measures require an objective, method and reference. Shared-load correctness held, but latency thresholds exposed free-tier limits. |
| 29. Cost and maintenance | 0:35 | Cost includes engineering effort, infrastructure, external services and maintenance. Explain bottom-up estimates, usage scenarios, quotas, model routing and why a general cache was deferred. |
| 30. Documentation | 0:25 | Show the artefact chain from needs and SRS to design, implementation, test evidence and operations. Documentation supports reproduction and maintenance. |
| 31. Conclusion | 0:20 | Conclude that the project is a deployed, accessible and explainable bridge supported by automated and human evidence, with clearly stated limits. Start the demonstration. |

## Five-minute demonstration

| Time | Action | Engineering proof |
|---|---|---|
| 0:00-1:00 | Open the prepared candidate profile; show language choice, editable text and consent. | Accessibility and human-controlled profile construction. |
| 1:00-2:00 | Open Matches; show eligibility, score and task-level explanation. | Deterministic and explainable decision logic. |
| 2:00-3:00 | Open an employer offer; show requirements, important tasks and assistance. | Employer-controlled domain modelling. |
| 3:00-4:00 | Show verifier or administrator and deployed-service evidence. | RBAC, governance and cloud integration. |
| 4:00-5:00 | Switch to Arabic RTL, show keyboard focus and one safe voice command. | Multilingual accessibility and bounded command execution. |

If the OpenAI account has no credit, do not trigger a paid request. Use the retained multilingual screenshots, state that the external provider is temporarily unavailable, and continue with deterministic matching and role workflows.

## Final claim guardrails

- Say "WCAG 2.1 Level AA target with supporting evidence," not "fully WCAG certified."
- Say "310 registered and executed staging cases," and distinguish automated logs, manual cases and team-confirmed observations.
- Explain that the 15 noisy voice cases were partial on first execution and passed after repetition or manual correction.
- Say "staging feasibility," not "production SLA" or "proven production scale."
- Matching is deterministic. AI assists profile structuring and voice interpretation; it does not make hiring decisions.
- Human sessions provide strong contextual evidence but do not prove universal accessibility or employment effectiveness.
- Never expose passwords, API keys, JWT material or private participant evidence during the demo.

Staging URL: <https://join-hospitality-zm-staging.onrender.com/>

