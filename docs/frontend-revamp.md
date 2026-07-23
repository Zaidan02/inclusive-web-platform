# Frontend Revamp Documentation

## Scope and constraints

This document records the frontend redesign and the decisions that should remain easy to revisit.

- Frontend work is contained in `frontend/`.
- Backend routes, request payloads, database behavior, and business logic must not be changed without explicit permission.
- The established blue, slate, white, and green color palette remains the visual foundation.
- Pages should use the full viewport and remain responsive.
- UI, API access, authentication utilities, and role-specific behavior should be separated into focused modules.

## Completed changes

### Global presentation

- Removed the fixed-width root container that boxed the application into a centered 1126px column.
- Added shared colors, typography, shadows, focus states, and full-viewport foundations in `frontend/src/index.css`.
- Added shared dashboard presentation rules in `frontend/src/styles/dashboard.css`.

### Landing page

- Replaced the original welcome card with a complete scrolling landing page.
- Added a full-screen hero and top navigation.
- Added purpose, platform principles, process, candidate, and employer sections.
- Added separate Candidate and Employer calls to action.
- Added a complete footer.
- Added responsive layouts for desktop, tablet, and mobile screens.
- Added a public `/employers` placeholder so the public employer journey is clearly separated from the protected `/employer` dashboard.

### Shared components

- `frontend/src/components/common/Brand.jsx`
- `frontend/src/components/common/ArrowIcon.jsx`
- `frontend/src/components/layout/SiteHeader.jsx`
- `frontend/src/components/layout/SiteFooter.jsx`
- `frontend/src/components/auth/RoleRoute.jsx`

### Authentication and routing

- Added shared JWT parsing and token storage in `frontend/src/services/tokenService.js`.
- Added role-aware frontend routes for candidate, employer, and admin dashboards.
- Added role-specific signup links through the `role` query parameter.
- Candidate and employer landing-page actions preselect the appropriate account type.

### API organization

Role-specific API entry points were added without changing backend endpoints or payloads:

- `frontend/src/services/authApi.js`
- `frontend/src/services/candidateApi.js`
- `frontend/src/services/employerApi.js`
- `frontend/src/services/adminApi.js`

### Local API address

The frontend fallback backend address is `http://127.0.0.1:8081`, matching the current Docker port. Environment variables can still override it.

## Candidate onboarding flow

The disability selection interface is placed behind the candidate profile experience.

1. The candidate signs in.
2. The frontend requests `GET /api/candidate/profile`.
3. An incomplete profile redirects the candidate to a dedicated profile-setup screen.
4. The candidate completes and saves the required profile information.
5. The candidate then enters the normal dashboard.
6. Returning candidates with complete profiles enter the dashboard directly.
7. The My Profile area allows candidates to review and edit the same information later.

### Profile completion rule — intentionally changeable

The initial completion rule is expected to be:

```js
export const isCandidateProfileComplete = (profile) =>
  Array.isArray(profile?.selectedDisabilities) &&
  profile.selectedDisabilities.length > 0;
```

This rule is intentionally documented and should be kept in one frontend utility rather than repeated across pages. It may change when more required candidate fields are added.

Current location:

```text
frontend/src/features/candidate/profile/profileCompletion.js
```

Changing this rule should not require changing the backend or candidate routing components.

The setup screen is implemented at:

```text
frontend/src/features/candidate/profile/CandidateProfileSetup.jsx
```

The protected route is `/candidate/setup`. The regular `/candidate` dashboard loads the profile and redirects to setup when the centralized completion rule returns `false`.

## Candidate navigation after onboarding

- Jobs
- My Applications

The disability selector no longer appears as a primary dashboard tab. Completed candidates land on Jobs. Clicking the profile avatar in the candidate header opens My Profile, where the candidate can review and edit disability information. AI Job Match and its compatibility results are displayed in Jobs above the available opportunities.

## Verification

Use the following from `frontend/`:

```powershell
npm.cmd run build
npx.cmd eslint src
```

The production build currently succeeds. Existing hook-dependency warnings in the candidate and admin dashboards are tracked separately from the redesign.

## Current implementation update — July 2026

This section extends the original revamp notes above. It records the backend, database, fixture, catalogue, and later UX work completed after the initial frontend redesign. Earlier sections are retained as historical context; where an earlier statement conflicts with this section, this section describes the current implementation.

### Product direction

- The platform now uses an administrator-controlled job catalogue.
- Employers cannot create arbitrary job titles in the current version. They advertise positions selected from the catalogue maintained by the platform.
- Candidate-to-job evaluation is planned as a deterministic mathematical scoring engine, not a machine-learning or generative-AI feature.
- Scoring work is deliberately paused until the core platform and performance work are complete.
- The previous runtime AI matching integration and legacy serialized model files were removed from the active application.

### Accounts, roles, and authentication

- The fixture loader creates one verified account for each current role: administrator, employer, and candidate.
- Every fixture account uses the local development password `Pass123!@#`.
- The fixture accounts are:

```text
admin@join.local
employer@join.local
candidate@join.local
```

- All three accounts have `isVerified = true` and are not archived.
- Successful administrator login is routed to the administrator panel.
- Login and JWT user providers are now separated correctly: login resolves an email address, while an issued JWT resolves the username claim used by the current token structure.

### Database reset and fixture catalogue

The fixture command intentionally purges local application data before loading the known development state:

```powershell
cd backend
docker compose exec php php bin/console doctrine:fixtures:load --no-interaction --env=dev --no-debug
```

The fixture loader now creates:

- Three verified role accounts.
- A complete generic employer/company profile.
- The normalized disability catalogue.
- The known job definitions.
- The tasks belonging to each job definition.
- Disability-specific task assessments imported into the generated catalogue data.

The generic employer profile contains:

```text
Company:  JoIn Hospitality Demo
Industry: Food and Beverage
Location: Beirut, Lebanon
Website:  https://example.com
```

It also contains a company description and accessibility statement, so resetting fixtures no longer forces the company form to be completed again.

### Normalized job and disability model

The old single-field/legacy task representation is no longer the active model. The catalogue is normalized so tasks and assessments can be queried, maintained, and scored without extracting text from a job record at runtime.

The new model includes:

- `disability` for the supported disability categories.
- `job_definition` for administrator-controlled job positions.
- `job_definition_task` for the individual tasks belonging to a job definition.
- `disability_task_assessment` for disability-specific feasibility information associated with a task.
- `job_post_highlighted_task` for the subset of catalogue tasks an employer wants to emphasize in an advertisement.
- Updated candidate profiles with normalized disability relationships, education level, and basic personal information.
- Updated job posts linked to their catalogue job definition.

Each schema concern was introduced through its own Doctrine migration file rather than combining the entire redesign into one migration.

### Dataset handling

- The job-description spreadsheets were inspected as source datasets for the catalogue design.
- Non-English worksheet content is ignored for the current import scope.
- The spreadsheet extraction process was designed to be reusable across datasets that follow the supported structure.
- Extracted catalogue data is stored in `backend/data/job_catalogue.json` for deterministic fixture loading.
- Source job-description dataset folders are ignored by Git so raw spreadsheet files are not committed accidentally.
- The administrator interface includes an Add Data Sheets action as a visual placeholder. Upload/import behavior is intentionally not connected yet.

### Employer job-posting experience

- Employers choose a position from the administrator-controlled job catalogue.
- Selecting a position makes its catalogue tasks available to the posting form.
- Employers can select highlighted tasks using a searchable, keyboard-accessible control.
- Highlighted tasks are saved separately from the complete catalogue task list.
- The public/candidate job card remains concise: candidates see the job title, description, company information, location, and relevant advertisement details without being shown the complete source dataset.
- Company information is resolved from the employer profile instead of requiring the employer to type the company name into every job advertisement.
- Employers must complete a company name before posting a job.

### Candidate profile and experience

Candidate profiles now support the basic information needed for a realistic platform experience:

- First name
- Last name
- Phone number
- Location
- About/biography
- Education level
- Selected disabilities

The candidate setup and profile screens were updated around these fields. Profile completion is no longer based only on selecting at least one disability; the centralized completion utility accounts for the required profile information. Candidate job and application views were also refined to present company and job information more clearly.

### Employer profile experience

Employer profiles support:

- Company name
- Industry
- Location
- Website
- Company description
- Accessibility statement
- Company logo upload

Company profile information is reused across job advertisements. Both employer and candidate views were adjusted so company context is presented consistently without duplicating data-entry work.

### Performance work

The primary local performance bottleneck was Symfony repeatedly reading dependency and cache files through the Windows-to-Docker bind mount while running with development debugging enabled.

The PHP development stack now uses:

- `APP_ENV=prod` and `APP_DEBUG=0` in Docker Compose.
- A Docker named volume for `/app/vendor`.
- A Docker named volume for `/app/var` and the Symfony cache.
- Composer dependencies installed into the PHP image with an optimized autoloader.
- PHP OPcache with a larger script cache.
- A warmed Symfony production cache owned by the Apache user.

Measured locally against `GET /api/job-definitions`:

```text
Before: approximately 4.4–6.5 seconds per request
After:  approximately 41–61 milliseconds for warm requests
```

The first Docker image build remains slower because PHP extensions and OPcache must be compiled once. Normal container starts and API requests are fast afterward.

After changing Symfony configuration, clear the production cache with:

```powershell
cd backend
docker compose exec --user www-data php php bin/console cache:clear --env=prod --no-debug
```

After changing Composer dependencies, synchronize the named dependency volume with:

```powershell
cd backend
docker compose exec php composer install --optimize-autoloader
```

### Current verification state

The following checks passed after the performance and fixture update:

- Docker PHP and PostgreSQL services start successfully.
- PostgreSQL reports healthy.
- PHP OPcache reports enabled.
- Doctrine fixture loading completes successfully.
- Doctrine entity mapping validation succeeds.
- Employer login succeeds with the fixture credentials.
- The authenticated employer profile returns all seeded company data.
- `GET /api/job-definitions` returns HTTP 200 at the improved response time.
- The Vite production frontend build succeeds.

### Deferred work

- The deterministic candidate/job scoring engine remains paused.
- Employer-provided assistance or accommodation capacity must be incorporated into the future scoring design because support can change whether a task is feasible.
- The Add Data Sheets administrator action still needs its upload, validation, preview, and import workflow.

## Scoring engine integration update

The deterministic Python scoring engine is now active end to end.

- The engine is isolated in `scoring_engine/` with separate domain models, policy, task resolver, calculation engine, serialization, HTTP adapter, example, and unit tests.
- Docker Compose starts the scoring service on port `5001` and waits for its health check before starting PHP.
- Symfony exposes `GET /api/candidate/matches`, loads authoritative profile and catalogue data from PostgreSQL, and sends normalized input to the Python `POST /score` endpoint.
- React requests the Symfony match endpoint and displays eligibility, percentage, company, accommodation availability, summary, and task-level explanations.
- The previous browser-side keyword heuristics and machine-learning claims are no longer used to calculate displayed results.
- Eleven Python business-rule tests pass.

The fixture state now contains exactly one candidate, four employer/company accounts, and six published offers. The six offers cover every combination of the three catalogue jobs with the proof-of-concept assistance checkbox disabled and enabled.

All fixture accounts continue to use `Pass123!@#`. Additional employer accounts are:

```text
cedar.sweets@join.local
north.scoop@join.local
artisan.bakery@join.local
```

## Matching proof-of-concept completion update

This update supersedes the earlier deferred-work note stating that the scoring engine was paused. That note is retained above as part of the project's chronological history; the deterministic scoring engine has since been implemented, integrated, tested, documented, and exposed to candidates.

### Scoring behavior completed

- Candidate/job matching now uses the saved candidate education level and selected disabilities together with the administrator-controlled job catalogue, job tasks, disability/task assessments, task weights, mandatory flags, highlighted employer tasks, and employer-provided accommodation flag.
- Education and mandatory-task requirements act as hard eligibility gates. An excluded offer returns `score = null`; it is not represented as a zero-percent compatible offer.
- When several disabilities are selected, the most restrictive applicable task assessment wins.
- A missing disability/task assessment follows the documented proof-of-concept fallback policy.
- Employer accommodation can transform a `needs_help` task into assisted feasibility. An explicit `avoid` assessment remains an avoid assessment.
- Task points are calculated deterministically from adjusted task weight and effective feasibility. Highlighting changes a task's importance rather than directly adding arbitrary percentage points.
- Eligible offers are ordered by descending score, with deterministic tie handling. Excluded offers appear after eligible offers.
- The engine has no training, probabilistic inference, generative-AI decision, or browser-side authoritative calculation. Identical persisted inputs and policy produce identical results.

The complete equations, validation rules, request and response contracts, runtime call sequence, decisions, limitations, test coverage, and worked examples are documented in `docs/scoring-engine-technical-specification.md`.

### Candidate matching and application flow

- The candidate dashboard calls the authenticated Symfony matching endpoint, which assembles authoritative database data and calls the isolated Python scoring service.
- Results show the calculated percentage, eligibility, company, accommodation availability, a short summary, and an expandable task-level explanation.
- The former `BEST MATCH` label was removed because it confused relative rank with absolute compatibility.
- The first eligible result is now labelled `HIGHEST-RANKED OFFER`, meaning only that it scored above the other currently returned offers.
- Every result also receives an absolute presentation band: Strong (`80–100`), Moderate (`60–<80`), Limited (`40–<60`), Low (`0–<40`), or Not eligible (`null`). These bands do not change the engine's mathematics or eligibility rules.
- A highest-ranked offer can still have limited or low compatibility. For example, `55.87%` can rank first while still meaning that approximately `44.13%` of adjusted task weight was not earned under the current policy.
- Candidate results now include a `View job & apply` action. It resolves the engine's exact `job_id` against the published job collection and opens that job's existing details and application view.
- Opening a match does not automatically submit an application. The candidate still reviews the complete advertisement, attaches the required documents, and deliberately submits.
- If a returned job is no longer available in the published collection, the interface reports the problem instead of opening a different job with a similar title.

### Scoring interpretation and calibration decision

The current percentages are intentionally not reduced merely because values around 50–60% may look subjectively high. The number represents the proportion of adjusted task weight earned under the current catalogue and policy; it is not an academic grade, a probability of hiring, or a guarantee of job success.

Future changes to scoring should be evidence-driven. The next calibration stage should create expert-reviewed candidate/job benchmark cases with expected eligibility and compatibility outcomes, then evaluate task weights, mandatory flags, highlighted-task importance, accommodation behavior, missing-assessment handling, and presentation thresholds against those cases. Cosmetic manipulation of the final percentage would make the engine less transparent.

### Verification

- The scoring service health check and Symfony integration operate through Docker Compose.
- The Python scoring-engine unit test suite passes.
- The candidate matching endpoint returns ranked, explained offer results.
- Fixture data covers three catalogue job definitions with accommodation disabled and enabled across six published offers.
- Match-result navigation uses the unique returned job identifier.
- The Vite production frontend build passes after the candidate result-label and application-navigation update.

### Work intentionally left for later

- Replace the proof-of-concept accommodation checkbox with structured accommodation types and, if domain review requires it, task-specific support capabilities.
- Build the administrator spreadsheet upload, validation, preview, error-reporting, and transactional import workflow behind the existing placeholder action.
- Expand and professionally validate the job catalogue and disability/task assessment data.
- Calibrate the scoring policy using expert-reviewed benchmark cases rather than subjective percentage expectations.
- Add production monitoring, security review, broader integration/end-to-end coverage, and deployment hardening.
- Design and implement the separate voice-only navigation accessibility workstream.

## Employer importance-selection expansion

- The former limit of 10 highlighted tasks per job post was removed.
- Employers must still select at least one important task, but may now select any number up to all tasks in the selected administrator-controlled job definition.
- The backend continues to reject unknown tasks and tasks belonging to a different job definition.
- The employer interface explains that selecting a task increases its scoring importance, displays the selected count against the complete catalogue count, and provides Select all and Clear selection actions.
- The task picker no longer hides catalogue tasks after the first 40 results.
- Fixtures now create 24 published offers: each of the three job definitions has variants with 10, 20, 30, and 50 important tasks, both with and without accommodation.
- This fixture matrix makes the effect of employer-declared importance visible without asking the engine to guess importance from task wording or spreadsheet position.

## Voice-navigation foundation

- Added an isolated `backend/voice_navigation` service with separate transcription, intent interpretation, deterministic registry routing, multilingual feedback, speech generation, orchestration, and HTTP layers.
- Added request-based OpenAI speech-to-text for bounded microphone utterances and optional OpenAI text-to-speech output.
- Added a trusted versioned command registry. The model proposes canonical commands, while ordinary code validates targets and resolves trusted React paths.
- Added generic navigation, section reading, back, help, repeat, stop, and unknown commands as the initial unrestricted proof-of-concept capability set.
- Added a global React voice-navigation control that appears on every route.
- Activating voice mode requests microphone permission, records a turn, detects silence, sends audio for processing, executes only an authorized action, speaks feedback, and resumes listening.
- Deactivating voice mode immediately stops recording, microphone tracks, generated audio, browser speech, and monitoring.
- Added visible listening, processing, speaking, error, transcript, and AI-voice disclosure states.
- The OpenAI key is loaded from `backend/voice_navigation/.env`, which is excluded from Git and the Docker image.
- The service runs through Docker Compose on port `5002` under Gunicorn.
- Deterministic registry tests, frontend production build, authenticated text interpretation, OpenAI TTS, OpenAI transcription, and the complete audio-to-route round trip pass.

## Voice-navigation interaction and safety update

This section appends to and supersedes only the incomplete command details in the earlier voice-navigation foundation entry. The earlier entry is retained to preserve the chronological record.

- Added an explicit English/Arabic spoken-language selector after real-device testing showed that automatic language detection could classify accented English incorrectly.
- The selected language is sent with every bounded audio turn and supplied directly to the transcription API.
- Retained `whisper-1` as the configurable default transcription model after it correctly recovered a real target-machine WebM login command with the domain vocabulary prompt.
- Added playback, size, duration, and download controls for the exact most recently uploaded browser recording so microphone and transcription problems can be distinguished.
- Added browser and backend pipeline diagnostics for the recording, transcript, intent proposal, registry decision, and feedback.
- Replaced the ambiguous original stop behavior with separate canonical commands for stopping speech, pausing listening, cancelling a request, and completely disabling voice navigation.
- Added visible `Cancel`, `Stop talking`, and `Resume` controls during the relevant frontend states.
- Paused mode releases the recorder, microphone tracks, analyser, and audio context. Resume is intentionally a visible button because a genuinely stopped microphone cannot also hear a resume phrase.
- The ordinary recorder remains stopped during processing and generated speech. Reliable spoken barge-in during speech is deferred because it requires a separate interruption channel and echo-handling strategy.
- Added a public `/voice-help` mini tutorial containing standard phrases, natural alternatives, interaction steps, clarification behavior, and honest proof-of-concept limitations.
- Expanded interpretation so ordinary synonyms resolve to canonical targets. For example, `landing page`, `main page`, `homepage`, `start page`, and `front page` resolve to `home`; sign-in/login and registration/signup wording are also normalized.
- Added `CLARIFY` as a schema-constrained interpretation outcome for requests that are valid but have several plausible registered destinations.
- Clarification may contain no more than three choices, and every choice must be revalidated against the current deterministic registry context.
- Added six-turn structured browser-memory context so a user can answer a current clarification with phrases such as `the first one`, `login`, `no`, or `never mind`.
- The temporary history is sanitized and bounded again by the backend, is not saved to PostgreSQL or local storage, is cleared when voice mode is disabled, and disappears on full reload.
- A bare confirmation such as `yes` is rejected when no pending clarification anchors its meaning.
- The OpenAI-backed components remain interpretation adapters rather than execution authorities. The model cannot invent a URL, React path, selector, target, or action that bypasses the trusted registry.
- Registry version 3 now covers canonical navigation, section reading, history back, help, repeat, stop speaking, pause listening, cancel, disable voice, clarification, and unknown outcomes.
- Nine deterministic registry tests pass, including rejection of invented navigation and clarification targets.
- Live checks confirm that `Can you go to the landing page?` resolves to authorized `home`, an ambiguous account-page request produces login/signup clarification, `the first one` resolves the pending choice to `/signin`, and an unanchored `yes` is rejected.
- The frontend production build passes after the state controls, language selection, short-term memory, and tutorial route were added.

The complete current architecture, state machine, audio capture mathematics, transcription and interpretation behavior, canonical commands, clarification protocol, API contracts, security boundaries, privacy behavior, tests, limitations, and future calibration plan are documented in `docs/voice-navigation-technical-specification.md`.

## Voice classifier and navigation-specialist refactor

- Refactored the Python service into `api`, `audio`, `classification`, `core`, `orchestration`, and `specialists/navigation` packages while preserving the existing HTTP endpoints and Docker entry point.
- Added a schema-constrained three-way classifier: `NAVIGATION`, `WEBSITE_QUESTION`, or `ACTION`.
- Classification determines request type only. It does not judge whether a request is logical, supported, authorized, safe, or executable.
- Added a deterministic orchestrator that dispatches only navigation to the implemented navigation specialist.
- Questions and actions are recognized but return `specialist_unavailable` until their specialists are implemented, preventing them from falling through into navigation.
- Expanded the navigation registry to version 4 with every current React route and distinct frontend contexts for each route.
- Added readable root markers to candidate, candidate-setup, employer, and admin screens.
- Protected destinations still rely on the existing React role guards and Symfony API authentication/authorization. No parallel voice JWT system was introduced.
- Browser diagnostics now show classification before the navigation proposal and registry result.
- Fourteen deterministic tests pass: eleven navigation-registry tests and three orchestrator dispatch-isolation tests.
- Live category checks and the saved real-browser audio-to-login round trip pass after the refactor.

## Candidate voice-navigation internal views

- Corrected the assumption that one React URL always represents one visible destination.
- `/candidate` contains Jobs, Applications, and Profile views controlled by component state, so navigating to the same URL could previously report success without changing the screen.
- Navigation registry version 5 now separates `candidate_dashboard`, `candidate_jobs`, `candidate_applications`, and `candidate_profile`.
- These destinations return a trusted `route_and_tab` action containing `/candidate` and one fixed tab identifier: `JOBS`, `APPLICATIONS`, or `PROFILE`.
- `CandidateDashboard` accepts only those declared tab values from React Router navigation state and clears selected job details when returning to Jobs.
- Live model checks confirm that candidate dashboard, applications, and profile requests resolve to the intended distinct views.
- Sixteen deterministic voice tests pass after the change.

## Employer and administrator voice-navigation internal views

- Expanded the route-plus-tab correction to every current Employer and Administrator dashboard tab.
- Employer targets now distinguish Post a Job, My Jobs, Applications, and Company Profile under `/employer`.
- Administrator targets now distinguish Users, Archived Users, Applications, and Candidate Profiles under `/admin`.
- Voice navigation changes only the active tab through trusted React Router state. Existing mouse navigation, forms, drafts, default tabs, route guards, and Symfony behavior are unchanged.
- Employer tab navigation does not clear a partially completed or edited job form.
- Navigation registry version 6 contains fixed internal tab identifiers for all three role dashboards.
- Twenty deterministic tests and representative live model phrases pass.
