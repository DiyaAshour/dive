# Phase 13 — Account Session UI

Phase 13 fixes traveler session presentation without changing authentication persistence or authorization rules.

## Changes

- Customer navigation resolves the authenticated session on the server.
- Signed-in travelers see their account name instead of a static `Sign in` label.
- Signed-out travelers continue to see `Sign in`.
- A real sign-out control calls the existing `/api/v1/auth/logout` POST endpoint and clears the persisted session cookie through the existing auth path.
- `/login` redirects an already-authenticated traveler to `/trips` instead of showing another login form.
- `/trips` now uses the same HandMeKey customer header as discovery pages.

## Invariants

1. UI state never invents authentication state; it is derived from the persisted server session.
2. Logging out must revoke the persisted session through the existing auth service and clear the session cookie.
3. No client-readable session token is introduced.
4. Customer pages and account pages share one session source of truth.
5. Partner authorization and traveler authorization remain separate from presentation concerns.
