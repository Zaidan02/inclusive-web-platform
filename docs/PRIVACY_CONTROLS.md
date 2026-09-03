# Consent, private storage, and candidate privacy controls

## Implemented controls

- Registration records the accepted privacy-notice version. Candidate registration separately requires consent to process the disability card for eligibility verification.
- Every AI profile-analysis request requires the current consent version. The audit record contains consent, language, character count, and outcome metadata; it does not store the transcript or audio.
- Disability cards and job-application documents are stored below `backend/var/private`, outside the public web root, with cryptographically random filenames and restrictive file permissions.
- Uploads are size-limited and validated from server-detected MIME content. Browser filenames do not decide the stored file type.
- Private downloads require an authenticated role and use `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff`.
- Every disability-card view or download creates an access-audit event with the request, actor, action, and timestamp.
- A verifier decision schedules the card file for deletion after 30 days. The verification status remains, but the sensitive source document is removed.
- The candidate **Privacy & data** dashboard exposes data categories, consent history, card-retention status, JSON export, AI-consent withdrawal, and password-confirmed account deletion.
- Candidate or administrator account deletion also removes private card and application files before removing database records.

## Operations

After deployment, apply the migration and move existing application documents out of the legacy public directory:

```powershell
cd backend
docker compose exec php php bin/console doctrine:migrations:migrate --no-interaction
docker compose exec php php bin/console app:migrate-private-application-documents --dry-run
docker compose exec php php bin/console app:migrate-private-application-documents
```

Run the retention purge at least daily with the production scheduler:

```powershell
docker compose exec php php bin/console app:purge-expired-private-data
```

Use `--dry-run` first when validating a deployment. The command is idempotent. It deletes only files with a recorded review retention date that has passed and marks the corresponding verification document as deleted.

## Scope statement

These technical controls support data minimization, purpose limitation, access control, transparency, retention, export, consent withdrawal, and erasure. They are not, by themselves, a claim of compliance with every privacy law. The deployed organization must still define its legal basis, controller/contact identity, jurisdiction-specific retention, backup-erasure process, incident response, and formal privacy/legal review.
