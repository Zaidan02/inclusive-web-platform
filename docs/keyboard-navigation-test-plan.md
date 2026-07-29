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

For each workflow, record the browser, viewport, date, tester, result, screenshot, defect ID, correction, and retest result. A workflow passes only when it can be completed without using a pointer and focus never becomes hidden or trapped.
