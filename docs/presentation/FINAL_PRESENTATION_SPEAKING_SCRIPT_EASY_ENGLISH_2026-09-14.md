# JoIn Hospitality — Final Presentation Speaking Script

Easy-English version for the final deck `RECOVERY_COPY_FINAL_PRESENTATION_2026-09-12_170417.pptx`.

Presentation date: 14 September 2026  
Presenters: Zaidan Mansour and Charbel Rizk  
Technical presentation target: 15 minutes 50 seconds  
Maximum with the allowed 10%: 16 minutes 30 seconds  
Live demonstration: 5 minutes, separate from the presentation

## Important corrections before the final save

The presentation is well structured and follows a clear software-engineering lifecycle. Make these small corrections before submitting it:

1. Slide 1 still says `PROGRESS PRESENTATION`. Change it to `FINAL ENGINEERING PRESENTATION`.
2. Slide 1 says `Le 15/9/2026`, while the other slides say `14 SEP 2026`. Use `14/9/2026` everywhere if the presentation is on Monday, 14 September.
3. A more accurate title is: **Inclusive Employment Platform: An AI-Assisted Accessible Recruitment Platform for Persons with Disabilities**. “AI-assisted” is more accurate than “AI-powered,” and “persons with disabilities” also includes the JAWS evaluation.
4. On slides 3, 4, 5, 7 and 8, change `REQUIRMENT ELICITATION` to `REQUIREMENTS ELICITATION`.
5. On slide 19, change `PROGRAMMATION` to `SOFTWARE IMPLEMENTATION`.
6. On slide 26, change `MEASUREMENTS ET METRICS` to `MEASUREMENTS AND METRICS`. Make the same correction on hidden slide 35.
7. On slide 29, change the temporary footer number `28T` to the final slide number used by your sequence.

Keep slides 34 to 39 hidden. They are backup evidence for questions and are not part of the timed presentation.

## Fair timing and speaking roles

| Part | Presenter | Slides | Time |
|---|---|---:|---:|
| Problem, requirements, design, implementation and deployment | Zaidan | 1–17 | 8:05 |
| Workflows, testing, cost, documentation and conclusion | Charbel | 18–32 | 7:40 |
| Return after the demo and invite questions | Charbel | 33 | 0:05 |
| **Total technical presentation** | **Both** | **1–33** | **15:50** |
| Live demonstration | Zaidan 2:30 + Charbel 2:30 | — | 5:00 |

This plan leaves about 40 seconds before the maximum allowed time. Speak calmly. Do not read all the text on the slides.

## Slide-by-slide script

### Slide 1 — Title — Zaidan — 0:25

“Good morning. We are Zaidan Mansour and Charbel Rizk. Our project is JoIn Hospitality, an accessible employment platform for persons with disabilities. It combines accessible interaction, protected role workflows, explainable matching and optional AI assistance. AI supports the user, but it does not make the hiring decision.”

### Slide 2 — Overview — Zaidan — 0:15

“We will present the project through the software-development lifecycle: the problem, research, requirements, design, implementation, testing, cost, documentation and conclusion. We will finish with a five-minute live demonstration.”

### Slide 3 — Business need — Zaidan — 0:30

“The problem is urgent. Around 1.3 billion people worldwide experience significant disability. Their labour-market participation is much lower, and more than 80 percent of candidates in the survey shown here said that finding inclusive employers was their main barrier. Our platform does not create jobs. It reduces the distance between ability, accessible recruitment and suitable employers.”

### Slide 4 — Background research — Zaidan — 0:25

“The view of disability has changed over time. The older medical view focused mainly on a person’s limitations. The social and rights-based view asks which barriers exist in the environment. Online portals improved reach, and AI increased automation, but both can introduce accessibility, privacy and fairness risks. JoIn therefore starts from ability and keeps people in control.”

### Slide 5 — Research gap — Zaidan — 0:30

“Existing solutions solve only part of the problem. General job websites have a wide reach but use generic profiles. Inclusive portals improve visibility but often do not explain task feasibility. AI screening can be fast but may be unclear or biased. Human coaching is useful but difficult to scale. Our gap is one accessible workflow that joins tasks, abilities, support, explanations and human review.”

### Slide 6 — Software lifecycle — Zaidan — 0:35

“We followed the main software-engineering stages taught in the course: needs, specification, design, programming, testing and debugging, documentation, deployment and maintenance, and conclusion. Our process was iterative and based on evolving prototypes. It was not a pure waterfall or pure V-model project. Inside each iteration, we used V-model-style traceability by linking every important requirement to a design choice and a test.”

### Slide 7 — Requirements elicitation — Zaidan — 0:30

“The requirements came from several sources. We considered candidates, employers, verifiers, administrators, supervisors and the institutional context. We reviewed Phase One work, WCAG, hospitality tasks, security and deployment needs. We then refined the requirements through prototypes, scenario observation, stakeholder feedback, the Arc en Ciel session and the separate JAWS evaluation.”

### Slide 8 — Engineering objectives — Zaidan — 0:25

“The final staging platform supports four protected roles and three interface languages. It contains 15 hospitality positions, 923 controlled tasks, 14,453 disability-task assessments and 74 published opportunities. The result connects candidate-controlled profile assistance, jobs and training, explainable matching, employer requirements, workplace support, verification and administration.”

### Slide 9 — SRS and traceability — Zaidan — 0:35

“The Software Requirements Specification, or SRS, defines what the system must do and how well it must work. We made the requirements measurable, reviewable and traceable. For example, the need for explainable matching led to a versioned scoring policy, a deterministic service and 45 expected decisions. All 45 matched the test oracle. This same chain was used for accessibility, security and AI control.”

### Slide 10 — Functional requirements — Zaidan — 0:30

“The functional requirements are organized by role. Candidates build a profile, choose work or training, view matches and apply. Employers publish offers and define tasks, requirements and available support. Verifiers review private evidence. Administrators manage users and controlled catalogues. The backend also checks rejected paths, so a user cannot perform an action outside the assigned role.”

### Slide 11 — Non-functional requirements — Zaidan — 0:30

“The non-functional requirements describe quality. We measured accessibility, security, privacy, reliability, performance, maintainability, internationalization and explainability. Examples include keyboard use, role-based access, private files, clear error recovery and repeatable response-time measurements. These qualities sometimes create trade-offs. For example, stronger validation and external services can add response time, but they protect correctness and privacy.”

### Slide 12 — WCAG 2.1 Level AA — Zaidan — 0:35

“WCAG means Web Content Accessibility Guidelines. Its four principles are perceivable, operable, understandable and robust. We used labels, headings, keyboard access, visible focus, clear errors, reduced motion, semantic controls and screen-reader status messages. We also tested Arabic right-to-left layout and a JAWS workflow. Level AA is our engineering target with supporting evidence; we do not claim an official accessibility certificate.”

### Slide 13 — Architecture — Zaidan — 0:40

“Users interact with the React and Vite frontend. Normal protected requests go to Symfony using a JWT. Symfony owns authentication, role checks, validation, workflows and all database and storage access. It calls the deterministic scoring service and the protected profile-suggestion path. React calls the voice service directly for live transcription and navigation. Only the voice and profile service communicates with OpenAI. The scoring service is deterministic and does not use AI.”

### Slide 14 — Design patterns — Zaidan — 0:25

“Several design patterns keep the system clear. The layered MVC structure separates the interface, business rules and data. Controller, service and repository responsibilities are separate. An adapter isolates OpenAI. A strategy stores versioned scoring rules. A command registry limits voice actions. Audit events and immutable snapshots keep important decisions traceable.”

### Slide 15 — Security design — Zaidan — 0:30

“Security is controlled by the backend, not only by hidden buttons. JWT and role-based access protect each workspace. Verification and application documents stay private, while only employer logos are public. AI requires clear consent, and unconfirmed suggestions are not saved. Route checks passed 51 out of 51, while the final security register passed 19 out of 20 because one oversized-upload behaviour remains open.”

### Slide 16 — Implementation quality — Zaidan — 0:20

“Programming included more than writing screens. We separated React, Symfony, Doctrine and the two Python services. Configuration and secrets remain outside the source code. Refactoring created smaller services and replaceable adapters, while regression tests checked that existing behaviour remained stable.”

### Slide 17 — Deployment — Zaidan — 0:25

“The staging system is deployed using a Render Blueprint. It contains the React static site, Symfony API, voice and profile service, and scoring service. Supabase provides SSL PostgreSQL and three storage areas for different file purposes. Docker and render.yaml make the deployment repeatable. Secrets are stored as environment values and are not included in the repository.”

Handover: “I will now hand over to Charbel, who will present the main workflows, test evidence, cost and conclusion.”

### Slide 18 — AI-assisted profile workflow — Charbel — 0:30

“The profile assistant is optional and controlled by the candidate. The candidate types or records in English, French or Arabic, then edits the transcript. The text is processed only after consent. The service returns suggestions that match the profile schema. Every item can be accepted, changed or rejected. Symfony validates the chosen items, and nothing is saved without final confirmation.”

### Slide 19 — Multilingual AI evidence — Charbel — 0:20

“We tested structured suggestions in English, French and Arabic, including Arabic right-to-left display. Fifty-three of 60 cases passed. Seven cases exposed an extraction weakness, mainly when the candidate clearly selected both work and training. Importantly, no unconfirmed AI suggestion was saved automatically.”

### Slide 20 — Voice interaction — Charbel — 0:35

“The voice path has controlled steps. Audio is recorded and transcribed, then the request is classified and changed into a known command. A page-and-role registry checks whether this command is allowed. React executes only the approved fixed action and gives visual and spoken feedback. In quiet conditions, the results were strong. Noise and long character sequences, such as an email address, can require repetition or manual correction.”

### Slide 21 — Deterministic matching — Charbel — 0:35

“Matching is not decided by an LLM. It uses a clear and versioned formula. Each task receives a feasibility value: one when feasible, zero point seven five when offered assistance makes it feasible, and zero when it should be avoided. Important tasks receive more weight. Education, practical abilities and unsafe mandatory tasks are also checked. All 45 staging cases matched the expected result.”

### Slide 22 — Employer workflow — Charbel — 0:25

“An employer first chooses a job or a hospitality training program, then selects one of the 15 controlled roles. The system loads approved tasks for that role. The employer defines education, practical abilities, important tasks and available assistance. The backend validates the complete offer before publishing it for matching.”

### Slide 23 — Integrated workflow — Charbel — 0:30

“This slide joins the full process. A verified candidate chooses an opportunity and receives a score with a task-level explanation. The candidate decides whether to apply, and private documents remain protected. The employer reviews the application and makes the human decision. Status changes, the responsible actor, the time and notification result are stored for audit.”

### Slide 24 — Verification and validation — Charbel — 0:30

“Verification asks whether we built the system according to its specification. Validation asks whether the system is useful in its real context. Our evidence includes static checks, 17 scoring tests, 57 voice and action-safety tests, 25 API checks and 26 browser scenarios. It also includes the 310-case staging register, the Arc en Ciel session and the separate JAWS workflow.”

### Slide 25 — Final 310 cases — Charbel — 0:35

“All 310 planned staging cases were executed. On the first execution, 274 passed, 15 voice cases were partial in noisy conditions, and 21 failed. The 15 partial cases passed after repetition or manual transcript correction. Therefore, the final result is 289 passes and 21 retained failures, or 93.2 percent. We kept the failures visible instead of hiding them.”

### Slide 26 — Results by test area — Charbel — 0:30

“The important point is the pattern, not only the average. Seven test areas reached a final rate of 100 percent. Security reached 95 percent and AI profile suggestions reached 88.3 percent. Performance and reliability reached 51.9 percent because several free-tier latency targets were not met. Functional correctness remained strong, but these lower areas define the next engineering work.”

### Slide 27 — Debugging and refinement — Charbel — 0:30

“Testing was useful because it found real problems. The open findings include the work-and-training extraction case, helper-text contrast, high-zoom header overflow, oversized-file handling and slow write operations. We also observed free-tier cold starts and reduced voice accuracy in noise. Each finding is documented so it can be corrected and then tested again without breaking other behaviour.”

### Slide 28 — User validation — Charbel — 0:35

“We also tested with intended users. At Arc en Ciel, 20 persons with disabilities used the main workflows in a real setting and gave encouraging feedback. In a separate evaluation, Noelle Marie Gabrielle, a visually impaired user, used her adapted device with JAWS. She navigated, registered and interacted with the job-application workflow. This is strong contextual evidence, but it does not prove universal accessibility.”

### Slide 29 — Cost estimation and control — Charbel — 0:35

“The cost has fixed parts, such as hosting, database and storage, and variable parts, mainly transcription and AI suggestions. We control variable cost by using deterministic rules first, limiting request size, applying daily user quotas, choosing lower-cost models and monitoring usage. Future scaling will prefilter relevant tasks, optimize database queries, add selective safe caching, separate budgets and use an emergency AI circuit breaker. Core workflows remain available without paid AI.”

### Slide 30 — Documentation — Charbel — 0:20

“Each lifecycle stage produced a reviewable document or artefact: requirements and WCAG targets, architecture and data design, source code and migrations, deployment configuration, test records, screenshots and operating guidance. This documentation supports traceability, reproduction, maintenance and future changes.”

### Slide 31 — Future work — Charbel — 0:35

“Future work is ordered by risk. First, we will correct the retained AI, contrast, reflow and upload findings and perform a wider independent accessibility audit. Next, we will improve monitoring, recovery and AI cost limits, and add caching only after measuring the real need. Later, we can add an accessible chatbot using verified knowledge, AI-assisted interview preparation, more roles and more employer partnerships.”

### Slide 32 — Conclusion — Charbel — 0:35

“JoIn is not only a website interface. It is a complete software-engineering system with protected roles, multilingual accessibility, explainable deterministic matching, optional human-controlled AI, separate data storage, repeatable deployment and retained test evidence. We executed 310 staging cases with a 93.2 percent final pass rate and completed real-user validation. The results show technical feasibility and practical value, while the remaining limits are clearly documented.”

Transition to demo: “We will now show the main workflow in a five-minute live demonstration.”

### Slide 33 — Questions — Charbel — 0:05 after the demo

“Thank you for your attention. We are ready for your questions.”

## Five-minute live demonstration

Prepare the candidate, employer and administrator or verifier pages before starting. Use separate browser profiles or windows so that you do not lose time signing out. Warm the Render services a few minutes before the presentation. Never show passwords, API keys, JWT values or private documents.

### Zaidan — 0:00 to 2:30

| Time | Action | Short sentence to say |
|---|---|---|
| 0:00–0:30 | Open the prepared candidate workspace and show the language selector. | “This is the protected candidate workspace. The same workflow is available in English, French and Arabic.” |
| 0:30–1:15 | Open the profile builder. Show editable input, consent and reviewable suggestions. | “The candidate can type or speak, edit the text and give consent. Suggestions are optional, and nothing is saved until the candidate confirms it.” |
| 1:15–2:05 | Open a prepared match and its explanation. | “The score is deterministic. The candidate can see which tasks are feasible, which need support and which requirements affect eligibility.” |
| 2:05–2:30 | Show the Apply action or a prepared application, then hand over. | “The candidate makes the final choice to apply, and private documents stay protected. Charbel will now show the employer and control side.” |

If OpenAI credit is unavailable, do not click a paid AI action. Show the retained English, French and Arabic screenshots and continue with matching, applications and role workflows.

### Charbel — 2:30 to 5:00

| Time | Action | Short sentence to say |
|---|---|---|
| 2:30–3:20 | Open a prepared employer offer. Show role, tasks, requirements and assistance. | “The employer publishes from a controlled role catalogue and defines real task requirements and available support.” |
| 3:20–4:00 | Show application review and a status change, or the prepared result if changing data is risky. | “The employer makes the human decision. Every status change is validated and recorded for audit.” |
| 4:00–4:30 | Show the verifier or administrator workspace. | “Protected roles separate private verification from catalogue and user administration.” |
| 4:30–5:00 | Show Arabic RTL and one deployment-evidence screen, then return to slide 33. | “The interface supports Arabic right-to-left presentation, and the same system is deployed as separate cloud services with a managed data layer.” |

## Hidden backup slides for jury questions

- **Slide 34 — Detailed register:** Use it if the jury asks how the 310 cases are divided. Say: “Every result has a test ID, expected result, actual result and retained evidence.”
- **Slide 35 — Load and latency:** Use it for performance questions. Say: “All 144 shared-load responses and 96 write operations were functionally successful, but some latency targets were missed on the free-tier staging environment.”
- **Slide 36 — WCAG mapping:** Use it if the jury asks for exact WCAG criteria. Say: “This is a representative mapping. We present evidence against the criteria, but we do not claim independent certification.”
- **Slide 37 — Voice trace:** Use it if the jury asks how voice commands are kept safe. Say: “Speech proposes a command, but the role-and-page registry decides whether it can run. Unknown or unauthorized targets cause no action.”
- **Slide 38 — Database and storage:** Use it for data-model or deployment questions. Say: “Structured data is stored in PostgreSQL. Private documents, public logos and verification files are separated by purpose.”
- **Slide 39 — References:** Use it for research questions. Mention WHO, ILO, W3C WCAG 2.1 and the candidate survey, and point to the full references in the report.

## Short answers to likely jury questions

**Did you use the V-model?**  
“Not as a pure development process. We used iterative prototyping, with V-model-style links between requirements, design and tests inside each iteration.”

**Does AI decide who gets a job?**  
“No. Matching is deterministic, and the employer makes the hiring decision. AI only assists text structuring, transcription and bounded command interpretation.”

**Are you fully WCAG 2.1 AA compliant?**  
“WCAG 2.1 Level AA is our target, and we have supporting technical and human evidence. We still retain known findings and have not received independent certification.”

**Why is the final rate 93.2 percent?**  
“We completed 310 cases. Two hundred eighty-nine finally passed and 21 failures remain open. Fifteen voice cases were partial at first and passed only after the defined recovery of repetition or manual correction.”

**Why is performance lower?**  
“The expected functions completed, but some latency targets were missed because of free-tier cold starts and slower write operations. We therefore claim staging feasibility, not a production service-level agreement.”

**Why was a cache not implemented?**  
“We did not add a general cache without measured evidence. Incorrect caching can create stale or unsafe data. We will first profile the database, optimize queries and indexes, then cache only repeated non-sensitive reads.”

**How will you control OpenAI cost?**  
“Paid AI is optional. We will use daily quotas, request-size limits, lower-cost model routing, budget alerts and a circuit breaker. Core registration, profile editing, matching and application workflows remain available without AI.”

Staging URL: <https://join-hospitality-zm-staging.onrender.com/>
