# Candidate eligibility verification

## Purpose

Candidate access is restricted to people with disabilities. Registration therefore has two independent approval gates:

1. The candidate verifies ownership of the submitted email address.
2. An authorized verifier reviews the submitted disability card and approves the request.

The account cannot sign in until both gates pass. Email verification and document review may occur in either order.

## Candidate workflow

1. Select **Candidate** on the signup page.
2. Enter username, email, and password.
3. Upload one disability card in PDF, JPEG, or PNG format, up to 5 MB.
4. Submit registration and follow the email verification link.
5. Wait for the verifier decision email.
6. Sign in only after the card has been approved and the email has been verified.

Employer registration does not request a disability card and continues to require email verification only.

## Verifier workflow

The dedicated route is `http://127.0.0.1:5173/verifier`. A user must have `ROLE_VERIFIER` (or administrator authority at the API layer) to access review data.

The dashboard provides pending, approved, rejected, and all filters. For each request, the verifier can:

- see candidate identity and email-verification state;
- open or download the protected document through an authenticated request;
- approve the request;
- reject it with a mandatory reason;
- correct an earlier decision when authorized to do so.

Every decision stores the status, reviewer, reviewer note, and review timestamp. The candidate receives an email when mail delivery is configured. A mail failure does not roll back a saved verifier decision and is shown to the verifier.

## Local verifier account

After loading fixtures:

```text
Email: verifier@join.local
Password: Pass123!@#
```

Fixture passwords are for local development only.

For an existing database, create an authorized verifier without purging data:

```powershell
cd backend
docker compose exec php php bin/console app:create-verifier verifier@example.com verifier_name
```

The command prompts for the password without displaying it. The `--password` option exists only for controlled non-interactive local automation; avoid it in production because command arguments may be recorded in shell history or process listings.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/verifier/requests?status=pending` | List filtered requests and status counts |
| `GET` | `/api/verifier/requests/{id}/document` | Open a protected document |
| `GET` | `/api/verifier/requests/{id}/document?download=1` | Download a protected document |
| `PATCH` | `/api/verifier/requests/{id}` | Approve or reject with `{ "status", "note" }` |

The frontend sends the JWT in `X-Auth-Token`. Tokens are not placed in document URLs.

## Privacy and security controls

- Files are stored in `backend/var/private/disability_cards`, outside `backend/public`.
- Stored filenames are cryptographically random and path traversal is rejected.
- Server-detected MIME type, not the browser filename extension, controls accepted file types.
- Files over 5 MB and empty uploads are rejected.
- Document responses use `private, no-store` caching and `X-Content-Type-Options: nosniff`.
- Only verifier or administrator JWT roles can list requests, access documents, or save decisions.
- Rejection requires a reason so the decision remains understandable and actionable.
- The UI exposes the file only to reviewers and includes keyboard-visible focus states and status announcements.

Operationally, the private `symfony_var` Docker volume contains these sensitive files. Production backups, retention rules, deletion handling, access logs, and authorized-verifier assignment must follow the project's privacy policy and applicable local law.

## Database and deployment

After pulling this feature, run:

```powershell
cd backend
docker compose up -d --build
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
```

Migration `Version20260803000100` creates `candidate_verification_request`. Legacy candidate accounts without a request are intentionally grandfathered to avoid unexpectedly locking existing users; every candidate created through the updated registration endpoint receives a pending request and is gated.
