# Multilingual frontend strategy: English, French, and Arabic

Status: **Architecture decision and implementation plan**  
Decision date: 15 August 2026  
Target interfaces: public pages, authentication, candidate, employer, verifier, administrator, privacy, AI profile, and voice-navigation interfaces  
Initial source language: English (`en`)  
Additional languages: French (`fr`) and Arabic (`ar`)

## 1. Executive decision

Use **i18next with react-i18next**, feature-based JSON translation resources, React's safe rendering, and the browser `Intl` APIs. Add a persistent, keyboard-accessible language selector and make the whole interface direction-aware. French uses left-to-right layout; Arabic uses right-to-left layout.

This is the best fit for the current application because it can be introduced route by route without replacing React Router or rewriting the dashboards. It provides namespaces, fallbacks, interpolation, plural rules, and lazy-loading support that would otherwise have to be implemented and maintained locally. Arabic pluralization is especially important: it is not adequately handled by a singular/plural Boolean.

This decision covers interface localization. It deliberately keeps the following concerns separate:

1. **Interface language**: menus, forms, errors, dialogs, dashboards, help, and privacy content.
2. **Spoken-command language**: the language selected in voice navigation.
3. **AI profile input language**: the language used for a spoken or written candidate narrative.
4. **Catalogue content language**: job, task, and disability names stored in the database.

The controls may use the interface language as their initial default, but users must be able to change spoken input independently. Changing the voice language must not unexpectedly change the whole interface.

No application code or stored data is changed by this document.

## 2. Current-state findings

The frontend is a React 19 and Vite application. It currently has no localization dependency, and most visible strings are embedded directly in JSX. The application contains public and authentication routes plus candidate, employer, verifier, and administrator interfaces.

The review identified these constraints:

- English is currently the effective interface language.
- The AI profile workflow already accepts English, French, or Arabic input, but that does not translate the complete interface.
- The current voice-navigation user interface exposes English and Arabic only. French voice commands are a separate feature that requires command/transcription testing; it must not be implied merely because the page is translated into French.
- Backend responses often provide English prose in a `message` field. Displaying that field directly prevents reliable frontend translation.
- Styles contain physical direction rules such as `left`, `right`, `margin-left`, `padding-right`, and `text-align: left`. These need an RTL review rather than a global visual flip.
- Job, task, and disability catalogue records are domain content, not interface labels. Their translation requires a reviewed content/data policy.

Therefore, replacing English words alone would not deliver a correct Arabic or French experience.

## 3. Goals and non-goals

### 3.1 Goals

- Let a user select English, French, or Arabic from every end-user area.
- Remember the selection on the same browser and, later, across devices for authenticated users.
- Translate visible text, accessible names, descriptions, validation, status announcements, page titles, and meaningful image alternatives.
- Render Arabic using a correct RTL reading and layout direction.
- Format user-facing dates, times, counts, and numbers according to the active locale.
- Preserve keyboard navigation, screen-reader behavior, responsive reflow, focus management, route protection, and business rules.
- Make missing translations detectable before release.
- Keep catalogue, voice, API, and email localization explicit instead of hiding gaps.

### 3.2 Non-goals

- Runtime machine translation of disability, verification, legal, privacy, or scoring terminology.
- Translating identifiers, email addresses, URLs, file names, database keys, or code.
- Changing matching mathematics, authorization, verification decisions, or consent rules based on locale.
- Claiming French or Arabic voice-command support until it has been separately validated.
- Claiming complete French/Arabic content if database catalogue records still fall back to English.

## 4. Solutions considered

Scores are project-specific: 1 is weak and 5 is strong. A higher total is preferable, but the explanatory trade-off is more important than the raw score.

| Criterion | Custom React context | React Intl / FormatJS | Lingui | i18next + react-i18next |
|---|---:|---:|---:|---:|
| Incremental migration of the existing JSX | 4 | 3 | 3 | **5** |
| Plurals and Arabic language rules | 1 | **5** | **5** | **5** |
| Feature namespaces and fallback behavior | 2 | 3 | 4 | **5** |
| Date and number formatting | 2 | **5** | 4 | 4 |
| Extraction/translator tooling | 1 | **5** | **5** | 4 |
| Runtime and build simplicity for this repository | **5** | 3 | 3 | 4 |
| Long-term maintainability | 2 | 4 | 4 | **5** |
| Ecosystem and documentation | 2 | **5** | 4 | **5** |
| **Total / 40** | **19** | **33** | **32** | **37** |

### Option A: custom React context and hand-written dictionaries

Example: a `LocaleProvider`, a `t(key)` function, and three JavaScript objects.

Advantages:

- Almost no dependency cost.
- Easy to demonstrate on a small page.
- Complete local control.

Disadvantages:

- The team must create fallback rules, nested-key handling, plural rules, interpolation, rich text, missing-key diagnostics, namespace loading, and test tooling.
- Arabic has several plural categories, so simplistic singular/plural handling produces incorrect language.
- The apparently small initial solution grows into an undocumented localization framework.

Decision: **rejected**. It is acceptable for a prototype with a few strings, not for this multi-role engineering application.

### Option B: React Intl / FormatJS

Advantages:

- Strong ICU MessageFormat support.
- Excellent date, time, number, select, and plural components.
- Mature message descriptors and extraction workflow.
- Good choice when an organization already uses an ICU-based translation platform.

Disadvantages:

- More message-descriptor and provider ceremony during an incremental conversion of the current JSX.
- Feature-resource organization and loading conventions would need more project-specific design.

Decision: **valid second choice**. Select it if formal ICU message extraction and an external translation-management pipeline become the dominant requirement.

### Option C: Lingui

Advantages:

- ICU messages, catalogue extraction, compilation, and React integration.
- Strong developer workflow and useful macros.

Disadvantages:

- Introduces a catalogue compilation/extraction workflow into a project that currently uses plain JavaScript and Vite without such a pipeline.
- Less direct for a gradual JSON-resource migration than react-i18next.

Decision: **valid alternative**, especially if compile-time catalogues and extraction become team priorities.

### Option D: i18next with react-i18next

Advantages:

- `useTranslation` integrates naturally with the current functional React components.
- Namespaces allow common, authentication, candidate, employer, verifier, and administrator content to be migrated independently.
- Built-in fallback and plural behavior, including rules based on `Intl.PluralRules`.
- Translation resources can start as reviewed JSON and later be loaded on demand.
- `Trans` supports sentences containing React links or emphasis without injecting raw HTML.
- The locale can be changed at runtime without replacing routing.

Disadvantages:

- Adds two runtime dependencies.
- Key discipline, translation review, RTL styling, and tests remain the project's responsibility.
- Date/number conventions still need agreed wrappers or formatting rules.

Decision: **selected**. It has the lowest migration risk and the best balance of capability and maintainability for this codebase.

## 5. Recommended architecture

### 5.1 Dependencies

Add these only when implementation begins:

```powershell
cd frontend
npm.cmd install i18next react-i18next
```

An automatic browser-language detector is optional. The initial implementation should use a small, deterministic resolver so the selection order and privacy behavior remain obvious.

### 5.2 Resource structure

Use semantic keys rather than English sentences as keys:

```text
frontend/src/i18n/
  index.js
  locales.js
  resources/
    en/
      common.json
      auth.json
      candidate.json
      employer.json
      verifier.json
      admin.json
      voice.json
      privacy.json
      validation.json
    fr/
      ...same namespaces...
    ar/
      ...same namespaces...
```

Good key:

```json
{
  "signIn": {
    "title": "Welcome back",
    "submit": "Sign in",
    "invalidCredentials": "The email or password is incorrect."
  }
}
```

Avoid keys such as `Welcome back` or `text1`. Semantic keys survive copy editing and can be checked consistently.

Start by bundling the resources because the application is currently modest. Introduce namespace lazy loading only if measurements show a meaningful bundle benefit.

### 5.3 Initialization

The implementation should conceptually follow this configuration:

```js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const supportedLocales = ["en", "fr", "ar"];

i18n.use(initReactI18next).init({
  supportedLngs: supportedLocales,
  fallbackLng: "en",
  lng: resolveInitialLocale(),
  defaultNS: "common",
  interpolation: { escapeValue: false },
  returnNull: false,
  resources,
});
```

`escapeValue: false` is appropriate because React escapes rendered values. Translation files must still be treated as trusted application assets, and the application must not render them through `dangerouslySetInnerHTML`.

### 5.4 Locale resolution and persistence

Use this priority:

1. Authenticated user's saved `preferredLocale`, once server persistence exists.
2. Browser-local value such as `join.locale`.
3. First supported value in `navigator.languages`.
4. English fallback.

Normalize regional variants to the supported base language: `fr-FR` becomes `fr`, and `ar-LB` becomes `ar`. Reject values outside the explicit allowlist.

The locale is not sensitive and may be kept in `localStorage`. Authentication tokens and other secrets must not be moved there as part of localization.

### 5.5 Document language and direction

Whenever the interface locale changes, update the root document immediately:

```js
function applyDocumentLocale(locale) {
  const language = normalizeSupportedLocale(locale);
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  localStorage.setItem("join.locale", language);
}
```

This is semantic information used by browsers and assistive technology, not merely a CSS preference. Arabic pages must use `<html lang="ar" dir="rtl">`; French pages use `<html lang="fr" dir="ltr">`.

Unknown user-generated text can use `dir="auto"`. Email addresses, URLs, identifiers, and other direction-sensitive fragments may need `<bdi>` or a local `dir="ltr"` wrapper inside an Arabic page.

### 5.6 Language selector

Use an ordinary labelled `<select>` initially. It is predictable on mobile, keyboard accessible, and screen-reader familiar. Show language names in their own languages and do not use flags:

- English
- Français
- العربية

The selector must be reachable on public pages, authentication pages, and every dashboard. A shared header placement is preferable; on narrow screens it must remain available without covering content.

Requirements:

- A persistent visible label such as “Language”.
- Native language names in the options.
- Keyboard selection using standard browser behavior.
- A polite status announcement after the change.
- No focus jump and no forced navigation.
- No loss of unsaved form data when switching.

### 5.7 URL decision

Three URL models were considered:

| Model | Strength | Cost | Decision |
|---|---|---|---|
| Stored preference, unchanged routes | Smallest routing/security impact; best for dashboards | Language is not encoded in a shared link | **Use now** |
| Locale prefix such as `/fr/privacy` | Shareable and useful for public-page search indexing | Requires route, redirect, canonical-link, and guard changes | Consider later for public content |
| Query such as `?lang=fr` | Shareable without route nesting | Noisy URLs and propagation rules | Do not use as primary model |

Protected route authorization must remain completely independent of locale.

## 6. RTL implementation for Arabic

RTL is a layout requirement, not a mirror-image effect. Convert physical CSS properties where direction matters:

| Physical rule | Direction-aware rule |
|---|---|
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `left` / `right` positioning | `inset-inline-start` / `inset-inline-end` |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` |
| `text-align: left` / `right` | `text-align: start` / `end` |

Additional rules:

- Mirror only icons that communicate direction, such as back/forward arrows or chevrons. Do not mirror logos, download icons, checkmarks, media controls, or arbitrary illustrations.
- Verify table column meaning and action order instead of blindly applying `row-reverse`.
- Keep telephone numbers, emails, URLs, file paths, and code readable using bidi isolation.
- Let labels and controls wrap. French text commonly needs more horizontal space than English.
- Use an Arabic-capable system font stack and verify actual glyph rendering on Windows, Android, and iOS.
- Test dialogs, fixed voice controls, navigation, tables, toasts, file inputs, and status badges in both directions.

## 7. Translating the complete user experience

The following are all translatable interface content:

- headings, navigation, buttons, tabs, links, and cards;
- field labels, placeholders, hints, option labels, and upload instructions;
- validation messages and backend error mappings;
- dialogs, confirmations, empty states, loading states, and success notices;
- `aria-label`, `aria-description`, visually hidden instructions, and live-region text;
- meaningful image alternative text;
- route/page titles and privacy/help text;
- voice-navigation control labels and spoken feedback templates;
- date, time, number, count, and pluralized content.

Do not concatenate translated fragments such as `"Hello " + name`. Use interpolation so each language controls word order:

```json
{
  "welcomeUser": "Welcome, {{name}}"
}
```

For text containing a link or emphasis, use `Trans` with an explicit component allowlist. Do not put arbitrary HTML in translation JSON.

## 8. API and backend boundary

### 8.1 Errors and status messages

The preferred API contract is a stable code plus optional parameters and an English fallback:

```json
{
  "code": "AUTH_INVALID_CREDENTIALS",
  "params": {},
  "fallbackMessage": "Invalid credentials."
}
```

The frontend maps the stable code to `api.AUTH_INVALID_CREDENTIALS`. The fallback supports logs, older clients, and unknown codes. Do not infer keys from mutable English prose.

Locale must never affect authentication, authorization, scoring, verification, or consent enforcement. Only an allowlisted locale may influence presentation.

### 8.2 Server-generated emails

Password reset, verification, and decision emails are generated outside React and therefore need server-side localization. Add a validated `preferredLocale` field only when cross-device persistence and localized email delivery are implemented. Symfony's translation layer can then select reviewed email templates using that value, with English fallback.

### 8.3 Catalogue and database content

Interface localization and domain-data localization are separate deliverables. Job definitions, tasks, disability categories, and scoring labels must not be machine-translated at runtime.

Until reviewed translations exist, return the English value together with its language and render it with `lang="en" dir="auto"`. The interface can be Arabic while a clearly isolated catalogue term remains an English fallback.

For a complete multilingual catalogue, use translation records keyed by stable entity IDs, for example:

```text
job_definition_translation(job_definition_id, locale, name, description)
job_task_translation(job_task_id, locale, name)
disability_translation(disability_id, locale, name)
```

Apply a unique constraint on `(entity_id, locale)`. Keep IDs, weights, mandatory flags, and scoring inputs language-neutral. The API should return the localized display value plus its effective locale so the frontend can identify a fallback.

The workbook importer should be extended only after the French and Arabic source columns and terminology have been validated. Importing translated labels must create a new, documented catalogue version; it must not alter scoring mathematics or silently reinterpret empty cells.

## 9. Voice and AI-language behavior

Use three explicit state values rather than one overloaded `language` value:

```text
uiLocale             en | fr | ar
voiceCommandLanguage en | ar | fr only after validation
profileInputLanguage en | fr | ar
```

Recommended behavior:

- The first visit can initialize voice/profile language from the UI locale when supported.
- After a user explicitly chooses a voice or input language, preserve that independent selection.
- Changing `uiLocale` translates the voice-control buttons and instructions but does not silently alter an active recording language.
- Add French to voice commands only after transcription, intent interpretation, confirmation, help, error, and speech-output paths are tested with French speakers and accents.
- An untranslated voice feature must expose an honest fallback rather than pretending full support.

## 10. Translation quality and governance

Use English as the controlled source and maintain a terminology glossary before bulk translation. At minimum, the glossary must cover:

- person with disability / candidate;
- disability card and authorized verifier;
- verification status;
- feasibility, not feasible, and needs assistance;
- compatibility/match result;
- consent, privacy, retention, deletion, and withdrawal;
- application, employer, task, skill, and accommodation.

French and Arabic copy must be reviewed by native or professionally qualified reviewers. Legal/privacy, disability, verification, safety, and scoring language requires domain review. Machine translation may help draft low-risk text, but it cannot be the approval source for sensitive content.

Every translation change should identify:

- source English version;
- reviewer;
- review date;
- affected namespace;
- terminology or policy version when relevant.

## 11. Accessibility requirements

Localization must preserve the existing WCAG work and add language-specific checks:

- Correct root `lang` and `dir` after initial load and every language change.
- A consistently placed, keyboard-operable language control.
- Visible focus in LTR and RTL modes.
- Translated accessible names, descriptions, errors, and live-region announcements.
- No focus movement merely because the language changes.
- Logical reading order and heading hierarchy in all languages.
- No text clipping at 200% zoom or with WCAG text spacing.
- Sufficient contrast for all localized states.
- User-generated mixed-language content uses appropriate bidi isolation.
- Screen-reader pronunciation is checked rather than assumed from visible text.

Language-switch announcements should be short and written in the newly selected language. The status region should use `aria-live="polite"` and should not steal focus.

## 12. Security and privacy requirements

- Allow only `en`, `fr`, and `ar`; reject or normalize every other locale value.
- Keep locale selection separate from identity, role, and permissions.
- Do not render translation content as raw HTML.
- Continue relying on React escaping for interpolated user values.
- Do not place sensitive data in translation resources or localization logs.
- Do not send page content to an external translation service at runtime.
- Avoid logging candidate narratives while diagnosing missing translations.
- Translate consent accurately; do not treat translated consent as a new legal version unless its meaning or policy actually changes.

## 13. Phased implementation plan

### Phase 0: inventory and terminology

- Create a route/component/string inventory.
- Classify strings as UI copy, API copy, database content, email, voice, validation, or accessibility text.
- Approve the French/Arabic glossary.
- Freeze stable semantic translation-key conventions.

Exit condition: no major user-facing text category is unclassified.

### Phase 1: localization foundation

- Install and initialize i18next/react-i18next.
- Add locale metadata, resolver, persistence, and fallback.
- Set root `lang` and `dir` before/at first render to avoid an incorrect-direction flash.
- Add the shared language selector and polite status announcement.
- Introduce date/number formatting helpers.
- Add locale-parity and missing-key checks.

Exit condition: the selector works on every route and the document attributes are correct, even though some routes may still fall back to English.

### Phase 2: public and authentication interfaces

- Welcome, employers, privacy, voice help, sign-up, sign-in, forgot/reset password.
- Translate validation, candidate-verification instructions, document messages, and authentication errors.
- Establish API error-code mappings.

Exit condition: an unauthenticated user can complete every available flow in all three UI languages.

### Phase 3: candidate experience

- Profile setup, editable transcript, AI suggestions, jobs, matching, applications, dialogs, files, and privacy controls.
- Keep UI, profile-input, and spoken-command languages distinct.
- Isolate untranslated catalogue fallbacks.

Exit condition: a candidate can complete the end-to-end workflow with no untranslated interface controls.

### Phase 4: employer, verifier, and administrator

- Translate navigation, tables, filters, forms, dialogs, status transitions, and document controls.
- Verify long French labels and Arabic table/action order.
- Ensure all operations remain keyboard accessible.

Exit condition: every management operation is usable and announced correctly in all three locales.

### Phase 5: backend content and communication

- Complete stable API codes.
- Store authenticated preferred locale if cross-device/email localization is required.
- Localize server-generated emails.
- Add reviewed catalogue translation tables/import logic if approved.

Exit condition: backend-generated user communication and agreed catalogue content have reviewed locale behavior and English fallbacks.

### Phase 6: RTL and release verification

- Replace remaining direction-sensitive CSS with logical properties.
- Test every state at the required responsive sizes.
- Resolve localization, bidi, overflow, pronunciation, focus, and announcement failures.
- Update the WCAG evidence without making an unsupported conformance claim.

Exit condition: all definition-of-done items below have evidence.

## 14. Verification plan

### 14.1 Automated checks

- Production build and ESLint.
- Script ensuring every required English key exists in French and Arabic.
- Script rejecting unexpected locale values and accidental raw translation keys.
- Component tests for fallback, interpolation, plurals, and locale persistence.
- Playwright tests that switch each language and assert root `lang`/`dir`.
- End-to-end authentication and role-route tests in each locale.
- axe scans for representative public and dashboard states in LTR and RTL.
- Visual screenshots for French expansion and Arabic RTL layouts.
- API tests for code-to-message mapping and unknown-code fallback.

### 14.2 Manual matrix

Test English, French, and Arabic at:

- 320, 375, 768, 1024, and 1440 CSS pixels;
- actual browser 200% zoom;
- WCAG text-spacing overrides;
- relevant landscape orientations;
- keyboard only, including forward/backward focus and project arrow navigation;
- at least one documented NVDA and browser combination;
- Android and iOS browser controls for the language selector and file inputs.

For each locale verify:

- first visit, saved preference, sign-in, sign-out, and protected-route redirect;
- headings, navigation, dialog focus, validation, toasts, status announcements, and empty/loading states;
- long French translations without truncation;
- Arabic RTL order, bidi mixed content, directional icons, tables, and forms;
- singular and plural counts, including Arabic plural categories;
- localized dates/numbers without changing stored values;
- independent UI, voice, and profile-input languages;
- missing catalogue translation fallback with the correct content language.

## 15. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Literal or machine translation of disability terminology | Harmful or inaccurate wording | Controlled glossary and qualified human review |
| One locale state reused for voice, AI input, and UI | Unexpected behavior and failed transcription | Three explicit state values with separate controls |
| Direct display of backend English messages | Mixed-language pages | Stable API codes, localized mapping, and fallback |
| Global CSS mirroring | Incorrect icons, forms, tables, or media | Logical properties and state-by-state RTL review |
| Missing keys appear as raw identifiers | Unprofessional and inaccessible output | CI parity check plus English fallback |
| Locale switch reloads a form | Loss of unsaved data | Runtime language change without navigation/reload |
| Database content remains English | Incomplete localization claim | Mark fallback language and document catalogue scope |
| French/Arabic bundles increase initial load | Performance regression | Measure first; lazy-load namespaces only if justified |
| Locale affects authorization logic | Security defect | Keep presentation locale outside access-control decisions |

## 16. Definition of done

The multilingual frontend is complete only when:

- English, French, and Arabic are selectable from every end-user interface.
- The selection persists predictably and uses an allowlisted fallback.
- Every supported route has translated visible and assistive-technology text.
- `<html lang>` and `<html dir>` always match the effective UI locale.
- Arabic layouts have no incorrect order, overlap, clipping, or avoidable horizontal scrolling.
- French expansion does not truncate controls or hide actions.
- Dates, numbers, counts, interpolation, and plurals are locale-correct.
- API errors shown to users are localized through stable codes or an explicitly tested fallback.
- UI locale, voice-command language, and AI profile-input language behave independently.
- Sensitive French and Arabic terminology has recorded human/domain review.
- Catalogue fallbacks are isolated and disclosed, or reviewed catalogue translations are implemented.
- Keyboard, screen-reader, responsive, text-spacing, zoom, and RTL tests pass with saved evidence.
- Build, lint, locale-parity, integration, E2E, accessibility, and relevant performance checks pass.
- Project documentation states any unresolved limitation; it does not make an unsupported full-localization or WCAG conformance claim.

## 17. Recommended first implementation slice

Implement a vertical slice before translating every page:

1. Add the i18n foundation and document attributes.
2. Add the shared language selector.
3. Translate common navigation and the sign-in page into all three languages.
4. Map the invalid-credentials API result to a stable translation key.
5. Refactor the sign-in layout to logical CSS properties.
6. Test persistence, keyboard use, NVDA, 320 px, 200% zoom, French expansion, and Arabic RTL.

This slice proves the architecture across React, API errors, accessibility, responsive layout, persistence, and RTL before the larger route-by-route migration.

## 18. Primary technical references

- [react-i18next quick start](https://react.i18next.com/guides/quick-start)
- [react-i18next `useTranslation` hook](https://react.i18next.com/latest/usetranslation-hook)
- [i18next namespaces](https://www.i18next.com/principles/namespaces)
- [i18next plural handling](https://www.i18next.com/translation-function/plurals)
- [FormatJS React Intl](https://formatjs.github.io/docs/react-intl/)
- [FormatJS React components and ICU messages](https://formatjs.github.io/docs/react-intl/components/)
- [Lingui introduction](https://lingui.dev/introduction)
- [W3C: structural markup and right-to-left text](https://www.w3.org/International/questions/qa-html-dir.en.html)
- [W3C internationalization quick tips](https://www.w3.org/International/quicktips/index)
