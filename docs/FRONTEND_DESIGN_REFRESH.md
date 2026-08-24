# Frontend design refresh

Status: **First approved slice implemented on `new-frontend-design`**  
Date: 24 August 2026

## Objective

Present JoIn Hospitality as a professional inclusive-recruitment platform without decorative visual conventions that imply an automated or AI-generated template. The design remains ability-led, task-focused, accessible, responsive, and suitable for hospitality candidates and employers.

The referenced Zoho Recruit landing page informed the use of strong typography, whitespace, restrained colour, direct calls to action, and structured product information. JoIn does not copy Zoho branding, artwork, content, or component layouts.

## Implemented first slice

### Public welcome page

- Removed the abstract hero artwork, glow, floating sparkle, and fabricated `92%` result.
- Replaced the decorative visual with an explanatory three-step panel: remaining abilities, hospitality job tasks, and workplace support.
- Changed the hero to a clean sans-serif typographic hierarchy with solid accessible actions.
- Added the approved JoIn Hospitality mission and vision in English, French, and Arabic.
- Retained the candidate and employer paths, purpose, process, and footer content.

### Candidate experience

- Removed the greeting emoji, title sparkle, matching star, pulsing button, gradient header pattern, and unexplained matching illustration.
- Reframed the feature as **task-based compatibility**, not AI matching.
- Added clearer copy describing real hospitality duties and workplace support.
- Replaced an ineligible `0%` presentation with an unscored state while preserving genuine eligible scores.
- Simplified the header, navigation, matching panel, action, empty state, and result-card surfaces.

## Protected boundaries

This visual change does not modify:

- scoring mathematics, weights, gates, sorting, or catalogue data;
- candidate, employer, verifier, or administrator API contracts;
- authentication, role authorization, verification, consent, privacy, or file security;
- form fields, job publication, applications, or outcome management;
- keyboard, voice, mouse, touch, or screen-reader operation;
- English, French, or Arabic locale contracts and Arabic RTL behavior.

## Accessibility rules

- WCAG 2.1 Level AA remains the target; automated checks are evidence, not a complete conformance claim.
- Text and control contrast is checked against the actual rendered background.
- Status is communicated with text rather than colour alone.
- Purposeful controls retain visible focus and keyboard operation.
- Typography and panels reflow without horizontal scrolling at supported widths.
- French expansion and Arabic RTL are covered by the existing translation contract and browser test.
- Decorative symbols do not replace accessible names or meaningful content.

## Verification

- Translation contract: 3 locales and 7 namespaces pass.
- ESLint: changed React pages pass.
- Production build: passes.
- Multilingual browser E2E: passes persistence, `lang`/`dir`, Arabic reflow, LTR email direction, and voice-language synchronization.
- Candidate dashboard automated WCAG scan: zero detected violations and no overflow at 375, 768, 1024, and 1440 px.
- Public page automated scan: no overflow across the baseline scenarios; detected contrast issues were corrected and retested.

## Later design slices

Authentication and employer, verifier, and administrator pages remain functionally unchanged. Any broader visual migration should be reviewed as a separate slice so usability and accessibility can be evaluated before the new style is propagated.

