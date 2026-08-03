# Responsive design and WCAG 2.1 AA baseline audit

Audit date: 3 August 2026

Target: current `zm` working tree

Browser engine: Microsoft Edge 151.0.4129.59 through Playwright Core

Automated rules: axe-core WCAG 2.0/2.1 A and AA tags

## Outcome

The baseline covered all 13 registered application routes at five required widths, a landscape viewport, a text-spacing override, a simulated 200% zoom condition, and automated keyboard traversal. Ten additional authenticated dashboard states and a dedicated incomplete candidate-profile fixture were also exercised.

The audit recorded 10 consolidated product issues: one Critical, eight High, and one Medium. The main risks are mobile dashboard reflow, content obscured by the voice panel, low-contrast secondary/status text, inaccessible horizontally scrollable admin tables, and generic titles on two routes. The authoritative prioritized list is the [issue matrix](ISSUE_MATRIX.md).

No source-level accessibility corrections were made as part of this baseline. The audit runner and evidence were added so corrections can be retested consistently.

## Route inventory

| Route | Access | Primary page/component | Important states included |
|---|---|---|---|
| `/` | Public | `WelcomePage` | Header, hero, calls to action, footer |
| `/signin` | Public | `SignInPage` | Credentials form and password visibility control |
| `/signup` | Public | `SignUpPage` | Role selection, candidate disability-card upload, consent, validation |
| `/forgot-password` | Public | `ForgotPasswordPage` | Email submission and status feedback |
| `/reset-password` | Public | `ResetPasswordPage` | Token/password form and status feedback |
| `/employers` | Public | `EmployersPage` | Employer information and calls to action |
| `/voice-help` | Public | `VoiceNavigationHelpPage` | Voice instructions and supported commands |
| `/privacy` | Public | `PrivacyPage` | Versioned privacy notice |
| `/candidate` | Candidate | `CandidateDashboard` | Jobs, My Applications, My Profile, Privacy & data |
| `/candidate/setup` | Candidate | `CandidateProfileSetup` | Incomplete-profile introduction, AI assistance, manual form |
| `/employer` | Employer | `EmployerDashboard` | My Jobs, Applications, Company Profile |
| `/admin` | Administrator | `AdminDashboard` | Active users, archived users, applications, candidate profiles |
| `/verifier` | Verifier | `VerifierDashboard` | Pending, approved, and rejected verification requests |

Protected routes were loaded with the corresponding development fixture role. `/candidate/setup` was separately tested with a temporary incomplete candidate account because the normal candidate fixture correctly redirects a completed profile to `/candidate`. The temporary account and uploaded probe document were removed after the scan.

## Important component inventory

| Area | Components or patterns reviewed |
|---|---|
| Global accessibility | `SkipLink`, `RouteAccessibility`, `ArrowKeyFocusNavigation`, global `:focus-visible` rules |
| Global interaction | `VoiceNavigationControl`, site header/footer, client-side route changes |
| Authorization | `RoleRoute` and role-specific landing routes |
| Forms | Sign-in, registration/upload/consent, password recovery/reset, candidate profile, employer job/profile forms |
| Candidate | Job cards, applications, profile progress/steps, AI profile builder, privacy controls |
| Employer | Fixed dashboard sidebar, job catalogue forms, application list, company profile |
| Administrator | Fixed dashboard sidebar, stat cards, filters, user/application/profile tables |
| Verifier | Status tabs, request cards, protected document review, approve/reject dialogs |
| Dialog behavior | Shared `useDialogFocus` usage and dashboard dialogs represented in source/manual review |

## Test matrix and method

| Scenario | Automated execution | What was checked |
|---|---|---|
| 320x800 | All routes; selected dashboard states | Reflow, clipping, horizontal overflow, axe rules, screenshots |
| 375x812 | All routes; selected dashboard states | Common mobile layout, text wrapping, state-specific controls |
| 768x1024 | All routes | Tablet/portrait layout and axe rules |
| 1024x768 | All routes and dashboard states | Desktop-small layout plus automated Tab/Shift+Tab sequence |
| 1440x900 | All routes; selected dashboard states | Wide desktop layout and axe rules |
| 667x375 landscape | All routes | Short-height/landscape content visibility and fixed overlays |
| 200% scenario | All routes; selected dashboard states | 320 CSS px-equivalent reflow using CSS zoom in headless Edge |
| WCAG text spacing | All routes; selected dashboard states | 1.5 line height, 2x paragraph spacing, 0.12em letter spacing, 0.16em word spacing |

For each route/scenario, the runner captures the final URL, title, viewport and document dimensions, likely overflow offenders, landmark/heading counts, console errors, failed requests, and compact axe results. Screenshots are deliberately representative rather than a claim that visual inspection alone establishes conformance.

## Automated and keyboard summary

- 104 initial route/scenario combinations completed without scan errors.
- Axe found repeated `color-contrast` failures across nine route groups and an additional `scrollable-region-focusable` failure in two mobile admin states.
- Initial pages exposed an HTML language, a main landmark, and one H1 in the tested state; no automated missing-language/main/H1 flag was recorded.
- The skip link was the first Tab stop on the initial public and dashboard route tests.
- Automated Tab/Shift+Tab traversal completed on the initial routes and ten authenticated dashboard states without detecting a simple keyboard trap.
- The repository already provides a strong global visible focus indicator. This positive result does not replace manual checks of focus order, dialogs, dynamic error announcements, or screen-reader output.
- Horizontal overflow was directly measured on candidate pages, including 378 px content at 320 px on `/candidate` and 458 px content at 320/375 px on `/candidate/setup`.
- The employer/admin dashboards can conceal their failure behind an internally scrollable container; visual review confirmed that their fixed mobile sidebars compress the working area to an unusable strip.

## Evidence

Machine-readable reports are stored beside this document:

- `baseline-results.json`: all routes and all eight baseline scenarios.
- `mobile-320-results.json`, `landscape-results.json`, `zoom-200-results.json`, and `text-spacing-detail.json`: focused responsive reruns.
- `dashboard-state-results.json` and `dashboard-state-keyboard-results.json`: authenticated secondary tabs and keyboard sequences.
- `candidate-state-mobile-results.json`: candidate Applications, Profile, and Privacy states.
- `candidate-setup-results.json`: dedicated incomplete-profile fixture.
- `verifier-state-results.json`: approved-verification state.
- `screenshots/`: 48 representative PNG captures.

## Reproduce the audit

Start the backend/API services and Vite frontend, then run from `frontend`:

```powershell
npm.cmd install
npm.cmd run audit:wcag
```

Defaults are `http://127.0.0.1:5173`, `http://127.0.0.1:8081/api`, the fixture password documented in the project README, and the installed Microsoft Edge executable. Useful optional environment variables are defined at the top of `scripts/wcag-baseline-audit.mjs`, including route/scenario filters, screenshots, dashboard-state coverage, and a dedicated candidate token.

## Completion status for baseline phase

- [x] Inventory every registered route and important component area.
- [x] Exercise 320, 375, 768, 1024, and 1440 pixel widths.
- [x] Exercise landscape, WCAG text spacing, and a repeatable 200% reflow scenario.
- [x] Run automated WCAG 2.1 A/AA scans.
- [x] Record initial keyboard traversal and inspect representative focus/reflow behavior.
- [x] Create a criterion/severity/page/remediation issue matrix.
- [ ] Confirm actual browser-native 200% zoom and complete screen-reader/manual interaction testing during the full WCAG audit phase.
