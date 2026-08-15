# JoIn Inclusive Employment Platform

JoIn is a Final Year Project focused on accessible, task-based employment for people with disabilities. It provides separate candidate, employer, and administrator experiences, deterministic candidate-job compatibility scoring, keyboard and voice access, and an optional AI-assisted candidate profile workflow.

## Current capabilities

- Candidate registration with mandatory private disability-card review, email verification, profile management, job browsing, matching, and applications.
- Employer company profiles, catalogue-backed job publishing, and application management.
- Administrator user, application, and job-catalogue management.
- Authorized verifier dashboard for reviewing and deciding candidate eligibility requests.
- Job definitions decomposed into controlled tasks imported from the project workbooks.
- Transparent deterministic compatibility scoring using education, selected disabilities, task feasibility, task importance, mandatory tasks, and assistance availability.
- Keyboard navigation in addition to mouse interaction.
- Voice navigation, website questions, form actions, and generated spoken feedback.
- AI-assisted profile building in English, French, and Arabic with editable transcripts, explicit consent, evidence, confidence, and per-suggestion confirmation.
- Versioned privacy consent, private document storage, audited verifier access, scheduled card-retention cleanup, candidate data export, consent withdrawal, and account deletion.

## Architecture

```text
React + Vite :5173
    |
    +--> Symfony API :8081 --> PostgreSQL
    |                         |
    |                         +--> deterministic scoring service :5001
    |
    +--> voice/profile AI service :5002 --> OpenAI APIs
```

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router |
| Backend | PHP 8.4, Symfony 8, Doctrine ORM, JWT |
| Database | PostgreSQL 16 |
| Matching | Python 3.12 deterministic scoring service |
| Voice/profile assistance | Flask, Pydantic structured outputs, OpenAI transcription and generation |
| Local runtime | Docker Compose plus a host Vite server |

The scoring engine is not machine learning or generative AI. Identical scoring inputs produce identical results. The generative AI service assists interaction and profile extraction but does not calculate or modify compatibility scores.

## Quick start on Windows

### Requirements

- Docker Desktop
- Node.js and npm
- Git

PHP, Composer, PostgreSQL, and Python are containerized for normal local use.

### 1. Create local environment files

From the repository root:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item backend\voice_navigation\.env.example backend\voice_navigation\.env
Copy-Item frontend\.env.example frontend\.env.local
```

Set `OPENAI_API_KEY` in `backend/voice_navigation/.env`.

Generate one strong random value and use it as `PROFILE_AI_TOKEN` in `backend/.env`. Use the same value in `backend/voice_navigation/.env` when running the Python service outside Compose. Never commit either local `.env` file.

### 2. Start backend services

From the repository root:

```powershell
cd backend
docker compose up -d --build
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
docker compose ps
```

If your prompt already ends in `\backend>`, run `docker compose ...` directly. Do not use `-f backend/compose.yaml` from inside `backend`, because that resolves to the nonexistent `backend\backend\compose.yaml`.

### 3. Start the frontend

In a second PowerShell window, from the repository root:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open http://127.0.0.1:5173.

## Service addresses

| Service | URL |
|---|---|
| Frontend | http://127.0.0.1:5173 |
| Symfony API | http://127.0.0.1:8081/api |
| Scoring health | http://127.0.0.1:5001/health |
| Voice/profile AI health | http://127.0.0.1:5002/health |

## AI-assisted profile workflow

Candidates can type or record a description in English, French, or Arabic. Audio is transcribed into editable text. Analysis requires explicit consent and produces unsaved suggestions only.

The candidate must individually accept profile fields, education, explicit disability statements, and catalogue-backed task skills. Symfony validates every accepted item before persistence. The application records privacy-safe consent and outcome events without storing audio or narrative text in the audit log.

Confirmed task skills enrich the profile but are deliberately excluded from the current scoring payload. See [AI profile workflow](docs/AI_PROFILE_WORKFLOW.md).

## Candidate eligibility verification

New candidate registration requires a PDF, JPEG, or PNG disability card no larger than 5 MB. The card is MIME-validated, assigned a random server filename, and stored under Symfony's private `var` directory rather than the public web root. A candidate can sign in only after both email verification and approval by an authorized verifier. The verifier dashboard is available at `/verifier`; review documents are fetched through authenticated API requests and approval or rejection is recorded with the reviewer and time.

The fixture verifier is `verifier@join.local` and uses the shared development password `Pass123!@#`. Existing candidate records created before this migration remain usable; every candidate created by the updated registration endpoint receives the new verification gate. Reviewed disability-card files are retained for 30 days and then removed by the scheduled purge command. See [candidate verification workflow](docs/CANDIDATE_VERIFICATION.md).

## Validation

```powershell
# Frontend
cd frontend
npm.cmd run build
.\node_modules\.bin\eslint.cmd src
npm.cmd run test:integration
npm.cmd run test:e2e
npm.cmd run test:performance

# Backend and Python services, from backend
cd ..\backend
docker compose exec php php bin/console doctrine:schema:validate
docker compose exec php php bin/console doctrine:migrations:status
docker compose exec voice-navigation python -m unittest discover -s tests -v

# Scoring tests, from the repository root
cd ..
docker compose -f backend\compose.yaml run --rm scoring-engine python -m unittest discover -s scoring_engine/tests -v
```

## Documentation

- [Project run commands](docs/run-project-commands.md)
- [Setup and Docker guide](docs/project-setup-and-docker-guide.md)
- [AI-assisted profile workflow](docs/AI_PROFILE_WORKFLOW.md)
- [Candidate verification workflow](docs/CANDIDATE_VERIFICATION.md)
- [Authentication and route authorization](docs/AUTHORIZATION_SECURITY.md)
- [Consent, private storage, and privacy controls](docs/PRIVACY_CONTROLS.md)
- [Outcome logging and accessible notifications](docs/OUTCOME_LOGGING_AND_ACCESSIBLE_NOTIFICATIONS.md)
- [Integration, E2E, and performance verification](docs/testing/INTEGRATION_E2E_PERFORMANCE.md)
- [Scoring engine specification](docs/scoring-engine-technical-specification.md)
- [Voice navigation specification](docs/voice-navigation-technical-specification.md)
- [English, French, and Arabic multilingual experience architecture](docs/MULTILINGUAL_FRONTEND_STRATEGY.md)
- [Multilingual implementation, examples, verification, and remaining work](docs/MULTILINGUAL_IMPLEMENTATION.md)
- [Keyboard navigation test plan](docs/keyboard-navigation-test-plan.md)
- [Responsive and WCAG 2.1 AA baseline audit](docs/wcag-audit/BASELINE_AUDIT.md)
- [WCAG baseline issue matrix](docs/wcag-audit/ISSUE_MATRIX.md)
- [Responsive foundation implementation](docs/wcag-audit/RESPONSIVE_FOUNDATION.md)
- [Public and authentication accessibility review](docs/wcag-audit/PUBLIC_AUTHENTICATION_ACCESSIBILITY.md)
- [Candidate experience accessibility review](docs/wcag-audit/CANDIDATE_EXPERIENCE_ACCESSIBILITY.md)
- [Management dashboards accessibility review](docs/wcag-audit/MANAGEMENT_DASHBOARDS_ACCESSIBILITY.md)
- [Shared WCAG 2.1 AA corrections](docs/wcag-audit/SHARED_WCAG_CORRECTIONS.md)
- [WCAG 2.1 AA final audit report and retest requirements](docs/wcag-audit/WCAG_2_1_AA_FINAL_AUDIT_REPORT.md)
- [Frontend accessibility revamp](docs/frontend-revamp.md)

## Important operational notes

- Run every pending Doctrine migration after pulling entity changes.
- `docker compose down` preserves database volumes; `docker compose down -v` deletes local database data.
- The PHP container refreshes the production Symfony cache when it starts so newly added routes are available.
- Use `docker compose logs --tail 100 php voice-navigation scoring-engine database` when diagnosing failures.
- Keep API keys, JWT secrets, database backups, uploaded documents, and local environment files out of Git.
