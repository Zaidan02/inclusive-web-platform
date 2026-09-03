# JoIn React frontend

The frontend provides the public website and role-specific Candidate, Employer, and Administrator interfaces. It is built with React 19, Vite, and React Router.

## Local development

From the `frontend` directory:

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://127.0.0.1:5173.

Use `npm.cmd` when PowerShell blocks the `npm.ps1` script.

## Environment

Copy the committed template when overrides are needed:

```powershell
Copy-Item .env.example .env.local
```

Supported variables:

```dotenv
VITE_BACKEND_URL=http://127.0.0.1:8081
VITE_API_URL=http://127.0.0.1:8081/api
VITE_VOICE_NAVIGATION_URL=http://127.0.0.1:5002
```

Restart Vite after changing environment variables.

## Validation

```powershell
npm.cmd run build
.\node_modules\.bin\eslint.cmd src
```

## Accessibility behavior

- Standard keyboard interaction remains available throughout the application.
- Global Left/Right Arrow navigation supplements Tab/Shift+Tab without removing native control behavior.
- Focus is visibly indicated and managed for dialogs and dynamic results.
- Voice navigation can switch views, answer grounded page questions, and execute registered actions.
- Candidate profile assistance supports typed or recorded English, French, and Arabic input, an editable transcript, explicit consent, and per-suggestion confirmation.

The AI profile builder is optional. The manual candidate form remains available, and unconfirmed suggestions never change the profile.

## Related documentation

- [AI profile workflow](../docs/AI_PROFILE_WORKFLOW.md)
- [Keyboard navigation test plan](../docs/keyboard-navigation-test-plan.md)
- [Voice navigation specification](../docs/voice-navigation-technical-specification.md)
- [Project run commands](../docs/run-project-commands.md)
