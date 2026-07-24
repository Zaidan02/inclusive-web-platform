# Voice Navigation Technical Specification

## Table of contents

1. [Purpose and current scope](#1-purpose-and-current-scope)
2. [Design principle](#2-design-principle)
3. [System architecture](#3-system-architecture)
4. [Source-code organization](#4-source-code-organization)
5. [Complete voice-turn lifecycle](#5-complete-voice-turn-lifecycle)
6. [Frontend state machine](#6-frontend-state-machine)
7. [Audio capture and silence detection](#7-audio-capture-and-silence-detection)
8. [Language selection and transcription](#8-language-selection-and-transcription)
9. [Intent interpretation](#9-intent-interpretation)
10. [Canonical commands](#10-canonical-commands)
11. [Synonyms and natural phrasing](#11-synonyms-and-natural-phrasing)
12. [Clarification and short-term memory](#12-clarification-and-short-term-memory)
13. [Deterministic authorization](#13-deterministic-authorization)
14. [Command execution in React](#14-command-execution-in-react)
15. [Feedback and text-to-speech](#15-feedback-and-text-to-speech)
16. [Interruption, pause, cancel, and shutdown](#16-interruption-pause-cancel-and-shutdown)
17. [HTTP API contracts](#17-http-api-contracts)
18. [Configuration and secrets](#18-configuration-and-secrets)
19. [Logging and debugging](#19-logging-and-debugging)
20. [Safety and privacy properties](#20-safety-and-privacy-properties)
21. [Validation and test coverage](#21-validation-and-test-coverage)
22. [Known limitations](#22-known-limitations)
23. [Future calibration and extension points](#23-future-calibration-and-extension-points)
24. [Operational commands](#24-operational-commands)
25. [Classifier, orchestrator, and navigation-specialist refactor](#25-classifier-orchestrator-and-navigation-specialist-refactor)
26. [Action Master authentication-form proof of concept](#26-action-master-authentication-form-proof-of-concept)

## 1. Purpose and current scope

The voice-navigation subsystem is an accessibility proof of concept for controlling the JoIn website with bounded spoken requests. It currently provides:

- browser microphone capture;
- explicit English or Arabic input-language selection;
- speech-to-text transcription;
- multilingual interpretation into a small canonical command vocabulary;
- natural synonym handling;
- safe clarification when several registered destinations are plausible;
- six-turn, in-memory conversational context;
- deterministic command and target authorization;
- controlled React navigation, internal-view switching, section reading, and bounded scrolling;
- authentication-form and Candidate-dashboard actions through a separate deterministic Action Registry;
- contextual field corrections, registered selections, dynamic loaded-item resolution, and confirmation-gated consequential actions;
- generated spoken feedback with browser speech fallback;
- pause, cancel, stop-speaking, repeat, help, and full-disable controls;
- a public mini tutorial at `/voice-help`.

This subsystem is not a general autonomous browser agent. It cannot freely inspect the
interface, invent routes, construct URLs, click arbitrary elements, or perform unregistered
operations. It can submit only explicitly registered forms after the required confirmation.
Its role is intentionally narrow: understand a person flexibly, then execute only actions
declared by trusted application code.

## 2. Design principle

The central invariant is:

> Flexible understanding, restricted choices, deterministic execution.

The OpenAI-backed interpreter is allowed to understand accents, synonyms, multilingual wording, and short conversational follow-ups. It is not the authority that decides which code runs. The trusted command registry remains the authority.

The separation is:

```text
Human language
    -> probabilistic transcription
    -> probabilistic intent proposal
    -> deterministic schema validation
    -> deterministic registry authorization
    -> fixed frontend action
```

An interpretation model can therefore recognize that “landing page,” “main page,” and “homepage” mean the same thing. It can propose only the canonical value `home`; the registry resolves `home` to `/`. The model never supplies `/`, a URL, a selector, or executable JavaScript.

## 3. System architecture

```text
Browser / React
  |
  | MediaRecorder: bounded WebM or Ogg utterance
  | current context + selected language + six recent structured turns
  v
Python voice-navigation service :5002
  |
  +--> OpenAI transcription adapter
  |      audio -> transcript
  |
  +--> OpenAI intent interpreter
  |      transcript + allowed context + bounded history
  |      -> schema-constrained proposal
  |
  +--> deterministic command registry
  |      proposal -> authorized, clarification, or rejected result
  |
  +--> deterministic feedback builder
  |
  v
React command executor
  |
  +--> trusted React route
  +--> history back
  +--> registered section read
  +--> local voice-state control
  +--> no action when rejected
  |
  v
OpenAI text-to-speech or browser SpeechSynthesis fallback
```

The voice service is isolated from the Symfony API and scoring engine. Docker Compose exposes it on host port `5002`. The frontend default is `http://127.0.0.1:5002`, configurable through `VITE_VOICE_NAVIGATION_URL`.

## 4. Source-code organization

### Backend

| File | Responsibility |
|---|---|
| `backend/voice_navigation/app.py` | Flask application, HTTP endpoints, validation, error mapping, and trace logging |
| `backend/voice_navigation/config.py` | Environment-based immutable settings |
| `backend/voice_navigation/transcription.py` | Bounded audio-to-text OpenAI adapter |
| `backend/voice_navigation/interpretation.py` | Schema-constrained multilingual intent proposal |
| `backend/voice_navigation/schemas.py` | Pydantic request/result domain models and canonical command type |
| `backend/voice_navigation/commands.json` | Versioned trusted command, context, target, and route registry |
| `backend/voice_navigation/registry.py` | Deterministic proposal validation and route authorization |
| `backend/voice_navigation/feedback.py` | Deterministic feedback selection and clarification feedback |
| `backend/voice_navigation/speech.py` | OpenAI text-to-speech adapter |
| `backend/voice_navigation/service.py` | Pipeline orchestration, input normalization, and history sanitization |
| `backend/voice_navigation/tests/test_registry.py` | Deterministic security-boundary tests |

### Frontend

| File | Responsibility |
|---|---|
| `frontend/src/components/voice/VoiceNavigationControl.jsx` | Global state machine, recording, API calls, safe action execution, memory, and controls |
| `frontend/src/components/voice/voiceNavigation.css` | Voice panel presentation and state styling |
| `frontend/src/pages/VoiceNavigationHelpPage.jsx` | Mini tutorial and standard-command reference |
| `frontend/src/styles/voiceHelp.css` | Tutorial presentation |
| `frontend/src/App.jsx` | Global control mount and `/voice-help` route |
| `frontend/src/config.js` | Voice-service base URL |

## 5. Complete voice-turn lifecycle

One ordinary voice turn works as follows:

1. The user activates voice navigation.
2. The browser requests microphone permission through `getUserMedia`.
3. React creates an `AudioContext`, analyser, and `MediaRecorder`.
4. The analyser monitors the input waveform.
5. Once speech is detected, silence following speech ends the bounded turn.
6. The browser creates a WebM or Ogg audio `Blob`.
7. The exact uploaded recording is retained temporarily as an object URL for local playback and download debugging.
8. React sends multipart form data to `POST /api/voice/process`.
9. The request includes:
   - the audio file;
   - the current page context;
   - the explicit spoken language;
   - at most six recent structured turns.
10. Flask validates the file, language, history, and request-size constraints.
11. The transcription adapter sends the audio to the configured OpenAI transcription model.
12. The normalized transcript is limited to the configured maximum length.
13. The registry exposes only the commands and targets valid for the current context.
14. The interpreter receives the transcript, allowed context, and sanitized recent history.
15. OpenAI Structured Outputs produces an `IntentProposal`.
16. Pydantic rejects output outside the declared schema.
17. The deterministic registry accepts, clarifies, or rejects the proposal.
18. The feedback builder generates the corresponding response text.
19. The server returns the complete structured result.
20. React logs the pipeline result and stores a bounded structured summary of the turn.
21. React executes only a registry-authorized fixed action.
22. Feedback is generated through the speech endpoint, with browser speech as fallback.
23. After feedback ends, recording resumes unless the action paused or disabled voice mode.

## 6. Frontend state machine

The control uses the following practical phases:

| Phase | Meaning |
|---|---|
| `off` | Voice mode is disabled and microphone resources are released |
| `requesting` | Browser microphone permission is being requested |
| `listening` | A bounded utterance is being captured |
| `processing` | Audio is uploaded and the response is pending |
| `speaking` | Spoken feedback is playing |
| `paused` | Voice mode is conceptually available, but microphone resources are released |
| `error` | Permission, network, recording, or service processing failed |

The normal transition is:

```text
off
  -> requesting
  -> listening
  -> processing
  -> speaking
  -> listening
```

Important alternative transitions are:

```text
listening -> processing -> paused
processing -> cancelled -> listening
speaking -> stopped -> listening
any active state -> disabled -> off
paused -> visible Resume button -> requesting -> listening
```

The microphone is not recording while the system is processing or speaking. This prevents the normal recorder from treating generated feedback as a new user request.

## 7. Audio capture and silence detection

The current proof of concept uses the browser `MediaRecorder` API. Preferred formats are checked in this order:

1. `audio/webm;codecs=opus`
2. `audio/webm`
3. `audio/ogg;codecs=opus`

The recorder emits chunks every 250 milliseconds. A Web Audio analyser measures root-mean-square waveform volume:

\[
\operatorname{RMS} =
\sqrt{
  \frac{1}{N}
  \sum_{i=1}^{N}
  \left(\frac{x_i-128}{128}\right)^2
}
\]

where:

- \(x_i\) is one unsigned byte time-domain sample;
- \(N\) is the number of analyser samples;
- `128` is the unsigned byte midpoint.

Current constants are:

| Setting | Value |
|---|---:|
| Speech threshold | `0.025` RMS |
| Silence required after detected speech | `1100 ms` |
| Timeout when no speech is detected | `12000 ms` |
| Analyser FFT size | `2048` |

If no value crosses the threshold within 12 seconds, the turn is discarded and listening restarts. If speech was detected and then remains below the threshold for 1.1 seconds, the recorder stops and uploads the completed turn.

These are proof-of-concept constants, not universally calibrated values. Microphone gain, room noise, distance, browser audio processing, accent, speech pace, and device quality can affect the result.

## 8. Language selection and transcription

Automatic language detection was intentionally replaced with an explicit English/Arabic selector after real recordings showed accented English being incorrectly classified and transcribed as another language.

The frontend sends:

```text
spokenLanguage=en
```

or:

```text
spokenLanguage=ar
```

The backend accepts only `en` and `ar` at this stage. This value is passed as the transcription API language hint.

The default transcription model is `whisper-1`. It was selected after testing a real browser WebM recording from the target development machine. In that sample, other evaluated transcription configurations produced incorrect multilingual output, while `whisper-1` with the domain vocabulary prompt correctly recovered the login command.

The configurable prompt supplies JoIn-specific vocabulary such as home, login, sign-in, sign-up, candidate, employer, administrator, profile, jobs, and applications. The prompt improves domain recognition but does not authorize commands.

The transcription layer:

- uploads only the bounded audio turn;
- assigns the original filename so the API can recognize the container;
- supplies the configured model, vocabulary prompt, and explicit language;
- trims the returned text;
- rejects an empty transcript.

## 9. Intent interpretation

The interpreter converts free-form language into the strict `IntentProposal` schema:

```json
{
  "command": "NAVIGATE",
  "target": "home",
  "language": "en",
  "confidence": 0.98,
  "choices": [],
  "question": null
}
```

The schema:

- forbids undeclared fields;
- restricts `command` to known command names;
- restricts confidence to \([0,1]\);
- limits clarification choices to three;
- limits the clarification question to 300 characters.

The interpreter receives an `allowed_context` object generated by the registry. It does not receive authority to create application capabilities. Its instructions explicitly forbid invented targets, routes, selectors, URLs, and actions.

The interpreter may:

- understand multilingual phrasing;
- normalize synonyms to canonical targets;
- interpret standard command variants;
- use the latest pending clarification;
- propose `CLARIFY` when several allowed navigation targets remain plausible;
- return `UNKNOWN` when the request is unsupported, unsafe, or meaningfully ambiguous outside bounded clarification.

## 10. Canonical commands

| Command | Purpose | Target |
|---|---|---|
| `NAVIGATE` | Open a registered application page | Required canonical page target |
| `READ_SECTION` | Read a section registered in the current context | Required canonical section target |
| `GO_BACK` | Use browser history back | Must be `null` |
| `HELP` | Open the voice tutorial | Must be `null` |
| `REPEAT` | Repeat the previous feedback | Must be `null` |
| `STOP_SPEAKING` | Stop current or requested voice output | Must be `null` |
| `PAUSE_LISTENING` | Pause and release microphone resources | Must be `null` |
| `CANCEL` | Cancel the current conversational action | Must be `null` |
| `DISABLE_VOICE` | Shut down voice mode completely | Must be `null` |
| `CLARIFY` | Ask the user to select among registered targets | Must be `null`; carries bounded choices |
| `UNKNOWN` | Represent unsupported or unresolved input | Must be `null` |

Current registered public pages are:

| Canonical target | Trusted React path |
|---|---|
| `home` | `/` |
| `login` | `/signin` |
| `signup` | `/signup` |

The registry also restricts commands and targets by page context. The current contexts are `landing`, `login`, and `signup`. Dashboard-specific navigation has not yet been added.

## 11. Synonyms and natural phrasing

Standard commands are a reliable baseline, not a mandatory exact grammar.

Examples of explicit canonical normalization include:

| Natural wording | Canonical result |
|---|---|
| home, homepage, main page, landing page, start page, front page | `NAVIGATE -> home` |
| sign in, log in | `NAVIGATE -> login` |
| sign up, register, create an account | `NAVIGATE -> signup` |
| stop talking, be quiet, silence, stop | `STOP_SPEAKING` |
| pause listening, hold on, wait, give me a moment | `PAUSE_LISTENING` |
| cancel that, never mind, forget that | `CANCEL` |
| turn off voice navigation, disable voice mode, goodbye | `DISABLE_VOICE` |

The interpreter can understand similar natural variations, but the result must still fit the canonical schema and pass registry authorization.

## 12. Clarification and short-term memory

### Why clarification exists

A vague but valid request should not always become a generic rejection. For example:

```text
User: Take me to the account page.
System: Do you mean login or signup?
User: The first one.
System: Opening login.
```

The first turn produces:

```json
{
  "command": "CLARIFY",
  "target": null,
  "choices": ["login", "signup"],
  "question": "Do you mean login or signup?"
}
```

The registry validates that every choice is available in the current context. An attempted choice such as `admin` is rejected if it is not currently allowed.

### Bounded browser memory

The frontend retains a maximum of six structured turn summaries:

```json
{
  "transcript": "Take me to the account page",
  "command": "CLARIFY",
  "target": null,
  "status": "needs_clarification",
  "question": "Do you mean login or signup?",
  "choices": ["login", "signup"]
}
```

The next request includes those summaries. The backend independently:

- keeps only the newest six entries;
- ignores non-object entries;
- normalizes whitespace;
- truncates each field;
- permits at most three stored choices.

The history is used only to resolve the newest pending clarification. It supports replies such as:

- “yes”;
- “no”;
- “the first one”;
- “the second one”;
- “I meant login”;
- “neither”;
- “cancel.”

A bare “yes” without a pending clarification becomes `UNKNOWN` and is rejected. This prevents an unanchored confirmation from executing an old or nonexistent action.

### Lifetime

The current history:

- exists only in React memory;
- is scoped to the active page/tab instance;
- is not saved to PostgreSQL;
- is not persisted to local storage;
- is cleared when voice navigation is disabled;
- disappears when the page is fully reloaded.

It is conversation context, not a durable chat history.

## 13. Deterministic authorization

`commands.json` is the trusted, versioned registry. Registry version 3 defines:

- known commands and risk levels;
- canonical page-to-path mappings;
- commands allowed in each context;
- navigation targets allowed in each context;
- readable sections allowed in each context.

Authorization rules include:

1. The proposed command must exist in the current context.
2. `UNKNOWN` is always rejected.
3. `NAVIGATE` targets must exist in both the context allowlist and trusted page map.
4. `READ_SECTION` targets must exist in the current section allowlist.
5. Targetless commands must actually have `target = null`.
6. Only `CLARIFY` may include choices or a question.
7. Every clarification choice must be an allowed navigation target.
8. Duplicate clarification choices are removed.
9. Empty clarification choices are rejected.
10. Any command without a registered implementation is rejected.

Possible route results are:

### Authorized

```json
{
  "status": "authorized",
  "command": "NAVIGATE",
  "target": "login",
  "risk": 1,
  "action": {
    "type": "route",
    "value": "/signin"
  }
}
```

### Needs clarification

```json
{
  "status": "needs_clarification",
  "command": "CLARIFY",
  "target": null,
  "choices": ["login", "signup"],
  "question": "Do you mean login or signup?",
  "action": {
    "type": "clarify",
    "choices": ["login", "signup"]
  }
}
```

### Rejected

```json
{
  "status": "rejected",
  "command": "UNKNOWN",
  "target": null,
  "reason": "The request is unsupported or ambiguous."
}
```

React executes actions only when `status` is `authorized`. Clarification results produce speech but no application action. Rejected results produce safe feedback but no application action.

## 14. Command execution in React

The frontend implements a fixed action switch:

| Action type | Browser behavior |
|---|---|
| `route` | Calls React Router `navigate()` with the registry-supplied trusted path |
| `history_back` | Calls `navigate(-1)` |
| `read_section` | Finds a registered `data-voice-section` or element ID, scrolls to it, and reads bounded visible text |
| `help` | Opens `/voice-help` |
| `repeat` | Reuses the last feedback text |
| `stop_speaking` | Stops current output |
| `pause_listening` | Speaks confirmation, then releases microphone resources |
| `cancel` | Performs no navigation and returns cancellation feedback |
| `disable_voice` | Speaks confirmation, then shuts down voice mode |

An unknown action type is not dynamically executed. The model cannot add cases to this switch.

Section reading collapses whitespace and limits extracted text to 1000 characters. It does not send arbitrary DOM selectors from the model into browser APIs.

## 15. Feedback and text-to-speech

For ordinary authorized commands, feedback is selected from deterministic English, Arabic, or French message templates. Clarification uses the validated clarification question.

React sends at most 1000 characters to `POST /api/voice/speech`. The configured OpenAI speech model returns MP3 audio. The prompt requests clear speech in the result language and identifies the content as accessibility navigation feedback.

If generated speech fails, the frontend falls back to the browser `SpeechSynthesis` API.

The interface displays `AI-generated voice` because generated speech must be disclosed to users.

## 16. Interruption, pause, cancel, and shutdown

The system deliberately separates meanings that are often overloaded into the word “stop.”

### Stop talking

Preferred phrase: **“Stop talking.”**

This means stop spoken output, not disable the feature. During speech, the interface displays a **Stop talking** button for immediate interruption.

The normal recorder is not active during generated speech. Therefore a spoken interruption cannot currently be guaranteed while audio is already playing. Reliable barge-in would require a separate concurrent interruption/wake-word channel and echo-handling strategy.

### Pause listening

Preferred phrase: **“Pause listening.”**

After confirmation, the recorder, microphone tracks, analyser, and audio context are released. The state becomes `paused`.

Because the microphone is genuinely stopped, it cannot hear “resume.” A visible **Resume** button reacquires microphone permission/resources and restarts listening. This is an intentional privacy and truthfulness decision.

### Cancel

Preferred phrase: **“Cancel that.”**

As a conversational command, `CANCEL` performs no navigation and returns cancellation feedback.

While an HTTP voice request is pending, the interface displays a **Cancel** button backed by `AbortController`. This stops the browser from waiting for and acting on the response, then restarts listening. It does not guarantee that an upstream service which already received the request immediately stops its internal computation.

### Disable

Preferred phrase: **“Turn off voice navigation.”**

Full deactivation:

- aborts the active browser request;
- clears pending mode transitions;
- clears six-turn history;
- stops recording;
- stops microphone tracks;
- closes the audio context;
- stops generated and browser speech;
- cancels animation-frame monitoring;
- returns the interface to `off`.

## 17. HTTP API contracts

### `GET /health`

Returns service state without calling OpenAI:

```json
{
  "status": "ok",
  "service": "voice-navigation",
  "registryVersion": 3,
  "openaiConfigured": true
}
```

### `POST /api/voice/process`

Content type: `multipart/form-data`

| Field | Required | Description |
|---|---|---|
| `audio` | Yes | Non-empty bounded WebM or Ogg audio file |
| `currentContext` | No | Registry context; defaults to `landing` |
| `spokenLanguage` | No | `en` or `ar`; defaults to `en` |
| `history` | No | JSON array of recent structured turns; defaults to `[]` |

The response is a `VoiceTurnResult` containing:

- unique request ID;
- normalized transcript;
- interpreted language;
- schema-constrained proposal;
- deterministic route result;
- feedback text.

### `POST /api/voice/interpret`

This text-only diagnostic endpoint skips transcription.

```json
{
  "transcript": "Can you go to the landing page?",
  "currentContext": "landing",
  "history": []
}
```

It uses the same interpreter, registry, memory sanitization, and feedback pipeline as an audio request.

### `POST /api/voice/speech`

```json
{
  "text": "Opening login.",
  "language": "en"
}
```

The endpoint rejects empty text and text longer than 1000 characters. A successful response is `audio/mpeg`.

### Error behavior

| Condition | HTTP status |
|---|---:|
| Invalid request, empty transcript, invalid history, invalid language | `400` |
| Missing OpenAI configuration | `503` |
| Unexpected service or upstream failure | `502` |
| Request exceeding configured Flask body limit | Flask request-too-large behavior |

## 18. Configuration and secrets

Runtime settings are loaded from `backend/voice_navigation/.env`.

| Variable | Default |
|---|---|
| `OPENAI_API_KEY` | Empty; service reports unconfigured |
| `OPENAI_TRANSCRIPTION_MODEL` | `whisper-1` |
| `OPENAI_TRANSCRIPTION_PROMPT` | JoIn navigation vocabulary |
| `OPENAI_INTENT_MODEL` | `gpt-5.6-sol` |
| `OPENAI_SPEECH_MODEL` | `gpt-4o-mini-tts` |
| `OPENAI_SPEECH_VOICE` | `cedar` |
| `VOICE_HOST` | `127.0.0.1`; Compose overrides to `0.0.0.0` |
| `VOICE_PORT` | `5002` |
| `VOICE_ALLOWED_ORIGIN` | `http://localhost:5173` |
| `VOICE_MAX_AUDIO_BYTES` | `10485760` bytes |
| `VOICE_MAX_TRANSCRIPT_CHARS` | `500` |

The actual `.env`:

- is excluded by Git;
- is excluded from the Docker build context;
- is loaded at container runtime;
- must never be copied into frontend code.

`.env.example` documents the expected variable names without containing a real key.

## 19. Logging and debugging

### Browser console

Each successful turn logs:

- `[VOICE AUDIO] Exact uploaded recording`
- `[VOICE STT] Transcript`
- `[VOICE INTENT] Proposal`
- `[VOICE ROUTER] Decision`
- `[VOICE FEEDBACK] Text`

The voice panel also exposes the last bounded recording through:

- an audio player;
- byte size;
- approximate turn duration;
- a local download link.

The recording uses a browser object URL. It is not automatically written to the repository or database.

### Backend logs

The service prints one `[VOICE PIPELINE]` JSON trace containing:

- request ID;
- current context;
- transcript;
- detected/interpreted language;
- intent proposal;
- route decision;
- feedback.

View logs with:

```powershell
cd backend
docker compose logs -f voice-navigation
```

The API key and raw audio bytes are not printed.

## 20. Safety and privacy properties

### Implemented safety properties

- OpenAI output is schema constrained.
- Unknown commands cannot enter the proposal model.
- Extra proposal fields are forbidden.
- The current registry context limits available commands and targets.
- Routes are resolved by trusted code, not generated by the model.
- Clarification choices are revalidated by trusted code.
- React executes only authorized action types.
- Rejected and clarification results do not execute application actions.
- Unanchored confirmations such as a bare “yes” are rejected.
- Transcript, history-field, choice-count, feedback-length, and request-size bounds exist.
- CORS is restricted to the configured frontend origin.
- The API key remains server-side.

### Current privacy behavior

- Microphone permission is requested through the browser.
- The microphone is released when paused, disabled, or the component unmounts.
- Short-term history is memory-only and bounded to six turns.
- History is cleared when voice mode is disabled.
- Recordings are not persisted by application code.
- Audio and transcript content are sent to configured OpenAI APIs to provide transcription, interpretation, and speech.

Production deployment still requires a formal privacy notice, retention review, consent design, threat model, authentication/rate limiting as appropriate, and jurisdiction-specific compliance review.

## 21. Validation and test coverage

The deterministic voice suite currently contains 36 passing tests. Coverage includes:

1. registered routes, internal dashboard views, and role-context permission results;
2. rejection of invented destinations, controls, clarification choices, and scroll amounts;
3. section restrictions and distinct lifecycle controls;
4. bounded scroll directions and amounts;
5. classifier/orchestrator specialist isolation;
6. authentication fields, sensitive password handling, and confirmation-gated submission;
7. Candidate matching, profile actions, registered disability options, loaded jobs, file-picker
   focusing, and confirmation-gated applications;
8. short confirmation replies after a pending action.

Live integration checks have also verified:

```text
"Can you go to the landing page?"
    -> NAVIGATE
    -> home
    -> authorized /

"Take me to the account page"
    -> CLARIFY
    -> choices [login, signup]

"The first one" with the clarification in recent history
    -> NAVIGATE
    -> login
    -> authorized /signin

"Yes" without a pending clarification
    -> UNKNOWN
    -> rejected

"Scroll down a bit"
    -> SCROLL_DOWN / small
    -> authorized bounded scroll

"Take me to the first matched job"
    -> ACTION / OPEN_ITEM
    -> matched_job / first
    -> authorized
```

The frontend production build passes. Live model checks cover navigation, permission denial,
clarification, authentication actions, Candidate matching/actions, scrolling, and rendered-job
routing. Deterministic tests do not call OpenAI; live checks do.

## 22. Known limitations

- Only English and Arabic may currently be selected as transcription languages.
- Language/accent/microphone calibration remains device dependent.
- Employer and Administrator navigation is supported, but their form/button actions are not yet
  registered in the Action Master.
- Silence detection uses fixed constants rather than adaptive calibration.
- There is no local wake word.
- Paused mode cannot hear a spoken resume command because the microphone is off.
- The normal recorder does not listen concurrently while generated speech plays.
- Immediate spoken barge-in during speech is therefore not yet reliable; the visible button is reliable.
- Browser cancellation does not prove that already-started upstream computation stopped.
- The interpreter uses only six recent structured turns and is not intended for open-ended conversation.
- History is lost on full page reload.
- Navigation clarification selects among registered destinations. Action corrections use recent
  structured history, but a general action-clarification protocol is not yet implemented.
- The service is a proof of concept and still needs production authentication, rate limiting, observability, retry policy, cost controls, and formal security/privacy review.
- Generated speech and transcription depend on network and upstream API availability.

## 23. Future calibration and extension points

Recommended next stages are:

1. Collect consented test recordings across target accents, languages, microphones, browsers, room conditions, and speaking styles.
2. Measure transcription word error rate and command success rate separately.
3. Tune or adapt silence thresholds without hiding transcription failures.
4. Add more explicit language options only after testing each language.
5. Expand the Action Registry and trusted React handlers to Employer and, where useful,
   Administrator controls.
6. Add action clarification for ambiguous loaded objects without weakening deterministic
   execution.
7. Continue introducing new parameterized operations through strict schemas rather than
   free-form action payloads.
8. Add a local or dedicated interruption channel if spoken barge-in is required.
9. Prevent generated speech echo through echo cancellation and interruption-specific recognition.
10. Add clarification expiry by time and/or intervening non-clarification turns.
11. Add automated interpreter contract cases for synonyms and follow-up wording.
12. Add browser end-to-end tests for permission, recording, pause, resume, cancellation, navigation, and cleanup.
13. Add production metrics without logging sensitive audio or unnecessary transcript content.
14. Conduct accessibility testing with actual users rather than treating engineering tests as accessibility validation.

The extension rule should remain unchanged: expand what the interpreter can understand without allowing it to bypass the deterministic registry.

## 24. Operational commands

Build and start the voice service:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose up -d --build voice-navigation
```

Check health:

```powershell
Invoke-RestMethod http://127.0.0.1:5002/health
```

Follow logs:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose logs -f voice-navigation
```

Run deterministic tests inside the container:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\backend
docker compose exec voice-navigation python -m unittest discover -s tests -v
```

Build the frontend:

```powershell
cd C:\Users\fouad\Desktop\inclusive-web-platform\frontend
npm.cmd run build
```

Perform a text-only interpretation check:

```powershell
$body = @{
  transcript = "Can you go to the landing page?"
  currentContext = "landing"
  history = @()
} | ConvertTo-Json -Depth 8

Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:5002/api/voice/interpret `
  -ContentType "application/json" `
  -Body $body
```

The central project command reference remains `docs/run-project-commands.md`.

## 25. Classifier, orchestrator, and navigation-specialist refactor

This section supersedes the earlier single-interpreter architectural description where the
details differ. The audio, registry, clarification, privacy, and frontend execution principles
documented above remain applicable.

> Historical stage note: this section describes the system immediately after the classifier
> refactor, before the Action Master was implemented. Section 26 and its subsections describe
> the current action behavior.

The current invariant is:

> Classification identifies the kind of request; it does not judge validity, permission, safety, or feasibility.

After transcription, a schema-constrained classifier returns exactly one category:

- `NAVIGATION`;
- `WEBSITE_QUESTION`;
- `ACTION`.

At this historical stage, the deterministic orchestrator dispatched only `NAVIGATION` to the
implemented navigation specialist. Website questions and actions returned
`specialist_unavailable`. The current system still returns that result for website questions,
but dispatches supported actions to the Action Master described in Section 26.

```text
bounded audio
  -> transcription
  -> three-way classifier
  -> deterministic orchestrator
       -> NAVIGATION
            -> navigation interpreter
            -> navigation registry
            -> authorized / clarification / rejected
       -> WEBSITE_QUESTION
            -> explicit specialist-unavailable result
       -> ACTION (historical state)
            -> explicit specialist-unavailable result
```

The refactored backend structure is:

| Package | Responsibility |
|---|---|
| `api/` | Flask transport, validation, error mapping, and trace logging |
| `audio/` | OpenAI transcription and speech adapters |
| `classification/` | Neutral three-way request classification |
| `core/` | Shared Pydantic schemas |
| `orchestration/` | Normalization, history sanitization, and specialist dispatch |
| `specialists/navigation/` | Navigation interpretation, feedback, and deterministic registry |
| `tests/` | Registry and dispatch-isolation tests |

The root `app.py` remains a stable Gunicorn façade importing `api.app:create_app`, so the
Docker command and public HTTP endpoints remain unchanged.

Navigation registry version 4 now includes every current React route:

- `/`;
- `/signin`;
- `/signup`;
- `/forgot-password`;
- `/reset-password`;
- `/employers`;
- `/voice-help`;
- `/candidate`;
- `/candidate/setup`;
- `/employer`;
- `/admin`.

The frontend supplies a distinct context for each route instead of collapsing most pages into
the landing context. Protected destinations resolve to the existing protected React route;
existing `RoleRoute` behavior and Symfony APIs remain responsible for the project's current
authentication and authorization. The voice service does not implement a second JWT system.

During this transition, assistant lifecycle controls such as stop speaking, pause, cancel,
repeat, help, and disable remain classified into the navigation/control path so existing
behavior is preserved. A later action specialist may separate those controls behind a dedicated
priority recognizer.

The response contract now includes `classification`. Navigation responses also include the
existing `proposal` and deterministic `route`. Question/action responses have `proposal = null`
and a `specialist_unavailable` route, which React speaks but never executes.

Verification after the refactor:

- Python compilation succeeds.
- The registry JSON parses at version 4.
- The frontend production build succeeds.
- The voice container is healthy.
- Eleven deterministic navigation-registry tests pass.
- Three deterministic orchestrator tests prove questions and actions cannot reach navigation.
- Live requests correctly separate navigation, website questions, website actions, and controls.
- The saved browser WebM login request still completes transcription, classification,
  navigation interpretation, and trusted `/signin` resolution.

### Candidate internal-view navigation correction

Registry version 5 distinguishes a React route from the internal view displayed by that route.
The candidate dashboard keeps Jobs, Applications, and Profile in component state under the
single `/candidate` URL. Re-navigating to `/candidate` therefore cannot by itself guarantee a
visible state change.

The registry now exposes:

| Canonical target | Route | Internal tab |
|---|---|---|
| `candidate_dashboard` | `/candidate` | `JOBS` |
| `candidate_jobs` | `/candidate` | `JOBS` |
| `candidate_applications` | `/candidate` | `APPLICATIONS` |
| `candidate_profile` | `/candidate` | `PROFILE` |

These targets resolve to a trusted `route_and_tab` action. React Router carries the fixed tab
identifier in navigation state, and `CandidateDashboard` applies only one of the three declared
tab values. This works both when entering `/candidate` from another route and when the user is
already on `/candidate`.

Live checks confirm that “candidate dashboard,” “my applications,” and “candidate profile”
produce separate targets and open Jobs, Applications, and Profile respectively. Sixteen
deterministic tests pass after this correction.

### Employer and administrator internal views

Registry version 6 applies the same route-plus-tab model to the remaining multi-view dashboards.

Employer destinations under `/employer`:

| Canonical target | Internal tab |
|---|---|
| `employer_dashboard` | `POST_JOB` |
| `employer_post_job` | `POST_JOB` |
| `employer_jobs` | `MY_JOBS` |
| `employer_applications` | `APPLICATIONS` |
| `employer_profile` | `PROFILE` |

Administrator destinations under `/admin`:

| Canonical target | Internal tab |
|---|---|
| `admin_dashboard` | `USERS` |
| `admin_users` | `USERS` |
| `admin_archived_users` | `ARCHIVED_USERS` |
| `admin_applications` | `APPLICATIONS` |
| `admin_candidate_profiles` | `USER_PROFILES` |

The existing dashboard tab buttons, default tabs, forms, drafts, and Symfony/React security
behavior are unchanged. Voice navigation supplies the same fixed tab identifiers through React
Router state. Employer voice tab changes do not clear form values or editing state.

Twenty deterministic tests pass. Live model checks resolve representative natural phrases for
all Employer and Administrator internal destinations to the correct trusted `route_and_tab`
action.

### Permission denied versus unknown

Registry version 7 separates recognition from permission behavior:

- A globally registered destination that is unavailable in the current context returns
  `permission_denied`.
- A destination that does not exist returns `rejected`.
- Language that cannot be mapped to a registered destination remains `UNKNOWN`.

The navigation interpreter receives all globally registered canonical targets plus a separate
list of targets allowed in the current context. It may therefore correctly recognize
`admin_dashboard` from the Candidate context without deciding permission itself. The
deterministic registry observes that the destination is known but unavailable and returns:

```json
{
  "status": "permission_denied",
  "command": "NAVIGATE",
  "target": "admin_dashboard",
  "reason": "You do not have permission to open that destination.",
  "action": null
}
```

React executes only `authorized` results, so no navigation occurs. An invented destination
continues to produce safe rejection. Twenty-one deterministic tests pass, and both outcomes
have been verified through live model requests.
## 26. Action Master authentication-form proof of concept

The first Action Master slice supports the controlled fields and submit controls on `/signin`
and `/signup`. It deliberately does not attempt arbitrary DOM automation.

### 26.1 Responsibility boundary

The action pipeline is:

```text
transcript
-> three-way classifier returns ACTION
-> Action Interpreter proposes a typed semantic operation
-> Action Registry validates context, control, operation, value, risk, and confirmation policy
-> React dispatches the authorized operation to the mounted page
-> the page updates its real controlled state or submits its real form
-> JoIn reports the result and asks the user to verify draft changes
```

The language model is an interpreter, not an execution authority. It cannot supply selectors,
URLs, JavaScript, or unregistered controls. The registry can return only a fixed action
containing a registered control identifier. The browser then emits `join:voice-action`; only a
mounted page handler that recognizes that exact identifier may report the action as handled.

Symfony remains responsible for authentication and authorization. Voice submission invokes
the same React form and API request as mouse or keyboard submission.

### 26.2 Action registry

`backend/voice_navigation/specialists/actions/registry.json` is versioned separately from the
navigation registry. Each context declares controls with:

| Property | Meaning |
|---|---|
| `kind` | `field`, `select`, `multi_select`, `collection`, `file`, or `button` |
| `label` | Human-readable feedback name |
| `aliases` | Natural expressions available to the interpreter |
| `editable` | Whether a field may be changed |
| `valueType` | Semantic type used to interpret the control; only closed types such as `enum` are registry-validated |
| `options` | Closed allowlist for enum values |
| `sensitive` | Prevent value logging, history retention, display, and spoken read-back |
| `risk` | Registry-owned action risk |
| `requiresConfirmation` | Whether execution must wait for a separate confirmation turn |

The login context registers `email`, `password`, and `sign_in`. The signup context registers
`username`, `email`, `password`, `account_type`, and `create_account`.

### 26.3 Canonical action operations

The current schema permits `SET_FIELD`, `CLEAR_FIELD`, `SELECT_OPTION`, `TOGGLE_OPTION`,
`OPEN_ITEM`, `FOCUS_FIELD`, `PRESS`, `CONFIRM`, `CANCEL_ACTION`, and `UNKNOWN`. A
command/control kind mismatch is rejected. Closed enum
membership is checked deterministically because it determines whether the browser can execute
the operation. Open draft values such as emails, usernames, and passwords are not judged by
the Action Master. Their React form and Symfony endpoint retain responsibility for validation.
A control belonging to another page returns `unavailable`.

`SET_FIELD`, `CLEAR_FIELD`, and `SELECT_OPTION` only update a draft. They never implicitly save
or submit. The response reads back a non-sensitive value and asks the user to check it. The
browser focuses the changed control and gives its containing field a temporary visible outline.
A correction is simply a new field-setting turn.

`PRESS` for sign-in or account creation returns `needs_confirmation` and no browser operation.
The browser retains only the fixed pending button action. A following `yes`, `confirm`,
`proceed`, `do it`, or the registered Arabic equivalents is forced into the ACTION branch when
the immediately preceding turn requires confirmation. `CONFIRM` then executes the retained
fixed action. `CANCEL_ACTION` discards it.

### 26.4 Password treatment

Passwords remain writable voice fields for this proof-of-concept, as decided for the current
stage, but they are marked `sensitive` from the beginning. The raw value must reach OpenAI for
interpretation and the React field for execution; therefore voice entry is not presented as a
privacy-equivalent replacement for typing. Once classified and routed, the browser:

- replaces the visible transcript with a redaction marker;
- redacts the proposal and route in console diagnostics;
- stores only the redaction marker in six-turn browser history;
- never reads the password value aloud.

The backend trace similarly replaces the structured proposal and authorized action value with
`[REDACTED]`. This minimizes secondary exposure but does not remove the upstream transcription
and interpretation exposure.

### 26.5 Extension rule established by the authentication pilot

The first pilot covered authentication forms only; Section 26.6 records its subsequent
Candidate expansion. Every additional form or dashboard must still declare semantic controls
in the Action Registry and implement explicit React handlers. Adding aliases alone cannot make
an action executable. Arbitrary selectors, DOM mutation, and model-generated execution
instructions remain prohibited.

### 26.6 Candidate Action Master expansion

Action Registry version 2 expands execution across Candidate routes while leaving Employer and
Administrator actions out of scope. The `candidate` context registers:

- profile draft fields: first name, last name, location, phone, and about;
- education and application-status closed selections;
- disability search and the sixteen registered disability options;
- compatibility matching and profile saving;
- loaded jobs, matched results, and companies;
- job-detail back navigation and company-modal controls;
- application-document and recommendation-letter file controls;
- confirmation-gated application submission and logout.

The `candidate_setup` context exposes the corresponding setup fields, education, disabilities,
search, and confirmation-gated completion action.

Candidate dynamic objects are bounded in two stages. The backend may authorize only the fixed
semantic collection identifiers `job`, `matched_job`, and `company`. React then resolves the
spoken title, company name, or ordinal such as `first`, `second`, or `third` exclusively against
the objects already loaded into the authenticated Candidate screen. A failure to find a loaded
object produces feedback and no action.

File actions use `FOCUS_FIELD`, not file injection. Browser security prevents the assistant from
choosing a local file path. Voice can focus and highlight the registered picker, but the user
must select the actual local file.

The Candidate matcher uses the existing `handleGetAiMatch` function, so clicking the button and
saying “Get my job match” reach the same candidate API and scoring workflow. The voice layer
does not duplicate or replace matching logic.

### 26.7 Bounded scrolling and rendered-item routing

Navigation Registry version 8 adds `SCROLL_UP` and `SCROLL_DOWN`. The interpreter may select
only `small`, `page`, or `edge`; it cannot generate pixel values or arbitrary browser code.
React maps `small` to 35 percent of the viewport with a 220-pixel minimum, `page` to 85 percent
of the viewport, and `edge` to the document top or bottom. All movement uses smooth native
scrolling.

A rendered job card is not a website destination even when a user says “take me to the first
matched job.” The classifier now treats opening, choosing, or selecting a currently rendered
job, match, application, or company as `ACTION`. Page and dashboard-view movement remains
`NAVIGATION`.

When compatibility results are visible, an ordinal request such as “select the first job”
prefers the visible ranked match list. A title request still resolves against the loaded job
objects. This prevents the first item in the general jobs array from silently replacing the
first result the user can currently see.
