# JoIn Hospitality — Final Engineering Presentation Speaker Guide

Presentation date: 14 September 2026  
Presenters: Zaidan Mansour and Charbel Rizk  
Formal presentation: 15 minutes  
Live demonstration: 5 minutes  

## Timing strategy

- Zaidan presents slides 1–12 in approximately 6 minutes 55 seconds.
- Charbel presents slides 13–27 in approximately 7 minutes 15 seconds.
- Approximately 50 seconds remain for speaker transition, natural pauses and minor delays.
- Slide 28 remains visible for questions.
- Slides 29–33 are hidden appendix slides and are not part of the timed presentation.
- Do not read every bullet. State the slide's conclusion, identify the strongest evidence and move on.

## Zaidan — problem, requirements and architecture

| Slide | Time | Essential speech |
|---|---:|---|
| 1. Title | 0:20 | “Our project is an accessible, multilingual recruitment platform for persons with physical disabilities. It combines software architecture, explainable matching, controlled AI assistance, cloud deployment and measured verification.” |
| 2. Roadmap | 0:20 | “We will move from the problem and research gap to requirements, architecture, implementation, verification and a five-minute demonstration.” |
| 3. Problem and urgency | 0:35 | “Disability affects about 1.3 billion people worldwide; labour-market participation remains substantially lower; and a large candidate survey identified finding inclusive employers as its greatest barrier. Our platform reduces this distance—it does not claim to solve unemployment by itself.” |
| 4. Background evolution | 0:30 | “Recruitment evolved from physical and document-heavy processes to online portals and AI-assisted systems. Each step improved reach but introduced new accessibility, privacy and opacity risks.” |
| 5. Research gap | 0:35 | “Generic job boards optimise vacancy search, accessibility tools improve interface access, and opaque ranking tools automate filtering. The unresolved gap is combining accessible interaction, task-level evidence, explainability and human control.” |
| 6. Delivered scope | 0:35 | “Phase II is an integrated platform: four protected roles, three languages, 15 hospitality positions, 923 controlled tasks, 14,453 disability-task assessments and 74 staging opportunities.” |
| 7. Functional requirements | 0:35 | “The four roles have distinct responsibilities. Candidates build profiles and apply; employers publish requirements and decide; verifiers review evidence; administrators govern users and catalogues. Symfony authorises every protected transition.” |
| 8. Non-functional requirements | 0:35 | “We converted quality goals into measurable requirements: accessibility, security, reliability, performance, maintainability, privacy and explainability. The final results include open defects, not only passes.” |
| 9. WCAG 2.1 AA | 0:45 | “WCAG is organised around perceivable, operable, understandable and robust content. We implemented semantic labels, keyboard flows, visible focus, predictable validation, RTL support and screen-reader-compatible status messages. Our evidence supports a Level AA target, not a full conformance claim.” |
| 10. Architecture | 0:45 | “React manages presentation, but never authorises itself. Symfony owns authentication, roles, validation and workflow rules. PostgreSQL stores business state; object storage separates uploads; deterministic scoring and AI/voice assistance are isolated services.” |
| 11. Design patterns | 0:35 | “The implementation uses layered architecture, controller-service-repository separation, adapters around external AI, a policy strategy for deterministic scoring, a command registry and state machine for voice actions, schema validation and immutable decision snapshots.” |
| 12. Security and privacy | 0:40 | “Security uses JWT authentication, server-side role checks, controlled CORS, validation, rate and size bounds, private storage and audit history. Route probes passed 51 out of 51; the security register retained one oversized-upload defect for correction.” |

Transition: “Charbel will now present the deployed implementation and its measured validation.”

## Charbel — implementation, evidence and conclusion

| Slide | Time | Essential speech |
|---|---:|---|
| 13. Cloud staging | 0:25 | “The system was deployed as a Render Blueprint with a React static site and three Docker services. Supabase provides SSL PostgreSQL and purpose-specific storage. HTTPS allows testing across real devices and networks.” |
| 14. AI profile workflow | 0:30 | “Speech or typed text remains editable. Processing requires explicit consent. The service returns structured suggestions; each starts unselected; only candidate-approved items pass Symfony validation and can be saved.” |
| 15. Multilingual AI evidence | 0:25 | “We evaluated sixty English, French and Arabic narratives. Fifty-three passed and seven retained extraction defects, mainly an omitted combined work-and-training preference. No suggestion was automatically persisted during the matrix.” |
| 16. Voice architecture | 0:35 | “Voice is a bounded pipeline: capture, transcription, classification, registered intent, authorisation, execution and feedback. Natural language can propose an action, but it cannot bypass the role-specific registry. Noise sometimes reduced recognition accuracy, especially for character sequences.” |
| 17. Deterministic matching | 0:40 | “Matching is not delegated to an LLM. A versioned formula combines required-task performance, task coverage and education feasibility. Forty-five out of forty-five cases reproduced expected eligibility, scores and explanations.” |
| 18. Employer modelling | 0:25 | “Employers select a controlled hospitality position, then configure actual tasks, priorities, educational requirements and available assistance for a job or training opportunity.” |
| 19. Recruitment workflow | 0:25 | “A verified candidate receives an explainable result and submits an application. The employer updates status, while an immutable compatibility snapshot and chronological events preserve the decision history.” |
| 20. Verification strategy | 0:25 | “Unit tests prove rules, integration tests prove service contracts, browser tests prove workflows, staging proves deployed integration, and real-user evaluation reveals barriers that automation cannot.” |
| 21. Final 310 cases | 0:35 | “All 310 planned staging cases were executed. The first run produced 274 passes, 15 noisy partials and 21 failures. The partials passed after repetition or manual correction, producing 289 final passes and a 93.2 percent final rate. The 21 failures remain visible.” |
| 22. Results by area | 0:30 | “Seven areas reached a 100 percent final rate. AI reached 88.3 percent, security 95 percent and performance 51.9 percent, defining the main engineering priorities.” |
| 23. Defects and lessons | 0:25 | “Testing exposed preference extraction, contrast and high-zoom reflow, oversized uploads, acoustic ambiguity and latency. These findings are retained as improvement work rather than hidden.” |
| 24. Human-centred validation | 0:35 | “Twenty persons with disabilities evaluated the platform at Arc en Ciel. Separately, Noelle Marie Gabrielle used JAWS on her adapted device to navigate, register and apply. This is strong practical evidence, but it does not prove universal accessibility.” |
| 25. Performance and reliability | 0:30 | “Correctness and speed produced different results. The safe shared-load run returned 144 out of 144 successful responses with no 5xx errors, while only three of nine latency thresholds passed. The free-tier deployment proves feasibility, not a production SLA.” |
| 26. Cost and scalability | 0:30 | “Current bounds already limit audio payloads, transcript length and conversation context. Production controls would add per-user quotas, budgets, backoff and monitoring. Caching was deferred because the measured bottlenecks were cold starts, external AI and write paths, and private mutable data requires careful invalidation.” |
| 27. Conclusion and demo | 0:20 | “The contribution is a deployed, accessible and explainable bridge between candidate abilities and employer tasks, supported by automated and human evidence. We will now demonstrate the main workflow.” |

## Five-minute demonstration

| Time | Demonstration action | Proof point |
|---|---|---|
| 0:00–1:00 | Sign in as the prepared candidate; open Profile; show multilingual controls, editable input and explicit AI consent. | Candidate control and accessible profile construction. |
| 1:00–2:00 | Open Matches; select an opportunity; show score, eligibility and task-level explanation. | Deterministic and explainable matching. |
| 2:00–3:00 | Sign in as employer; open a job or training offer; show requirements, important tasks and available assistance. | Employer-controlled opportunity modelling. |
| 3:00–4:00 | Show verifier or administrator view, then briefly show healthy Render services or Supabase evidence if appropriate. | Role separation, governance and deployed integration. |
| 4:00–5:00 | Switch language/RTL, demonstrate keyboard focus and show one safe voice-navigation command. | Multilingual accessibility and bounded command execution. |

If the OpenAI account has no credit, do not trigger a live paid request. Show slide 15 or the stored multilingual evidence, explain the external dependency honestly, and continue with matching and role workflows, which are deterministic and independent of the LLM.

## Pre-presentation checklist

- Confirm all Render services are healthy and warm them by opening the staging site before the session.
- Test the prepared candidate, employer, verifier and administrator accounts.
- Keep the PowerPoint, exported PDF and key screenshots available offline.
- Confirm the browser microphone permission and use a quiet environment for the live voice command.
- Never display API keys, database credentials, tokens or personal participant information.
- Use the staging URL: <https://join-hospitality-zm-staging.onrender.com/>.

## Claim guardrails

- Say “WCAG 2.1 Level AA target with supporting evidence,” not “fully WCAG certified.”
- Say “310 registered staging test cases,” and distinguish automated logs, manual cases and team-confirmed evidence.
- Say that noisy voice inputs sometimes required repetition or manual correction.
- Say “staging feasibility,” not “production availability” or “proven production scale.”
- State that matching is deterministic; AI assists profile structuring and voice understanding but does not make hiring decisions.
- Treat the Arc en Ciel and JAWS sessions as valuable human-centred evidence, not proof of universal accessibility or employment effectiveness.

## Hidden appendix navigation

- Slide 29: detailed 310-case result table.
- Slide 30: selected WCAG 2.1 AA criteria and evidence.
- Slide 31: redacted voice-command trace and rejected-command example.
- Slide 32: Supabase relational schema, storage separation and staging dataset size.
- Slide 33: principal references and evidence locations.

