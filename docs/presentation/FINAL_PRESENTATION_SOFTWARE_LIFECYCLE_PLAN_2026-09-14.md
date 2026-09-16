# Final Presentation - Software Engineering Lifecycle Plan

## Academic framing

The presentation uses the course chapters as an evidence structure, not as a claim that the project followed a strict sequential waterfall process. JoIn Hospitality used evolutionary prototyping and iterative increments. Within each increment, needs, specifications, design decisions and tests were linked through V-model-style traceability.

| Lifecycle phase | Course principle applied | JoIn Hospitality evidence | Slides |
|---|---|---|---:|
| Business context | Establish the problem, stakeholders and urgency before proposing a technical solution. | Global context, recruitment barrier, Phase I evolution and solution gap. | 2-4 |
| Software lifecycle | Select a development model appropriate to uncertainty and change. | Iterative increments, evolutionary prototype and requirement-to-test traceability. | 5 |
| Expression des besoins | Distinguish user wishes from justified needs; gather from people, documents and observation. | Candidates, employers, verifier/admin roles, Phase I artefacts, WCAG research, hospitality catalogue, prototypes, Arc en Ciel and JAWS feedback. | 6-7 |
| Specifications du logiciel | Specify what the system must do and how well it must do it; make requirements verifiable and traceable. | Role-based FR, measurable NFR, WCAG 2.1 AA target and traceability examples. | 8-11 |
| Conception du logiciel | Transform what into how through data, architecture, interfaces and algorithms. | Layered architecture, trust boundaries, design patterns, deterministic scoring and security/privacy design. | 12-14 |
| La programmation | Implement cohesive components; manage integration, configuration, refactoring and regression safety. | React/Vite, Symfony/Doctrine, Python services, PostgreSQL, object storage, Docker, render.yaml, migrations and adapters. | 15-22 |
| Tests et mise au point | Use expected oracles, complementary static/dynamic levels, non-regression and honest defect reporting. | Local suites, 310-case staging register, automated/manual evidence, defect register, human validation and latency measurements. | 23-28 |
| Estimation du cout | Estimate effort, infrastructure, software and providers; use more than one method and explicit scenarios. | Bottom-up subsystem view, analogous-deployment cross-check, usage scenarios, AI quotas, model routing and maintenance categories. | 29 |
| Documentation | Produce reviewable artefacts across the entire lifecycle. | Final report, FR/NFR, architecture, deployment configuration, migrations, test workbook, JSON/PNG evidence and operations guidance. | 30 |
| Conclusion | Evaluate delivery against requirements, evidence, limitations and the next evolution cycle. | Deployed prototype, 93.2 percent final staging rate, human validation, open defects and controlled future work. | 31-32 |

## Course-source mapping

- `MonChap1_IntroAuGenieLogiciel2526.pdf`: lifecycle activities, artefacts and verification/validation purpose.
- `MonChap2_ActiviteEtModelededeveloppementdulog2526.pdf`: evolutionary prototyping, iterative development and V-model traceability.
- `MonChap3_ExpressionsDesBesoinsEtTechniquesDeSpecification_2526.pdf`: stakeholders, elicitation methods, FR/NFR, SRS quality and measurable requirements.
- `MonChap4_ConceptionApplication_Classes_2526.pdf`: architecture, data/interface/algorithm design, cohesion, coupling and responsibility assignment.
- `MonChap5_Refactoring_2324.pdf`: behaviour-preserving refactoring and regression testing.
- `MonChap6_MesuresEtMetriques_2526.pdf`: objective, measurement method, execution, reference and interpretation.
- `MonChap7_TestLogiciel_2324.pdf`: oracle-based cases, test campaigns, static/dynamic testing, test levels and non-regression.
- `MonChap8_EstimationCout.pdf`: human effort, infrastructure, providers, bottom-up/analogy/expert estimates and maintenance categories.

## Important academic distinctions

- Requirements state what and how well; design and implementation explain how.
- Verification is conformance to the specification; validation is suitability for users and context.
- Testing exposes defects and reduces risk; it cannot prove the absence of every defect.
- Measurements are meaningful only when their objective, method and comparison reference are stated.
- WCAG evidence supports a Level AA target; it is not equivalent to independent certification.
- Cost is not limited to OpenAI usage. It includes engineering effort, compute, database, storage, email, monitoring, accessibility, security and maintenance.

