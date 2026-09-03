# Voice Navigation Service

This service implements two constrained AI workflows:

1. bounded voice navigation and registered website actions;
2. multilingual candidate-profile transcription and structured, reviewable suggestions.

The voice-assistant pipeline is:

```text
audio upload
-> OpenAI transcription
-> three-way request classification
-> deterministic orchestration
   -> navigation specialist
   -> grounded website-question specialist
   -> action specialist
-> deterministic navigation registry validation
-> deterministic action registry validation
-> executable trusted command or bounded rejection
```

The classifier decides only whether a transcript is navigation, a website question, or a
website action. It does not decide whether the request is logical, supported, or permitted.
Navigation requests reach the navigation specialist. Registered form and dashboard actions
reach the Action Master. Website questions are answered only from bounded content supplied by
the currently rendered page.

The navigation model interprets. The registry authorizes. Browser code executes only a
returned fixed action type. Existing React role guards and Symfony API authorization remain
the project security authority.

The code is separated into `api`, `audio`, `classification`, `core`, `orchestration`, `profile`,
and specialist packages.

The Action Master proof of concept supports login and signup fields, account-type selection,
and confirmation-gated form submission. It emits semantic control identifiers only; mounted
React pages update their own controlled state. Password values are redacted from structured
diagnostics, browser history, display, and speech.

Navigation registry version 5 also distinguishes route-level destinations from internal React
views. Candidate Jobs/dashboard, Applications, and Profile all use `/candidate` but return a
trusted `route_and_tab` action with the appropriate fixed tab identifier.

Registry version 6 extends `route_and_tab` to Employer Post a Job, My Jobs, Applications, and
Company Profile, plus Administrator Users, Archived Users, Applications, and Candidate Profiles.

Registry version 7 distinguishes known-but-unavailable destinations (`permission_denied`) from
invented or unresolved destinations (`rejected`/`UNKNOWN`). The model recognizes; the registry
decides availability; React executes only `authorized` results.

The bounded-audio transcription adapter currently defaults to `whisper-1`. A real browser WebM sample from the target machine was evaluated against multiple configurations: `gpt-4o-transcribe` and `gpt-4o-mini-transcribe` produced incorrect multilingual text, while `whisper-1` correctly recovered the spoken login request. The model remains configurable through `OPENAI_TRANSCRIPTION_MODEL`.

## Configure

Edit the Git-ignored `.env` file in this directory:

```env
OPENAI_API_KEY=your_api_key
PROFILE_AI_TOKEN=the_same_strong_random_value_used_by_the_symfony_backend
```

Do not place the API key in frontend code or commit `.env`.

`PROFILE_AI_TOKEN` protects `/api/profile/extract`, which is an internal Symfony-to-Python
endpoint. The public browser never receives this token. When using Docker Compose, the value is
supplied from `backend/.env`; use the matching value here when running this service directly.

## Start with Docker

From `backend`:

```powershell
docker compose up -d --build voice-navigation
docker compose logs -f voice-navigation
```

Health check:

```powershell
Invoke-RestMethod http://localhost:5002/health
```

## Candidate profile endpoints

- `POST /api/profile/transcribe` accepts multipart audio and `language=en|fr|ar`. It returns an
  editable transcript and does not perform profile extraction.
- `POST /api/profile/extract` accepts a bounded narrative, existing profile, allowed disability
  catalogue, and task vocabulary. It requires `X-Profile-AI-Token` and returns Pydantic-validated
  suggestions.

Extraction never persists data. Symfony revalidates the response, and the candidate must select
and confirm each item through the authenticated backend endpoint before it is saved. Disability
suggestions require an explicit candidate statement; task skills must reference supplied task IDs.

## Test text interpretation

```powershell
$body = @{
  transcript = "take me to the login page"
  currentContext = "home"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:5002/api/voice/interpret `
  -ContentType "application/json" `
  -Body $body
```

## Test bounded audio processing

```powershell
curl.exe -X POST http://localhost:5002/api/voice/process `
  -F "audio=@C:\path\to\utterance.webm" `
  -F "currentContext=home"
```

## Generate spoken feedback

```powershell
$body = @{
  text = "سأفتح صفحة تسجيل الدخول."
  language = "ar"
} | ConvertTo-Json

Invoke-WebRequest `
  -Method Post `
  -Uri http://localhost:5002/api/voice/speech `
  -ContentType "application/json" `
  -Body $body `
  -OutFile feedback.mp3
```

OpenAI-generated speech must be disclosed to users as AI-generated.

## Run deterministic tests

From this directory:

```powershell
py -3.12 -m unittest discover -s tests -v
```

These tests do not call OpenAI and do not require an API key. They include bounded-context tests
for the profile extractor.
