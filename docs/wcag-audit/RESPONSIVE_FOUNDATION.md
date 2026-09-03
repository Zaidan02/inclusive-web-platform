# Responsive foundation implementation

Implemented: 6 August 2026  
Branch: `zm`

## Outcome

The frontend now uses shared responsive tokens and consistent mobile behavior for page gutters, content widths, control sizing, dashboard navigation, tables, dialogs, forms, cards, and the voice-navigation control. The work addresses the reflow issues identified in the WCAG baseline without changing application roles, workflows, matching logic, or stored data.

## Shared foundation

- Added reusable spacing, page-gutter, container-width, control-height, and control-radius tokens in `src/index.css`.
- Standardized full-width/minimum-width behavior so media, controls, route content, and app roots cannot create accidental horizontal overflow.
- Used `minmax(0, ...)`, `min-width: 0`, safe wrapping, and fluid containers wherever grid/flex children contain long labels or user-entered data.
- Preserved the existing visible keyboard-focus treatment.

## Responsive rules

| Breakpoint | Behavior |
|---|---|
| `<= 760px` | Admin/employer dashboards switch from fixed sidebar to compact top navigation; main content uses fluid page gutters; two-column forms and profile layouts become one column; dialogs use viewport-safe width and height. |
| `<= 720px` | Landing-page header switches to compact navigation before its actions can overflow at zoom. |
| `<= 640px` | The voice control starts compact and page content reserves bottom space for it. Its optional panel expands only when requested or when voice is active. |
| `<= 520px` | Dashboard data tables change to labelled card rows; candidate disability options use two columns; dashboard stat cards use one column. |

## Corrected areas

- Candidate dashboard: header, account controls, tabs, profile steps, profile form, disability cards, job cards, company dialog, and company metadata reflow.
- Candidate profile setup: fluid shell/card widths, safe title/text wrapping, responsive heading scale, and resilient option grid.
- Employer dashboard: sidebar, job form, selection controls, job cards, application table, company profile layout, and dialogs reflow.
- Administrator dashboard: sidebar, page header, statistics, users table, applications table, profile views, and dialogs reflow.
- Tables: mobile tables retain their semantic HTML table structure on larger screens and become labelled rows at narrow widths. Scroll regions remain focusable for keyboard users before that breakpoint.
- Voice control: compact default on small/short viewports, controllable options panel, responsive size limits, and a darker disclosure color.
- Public pages: landing-header compaction begins earlier; the shared sizing rules also protect authentication forms and privacy/voice pages.

## Verification

- `npm.cmd run build` passes.
- ESLint passes with no errors or warnings after the final hook-stability pass.
- A focused public scan completed 40 checks across `/`, authentication pages, `/employers`, `/voice-help`, and `/privacy` at 320 px, 375 px, landscape, text spacing, and 200%-equivalent zoom: all reported **no overflow** and **no automated WCAG A/AA violation**.
- A protected-route scan completed 25 checks across candidate, employer, admin, and verifier dashboards under the same conditions: all reported **no overflow**. Its remaining automated findings are colour-contrast issues tracked separately from responsive reflow.
- A secondary-dashboard-state scan covered candidate, employer, admin, and verifier tabs. It found one 12 px candidate-profile overflow at simulated 200% zoom; the profile fields were then changed to a single-column responsive layout at the 760 px breakpoint and the production build was revalidated.

## Final targeted regression command

Once Docker Desktop and the local services are running, repeat this final targeted check from `frontend`:

```powershell
$env:WCAG_INCLUDE_DASHBOARD_STATES='true'
$env:WCAG_ROUTE_FILTER='/candidate'
$env:WCAG_SCENARIO_FILTER='zoom-200'
npm.cmd run audit:wcag
```

All three candidate dashboard states should report `no-overflow`. Then run the full audit:

```powershell
npm.cmd run audit:wcag
```

The remaining WCAG work is contrast remediation and full manual assistive-technology testing, not this responsive foundation.
