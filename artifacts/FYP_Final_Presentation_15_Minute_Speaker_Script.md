# 15-Minute Speaker Script

The timings total **15:00** and do not include the validation videos or live demonstration.

## Slide 1 — Title (0:20)

Good morning. This presentation introduces the Inclusive Employment Platform, an accessible, AI-assisted recruitment system for persons with physical disabilities. Its purpose is to connect verified abilities with real hospitality tasks while keeping candidates, employers and verifiers in control.

## Slide 2 — Presentation Overview (0:40)

We begin with the problem context and the research gap. We then explain the software lifecycle, requirements elicitation and specification, including accessibility. Next, we present the architecture, implementation, cloud deployment and project management approach. Finally, we cover testing, performance, cost control, maintenance and documentation before concluding with the validation evidence and live demonstration.

## Slide 3 — Problem Context (0:40)

The central problem is not a lack of ability; it is the disconnect between ability and opportunity. Our research highlights the scale of disability, lower labour-market participation and the barriers employers face when trying to recruit inclusively. The engineering challenge is therefore to connect accessible recruitment, verified profiles, real job tasks and workplace support in one trustworthy workflow.

## Slide 4 — Background Research (0:35)

Existing approaches solve only parts of this problem. General portals offer reach but use generic profiles. Inclusive portals improve visibility but provide limited task-level evidence. AI screening offers speed but can introduce bias and opaque decisions. Human coaching adds context but is difficult to scale. Our gap is an integrated workflow combining accessibility, task evidence, explainable matching and human review.

## Slide 5 — Software Lifecycle (0:45)

We followed an iterative lifecycle combined with V-model traceability. We first discovered stakeholder needs, then specified functional and non-functional requirements and designed the architecture. Implementation was delivered incrementally across React, Symfony and the specialist services. Each significant change was followed by verification and validation. This maintained a traceable path from stakeholder need to requirement, design, code, test oracle and retained evidence.

## Slide 6 — Requirements Elicitation (0:40)

Requirements came from three sources. First, people: candidates, employers, verifiers and administrators. Second, evidence: WCAG research, hospitality-domain material, Arc-en-Ciel sessions and JAWS observations. Third, techniques: background study, scenario observation and iterative prototype review. This produced four role-based workspaces, fifteen hospitality roles, 923 controlled tasks and interfaces in three languages.

## Slide 7 — Functional Requirements (0:45)

The functional requirements are organized by role. Candidates verify their identity, create an accessible profile, explore matching opportunities and apply. Employers publish jobs or training opportunities, define tasks and assistance and review applications. Verifiers inspect private evidence and record auditable approval decisions. Administrators manage users and controlled catalogue data. Both successful workflows and rejected or recovery paths were specified and tested.

## Slide 8 — Non-Functional Requirements (0:40)

The main quality requirements were accessibility, security, reliability and maintainability. Accessibility targets WCAG 2.1 Level AA, keyboard and screen-reader use and responsive reflow. Security uses JWT, server-side role controls and protected evidence. Reliability is measured through health checks and repeatable latency tests. Maintainability is supported by component boundaries, versioned policy and stable English, French and Arabic interfaces.

## Slide 9 — Implemented Accessibility (0:40)

Accessibility was implemented across the platform, not added to one page. We used semantic HTML, labelled forms, keyboard navigation and visible focus. We considered contrast, alternative text, responsive layouts and 200-percent zoom. Errors and notifications were designed for screen readers. Voice input remains optional, transcripts are editable and AI-generated information requires consent and confirmation before it can be saved.

## Slide 10 — Architecture (0:55)

Users interact through the React and Vite interface, which sends authenticated requests to Symfony. Symfony owns identity, authorization, validation, workflow orchestration and all persistence decisions. PostgreSQL stores domain data, while object storage separates private documents from public employer logos. The scoring service uses deterministic, versioned rules and does not call OpenAI. The voice and profile service uses a replaceable provider adapter but has no database authority. This means AI can propose structured information, but only the protected backend can validate and persist confirmed data.

## Slide 11 — Detailed Design (0:35)

Four design decisions control complexity and sensitive data. Layered controller, service and repository boundaries reduce coupling. Adapters isolate OpenAI and the versioned scoring policy. A deterministic command registry restricts voice actions according to role and page. Private storage, consent and audit snapshots preserve decision history. Security testing passed 51 route probes, while the remaining oversized-upload issue stayed explicitly recorded.

## Slide 12 — Cloud Deployment (0:40)

The implemented system runs on shared cloud staging. Render hosts the React frontend, Symfony API, scoring service and voice-profile service as independent resources. Supabase provides PostgreSQL and purpose-specific storage for private evidence and public logos. The deployment is versioned through infrastructure configuration, making integration reproducible. This is engineering evidence from staging, not a claim of production-scale availability.

## Slide 13 — AI-Assisted Profile (0:45)

The AI-assisted profile workflow keeps the candidate in control. The candidate describes their situation by typing or speaking, reviews and edits the transcript and explicitly approves AI use. Structured suggestions can then be selected, rejected or corrected. Only confirmed information is sent to the backend for persistence. The workflow supports English, French and Arabic, and no AI suggestion becomes an automatic profile fact.

## Slide 14 — Voice Navigation (0:40)

Voice navigation follows a controlled path: record, transcribe, interpret, authorize and execute. The browser console trace shows the transcript, classifier output, proposed intent, router decision and interface feedback. Natural language can suggest a command, but only the deterministic registry can authorize a known action for the current role and page. Unknown, cross-role or sensitive actions are rejected or require confirmation.

## Slide 15 — Compatibility Algorithm (0:45)

Compatibility is deterministic and explainable. Each required task receives a feasibility factor: one when feasible, zero-point-seven-five when feasible with offered assistance and zero when it should be avoided. The weighted feasible total is divided by the total adjusted weight to produce the percentage. Unsafe mandatory tasks remain gates rather than being hidden by an average. The same inputs therefore always produce the same score and task-level reasons.

## Slide 16 — Integrated Workflow (0:35)

The integrated workflow separates responsibilities. The employer defines the role, its tasks and available support. The candidate explores jobs, training or both. The system calculates compatibility and explains any gates. The final application and employment outcome remain human decisions. An audit snapshot preserves the score context and status history for later review.

## Slide 17 — Project Management (0:40)

Project delivery was organized from June to September. Discovery and requirements were followed by architecture and prototype design, then implementation of the catalogue, backend, AI, voice and scoring services. The final iteration focused on testing, user validation, staging, the report and the defence. Control mechanisms included focused Git commits, reproducible deployment configuration, requirement-to-test evidence and visible retained risks.

## Slide 18 — Verification and Validation (0:40)

Testing covered several levels. Static and component checks examined builds, linting, syntax, schemas and unit behaviour. Service and integration tests covered API workflows, scoring oracles, the voice registry and AI cases. System testing used browser end-to-end, security and performance checks against deployed origins. Human validation then examined accessibility, JAWS use and complete stakeholder workflows.

## Slide 19 — Results and Debugging (0:45)

The campaign executed all 310 planned cases. The final pass rate was 93.2 percent, with 274 first-run passes, fifteen noisy partials corrected and twenty-one retained failures. The remaining findings include profile contrast and 200-percent zoom overflow, the oversized-upload path, preference extraction and free-tier latency. Reporting these findings is important: completion means every case was executed, not that the platform has no remaining defects.

## Slide 20 — User Validation and Video Transition (0:20)

These images summarize three validation settings: an Arabic workflow, the Arc-en-Ciel group session and a complete JAWS workflow. They demonstrate evaluation with intended users, while the remaining contrast and zoom findings stay documented. I will keep this slide brief because short videos of these sessions will be shown after the main presentation.

## Slide 21 — Cost, Maintenance and Documentation (0:35)

OpenAI, voice and email costs are controlled with daily limits and email summaries. We can also replace the AI model with a cheaper but effective alternative. The estimated pilot cost is around seventy to ninety dollars per month. If an API limit is reached, the main features still work. Maintenance includes fixes, monitoring and backups, while documentation stays updated.

## Slide 22 — Conclusion (0:50)

The project delivers an accessible recruitment bridge from ability to opportunity. The first contribution is human control: candidates confirm AI suggestions, employers define real requirements and verifiers record accountable decisions. The second is explainable engineering through deterministic matching, explicit trust boundaries and auditable outcomes. The third is evidence with limits: four protected roles, three interface languages, 310 executed staging cases and human validation, while unresolved findings remain visible instead of being hidden.

## Slide 23 — Acknowledgements and Thank You (0:30)

Before closing, we sincerely thank our supervisors for their guidance, Université Saint-Joseph and ESIB, the JoIn Hospitality stakeholders, the Arc-en-Ciel team and participants, the JAWS participant and everyone who supported, tested and evaluated the platform. Thank you for your time and attention. After this presentation, we will show the short validation videos and then continue with questions and the live demonstration.
