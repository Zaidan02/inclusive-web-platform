# Frontend Revamp Documentation

## Scope and constraints

This document records the frontend redesign and the decisions that should remain easy to revisit.

- Frontend work is contained in `frontend/`.
- Backend routes, request payloads, database behavior, and business logic must not be changed without explicit permission.
- The established blue, slate, white, and green color palette remains the visual foundation.
- Pages should use the full viewport and remain responsive.
- UI, API access, authentication utilities, and role-specific behavior should be separated into focused modules.

## Completed changes

### Global presentation

- Removed the fixed-width root container that boxed the application into a centered 1126px column.
- Added shared colors, typography, shadows, focus states, and full-viewport foundations in `frontend/src/index.css`.
- Added shared dashboard presentation rules in `frontend/src/styles/dashboard.css`.

### Landing page

- Replaced the original welcome card with a complete scrolling landing page.
- Added a full-screen hero and top navigation.
- Added purpose, platform principles, process, candidate, and employer sections.
- Added separate Candidate and Employer calls to action.
- Added a complete footer.
- Added responsive layouts for desktop, tablet, and mobile screens.
- Added a public `/employers` placeholder so the public employer journey is clearly separated from the protected `/employer` dashboard.

### Shared components

- `frontend/src/components/common/Brand.jsx`
- `frontend/src/components/common/ArrowIcon.jsx`
- `frontend/src/components/layout/SiteHeader.jsx`
- `frontend/src/components/layout/SiteFooter.jsx`
- `frontend/src/components/auth/RoleRoute.jsx`

### Authentication and routing

- Added shared JWT parsing and token storage in `frontend/src/services/tokenService.js`.
- Added role-aware frontend routes for candidate, employer, and admin dashboards.
- Added role-specific signup links through the `role` query parameter.
- Candidate and employer landing-page actions preselect the appropriate account type.

### API organization

Role-specific API entry points were added without changing backend endpoints or payloads:

- `frontend/src/services/authApi.js`
- `frontend/src/services/candidateApi.js`
- `frontend/src/services/employerApi.js`
- `frontend/src/services/adminApi.js`

### Local API address

The frontend fallback backend address is `http://127.0.0.1:8081`, matching the current Docker port. Environment variables can still override it.

## Candidate onboarding flow

The disability selection interface is placed behind the candidate profile experience.

1. The candidate signs in.
2. The frontend requests `GET /api/candidate/profile`.
3. An incomplete profile redirects the candidate to a dedicated profile-setup screen.
4. The candidate completes and saves the required profile information.
5. The candidate then enters the normal dashboard.
6. Returning candidates with complete profiles enter the dashboard directly.
7. The My Profile area allows candidates to review and edit the same information later.

### Profile completion rule — intentionally changeable

The initial completion rule is expected to be:

```js
export const isCandidateProfileComplete = (profile) =>
  Array.isArray(profile?.selectedDisabilities) &&
  profile.selectedDisabilities.length > 0;
```

This rule is intentionally documented and should be kept in one frontend utility rather than repeated across pages. It may change when more required candidate fields are added.

Current location:

```text
frontend/src/features/candidate/profile/profileCompletion.js
```

Changing this rule should not require changing the backend or candidate routing components.

The setup screen is implemented at:

```text
frontend/src/features/candidate/profile/CandidateProfileSetup.jsx
```

The protected route is `/candidate/setup`. The regular `/candidate` dashboard loads the profile and redirects to setup when the centralized completion rule returns `false`.

## Candidate navigation after onboarding

- Jobs
- My Applications

The disability selector no longer appears as a primary dashboard tab. Completed candidates land on Jobs. Clicking the profile avatar in the candidate header opens My Profile, where the candidate can review and edit disability information. AI Job Match and its compatibility results are displayed in Jobs above the available opportunities.

## Verification

Use the following from `frontend/`:

```powershell
npm.cmd run build
npx.cmd eslint src
```

The production build currently succeeds. Existing hook-dependency warnings in the candidate and admin dashboards are tracked separately from the redesign.
