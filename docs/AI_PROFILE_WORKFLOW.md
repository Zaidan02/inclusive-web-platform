# AI-assisted candidate profile workflow

## Candidate journey

1. The candidate opens profile setup or **My Profile**.
2. They type a description or record it in English, French, or Arabic.
3. Recorded audio is transcribed and the transcript remains editable.
4. The candidate gives explicit consent before the transcript is analysed.
5. The assistant returns unsaved suggestions with evidence and confidence.
6. Every suggestion starts unselected. The candidate reviews, edits, accepts, or ignores each item.
7. Only selected suggestions are sent to the confirmation endpoint and persisted.

The manual profile form remains fully available. The AI workflow is optional and does not block profile completion.

## Safety and data boundaries

- The assistant may suggest a disability only when the candidate explicitly states one and it exactly matches the active disability catalogue.
- The assistant never diagnoses or infers medical information.
- Task skills must match an active `job_definition_task` imported from the controlled job catalogue.
- Unmatched useful statements are shown for manual review and are not persisted automatically.
- Audio is held in browser memory for transcription and is not stored by this application.
- Audit events store language, consent/outcome type, character count, and item counts. They do not store audio or narrative text.
- The Symfony API revalidates all AI output against field limits and current database catalogues.
- The extraction endpoint is server-to-server and requires `PROFILE_AI_TOKEN`.

## Scoring invariant

The mathematical scoring engine and `CandidateMatchController` payload are unchanged. Matching continues to use:

- confirmed education level;
- confirmed selected disabilities;
- published job tasks, weights, mandatory/highlighted status, feasibility assessments, and assistance availability.

Confirmed task skills are stored in `candidate_task_skill` to enrich the profile, but are not sent to the scoring engine. Introducing them into matching requires a separately reviewed scoring version and migration.

## Configuration

Set the same strong random `PROFILE_AI_TOKEN` for the Symfony and voice-navigation containers. Configure `OPENAI_API_KEY` in `backend/voice_navigation/.env`.

```powershell
docker compose -f backend/compose.yaml up --build
docker compose -f backend/compose.yaml exec php php bin/console doctrine:migrations:migrate --no-interaction
```

For production, replace the local development token default with a secret supplied by the deployment environment.

## API endpoints

- `POST /api/profile/transcribe` on voice-navigation: multipart audio transcription in `en`, `fr`, or `ar`.
- `POST /api/candidate/profile/ai-suggestions` on Symfony: authenticated, consent-gated suggestion request.
- `POST /api/candidate/profile/ai-confirm` on Symfony: authenticated persistence of explicitly selected items.
- `POST /api/profile/extract` on voice-navigation: protected internal structured-extraction endpoint.
