# Outcome logging and accessible notifications

## Implemented scope

Application submission and employer status changes now create a chronological
`application_outcome_event` record. Each record contains only the application
and actor identifiers, previous and new status, email delivery result, and
timestamp. It does not contain application documents, filenames, disability
information, profile text, reviewer notes, passwords, or email bodies.

The existing verifier audit trail now also records `decision_approved` and
`decision_rejected` actions. AI-profile analysis continues to use its existing
privacy-safe consent and outcome events.

When an employer changes an application to pending, in review, accepted, or
rejected, the candidate receives a plain-text email. A mail failure does not
roll back the saved decision. The event records `sent` or `failed`, and the API
returns that delivery result to the employer.

Frontend success and error feedback in the candidate, employer, verifier, and
administrator dashboards uses the shared `AccessibleNotice` component. Errors
use an assertive `alert`; successful outcomes use a polite `status`; both are
atomic and may receive programmatic focus after an action.

## Deployment

Run the database migration before exercising application submission or status
changes:

```powershell
cd backend
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
```

## Required manual retest

1. Submit a candidate application and confirm one `pending` outcome event.
2. Change its status as the owning employer and confirm old/new status values.
3. Confirm the employer notice states whether candidate email was delivered.
4. With NVDA, confirm success is announced politely and failure immediately.
5. Repeat a status already selected; confirm no duplicate event or email.
6. Approve and reject verifier requests and confirm the decision audit actions.
7. Simulate mail service failure; confirm the decision remains saved and the
   audit delivery result is `failed`.

Automated source, container, mapping, lint, and build checks do not replace the
mail-delivery and screen-reader retests above.
