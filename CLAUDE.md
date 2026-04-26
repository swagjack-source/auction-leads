# Claude Code Instructions — Auction Leads (CT Denver SE)

## Project Overview

React 19 + Vite SPA for Caring Transitions Denver Southeast franchise. Supabase backend, Netlify Functions serverless API, deployed on Netlify. The long-term goal is pitching this as a franchise-wide product to CT corporate.

## Tech Stack

- **Frontend:** React 19, Vite 8, React Router v7, Tailwind CSS (via `@tailwindcss/vite`)
- **Backend:** Supabase (auth + Postgres), Netlify Functions (CommonJS)
- **Testing:** Vitest + @testing-library/react + jsdom
- **Key libs:** DOMPurify (XSS), @sentry/react (error monitoring), @react-pdf/renderer (estimates)

## Commit Policy

- Never commit without being explicitly asked
- Never amend existing commits — always create new ones
- Never skip hooks (`--no-verify`)
- Stage specific files by name; avoid `git add -A`
- Do not push unless explicitly asked

## Testing & Verification Standard

**Before completing any implementation task:**
1. Run dev server and manually test the feature
2. Test edge cases (rapid input, errors, resize events)
3. Check browser console for warnings/errors
4. Verify the build compiles cleanly (`npm run build`)
5. Run the test suite (`npm test -- --run`) and confirm no regressions
6. Report what was tested and results

**When adding external dependencies:**
1. Read official documentation for setup requirements
2. Check for: CSS imports, peer deps, config files, known issues
3. Search GitHub issues for "[library] + React" or "[library] + Vite"
4. Verify compatibility before installation
5. Report findings and confirm approach before proceeding

**If task complexity seems high:**
- Stop and propose simpler alternatives
- Ask for clarification on requirements
- Break into smaller testable steps

**Never report "done" until the feature demonstrably works.**

## Code Conventions

- **Netlify Functions:** CommonJS (`require`/`module.exports`), not ESM
- **Pages:** Route-based lazy loading via `React.lazy()` — don't add eager imports to `App.jsx`
- **Data fetching:** Use `useSupabaseQuery` hook from `src/lib/useSupabaseQuery.js` for all Supabase reads
- **Validation:** Use `src/lib/validate.js` (`validateEmail`, `validatePhone`, `validateRequired`, `firstError`) — don't add ad-hoc inline validation
- **Errors:** Always surface fetch failures with a visible error message; use `logger.error()` (not `console.error`) so Sentry captures them
- **Error boundaries:** Wrap drawers and modals with `<ErrorBoundary inline>` to contain crashes

## Key Files

| File | Purpose |
|---|---|
| `src/lib/useSupabaseQuery.js` | Shared data-fetching hook (loading/error/data/refetch/mutate) |
| `src/lib/validate.js` | Shared form validators |
| `src/lib/scoring.js` | Labour hours, bid calculation, deal scoring — calibrated to CT Denver SE real job data |
| `src/lib/sentry.js` | Sentry wrapper — call `captureError()`, never import `@sentry/react` directly |
| `src/lib/logger.js` | `logger.error/warn/info` — forwards to Sentry in prod |
| `src/components/ErrorBoundary.jsx` | Supports `inline` prop for drawer-level containment |
| `netlify/functions/_utils/rateLimit.js` | Rate limiting + CORS origin check for Netlify Functions |

## Environment Variables

- `VITE_SENTRY_DSN` — Sentry project DSN (add to Netlify env; without it Sentry is silently disabled)
- `RESEND_API_KEY` — Email sending via Resend API (Netlify env)
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — Supabase project credentials
