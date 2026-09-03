# Integration, E2E, and performance verification

Date of recorded local run: 10 August 2026

## Scope

The project now has three independent executable checks:

- API integration tests authenticate candidate, employer, administrator, and
  verifier fixtures; exercise representative authorized reads; confirm public
  catalogue access; and verify anonymous and cross-role access rejection.
- Browser E2E tests cover public pages, protected-route redirects, all four
  authenticated dashboards, wrong-role redirection, sign-in validation,
  accessible error focus, and keyboard access to the skip link.
- Performance measurements run against a production Vite build and record API
  latency, navigation timing, first contentful paint, transferred bytes,
  resource timing, and gzip bundle sizes against explicit budgets.

These tests are read-only against normal application records. They do not
create or delete users, jobs, applications, verification decisions, or files.

## Commands

Start Docker and the Vite development server before integration/E2E testing:

```powershell
cd backend
docker compose up -d

cd ..\frontend
npm.cmd run dev -- --host 0.0.0.0
```

In another terminal:

```powershell
cd frontend
npm.cmd run test:integration
npm.cmd run test:e2e
npm.cmd run test:performance
```

`test:performance` builds the frontend and starts its own production preview on
port 4173. Run all three with `npm.cmd run test:all`.

Configuration is available through `TEST_WEB_BASE`, `TEST_API_BASE`,
`TEST_FIXTURE_PASSWORD`, `TEST_BROWSER_PATH`, `PERFORMANCE_ROUNDS`, and the
`PERF_MAX_*` budget variables defined in the performance script.

## Recorded result

| Suite | Result | Evidence |
|---|---:|---|
| API integration | 17/17 passed | [integration-results.json](integration-results.json) |
| Browser E2E | 19/19 passed | [e2e-results.json](e2e-results.json) |
| Performance budgets | Passed, 0 violations | [performance-results.json](performance-results.json) |

Recorded local p95 values:

| Measurement | p95 |
|---|---:|
| Public jobs API | 205.1 ms |
| Job definitions API | 163.2 ms |
| Candidate session API | 86.7 ms |
| Candidate profile API | 244.8 ms |
| Welcome page load / FCP | 102.6 ms / 448 ms |
| Sign-in page load / FCP | 95.3 ms / 184 ms |
| Candidate page load / FCP | 103 ms / 552 ms |
| JavaScript gzip | 130,428 bytes |
| CSS gzip | 13,579 bytes |

The initial performance run exposed a synchronous Google Fonts dependency that
could delay rendering by about 6.2 seconds when the external service was slow.
The external font request was removed; system fallbacks keep the application
usable offline and the repeated production-build run passed all budgets.

## Interpretation and limitations

These measurements are a regression baseline on the development computer, not
a production capacity or concurrency test. Deployment evidence should repeat
the suite on the deployed origin and retain its separate report. Network
conditions, server contention, browser version, device power, and cache state
must be recorded when comparing runs.

Automated E2E coverage complements but does not replace the manual NVDA,
keyboard, zoom, reflow, mobile-device, and cross-browser evidence required by
the WCAG audit.
