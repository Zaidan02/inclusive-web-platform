# Frontend design refresh

Status: **Public, opportunity, and guided candidate-flow slices implemented on `new-frontend-design`**
Date: 24 August 2026

## Objective

Present JoIn Hospitality as a professional inclusive-recruitment platform without decorative visual conventions that imply an automated or AI-generated template. The design remains ability-led, task-focused, accessible, responsive, and suitable for hospitality candidates and employers.

The referenced Zoho Recruit landing page informed the use of strong typography, whitespace, restrained colour, direct calls to action, and structured product information. JoIn does not copy Zoho branding, artwork, content, or component layouts.

The supplied [JobFinders](https://jobfindersme.com/) reference informed the calmer header density, grouped navigation, clear disclosure indicator, and stronger sense of movement between tasks. JoIn retains its own ability-led content, multilingual behavior, visual identity, and interaction model.

## Implemented first slice

### Public welcome page

- Removed the abstract hero artwork, glow, floating sparkle, and fabricated `92%` result.
- Replaced the decorative visual with an explanatory three-step panel: remaining abilities, hospitality job tasks, and workplace support.
- Changed the hero to a clean sans-serif typographic hierarchy with solid accessible actions.
- Added the approved JoIn Hospitality mission and vision in English, French, and Arabic.
- Added a live opportunity overview with exact counts for active candidate registrations, published job posts, and active job descriptions.
- Added the six newest published job posts using real platform data, known-value localization, responsive cards, and explicit loading, empty, and unavailable states.
- Moved the interface-language selector into the main welcome-page header beside the account actions.
- Replaced flat section links with three accessible disclosure groups: Job seekers, For employers, and About JoIn. Each group provides specific destinations and closes with `Escape`, returning focus to its trigger.
- Added direct section targets for latest jobs, mission and vision, purpose, and matching guidance.
- Rebalanced the palette: navy structures content, blue identifies primary calls to action, terracotta identifies guidance and current steps, green identifies completed states, and warm neutrals reduce visual fatigue.
- Reduced decorative corner radii to restrained near-square geometry while preserving recognizable controls and visible focus.
- Retained the candidate and employer paths, purpose, process, and footer content.

The overview deliberately distinguishes an employer's published **job post** from an active **job description** in the task-based matching catalogue. Counts are not hardcoded and do not use an inflated `+` suffix. Importing the 12 additional job descriptions will therefore change the catalogue total from 3 to 15 automatically when those definitions are active in the database.

The public overview API exposes only aggregate counts and fields already intended for a published vacancy: title, company name, location, job type, work mode, and publication date. Candidate names, contact details, disability information, verification state, documents, profiles, and application data are never returned.

### Candidate experience

- Removed the greeting emoji, title sparkle, matching star, pulsing button, gradient header pattern, and unexplained matching illustration.
- Reframed the feature as **task-based compatibility**, not AI matching.
- Added clearer copy describing real hospitality duties and workplace support.
- Replaced an ineligible `0%` presentation with an unscored state while preserving genuine eligible scores.
- Simplified the header, navigation, matching panel, action, empty state, and result-card surfaces.
- Added a persistent three-stage candidate journey: build the profile, match and explore, then apply and track.
- Made each journey stage an actual keyboard-operable navigation control rather than a decorative progress line.
- After a successful profile save, added a live status message and a clear **Continue to job matching** action.
- Updated first-time setup to identify itself as step 1 of 3 and to explain what follows.
- After application submission, the existing behavior still advances to application tracking, completing the guided path without changing application logic.

## Protected boundaries

This visual change does not modify:

- scoring mathematics, weights, gates, sorting, or catalogue data;
- existing candidate, employer, verifier, or administrator API contracts;
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
- API integration: the overview is publicly readable, contains non-negative integer aggregates, returns no more than six jobs, and exposes only the approved published-job fields.
- ESLint: changed React pages pass.
- Production build: passes.
- Multilingual browser E2E: passes persistence, `lang`/`dir`, Arabic reflow, LTR email direction, and voice-language synchronization.
- Candidate dashboard automated WCAG scan: zero detected violations and no overflow at 375, 768, 1024, and 1440 px.
- Public page automated scan: no overflow across the baseline scenarios; detected contrast issues were corrected and retested.
- Guided-flow WCAG retest: zero detected violations and no overflow on the welcome page, candidate dashboard, and candidate setup at 320, 375, 768, 1024, and 1440 px, landscape, 200% zoom, and text spacing.
- Guided-flow E2E: public disclosure navigation opens by keyboard, closes with `Escape`, restores trigger focus, and the profile-save action advances to the matching stage.

## Later design slices

Authentication and employer, verifier, and administrator pages remain functionally unchanged. Any broader visual migration should be reviewed as a separate slice so usability and accessibility can be evaluated before the new style is propagated.
