# Voice Navigation Service

This isolated service implements the first bounded-utterance voice-navigation pipeline:

```text
audio upload
-> OpenAI transcription
-> constrained multilingual intent proposal
-> deterministic registry validation
-> executable command plus deterministic feedback
```

The model interprets. The registry authorizes. Browser code will execute only the returned fixed action type.

The bounded-audio transcription adapter currently defaults to `whisper-1`. A real browser WebM sample from the target machine was evaluated against multiple configurations: `gpt-4o-transcribe` and `gpt-4o-mini-transcribe` produced incorrect multilingual text, while `whisper-1` correctly recovered the spoken login request. The model remains configurable through `OPENAI_TRANSCRIPTION_MODEL`.

## Configure

Edit the Git-ignored `.env` file in this directory:

```env
OPENAI_API_KEY=your_api_key
```

Do not place the API key in frontend code or commit `.env`.

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

## Test text interpretation

```powershell
$body = @{
  transcript = "take me to the login page"
  currentContext = "landing"
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
  -F "currentContext=landing"
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

These tests do not call OpenAI and do not require an API key.
