# WCAG 2.1 AA Final Audit Report

Audit status: **remediation complete; final rendered conformance verification pending**  
Project branch: `zm`  
Report date: 6 August 2026  
Standard: WCAG 2.1 Level AA

## Conformance statement

This report does **not** claim WCAG 2.1 AA conformance. The code corrections,
production build, lint, static source review, and historical automated baseline
are evidence of substantial remediation. A new live browser/axe run, manual
native 200% zoom check, screen-reader checks, and representative authenticated
workflow checks are still required before making a compliance claim.

## Scope

All registered frontend routes and important states are in scope:

- Public and authentication: welcome, employers, privacy, voice help, sign-up,
  sign-in, password recovery, and password reset.
- Candidate: setup, profile, AI-assisted transcript and suggestion review, jobs,
  applications, file uploads, dialogs, and privacy controls.
- Employer, verifier, and administrator dashboards: navigation, forms, task
  selection, filters, tables, document controls, dialogs, and status updates.
- Shared behavior: skip navigation, route titles/focus, arrow-key navigation,
  focus visibility, contrast, reduced motion, landmarks, alternative text, and
  ARIA relationships.

## Evidence and completed checks

| Evidence | Result | Date/status |
|---|---|---|
| Historical Playwright + axe baseline | 104 baseline route/scenario combinations and authenticated state scans recorded. Ten issues identified. | 3 Aug 2026, before remediation; see [baseline audit](BASELINE_AUDIT.md). |
| Production build | `npm.cmd run build` passed. | 6 Aug 2026 |
| Static lint | `npx.cmd eslint src` returned zero errors and zero warnings. | 6 Aug 2026 |
| Diff validation | `git diff --check` passed. | 6 Aug 2026 |
| Static contrast review | Known low-contrast shared colours (`#94a3b8`, `#91a2c7`, `#7183a8`, `#9ca3af`, `#a0aec0`) no longer occur in frontend source. | 6 Aug 2026 |
| Live post-remediation axe/reflow matrix | Not run: frontend server was not available at `127.0.0.1:5173` during this audit session. | Pending |
| Manual browser zoom and screen-reader checks | Not run in this session. | Pending |

The previous machine-readable files in this folder are retained as baseline
evidence. They must not be represented as post-remediation results.

## Issue, correction, and retest matrix

| Baseline ID | WCAG criterion | Correction completed | Code/static retest | Rendered retest | Current status |
|---|---|---|---|---|---|
| RESP-001 | 1.4.10 Reflow; 2.1.1 Keyboard | Reworked dashboard breakpoints, sidebar navigation, form grids, table-to-card layout, dialogs, and narrow-width containers in shared dashboard CSS. | Build passed; responsive CSS inspected. | Run 320 px, 375 px, and native 200% tests for employer/admin tabs. | Pending rendered retest |
| RESP-002 | 1.4.10 Reflow; 1.4.12 Text Spacing | Candidate tabs, cards, profile fields, steps, jobs, and dialog layouts reflow at narrow widths. | Build passed; responsive selectors present. | Run candidate jobs/profile/applications/privacy at mobile and text-spacing scenarios. | Pending rendered retest |
| RESP-003 | 1.4.10 Reflow; 1.4.12 Text Spacing | Candidate setup fields use a mobile one-column layout; cards and text wrap safely. | Build passed; setup CSS inspected. | Run incomplete candidate setup at 320 px, text spacing, and native 200% zoom. | Pending rendered retest |
| RESP-004 | 1.4.10 | Voice panel was made compact/responsive and its controls remain accessible; shared focus and reduced-motion behavior were retained. | Build passed; component/CSS reviewed. | Verify the panel never obscures focused controls at narrow/landscape viewports. | Pending rendered retest |
| RESP-005 | 1.4.10 | Public responsive foundation standardizes compact header, containers, and action wrapping. | Build passed; foundation evidence recorded. | Run welcome route at native 200% zoom and 320 CSS px. | Pending rendered retest |
| A11Y-001 | 1.4.3 Contrast (Minimum) | Shared muted foreground values were raised, including voice controls and secondary text. | Known baseline muted colour values absent from source. | Run axe contrast scans in default, expanded, listening, success, and error voice states. | Pending rendered retest |
| A11Y-002 | 1.4.3 Contrast (Minimum) | Candidate/employer/admin secondary text, labels, empty states, and controls were updated to a darker shared foreground. | Known baseline muted colour values absent from source. | Run axe contrast scans across dashboard states and inspect status badges. | Pending rendered retest |
| A11Y-003 | 1.4.3 Contrast (Minimum) | Status and management control foreground/background treatments were reviewed and strengthened during dashboard corrections. | Build passed; shared contrast pass completed. | Axe/manual retest of accepted, rejected, in-review, warning, disabled, hover, and focus states. | Pending rendered retest |
| A11Y-004 | 2.1.1 Keyboard | Responsive table/card behavior, named keyboard-focusable table regions, and keyboard management controls are in place. | Build passed; table regions retain names and `tabIndex="0"`. | Verify mobile tables/card layout and arrow-key behavior without conflict with global arrow navigation. | Pending rendered retest |
| A11Y-005 | 2.4.2 Page Titled | Added descriptive privacy and verifier page titles. | Source review passed. | Confirm titles after browser client-side navigation. | Pending rendered retest |

## Additional remediation completed

| Area | Relevant WCAG criteria | Correction |
|---|---|---|
| Form validation | 3.3.1, 3.3.2, 3.3.3, 4.1.3 | Required controls have labels, invalid states, linked error messages, first-invalid-field focus, and success/error announcements. |
| Keyboard and focus | 2.1.1, 2.1.2, 2.4.3, 2.4.7 | Skip link, route focus, visible focus, dialog trapping/restoration, Escape handling, and requested Left/Right arrow navigation are implemented. |
| Semantics and names | 1.1.1, 1.3.1, 2.4.6, 4.1.2 | Headings, footer/navigation groups, privacy regions, named controls, meaningful image alternatives, and dialog/tab semantics were corrected. |
| Status and privacy actions | 4.1.3 | AI, application, verification, import, account/privacy, and management outcomes use status/error patterns. |
| Motion | 2.3.3 (AAA advisory) | Global `prefers-reduced-motion` behavior now disables nonessential animation and transitions. |

Detailed implementation evidence is available in the phase documents:

- [Responsive foundation](RESPONSIVE_FOUNDATION.md)
- [Public and authentication review](PUBLIC_AUTHENTICATION_ACCESSIBILITY.md)
- [Candidate experience review](CANDIDATE_EXPERIENCE_ACCESSIBILITY.md)
- [Management dashboards review](MANAGEMENT_DASHBOARDS_ACCESSIBILITY.md)
- [Shared WCAG corrections](SHARED_WCAG_CORRECTIONS.md)

## Required final retest procedure

1. Start backend services with fixture data and start Vite on port 5173.
2. Run the baseline script using the command below.
3. Repeat it for dashboard states with `WCAG_INCLUDE_DASHBOARD_STATES=true`.
4. Perform the manual checks in the updated [keyboard test plan](../keyboard-navigation-test-plan.md).
5. Test native browser zoom at 200%, not only the headless CSS-zoom scenario.
6. Test at least one screen reader/browser pairing (NVDA + Edge is recommended
   on Windows) for route changes, validation, AI review, application submission,
   dialogs, verifier review, and admin management actions.
7. Update the "Rendered retest" column above with the date, tester, browser,
   result, evidence-file path, and any defect ID. Only then decide whether a
   WCAG conformance claim is justified.

```powershell
cd C:\Users\User\Desktop\FYP_26\inclusive-web-platform-main\frontend
npm.cmd run dev

# In a second terminal after the frontend and backend are available:
npm.cmd run audit:wcag

# Dashboard-state matrix:
$env:WCAG_INCLUDE_DASHBOARD_STATES = 'true'
$env:WCAG_OUTPUT = '..\docs\wcag-audit\post-remediation-dashboard-results.json'
npm.cmd run audit:wcag
```

## Known limitations

- The audit runner's 200% scenario uses CSS zoom to test reflow. It is useful
  repeatable evidence but does not replace browser-native 200% zoom.
- Automated axe checks cannot prove reading order, meaningful alternative text,
  the quality of instructions, focus visibility, error recovery, or
  screen-reader announcement quality.
- Authenticated results depend on the development fixtures and backend/API
  services being available. No final post-remediation browser run is recorded
  until those services and the frontend server are running together.
- React hook dependencies and long-lived voice-action listeners were stabilized;
  the final lint run reports no warnings.
