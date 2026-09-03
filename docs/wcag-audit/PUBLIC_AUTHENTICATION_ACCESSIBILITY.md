# Public and Authentication Accessibility Review

## Scope

This review covers the public and authentication routes:

- Welcome (`/`)
- Employers (`/employers`)
- Privacy (`/privacy`)
- Voice navigation help (`/voice-help`)
- Sign up (`/signup`)
- Sign in (`/signin`)
- Forgot password (`/forgot-password`)
- Reset password (`/reset-password`)

The review focuses on WCAG 2.1 Level AA requirements for labels, headings,
validation feedback, contrast, focus order, keyboard access, and mobile reflow.

## Implemented corrections

- Added programmatic labels and error descriptions to authentication fields.
- Added `required`, `aria-invalid`, and `aria-describedby` states where relevant.
- Moved keyboard focus to the first invalid field and to important success or
  server-error messages.
- Added local email and strong-password validation before API requests.
- Removed automatic redirects from successful sign-up and password reset so
  users can read the confirmation and choose when to continue.
- Converted the sign-up account-type selector into a labelled field group.
- Exposed password-button state and the controlled input to assistive
  technologies.
- Corrected heading structure on password recovery, privacy, voice-help, and
  footer content.
- Added descriptive document titles for privacy and verifier routes.
- Rebuilt the privacy page with semantic regions and responsive action links.
- Improved secondary-text contrast and minimum target size for password
  visibility controls.
- Added mobile wrapping and safe content reflow for authentication content.

## Verification status

- Production build: passed (`npm.cmd run build`).
- ESLint: passed with no errors or warnings after the final hook-stability pass.
- Browser matrix: pending a running frontend server. The intended matrix covers
  320 px, 375 px, 1024 px, landscape, 200% zoom, and WCAG text spacing for every
  route listed above.

## Manual interaction checks

For each authentication form:

1. Submit an empty or invalid form and confirm focus moves to the first invalid
   field.
2. Confirm each field error is announced with its field label.
3. Correct the value and confirm its invalid state and message are cleared.
4. Navigate forward with `Tab`, backward with `Shift+Tab`, and activate controls
   with `Enter` or `Space`.
5. Confirm password visibility controls announce their current state.
6. Confirm server errors and successful outcomes receive focus and remain on
   screen until the user chooses the next action.
