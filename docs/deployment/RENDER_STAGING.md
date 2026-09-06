# Render staging deployment

This deployment is an evaluation environment, not a production conformance or capacity claim. It uses free Render web services and a static site, with Supabase providing PostgreSQL and durable object storage.

## Deployed components

| Component | Staging resource | Region |
| --- | --- | --- |
| React/Vite frontend | Render static site | Global CDN |
| Symfony API | Render Docker web service | Frankfurt |
| Voice/profile AI | Render Docker web service | Frankfurt |
| Deterministic scoring | Render Docker web service | Frankfurt |
| Relational data | Supabase PostgreSQL Session Pooler | Frankfurt |
| Private and public uploads | Supabase Storage | Frankfurt |

The Blueprint is defined in `render.yaml` and deploys only the `staging-deployment` Git branch.

## Supabase configuration

Create these buckets before deploying:

| Bucket | Public | Per-file limit | Allowed MIME types |
| --- | --- | ---: | --- |
| `candidate-verification` | No | 5 MB | PDF, JPEG, PNG |
| `application-documents` | No | 10 MB | PDF, DOC, DOCX |
| `employer-logos` | Yes | 3 MB | JPEG, PNG |

Symfony validates size and detected MIME type before uploading. Private objects are downloaded only after the platform's existing role checks. The Supabase secret key remains server-side and bypasses Storage RLS, so it must never be included in frontend variables, screenshots, documentation values, or Git.

## Secrets requested by the Blueprint

Render asks for variables marked `sync: false` during the first Blueprint deployment.

| Variable | Enter on | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Symfony API | Supabase Session Pooler URI with `sslmode=require` |
| `SUPABASE_URL` | Symfony API | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Symfony API | Server-only Storage access |
| `JWT_PRIVATE_KEY_BASE64` | Symfony API | Base64 of the staging RSA private key |
| `JWT_PUBLIC_KEY_BASE64` | Symfony API | Base64 of the matching public key |
| `JWT_PASSPHRASE` | Symfony API | Passphrase used to encrypt the private key |
| `DEMO_ACCOUNT_PASSWORD` | Symfony API | At least 12 characters; applied to staging fixtures |
| `PROFILE_AI_TOKEN` | Symfony API and voice service | Use the same random value in both services |
| `SCORING_ENGINE_TOKEN` | Symfony API and scoring service | Use the same random value in both services |
| `OPENAI_API_KEY` | Voice service | OpenAI transcription/classification/speech access |

To copy existing local JWT keys as single-line Base64 values without printing them in the terminal:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path 'backend\config\jwt\private.pem'))) | Set-Clipboard
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path 'backend\config\jwt\public.pem'))) | Set-Clipboard
```

Run one command, paste the clipboard into the matching Render field, and then run the second command. `JWT_PASSPHRASE` must match the passphrase used for those keys.

Generate each shared service token with a cryptographically secure value:

```powershell
$bytes = New-Object byte[] 32
$generator = [Security.Cryptography.RandomNumberGenerator]::Create()
$generator.GetBytes($bytes)
[Convert]::ToBase64String($bytes) | Set-Clipboard
$generator.Dispose()
```

Generate this twice: once for `PROFILE_AI_TOKEN` and once for `SCORING_ENGINE_TOKEN`. Paste each value into both services that use it.

## Deployment steps

1. Push the tested `staging-deployment` branch to GitHub.
2. In Render, select **New > Blueprint** and connect the GitHub repository.
3. Select branch `staging-deployment` and Blueprint path `render.yaml`.
4. Confirm all dynamic services use the Free plan and Frankfurt region.
5. Enter every requested secret without exposing it in source control.
6. Deploy the Blueprint and wait for all four resources to become healthy.
7. Verify `/health` on the Symfony, voice, and scoring services.
8. Open the static-site URL and test the candidate, employer, verifier, and administrator workflows.
9. Confirm private documents appear only in their private Supabase buckets and employer logos use the public bucket.
10. Save screenshots and test output as staging evidence, with secrets and personal evidence redacted.

## Initial staging data

The Blueprint runs Doctrine fixtures only on the first successful deployment. The password supplied through `DEMO_ACCOUNT_PASSWORD` replaces the source-code development default. Fixtures are never rerun automatically on normal deployments, because doing so would erase staging changes.

## Free-tier limitations

- Render Free web services can sleep after inactivity and produce cold-start delays.
- Supabase Free projects can pause after inactivity and have database/storage quotas.
- Email transport is disabled in this staging Blueprint, so real email verification and password-reset delivery are not evidence from this environment.
- The OpenAI key should have a conservative project budget and should be rotated after demonstrations.
- Free staging is suitable for functional and cross-device evidence, not production availability, load, backup, or regulatory claims.

Before a scheduled demonstration, open each `/health` endpoint and the frontend several minutes early. Record cold-start and warm-response results separately.

## Rollback and shutdown

Render can roll a service back to a prior successful deploy. When the evaluation period ends, suspend or delete the Render resources, rotate the OpenAI and Supabase server keys, and delete staging data according to the project's retention policy.
