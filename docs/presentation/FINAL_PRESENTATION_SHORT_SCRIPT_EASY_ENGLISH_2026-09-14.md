# JoIn Hospitality — Short Final Presentation Script

Easy English. Planned speaking time: about 11–13 minutes, depending on pace, leaving time for pauses and short explanations. The live demo remains 5 minutes.

## Zaidan — Slides 1 to 17

### Slide 1 — Title — 0:25

“Good morning. We are Zaidan Mansour and Charbel Rizk. Our final-year project focuses on developing the software part of JoIn Hospitality. We signed a non-disclosure agreement, or NDA, for this work. Therefore, confidential business details, personal data and protected information are not shown. Today, we will present the software we designed, implemented and tested.”

### Slide 2 — Overview — 0:10

“We will follow the software lifecycle, from the problem and requirements to design, implementation, testing, cost and conclusion. We will finish with a live demo.”

### Slide 3 — Business need — 0:25

“Persons with disabilities still face major employment barriers. Around 1.3 billion people experience significant disability, and their participation in work is lower. Our platform does not create jobs, but it brings candidates closer to accessible recruitment and suitable employers.”

### Slide 4 — Background research — 0:20

“Older approaches focused on a person’s limitations. Modern approaches focus on removing barriers. Job portals improved access, but they often remain generic. AI can help, but it can also create privacy, bias and transparency risks.”

### Slide 5 — Research gap — 0:25

“Current solutions cover only parts of the problem. Our contribution is one accessible workflow that connects candidate abilities, hospitality tasks, employer support, explainable matching and human decisions.”

### Slide 6 — Software lifecycle — 0:30

“We followed the main software-engineering stages: needs, specification, design, programming, testing, documentation, deployment and maintenance. Our development was iterative. Inside every iteration, we linked requirements to design and tests, following V-model-style traceability.”

### Slide 7 — Requirements elicitation — 0:20

“We collected needs from candidates, employers, verifiers, administrators and supervisors. We also studied Phase One documents, WCAG, hospitality tasks and security needs. Prototypes and real-user feedback helped us improve the requirements.”

### Slide 8 — Engineering objectives — 0:20

“The staging platform supports four protected roles and three languages. It includes 15 positions, 923 tasks, 14,453 task assessments and 74 published opportunities.”

### Slide 9 — SRS and traceability — 0:30

“The SRS defines what the software must do and how well it must work. Each important requirement is linked to a design choice and a test. For example, deterministic matching was checked with 45 expected decisions, and all 45 passed.”

### Slide 10 — Functional requirements — 0:20

“Candidates build profiles, view matches and apply. Employers publish jobs or training offers. Verifiers review private evidence, and administrators manage users and catalogues. Symfony protects every role and action.”

### Slide 11 — Non-functional requirements — 0:20

“Our main quality requirements are accessibility, security, privacy, performance, reliability, maintainability, multilingual support and explainability. These requirements were tested with measurable targets.”

### Slide 12 — WCAG 2.1 Level AA — 0:30

“WCAG has four principles: perceivable, operable, understandable and robust. We implemented labels, keyboard access, visible focus, clear errors, reduced motion, semantic controls and screen-reader feedback. Level AA is our target, but we do not claim official certification.”

### Slide 13 — Architecture — 0:40

“React and Vite provide the user interface. Protected requests go to Symfony, which manages security, validation, workflows, the database and file storage. Symfony calls the deterministic scoring service and the protected profile service. React can call the voice service for transcription and navigation. Only the voice and profile service calls OpenAI. The scoring service does not use AI.”

### Slide 14 — Design patterns — 0:20

“We used layered MVC, controller-service-repository, adapters, scoring strategies and a voice-command registry. These patterns separate responsibilities, reduce coupling and make changes easier to test.”

### Slide 15 — Security design — 0:30

“JWT and role-based access protect the workspaces. Sensitive documents stay private, while only employer logos are public. AI processing requires consent, and suggestions are never saved without confirmation. The security result was 19 out of 20 because one oversized-upload issue remains open.”

### Slide 16 — Implementation quality — 0:15

“The implementation separates React, Symfony, Doctrine and the Python services. Secrets remain outside the code, and regression tests protected existing behaviour during refactoring.”

### Slide 17 — Deployment — 0:20

“Render hosts the frontend and three backend services. Supabase provides PostgreSQL and separate file-storage areas. Docker and render.yaml make the staging deployment repeatable.”

Handover: “Charbel will now present the main workflows, testing, cost and final results.”

## Charbel — Slides 18 to 33

### Slide 18 — AI-assisted profile — 0:25

“The candidate can type or speak in English, French or Arabic. The transcript can be corrected before processing. AI requires consent, and every suggestion can be accepted, changed or rejected before saving.”

### Slide 19 — AI evidence — 0:15

“We tested 60 multilingual profile cases. Fifty-three passed, while seven showed an extraction weakness. No unconfirmed suggestion was saved automatically.”

### Slide 20 — Voice interaction — 0:30

“Voice input is transcribed and changed into a known command. The system checks the user’s page and role before running it. Results were strong in quiet conditions. Noise and long values, such as email addresses, can require repetition or manual correction.”

### Slide 21 — Matching — 0:30

“Matching is deterministic, not controlled by AI. It compares task feasibility, available assistance, important tasks, education and practical abilities. Unsafe mandatory tasks remain clear eligibility rules. All 45 matching cases passed.”

### Slide 22 — Employer workflow — 0:20

“Employers choose a job or training program and select a controlled hospitality role. They then define requirements, important tasks and available assistance before publishing.”

### Slide 23 — Integrated workflow — 0:20

“The candidate sees an explained match and chooses whether to apply. The employer makes the final human decision. Application status changes are recorded for audit.”

### Slide 24 — Verification and validation — 0:30

“Verification checks that the software follows its specification. Validation checks that it is useful for real users. We used service tests, API checks, browser tests, the 310-case staging register and real-user evaluation.”

### Slide 25 — Final test result — 0:35

“All 310 planned cases were completed. The final result was 289 passes and 21 retained failures, giving 93.2 percent. Fifteen voice cases were partial in noisy conditions, but passed after repetition or manual correction. We kept every failure visible.”

### Slide 26 — Results by area — 0:25

“Seven areas reached 100 percent. Security reached 95 percent, and AI suggestions reached 88.3 percent. Performance was lower because free-tier latency targets were not always met.”

### Slide 27 — Debugging — 0:25

“Testing found useful problems: AI preference extraction, contrast, zoom reflow, oversized uploads, voice noise and slow write operations. These findings are documented for correction and regression testing.”

### Slide 28 — User validation — 0:30

“Twenty persons with disabilities tested the platform at Arc en Ciel. In a separate test, Noelle Marie Gabrielle used JAWS on her adapted device and completed the main workflow. The feedback was positive, but we do not claim universal accessibility.”

### Slide 29 — Cost control — 0:35

“Hosting, database and storage create fixed costs. Transcription and AI create variable costs. We can control them with daily quotas, request limits, cheaper models and budget alerts. Later, we will improve database queries, add selective safe caching and evaluate self-hosted options. The essential platform still works without paid AI.”

### Slide 30 — Documentation — 0:15

“We documented requirements, architecture, implementation, deployment, testing and known limits. This supports maintenance, traceability and future development.”

### Slide 31 — Future work — 0:25

“First, we will correct the remaining accessibility, AI and upload issues. Next, we will improve monitoring, performance and cost control. Later, we can add a verified-knowledge chatbot and human-controlled interview assistance.”

### Slide 32 — Conclusion — 0:25

“JoIn is more than a small website. It combines accessible multilingual workflows, protected roles, explainable matching, optional AI, cloud staging and measured testing. The results show technical feasibility and real value, while the remaining limits are clearly documented.”

Transition: “We will now show the main workflow in a five-minute demonstration.”

### Slide 33 — Questions — after the demo

“Thank you. We are ready for your questions.”

## Very short demo plan — 5 minutes

### Zaidan — first 2:30

1. Open the candidate profile and language selector.
2. Show editable text, consent and reviewable AI suggestions.
3. Show one match with its task explanation.
4. Show the application action.

Say: “The candidate stays in control. AI is optional, matching is deterministic, and every result is explained.”

### Charbel — final 2:30

1. Show an employer offer with requirements, tasks and assistance.
2. Show application review or a prepared status result.
3. Show verifier or administrator role separation.
4. Show Arabic RTL and deployment evidence.

Say: “The employer makes the human decision, protected roles control sensitive actions, and the complete system is deployed in staging.”

If OpenAI credit is unavailable, use the saved AI screenshots. Do not spend demo time waiting for an external service.
