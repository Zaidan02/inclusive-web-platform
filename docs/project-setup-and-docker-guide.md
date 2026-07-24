# Project Setup and Docker Guide

This guide explains how to run the Inclusive Web Platform locally, how its services connect, how Docker ports and volumes behave, and how to apply and publish backend updates safely.

Existing README files are not replaced by this guide.

## 1. Project architecture

The repository contains five runtime services:

```text
React frontend             http://localhost:5173
        |
        v
Symfony/PHP backend        http://localhost:8081
        |
        +-- PostgreSQL      Docker port 5432
        |
        +-- Scoring engine  http://localhost:5001

React frontend
        |
        +-- Voice assistant http://localhost:5002
```

Docker Compose starts:

- The Symfony/PHP backend
- PostgreSQL
- The Python scoring engine
- The Python voice assistant

The React frontend is the only runtime started separately on the host machine.

The scoring engine provides deterministic compatibility matching. The voice service provides
transcription, classification, Navigator, Action Master, Question Master, and speech output.

## 2. Prerequisites

Install:

- Git
- Docker Desktop using Linux containers
- Node.js 18 or newer
- Python 3.12 only when running Python tests or catalogue extraction directly on Windows

Composer and PHP do not need to be installed on Windows because the backend Docker image includes them.

Verify the tools:

```powershell
git --version
docker --version
docker compose version
node --version
npm.cmd --version
py -3.12 --version
```

Use `npm.cmd` instead of `npm` if PowerShell blocks `npm.ps1`.

## 3. Clone and enter the repository

```powershell
git clone https://github.com/Zaidan02/inclusive-web-platform.git
cd inclusive-web-platform
```

If the repository is already cloned:

```powershell
git fetch --all --prune
git status
```

Do not run `cd frontend` when the PowerShell prompt already ends in `\frontend`.

## 4. Local backend environment

Symfony requires `backend/.env` locally. This file is ignored by Git and should not contain
production secrets. Copy the committed template:

```powershell
Copy-Item backend\.env.example backend\.env
```

Then review `backend/.env`. The development template contains:

```dotenv
APP_ENV=dev
APP_SECRET=replace-with-a-local-random-value

DATABASE_URL="postgresql://app:!ChangeMe!@database:5432/app?serverVersion=16&charset=utf8"

JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=replace-with-a-local-passphrase

MAILER_DSN=null://null
MAILER_FROM=inclusive.web.platform@example.com
DEFAULT_URI=http://localhost:8081
CORS_ALLOW_ORIGIN="^http://(localhost|127\.0\.0\.1):5173$"

SCORING_ENGINE_URL=http://scoring-engine:5001
VERIFICATION_BASE_URL=http://localhost:8081
RESET_PASSWORD_BASE_URL=http://localhost:5173
```

Important hostnames:

- Symfony connects to PostgreSQL using `database`, not `localhost`, because both run in Docker Compose.
- Symfony connects to the Compose scoring service using `scoring-engine`.
- TablePlus connects from Windows using `127.0.0.1` and the published PostgreSQL host port.

### Voice assistant environment

Copy the committed voice template:

```powershell
Copy-Item backend\voice_navigation\.env.example backend\voice_navigation\.env
```

Set at minimum:

```dotenv
OPENAI_API_KEY=your_actual_openai_api_key
```

The remaining values already have development defaults:

- `OPENAI_TRANSCRIPTION_MODEL` and `OPENAI_TRANSCRIPTION_PROMPT` control speech-to-text.
- `OPENAI_CLASSIFIER_MODEL` chooses Navigation, Website Question, or Action.
- `OPENAI_INTENT_MODEL` powers the Navigator, Action Master, and Question Master.
- `OPENAI_SPEECH_MODEL` and `OPENAI_SPEECH_VOICE` control spoken feedback.
- `VOICE_HOST` and `VOICE_PORT` configure the container listener.
- `VOICE_ALLOWED_ORIGIN` must match the React origin.
- `VOICE_MAX_AUDIO_BYTES` and `VOICE_MAX_TRANSCRIPT_CHARS` bound requests.

Never commit `backend/voice_navigation/.env`. Recreate the service after changing it:

```powershell
cd backend
docker compose up -d --build --force-recreate voice-navigation
```

### Frontend environment

The frontend defaults work with the documented local ports. Optional overrides may be placed in
the Git-ignored `frontend/.env.local`, copied from `frontend/.env.example`:

```powershell
Copy-Item frontend\.env.example frontend\.env.local
```

The supported variables are `VITE_BACKEND_URL`, `VITE_API_URL`, and
`VITE_VOICE_NAVIGATION_URL`. Restart Vite after changing them.

## 5. Start Docker correctly

Open Docker Desktop and wait until it reports that the engine is running.

Then:

```powershell
cd backend
docker compose up -d --build
docker compose ps
```

Expected services:

```text
php         Up
database    Up (healthy)
scoring-engine     Up (healthy)
voice-navigation   Up (healthy)
```

The backend is published using this mapping:

```yaml
ports:
  - "8081:80"
```

This means:

```text
Windows port 8081 -> container port 80
```

The API is therefore available at `http://localhost:8081/api`.

## 6. First backend initialization

Run these commands from `backend/` after the containers start:

```powershell
docker compose exec php composer install
docker compose exec php php bin/console lexik:jwt:generate-keypair --skip-if-exists
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
```

Confirm the migration state:

```powershell
docker compose exec php php bin/console doctrine:migrations:status
```

Confirm the tables directly:

```powershell
docker compose exec database psql -U app -d app -c "\dt"
```

Expected application tables include:

- `user`
- `candidate_profile`
- `employer_profile`
- `job_post`
- `job_definition`
- `job_definition_task`
- `disability`
- `disability_task_assessment`
- `job_post_highlighted_task`
- `job_application`
- `doctrine_migration_versions`

## 7. PostgreSQL ports: dynamic versus static

### Current behavior

`backend/compose.override.yaml` currently contains:

```yaml
services:
  database:
    ports:
      - "5432"
```

Only the container port is specified. Docker therefore chooses a random available Windows host port whenever the container is recreated.

Find the current port with:

```powershell
docker compose port database 5432
```

Example:

```text
0.0.0.0:55896
```

In this example, TablePlus must use port `55896`. An old port from a previous container will return “connection refused.”

### Make the database port static

To keep the Windows port fixed, change `backend/compose.override.yaml` to:

```yaml
services:
  database:
    ports:
      - "5432:5432"
```

The mapping means:

```text
Windows port 5432 -> container port 5432
```

Recreate the database container after changing the mapping:

```powershell
cd backend
docker compose up -d --force-recreate database
docker compose port database 5432
```

It should now report port `5432`.

If Windows already has PostgreSQL or another application using port 5432, choose another fixed host port:

```yaml
services:
  database:
    ports:
      - "5433:5432"
```

TablePlus would then use port `5433`. Symfony still uses `database:5432` internally; `DATABASE_URL` does not change.

Check whether a Windows port is occupied:

```powershell
Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
```

After any Compose port change, verify the fully merged configuration:

```powershell
docker compose config
```

## 8. Connect TablePlus

Use a PostgreSQL connection:

```text
Host:      127.0.0.1
Port:      5432 if configured statically, otherwise the result of docker compose port
User:      app
Password:  !ChangeMe!
Database:  app
SSL:       Disabled
```

Refresh the `public` schema after migrations.

Do not manually edit:

- Password hashes
- Doctrine’s migration table
- Foreign-key identifiers unless the relationships are understood

Passwords must be generated by Symfony’s configured password hasher. Arbitrary SHA-256 or plain-text values will make login fail.

## 9. Start the frontend

Open another PowerShell window:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://localhost:5173
```

The frontend currently defaults to:

```text
Backend: http://127.0.0.1:8081
API:     http://127.0.0.1:8081/api
Voice:   http://127.0.0.1:5002
```

Optional PowerShell overrides:

```powershell
$env:VITE_BACKEND_URL="http://localhost:8081"
$env:VITE_API_URL="http://localhost:8081/api"
$env:VITE_VOICE_NAVIGATION_URL="http://localhost:5002"
npm.cmd run dev
```

Environment variables set this way apply only to the current PowerShell window.

## 10. Check the Python services

Both Python runtime services start through Docker Compose:

```powershell
cd backend
docker compose up -d --build scoring-engine voice-navigation
```

Check them from PowerShell:

```powershell
Invoke-RestMethod http://localhost:5001/health
Invoke-RestMethod http://localhost:5002/health
```

The voice response should report `"openaiConfigured": true`. If it reports false, review
`backend/voice_navigation/.env` and recreate the voice container.

The PHP image also includes Python and OpenPyXL for the Admin Console's Add Data Sheets
workflow. Administrators can upload `.xlsx` workbooks from the UI without installing Python on
Windows. The Compose file mounts `tools/` read-only so Symfony can call the shared extractor.
After Dockerfile or Compose changes, rebuild the PHP service:

```powershell
docker compose up -d --build php
```

## 11. How backend code changes reach Docker

The PHP service has a bind mount:

```yaml
volumes:
  - .:/app
```

This maps the local `backend/` folder into `/app` inside the container.

### PHP/controller/entity source changes

For ordinary PHP changes, the container immediately sees the updated files. Usually a rebuild is unnecessary.

If behavior appears cached:

```powershell
docker compose exec php php bin/console cache:clear
docker compose restart php
```

### Symfony configuration changes

After changing files under `backend/config/`:

```powershell
docker compose exec php php bin/console cache:clear
docker compose restart php
```

### Composer dependency changes

After changing `composer.json` or pulling a new `composer.lock`:

```powershell
docker compose exec php composer install
docker compose exec php php bin/console cache:clear
```

### Dockerfile or installed PHP extension changes

Rebuild the PHP image:

```powershell
docker compose up -d --build --force-recreate php
```

### Compose environment or port changes

Recreate the affected service:

```powershell
docker compose up -d --force-recreate php
```

or:

```powershell
docker compose up -d --force-recreate database
```

### Entity/schema changes

Do not rely on editing the database manually. Create and run a Doctrine migration:

```powershell
docker compose exec php php bin/console make:migration
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
```

Review the generated migration before committing it.

## 12. Pull backend updates made by another contributor

Before pulling, inspect local work:

```powershell
git status
git branch --show-current
```

Fetch and pull the current branch:

```powershell
git fetch --all --prune
git pull --ff-only
```

Then synchronize the running backend:

```powershell
cd backend
docker compose up -d --build
docker compose exec php composer install
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
docker compose exec php php bin/console cache:clear
```

The rebuild is conservative. It is especially important when the Dockerfile, Composer lock file, or Compose files changed.

## 13. Publish backend changes to GitHub

Use a feature branch rather than pushing directly to `main`:

```powershell
git switch -c backend/short-description
```

Inspect exactly what changed:

```powershell
git status
git diff -- backend
```

Run appropriate verification:

```powershell
cd backend
docker compose exec php php bin/console lint:yaml config
docker compose exec php php bin/console doctrine:schema:validate
docker compose exec php php bin/console doctrine:migrations:status
```

Return to the repository root, stage only intended files, commit, and push:

```powershell
cd ..
git add backend/path/to/changed-file.php
git add backend/migrations/VersionYYYYMMDDHHMMSS.php
git status
git commit -m "Describe the backend change"
git push -u origin backend/short-description
```

Do not use `git add .` without reviewing the worktree. It may include local virtual environments, secrets, generated files, or unrelated work.

If you have write permission, the branch will be pushed to the original repository. If GitHub rejects the push, push to a fork and open a pull request.

## 14. Database persistence and safe resets

PostgreSQL data is stored in the named Docker volume `backend_database_data`. Restarting or recreating the container normally preserves the data.

Safe service stop:

```powershell
docker compose down
```

Start again:

```powershell
docker compose up -d
```

Warning: the following removes the Compose database volume and all local database data:

```powershell
docker compose down -v
```

Do not run it unless a complete local database reset is intended.

Create a backup before risky database operations:

```powershell
docker compose exec -T database pg_dump -U app -d app > local-backup.sql
```

The backup file can contain personal or sensitive data and must not be committed.

## 15. Everyday start and stop commands

Start backend and database:

```powershell
cd backend
docker compose up -d
```

Inspect status:

```powershell
docker compose ps
```

Follow backend logs:

```powershell
docker compose logs -f php
```

Follow database logs:

```powershell
docker compose logs -f database
```

Stop services while preserving data:

```powershell
docker compose down
```

## 16. Common problems

### Docker pipe or `dockerDesktopLinuxEngine` not found

Docker Desktop is not running or has not finished starting.

### TablePlus connection refused

The database container is stopped, or Docker assigned a different dynamic port. Run:

```powershell
docker compose ps
docker compose port database 5432
```

### Symfony says `.env` is missing

Create the local `backend/.env` described in section 4.

### No database tables

Run:

```powershell
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
```

### CORS missing origin

Confirm the PHP container receives a CORS expression allowing the exact frontend origin, including its port. `localhost:5173` and `127.0.0.1:5173` are different browser origins.

### Login returns 401

Check:

- The email exists exactly as entered.
- The password was hashed by Symfony.
- `is_verified` is true.
- JWT keys exist under `backend/config/jwt/`.
- The backend logs with `docker compose logs php --tail 100`.

### Python or OpenPyXL is missing on Windows

Normal runtime use is containerized. For direct scoring tests, use Python 3.12. For direct
catalogue extraction, install OpenPyXL:

```powershell
py -3.12 -m pip install openpyxl
```

## 17. Quick full startup checklist

Terminal 1:

```powershell
cd backend
docker compose up -d
docker compose ps
```

Terminal 2:

```powershell
cd frontend
npm.cmd run dev
```

URLs:

```text
Frontend:       http://localhost:5173
Backend:        http://localhost:8081
Scoring health: http://localhost:5001/health
Voice health:   http://localhost:5002/health
```
