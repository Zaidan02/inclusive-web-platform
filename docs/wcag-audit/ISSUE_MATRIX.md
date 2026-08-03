# WCAG 2.1 AA baseline issue matrix

Audit date: 3 August 2026

Branch: `zm`

Standard: WCAG 2.1 Level AA

Status: Baseline findings; no remediation is claimed by this document.

Severity uses the following project scale:

- **Critical**: prevents a core task for a significant user group or at a required test condition.
- **High**: fails an A/AA requirement or seriously obstructs content or controls.
- **Medium**: localized conformance or usability failure with a practical workaround.
- **Low**: limited impact, advisory improvement, or audit-environment observation.

| ID | WCAG criterion | Severity | Affected page/state | Evidence | Required correction | Status |
|---|---|---:|---|---|---|---|
| RESP-001 | 1.4.10 Reflow; 2.1.1 Keyboard | Critical | `/admin` and `/employer`, including dashboard tabs | At 320 px and the 200% scenario, the fixed 190 px sidebar leaves a narrow, unusable content column. Admin tables use internal horizontal scrolling rather than reflow. See `admin-width-320.png`, `admin-zoom-200.png`, `employer-width-320.png`, and `employer-zoom-200.png`. | Replace the fixed mobile sidebar with a compact top navigation or accessible disclosure/drawer; render forms and summary cards in one column; convert wide tables to responsive cards or an accessible scroll region; eliminate page-level horizontal scrolling at 320 CSS px. | Open |
| RESP-002 | 1.4.10 Reflow; 1.4.12 Text Spacing | High | `/candidate`, Jobs and My Profile states | The dashboard reaches 378 px at a 320 px viewport, 415 px at 375 px, and 431 px with text spacing. The three-column job layout, navigation tabs, and non-wrapping three-step profile indicator are clipped. See `candidate-width-320.png`, `candidate-text-spacing-375.png`, and `candidate-profile-width-375.png`. | Change job cards and profile sections to a single-column mobile layout; allow tabs and the progress indicator to wrap or switch to a vertical layout; apply `min-width: 0` and safe word wrapping to flex/grid children. | Open |
| RESP-003 | 1.4.10 Reflow; 1.4.12 Text Spacing | High | `/candidate/setup` | Dedicated incomplete-profile fixture: document width is 458 px at 320/375 px and with text spacing; it reaches 994 px in the 200% scenario. Introductory text and the AI profile card are clipped. See `candidate-setup-width-320.png`, `candidate-setup-text-spacing-375.png`, and `candidate-setup-zoom-200.png`. | Constrain the intro and cards to the viewport; remove fixed/minimum widths; add `min-width: 0`, `overflow-wrap: anywhere`, responsive typography, and single-column option layouts at narrow widths. | Open |
| RESP-004 | 1.4.10 Reflow; 2.4.11 Focus Not Obscured (Enhanced, advisory for WCAG 2.1) | High | Global voice navigation control on public, authentication, candidate, employer, admin, and verifier pages | The expanded fixed voice panel covers forms, buttons, cards, and dashboard content at 320 px, landscape 667x375, text spacing, and 200%. Representative evidence: `signup-width-320.png`, `candidate-landscape-667x375.png`, and `admin-zoom-200.png`. | Default to a compact/collapsed control on constrained viewports; provide an explicit accessible expand/collapse button; constrain panel size; reserve safe page space or reposition it so it never covers the currently focused control or essential content. | Open |
| RESP-005 | 1.4.10 Reflow | High | `/` | Header actions and content overflow in the simulated 200% scenario. See `home-zoom-200.png`. | Trigger the compact header earlier, permit safe wrapping, and verify all actions fit at a 320 CSS px equivalent without horizontal scrolling. | Open |
| A11Y-001 | 1.4.3 Contrast (Minimum) | High | Global voice navigation disclosure/help text | Axe reports `#94a3b8` on white at approximately 2.56:1; normal text requires at least 4.5:1. The same component causes failures across most routes. | Replace the muted foreground token with a color that provides at least 4.5:1 against every actual panel background, then test default, expanded, listening, success, and error states. | Open |
| A11Y-002 | 1.4.3 Contrast (Minimum) | High | Candidate, employer, and admin dashboard states | Muted text using `#94a3b8` measures about 2.43–2.56:1 on white and `#f7f9fd`. It affects labels, summaries, empty states, and secondary information. | Introduce an accessible secondary-text token meeting 4.5:1 on all dashboard surfaces and replace low-contrast usages; retain meaning without relying on color alone. | Open |
| A11Y-003 | 1.4.3 Contrast (Minimum) | High | Admin verified/status controls; employer status and delete controls | Axe reports green text near 3.14:1, orange status text near 3.07:1, and red delete text near 4.41:1. | Darken foreground colors or change badge backgrounds so normal text reaches 4.5:1; validate every status, hover, focus, disabled, and destructive state. | Open |
| A11Y-004 | 2.1.1 Keyboard | High | `/admin`, Archived Users and Applications states at mobile widths | Axe `scrollable-region-focusable`: horizontally scrollable `<div>` containers are not keyboard focusable, so keyboard users cannot operate the scroll area. Recorded in `dashboard-state-results.json`. | Prefer a responsive card/list layout. If horizontal scrolling remains necessary, give the region an accessible name and `tabIndex="0"`, provide a visible focus state and instructions, and verify arrow-key and screen-reader operation without conflicting with global arrow navigation. | Open |
| A11Y-005 | 2.4.2 Page Titled | Medium | `/privacy` and `/verifier` | `RouteAccessibility.jsx` has no title entries for these routes, so both receive the generic `JoIn Hospitality` title rather than identifying the page. | Add unique, descriptive titles such as `Privacy notice | JoIn Hospitality` and `Verifier dashboard | JoIn Hospitality`; verify title updates after client-side navigation. | Open |

## Audit observations, not recorded as product failures

- Google Fonts requests were blocked by the isolated audit environment (`ERR_NETWORK_ACCESS_DENIED`). Fallback fonts rendered. Production should still be checked for a resilient local or system-font fallback.
- The 200% automated scenario uses CSS zoom to reproduce the 320 CSS px reflow condition in headless Edge. A manual check with actual browser zoom remains required before closing any zoom-related issue.
- Automated scans cannot prove complete accessibility. Screen-reader reading order, announcements, error recovery, modal focus return, hover/focus content, and representative real-device testing remain manual audit work.
