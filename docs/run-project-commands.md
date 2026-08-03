# Project Run Commands

This is the command-focused reference for running the inclusive web platform locally on Windows with PowerShell.

## Table of contents

1. [Required software](#required-software)
2. [Service addresses](#service-addresses)
3. [First-time setup](#first-time-setup)
4. [Normal daily startup](#normal-daily-startup)
5. [Normal shutdown](#normal-shutdown)
6. [Database migrations](#database-migrations)
7. [Load fixture data](#load-fixture-data)
8. [Frontend commands](#frontend-commands)
9. [Scoring-engine commands](#scoring-engine-commands)
10. [Voice-navigation commands](#voice-navigation-commands)
11. [Backend validation](#backend-validation)
12. [Logs and service status](#logs-and-service-status)
13. [Rebuild and cache commands](#rebuild-and-cache-commands)
14. [Database inspection](#database-inspection)
15. [Dataset extraction](#dataset-extraction)
16. [Complete verification sequence](#complete-verification-sequence)
17. [Destructive reset](#destructive-reset)
18. [Common problems](#common-problems)

## Required software

Install:

- Docker Desktop with Docker Compose
- Node.js and npm
- Git
- Python 3.12 to run the scoring-engine tests directly on Windows

Confirm the tools are available:

```powershell
docker --version
docker compose version
node --version
npm.cmd --version
git --version
py -3.12 --version
```

PHP, Composer, PostgreSQL, and the scoring HTTP service run through Docker. They do not need to be installed directly on Windows for normal project use.

## Service addresses

| Service | Address |
|---|---|
| React frontend | `http://localhost:5173` |
| Symfony backend | `http://localhost:8081` |
| Symfony API | `http://localhost:8081/api` |
| Scoring service | `http://localhost:5001` |
| Scoring health check | `http://localhost:5001/health` |
| Voice-navigation service | `http://localhost:5002` |
| Voice-navigation health check | `http://localhost:5002/health` |

## First-time setup

Open PowerShell in the repository root:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform
```

Create the local environment files from the committed templates:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item backend\voice_navigation\.env.example backend\voice_navigation\.env
Copy-Item frontend\.env.example frontend\.env.local
```

Edit `backend/voice_navigation/.env` and set:

```dotenv
OPENAI_API_KEY=your_actual_openai_api_key
PROFILE_AI_TOKEN=the_same_strong_random_value_used_in_backend_.env
```

Also set a strong random `PROFILE_AI_TOKEN` in `backend/.env`. Compose supplies that value to
both Symfony and the protected profile-extraction service. Never commit either local `.env` file.

The frontend file is optional because its committed example contains the normal local defaults.
The Symfony template uses Docker service names and development-only values. Change its
`APP_SECRET` and `JWT_PASSPHRASE` before treating the environment as anything beyond local
development. All three generated local files are ignored by Git.

Install frontend dependencies:

```powershell
cd frontend
npm.cmd install
cd ..
```

Build and start PostgreSQL, Symfony/PHP, the Python scoring service, and voice navigation:

```powershell
cd backend
docker compose up -d --build
docker compose ps
```

Install or synchronize backend dependencies inside the Docker volume:

```powershell
docker compose exec php composer install --optimize-autoloader
```

Generate JWT keys if they do not already exist:

```powershell
docker compose exec php php bin/console lexik:jwt:generate-keypair --skip-if-exists
```

Run all database migrations:

```powershell
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
```

Load the development fixture accounts, profiles, catalogue, assessments, and job offers:

```powershell
docker compose exec php php bin/console doctrine:fixtures:load --no-interaction --env=dev --no-debug
```

> Warning: fixture loading purges the existing database contents before recreating the fixture data.

Start the frontend in a second PowerShell window:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\frontend
npm.cmd run dev
```

Open `http://localhost:5173`.

## Normal daily startup

PowerShell window 1—start backend services:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose up -d
docker compose ps
```

PowerShell window 2—start the frontend:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\frontend
npm.cmd run dev
```

If Docker images or dependencies changed, use:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose up -d --build
```

## Normal shutdown

Stop the Vite frontend with `Ctrl+C` in its PowerShell window.

Stop the Docker services without deleting database data:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose down
```

## Database migrations

Check migration status:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose exec php php bin/console doctrine:migrations:status
```

Run pending migrations:

```powershell
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
```

Generate a migration after changing Doctrine entities:

```powershell
docker compose exec php php bin/console make:migration
```

Always review a generated migration before running or committing it.

Validate entity mappings and the database schema:

```powershell
docker compose exec php php bin/console doctrine:schema:validate
```

## Load fixture data

Reload the complete fixture database:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose exec php php bin/console doctrine:fixtures:load --no-interaction --env=dev --no-debug
```

This command intentionally purges existing rows. The current fixtures create:

- One verified administrator
- One verified authorized verifier
- One verified candidate
- Four verified employer/company accounts
- Three job definitions
- Disability/task assessments
- Twenty-four published offers
- Offer variants with 10, 20, 30, and 50 important tasks
- Accommodation enabled and disabled for each variant

All fixture accounts use:

```text
Password: Pass123!@#
```

Primary fixture emails:

```text
admin@join.local
verifier@join.local
candidate@join.local
employer@join.local
cedar.sweets@join.local
north.scoop@join.local
artisan.bakery@join.local
```

## Frontend commands

Run the development server:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\frontend
npm.cmd run dev
```

Run Vite and automatically open the browser:

```powershell
npm.cmd start
```

Create a production build:

```powershell
npm.cmd run build
```

Preview the production build locally:

```powershell
npm.cmd run preview
```

Reinstall frontend dependencies when `package.json` or `package-lock.json` changes:

```powershell
npm.cmd install
```

## Scoring-engine commands

The scoring HTTP service starts automatically with Docker Compose.

Check its health from PowerShell:

```powershell
Invoke-RestMethod http://localhost:5001/health
```

Run the standalone mathematical example from the repository root:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform
py -3.12 -m scoring_engine.example
```

Run all scoring-engine unit tests from the repository root:

```powershell
py -3.12 -m unittest discover -s scoring_engine/tests -v
```

Do not run that discovery command from `backend`; `scoring_engine/tests` is relative to the repository root.

Rebuild only the scoring service after changing its Docker configuration or dependencies:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose up -d --build scoring-engine
```

View scoring-service logs:

```powershell
docker compose logs scoring-engine --tail 100
docker compose logs -f scoring-engine
```

## Voice-navigation commands

Place the OpenAI API key in the Git-ignored file:

```text
backend/voice_navigation/.env
```

The file should normally be created from the committed template:

```powershell
Copy-Item backend\voice_navigation\.env.example backend\voice_navigation\.env
```

```env
OPENAI_API_KEY=your_actual_key
```

The same OpenAI key/model configuration powers transcription, classification, Navigator, Action
Master, Question Master, profile extraction, and speech output. The optional model, prompt, voice,
CORS, token, and request-limit variables are documented inline in `.env.example`.

Recreate the service after changing `.env`:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose up -d --build --force-recreate voice-navigation
```

Check configuration and health:

```powershell
Invoke-RestMethod http://localhost:5002/health
```

The response should contain `"openaiConfigured": true`.

Run deterministic registry tests:

```powershell
docker compose exec voice-navigation python -m unittest discover -s tests -v
```

Follow voice-service logs:

```powershell
docker compose logs -f voice-navigation
```

## Backend validation

Validate Symfony YAML configuration:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose exec php php bin/console lint:yaml config
```

Validate Doctrine mappings and schema:

```powershell
docker compose exec php php bin/console doctrine:schema:validate
```

Check migrations:

```powershell
docker compose exec php php bin/console doctrine:migrations:status
```

List Symfony routes:

```powershell
docker compose exec php php bin/console debug:router
```

Lint one PHP file:

```powershell
docker compose exec php php -l src/Controller/CandidateMatchController.php
```

## Logs and service status

Show all service states:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose ps
```

Show recent logs from every service:

```powershell
docker compose logs --tail 100
```

Follow backend logs:

```powershell
docker compose logs -f php
```

Follow database logs:

```powershell
docker compose logs -f database
```

Follow scoring-service logs:

```powershell
docker compose logs -f scoring-engine
```

Stop following logs with `Ctrl+C`.

## Rebuild and cache commands

Clear the optimized Symfony production cache:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose exec --user www-data php php bin/console cache:clear --env=prod --no-debug
```

Restart PHP:

```powershell
docker compose restart php
```

Synchronize Composer dependencies into the named Docker volume:

```powershell
docker compose exec php composer install --optimize-autoloader
```

Rebuild and recreate the full backend stack:

```powershell
docker compose up -d --build --force-recreate
```

Rebuild only PHP:

```powershell
docker compose up -d --build --force-recreate php
```

## Database inspection

Open an interactive PostgreSQL shell:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose exec database psql -U app -d app
```

Exit PostgreSQL with:

```text
\q
```

List database tables without entering an interactive shell:

```powershell
docker compose exec database psql -U app -d app -c "\dt"
```

Count published fixture offers:

```powershell
docker compose exec database psql -U app -d app -c "SELECT COUNT(*) AS offers FROM job_post;"
```

Inspect the important-task fixture matrix:

```powershell
docker compose exec database psql -U app -d app -c "SELECT highlighted_count, assistance_available, COUNT(*) AS offers FROM (SELECT jp.id, jp.assistance_available, COUNT(h.id) AS highlighted_count FROM job_post jp LEFT JOIN job_post_highlighted_task h ON h.job_post_id = jp.id GROUP BY jp.id, jp.assistance_available) grouped_offers GROUP BY highlighted_count, assistance_available ORDER BY highlighted_count, assistance_available;"
```

## Dataset extraction

The extraction script reads the supported workbooks from the Git-ignored `job descriptions` folder and writes the normalized catalogue to `backend/data/job_catalogue.json`.

For normal non-destructive imports, sign in as an administrator and use **Add data sheets** in
the Admin Console. It accepts one or more `.xlsx` files, rejects duplicate job definitions,
imports transactionally, and does not purge existing data. Python and OpenPyXL for this UI
workflow are already included in the PHP Docker image.

The direct command below is for deliberately regenerating the fixture catalogue JSON:

From the repository root:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform
py -3.12 tools/extract_job_catalogue.py
```

The extraction script requires the Python `openpyxl` package. Install it if Python reports that the module is missing:

```powershell
py -3.12 -m pip install openpyxl
```

After intentionally regenerating the catalogue, reload fixtures to place the normalized data in PostgreSQL:

```powershell
cd backend
docker compose exec php php bin/console doctrine:fixtures:load --no-interaction --env=dev --no-debug
```

Remember that fixture loading purges existing database content.

## Complete verification sequence

Run backend configuration and schema checks:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose ps
docker compose exec php php bin/console lint:yaml config
docker compose exec php php bin/console doctrine:schema:validate
docker compose exec php php bin/console doctrine:migrations:status
```

Run scoring tests:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform
py -3.12 -m unittest discover -s scoring_engine/tests -v
```

Build the frontend:

```powershell
cd frontend
npm.cmd run build
```

Check the scoring-service health:

```powershell
Invoke-RestMethod http://localhost:5001/health
```

Run deterministic voice tests and check the voice service:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose exec voice-navigation python -m unittest discover -s tests -v
Invoke-RestMethod http://localhost:5002/health
```

## Destructive reset

The following command deletes Docker volumes, including the PostgreSQL database, Composer dependency volume, and Symfony cache volume:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose down -v
```

Use it only when a complete local reset is intentional. Recreate everything with:

```powershell
docker compose up -d --build
docker compose exec php composer install --optimize-autoloader
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
docker compose exec php php bin/console doctrine:fixtures:load --no-interaction --env=dev --no-debug
```

## Common problems

### Running `cd backend` while already inside `backend`

If the prompt ends with:

```text
...\inclusive-web-platform\backend>
```

do not run `cd backend` again. That attempts to open `backend\backend`, which does not exist.

Return to the repository root with:

```powershell
cd ..
```

### `gh` is not recognized

GitHub CLI is not required to run this project. The error means GitHub CLI is not installed or is absent from `PATH`; it does not mean ordinary `git` or the application is broken.

### Frontend cannot reach the backend

Confirm that the containers are running:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose ps
```

Confirm the backend responds:

```powershell
Invoke-WebRequest http://localhost:8081/api/job-definitions
```

Inspect PHP logs:

```powershell
docker compose logs php --tail 100
```

### Scoring requests fail

Check service health and logs:

```powershell
Invoke-RestMethod http://localhost:5001/health
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose logs scoring-engine --tail 100
```

### Backend code or configuration appears stale

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose restart php
```

The PHP container now clears and warms the production Symfony cache whenever it starts. After
pulling new controllers or routes, recreating or restarting PHP is sufficient.

### Candidate profile suggestions fail

Check that the AI routes exist and both services are healthy:

```powershell
cd backend
docker compose exec php php bin/console debug:router --env=prod | Select-String candidate_profile_ai
Invoke-RestMethod http://127.0.0.1:5002/health
docker compose logs --tail 100 php voice-navigation
```

Confirm that `PROFILE_AI_TOKEN` is non-empty in `backend/.env` and that the voice service reports
`"openaiConfigured": true`. Recreate the affected services after changing environment values:

```powershell
docker compose up -d --force-recreate php voice-navigation
```

### Composer classes are missing

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose exec php composer install --optimize-autoloader
```

### Frontend packages are missing

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\frontend
npm.cmd install
```
