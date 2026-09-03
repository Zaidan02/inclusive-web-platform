# Keyboard Navigation Test Plan

## Acceptance criteria

Every user-facing workflow must be completable without a mouse, touch, or voice input. Test with `Tab`, `Shift+Tab`, `Enter`, `Space`, arrow keys, and `Escape` for dismissible overlays.

## Global checks

- The first `Tab` stop exposes “Skip to main content”.
- Activating the skip link moves focus to the page’s actual main region.
- Every focused link, button, input, select, textarea, and custom focus target has a visible indicator.
- Focus follows the visual and reading order.
- Route changes move focus to the new page’s main region.
- No positive `tabIndex` values or keyboard traps exist.
- The mobile navigation can be opened, traversed, and closed with `Escape`.
- `Right Arrow` moves to the next focusable control and `Left Arrow` moves to the previous control.
- Text fields retain normal caret movement; focus changes only when the caret is already at the corresponding field boundary.
- Selects, radio groups, sliders, date/time inputs, editable content, and media controls retain their native arrow-key behavior.

## Workflow matrix

| Workflow | Keyboard path | Expected result |
|---|---|---|
| Public landing | Skip link → header navigation → calls to action → footer | Every link is reachable and activates with `Enter`. |
| Registration | Account type → username → email → password → password visibility → submit | Account type works with `Enter`/`Space`; invalid submission focuses the first invalid field. |
| Sign in | Email → password → password visibility → submit | `Enter` submits; missing-field errors focus the first missing field. |
| Password recovery | Email → submit → try again/back | All controls remain reachable after the success state replaces the form. |
| Candidate profile setup | Profile fields → education → search → disability options → complete | Options toggle with `Enter`/`Space`; validation focuses the first incomplete control. |
| Candidate dashboard | Header controls → Jobs/Applications/Profile navigation → page controls | Every dashboard section is reachable without the profile-avatar shortcut. |
| Job browsing | Job title → company → job details → uploads → apply | Job and company are separate, valid buttons; both activate with `Enter`/`Space`. |
| Employer dashboard | Sidebar → job form/tasks → jobs/applications/profile | Labels identify form controls; task choices toggle with `Enter`/`Space`. |
| Company logo | Upload Logo button | `Enter`/`Space` opens the native file picker. |
| Admin dashboard | Sidebar → import → filters → table actions | Search, filters, import, edit, archive, restore, and delete are keyboard reachable. |
| Voice navigation | Toggle → phase actions → commands → language → audio controls | Voice remains optional and every control has a keyboard equivalent. |

## Dialog checks

Apply these checks to company profiles, candidate profiles, user editing, archive confirmation, and delete confirmation:

1. Open the dialog from its trigger.
2. Confirm focus moves inside the dialog.
3. Press `Tab` through every dialog control.
4. Confirm focus wraps from the last control to the first.
5. Confirm `Shift+Tab` wraps in reverse.
6. Press `Escape` and confirm the dialog closes.
7. Confirm focus returns to the control that opened it.

## Evidence record

### Additional workflow coverage

| Workflow | Keyboard path | Expected result |
|---|---|---|
| AI profile assistance | Language → microphone/type area → consent → create suggestions → suggestion checkboxes/edits → confirm | Missing consent or short text focuses the relevant control; no suggestion is saved until explicitly confirmed. |
| Candidate privacy | Export → withdraw consent → deletion password → DELETE confirmation → delete | Outcomes are announced; invalid deletion confirmation focuses the related field. |
| Employer applications | Applications table → profile → status select → document view/download → delete | Repeated actions identify their candidate/document; status changes announce the outcome and whether candidate email was delivered. |
| Verifier dashboard | Filter buttons → document controls → reviewer note → approve/reject | Rejection without a note focuses the note; decisions announce success or failure. |
| Administrator dashboard | Sidebar → import → filters → table actions | Import, edit, archive, restore, delete, and document actions are keyboard reachable and announce outcomes. |

For each workflow, record the browser, viewport, date, tester, result, screenshot, defect ID, correction, and retest result. A workflow passes only when it can be completed without using a pointer and focus never becomes hidden or trapped.

### Final evidence record

Use this record for the post-remediation test. Do not mark a workflow as passed
from source review alone.

| Workflow | Browser / assistive technology | Viewport / zoom | Tester and date | Keyboard result | Focus / announcement result | Evidence path | Defect ID or retest result |
|---|---|---|---|---|---|---|---|
| Public and authentication |  |  |  | Pending | Pending |  |  |
| Candidate profile and AI |  |  |  | Pending | Pending |  |  |
| Candidate jobs, application, privacy |  |  |  | Pending | Pending |  |  |
| Employer dashboard |  |  |  | Pending | Pending |  |  |
| Verifier dashboard |  |  |  | Pending | Pending |  |  |
| Administrator dashboard |  |  |  | Pending | Pending |  |  |
| Reduced-motion behavior |  |  |  | Pending | Pending |  |  |

### Screen-reader checks

Use NVDA with Microsoft Edge on Windows where available. Record the actual
version used in the evidence record.

- Route title and main-content announcement after every client-side navigation.
- Labels, required state, linked errors, and recovery instructions on all forms.
- AI transcript consent, suggestion count, editable suggestions, and explicit
  confirmation behavior.
- Selected-file names, application outcome, privacy-operation outcome, and
  deletion validation.
- Dialog title, initial focus, tab containment, Escape close, and focus return.
- Employer application status, verifier decision, and administrator management
  outcome announcements.

### Arrow-key boundary checks

The application intentionally offers Right Arrow for next focus and Left Arrow
for previous focus when this does not override native control behavior. Verify:

- Arrow keys move between ordinary links, buttons, and controls.
- Text inputs and textareas retain caret movement until the relevant boundary.
- Selects, date/time controls, radio groups, sliders, media controls, and
  widgets with their own arrow behavior retain native keyboard handling.
- Within a modal dialog, Left/Right wrapping does not move focus outside the
  dialog.
