# Multilingual implementation and verification

Status: **Implemented baseline; release verification remains open**  
Languages: English (`en`), French (`fr`), Arabic (`ar`)  
Architecture decision: [Multilingual experience architecture](MULTILINGUAL_FRONTEND_STRATEGY.md)

## 1. Implemented scope

The application now uses one persisted language choice across the public site, authentication, candidate, employer, verifier, administrator, privacy, AI-assisted profile, and voice-navigation interfaces. English and French render left to right; Arabic renders right to left. The root document's `lang` and `dir` attributes change with the selected locale so browsers and assistive technology receive the same language state as the visible interface.

The implementation includes:

- `i18next` and `react-i18next` with feature-based JSON resources and English fallback;
- a labelled, keyboard-operable language selector using the language names English, Français, and العربية;
- same-browser persistence in `localStorage` under the non-sensitive key `join.locale`;
- localized public pages, authentication flows, dashboards, dialogs, form labels, validation, accessible names, status announcements, page titles, and privacy controls;
- locale-aware dates and numbers through `Intl`;
- logical CSS properties and `dir="auto"` for multilingual free text, with email addresses, URLs, phone numbers, and required technical tokens kept left to right where appropriate;
- a translation-key contract test that checks every locale and namespace for missing or additional keys;
- a browser test for persistence, `lang`/`dir`, Arabic mobile reflow, email direction, and voice-language synchronization;
- route-level lazy loading so role dashboards and route-specific styles are delivered as separate chunks instead of one oversized initial bundle.

The implementation does **not** change the mathematical scoring policy, job/task identifiers, role codes, authorization checks, consent rules, or verification decisions.

## 2. Data and processing boundary

The interface and the processing model use different representations deliberately:

| Concern | User-facing representation | Internal representation |
|---|---|---|
| Interface label | Selected language | Translation key |
| Controlled choice | Localized label | Stable existing ID/code |
| Free text | Original English, French, or Arabic text | Original Unicode text plus locale metadata |
| AI/voice operation | Localized command and feedback | Validated JSON with canonical English keys/codes |
| Scoring | Localized explanation where available | Existing deterministic inputs and mathematics |
| Email address | Explanation in selected language | Existing Latin email validation and unchanged value |

This boundary allows an Arabic- or French-speaking user to interact naturally without requiring the router, database relations, authorization layer, or scoring engine to understand translated identifiers.

### Example: controlled profile value

The education selector may display `Université` or `جامعة`, but it still submits the existing value:

```json
{
  "educationLevel": "university"
}
```

The same rule applies to disability selections: the localized label changes, while the existing canonical disability name used by the API and scoring engine remains stable.

### Example: multilingual AI profile input

User input is preserved:

```json
{
  "language": "ar",
  "transcript": "أعيش في بيروت وأدرس في الجامعة وأبحث عن عمل في المخبوزات."
}
```

The AI adapter is instructed to return a strict, reviewable contract with English property names and canonical codes while keeping user-authored values in their original language:

```json
{
  "language": "ar",
  "suggestions": {
    "location": "بيروت",
    "educationLevel": "university",
    "about": "أبحث عن عمل في المخبوزات."
  }
}
```

Suggestions remain consent-gated and reviewable. They do not silently overwrite the profile and are not added to scoring as new evidence without a separately reviewed scoring-policy version.

### Example: voice navigation

A French command such as `ouvrir mon profil` can be interpreted into the existing canonical action contract:

```json
{
  "action": "navigate",
  "target": "candidate_profile",
  "language": "fr"
}
```

The frontend consumes the stable action while the spoken confirmation is returned in French. Arabic and English follow the same pattern. Only allowlisted actions and fields are accepted; translated free text is never executed as a route or code fragment.

## 3. Translation-resource structure

The implementation currently uses seven namespaces under `frontend/src/i18n/resources/{en,fr,ar}`:

- `common`: shared navigation, route titles, language selector, and general controls;
- `auth`: sign-in, signup, verification, and password recovery;
- `public`: welcome, employer information, and privacy pages;
- `voiceHelp`: voice-navigation help content;
- `voice`: voice panel, states, and localized feedback;
- `profile`: AI profile assistance, candidate setup, education, and disability labels;
- `dashboards`: candidate, employer, verifier, administrator, and candidate privacy interfaces.

Namespacing keeps feature ownership clear while the contract test prevents locale files from drifting apart. Translation resources remain bundled because this reduces operational complexity, while React routes are lazy-loaded. After route splitting, the largest initial JavaScript chunk is 458.89 kB and Vite no longer reports the 500 kB chunk warning; the candidate, employer, administrator, and verifier interfaces load as separate chunks.

## 4. Verification performed on 15 August 2026

| Check | Command or method | Result |
|---|---|---|
| Locale/key contract | `npm.cmd run test:i18n` | Passed: 3 locales, 7 namespaces |
| Frontend static analysis | `npx.cmd eslint src` | Passed: 0 errors, 0 warnings |
| Production compilation | `npm.cmd run build` | Passed; route splitting reduced the largest initial JavaScript chunk to 458.89 kB with no size warning |
| Browser language test | `npm.cmd run test:i18n-e2e` with local Vite server | Passed at 375 × 812 px |
| Browser assertions | Locale persistence, `lang`/`dir`, Arabic public/auth reflow, LTR email field, voice synchronization | Passed |
| Modified PHP controller syntax | `php -l backend/src/Controller/CandidatePrivacyController.php` | Passed |
| Voice Python unit tests | Compose voice service | Not executed: Docker engine was not running in the verification environment |

The browser test is evidence for its stated assertions, not a complete WCAG 2.1 AA audit or proof that every authenticated data state has been manually translated.

## 5. Required release follow-up

The following items remain before claiming complete production-quality trilingual support:

1. Have fluent French and Arabic reviewers approve disability, verification, privacy, scoring, and employment terminology.
2. Decide and implement a reviewed translation model for dynamic catalogue content: job titles, descriptions, tasks, and accommodation text. Do not use unreviewed runtime machine translation for eligibility or scoring facts.
3. Replace remaining server-originated prose contracts with stable API error/status codes where a frontend currently has to use a safe generic localized message.
4. Add a validated `preferredLocale` account field if language must follow an authenticated user across devices and drive server-generated email language.
5. Run the voice unit suite with Docker Desktop running:

   ```powershell
   docker compose -f backend/compose.yaml run --rm voice-navigation python -m unittest discover -s tests -v
   ```

6. Manually test the authenticated candidate, employer, verifier, and administrator journeys in all three languages with realistic data, keyboard-only operation, 200% zoom, and at least one documented NVDA/browser pairing.
7. Test Arabic and French speech recognition on target browsers/devices; recognition support depends on the browser and operating system, so typed operation must remain a complete fallback.
8. Continue tracking route and translation-resource sizes as the reviewed catalogue translations grow; introduce namespace lazy loading only if measurement shows a material benefit.

## 6. Engineering acceptance criteria

The multilingual feature can be marked release-ready only when:

- every supported route has reviewed English, French, and Arabic user-facing content;
- no missing-key output or silent fallback appears in a release build;
- dynamic safety-critical and scoring content follows an approved data translation policy;
- locale changes do not change canonical IDs, API enums, authorization, consent, verification, or scores;
- Arabic has no unintended horizontal scrolling and focus order remains meaningful;
- typed and voice input in all supported languages produces validated canonical operations;
- failures are announced accessibly in the selected language and never expose raw backend details;
- the manual device/screen-reader matrix and automated tests are recorded with actual results;
- unresolved limitations remain documented instead of being represented as completed conformance.
