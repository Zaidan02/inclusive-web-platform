# Candidate Experience Accessibility Review

## Scope

This review covers the candidate setup and dashboard journeys:

- Candidate profile setup and manual profile editing
- Optional AI transcript and suggestion review
- Job browsing, compatibility explanations, and company dialog
- Application documents and application status
- Candidate privacy, export, consent withdrawal, and deletion controls

## Implemented corrections

- Added field-specific required-state feedback to candidate profile forms and
  moved focus to the first missing field.
- Preserved all profile data and scoring inputs; no profile field, catalogue
  task, assessment, or scoring rule was removed or changed.
- Added a mobile one-column layout for setup fields and safe wrapping for
  privacy content.
- Improved AI workflow feedback: transcript errors focus the relevant control,
  consent is exposed to assistive technologies, and generated suggestions move
  focus to their review heading.
- Added accessible compatibility-score labels and expandable scoring-explanation
  state.
- Added file-upload validation, selected-file feedback, server-error focus, and
  success announcements for job applications.
- Added live loading, empty-state, success, and error announcements for jobs
  and applications.
- Updated the employer-company dialog with a labelled tab list, tab panels,
  Escape handling, focus trapping, and focus restoration.
- Improved privacy-operation announcements and deletion-form validation/focus.

## Verification status

- Production build: passed (`npm.cmd run build`).
- ESLint: passed with no errors or warnings after the final hook-stability pass.
- Browser accessibility and responsive matrix: pending a running frontend dev
  server. The intended checks cover candidate setup, profile, jobs,
  applications, privacy, the company dialog, 320 px and 375 px mobile widths,
  200% zoom, text spacing, keyboard-only operation, and screen-reader live
  announcements.

## Manual checks

1. In profile setup and My Profile, submit missing required fields. Confirm
   focus moves to the first missing field and its error is announced.
2. In the AI panel, try submitting without consent or with fewer than ten
   characters. Confirm the relevant control receives focus.
3. Select an AI suggestion, edit it, then save it. Confirm nothing is saved
   until the candidate explicitly confirms the selection.
4. Open a job that requires a document and submit without it. Confirm focus
   reaches the correct upload control; choose a file and confirm its name is
   announced.
5. Open a company dialog, navigate its tabs, press Escape, and confirm focus
   returns to the button that opened it.
6. In Privacy & data, use an export or consent action and confirm its result is
   announced. Try deleting without the password or exact `DELETE` confirmation
   and confirm focus reaches the relevant input.
