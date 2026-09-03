# Shared WCAG 2.1 AA Corrections

## Cross-cutting corrections

- Raised shared secondary interface colours from `#94a3b8` to `#64748b` where
  they were used for readable text, labels, counts, and controls. This provides
  stronger contrast on light surfaces.
- Kept the global high-visibility keyboard focus treatment for links, buttons,
  form controls, summaries, and programmatic focus targets.
- Added a full `prefers-reduced-motion` override that removes nonessential
  animation and near-instantly completes transitions throughout the interface.
- Added forced-colours focus support for high-contrast operating-system modes.
- Improved default text flow: responsive media, automatic image height, and safe
  wrapping for paragraph and list content.
- Maintained page-title updates, route focus placement, skip navigation, and
  named page landmarks.
- Ensured decorative images are hidden from assistive technology and meaningful
  images have descriptive alternative text. Corrected the company-logo and
  reset-password branding alternatives.
- Corrected the voice-navigation options button so its `aria-controls`
  relationship is valid whether the panel is expanded or collapsed.
- Consolidated the previous form error, success, busy-state, dialog, and status
  announcement work across public, candidate, and management journeys.

## Validation

- `npm.cmd run build`: passed.
- `npx.cmd eslint src`: zero errors and zero warnings.
- Static review found no remaining occurrences of the known low-contrast shared
  colour set (`#94a3b8`, `#91a2c7`, `#7183a8`, `#9ca3af`, or `#a0aec0`) in the
  frontend source.

## Rendered browser verification

- The live matrix covers every route at 320 px, 375 px, 768 px, 1024 px, and
  1440 px, plus landscape, 200% zoom simulation, text spacing, keyboard tab
  stops, and automated axe scans.
- The 24 August 2026 post-redesign run reports zero automated WCAG 2.1 A/AA
  findings and no horizontal page overflow for every tested route and scenario.
- Browser automation remains supporting evidence rather than a standalone AA
  conformance claim; the documented native-zoom and NVDA/browser manual checks
  remain part of final human acceptance.
