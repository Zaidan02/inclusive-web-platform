# Employer, Verifier, and Administrator Dashboard Accessibility Review

## Scope

This review covers the management dashboards for employers, authorized
verifiers, and administrators:

- Responsive dashboard navigation and forms
- Employer job posting, catalogue-task selection, jobs, applications, documents,
  candidate-profile dialog, and company profile
- Verifier request filters, disability-card documents, review notes, and approval
  or rejection actions
- Administrator users, archives, candidate profiles, applications, catalogue
  imports, documents, filters, and confirmation dialogs

## Implemented corrections

- Kept dashboard navigation and every management action operable with keyboard
  buttons, selects, and native form controls.
- Preserved existing responsive sidebar, form-grid, card, dialog, and
  mobile-table behaviour from the responsive foundation.
- Added explicit, contextual accessible names to repeated edit, archive, delete,
  view, download, and document controls.
- Added status and error announcements for employer, verifier, and administrator
  operations.
- Replaced administrator browser alert feedback with on-page, assistive-
  technology-friendly outcome messages.
- Added an accessible status announcement after an employer changes an
  application status.
- Added verifier note guidance, invalid-state exposure, rejection-note feedback,
  and accessible candidate-specific document actions.
- Added accessible progress state for busy review actions, dashboard regions,
  loading states, and empty states.
- Retained modal focus trapping, Escape-to-close behavior, and focus restoration
  for candidate/user dialogs.
- Added a selected-logo status for the employer upload control.

## Verification status

- Production build: passed (`npm.cmd run build`).
- ESLint: passed with no errors or warnings after the final hook-stability pass.
- Browser accessibility and responsive checks are pending a running frontend
  development server. The matrix will cover keyboard-only navigation, dialogs,
  destructive confirmations, mobile tables, filters, status changes, and
  document operations across all three dashboards.

## Keyboard acceptance checks

1. Move through every sidebar item with `Tab`/`Shift+Tab`, then activate it with
   `Enter` or `Space`.
2. In employer job posting, select a catalogue task and remove it using only the
   keyboard; submit required-field errors and confirm focus reaches the missing
   control.
3. In employer and administrator application tables, open/view/download each
   document control and verify its accessible name identifies the candidate and
   document type.
4. In verifier review, attempt a rejection without a note. Confirm focus moves
   to the note field, then approve or reject with keyboard controls.
5. Open each dialog, use `Tab` and `Shift+Tab` to confirm focus is contained,
   press `Escape`, and confirm focus returns to the opener.
6. Perform archive, restore, delete, and application-status actions and confirm
   their result is announced on the page.
