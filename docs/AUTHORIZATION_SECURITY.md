# Authentication and route authorization

## Security model

Symfony's JWT firewall authenticates protected API calls before a controller runs. The application uses `X-Auth-Token` as its JWT header, with query-string JWT extraction disabled.

Protected route groups use explicit roles:

| Route prefix | Required role |
|---|---|
| `/api/admin` | `ROLE_ADMIN` |
| `/api/verifier` | `ROLE_VERIFIER` |
| `/api/candidate` | `ROLE_CANDIDATE` |
| `/api/employer` | `ROLE_EMPLOYER` |
| Other non-public `/api` routes | Authenticated account |

Administrators inherit verifier API authority for operational oversight but do not enter the verifier frontend dashboard. Candidate, employer, verifier, and administrator accounts cannot use one another's protected route groups.

The intentionally public endpoints are login, registration, email verification, password recovery, API documentation, published jobs, and public job definitions. CORS preflight `OPTIONS` requests are also public but do not return protected application data.

## Frontend protection

Frontend route checks do not trust decoded local JWT claims. Before rendering a dashboard, `RoleRoute` calls the protected `/api/session` endpoint and compares the server-confirmed role with the route role. It repeats validation every 60 seconds and when the window regains focus. Missing, forged, expired, archived, pending-verification, and otherwise invalid sessions are cleared and redirected to sign-in.

JWTs are stored in tab-scoped `sessionStorage`, not persistent `localStorage`. Signing out or ending the browser session removes access, and the application deletes tokens left by older builds.

Protected documents are retrieved with authenticated `fetch` requests. JWTs are never added to document URLs, which avoids credential leakage through browser history, copied links, referrer headers, and ordinary access logs.

## Regression audit

With the fixture accounts loaded and services running, execute:

```powershell
.\tools\security-route-audit.ps1
```

The audit checks every protected method anonymously, tests a forged JWT, exercises wrong-role attempts across every role boundary, confirms each valid role, and confirms the two intentionally public catalogue endpoints. It exits with code `1` if any expected status differs.

When adding a new backend route, place it under the correct protected prefix or add an explicit `access_control` rule, then add it to this audit. Never mark a role-protected controller `PUBLIC_ACCESS`.
