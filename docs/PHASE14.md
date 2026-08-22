# Phase 14 — Smart Account Center

Phase 14 turns traveler authentication into a useful account experience without exposing settings that do not have real platform behavior behind them.

## Shipped

- `/account` overview with persisted counts for trips, active price watches and unread notifications.
- `/account/profile` for editing the traveler display name; the sign-in email remains protected.
- `/account/security` for password changes and active-session management.
- Individual non-current sessions can be revoked, or all other sessions can be closed at once.
- Password changes verify the current password, reject reuse, revoke all previous sessions and issue a fresh server session for the current browser.
- `/trips` and `/account/alerts` use the shared account navigation shell.
- The signed-in customer header opens `/account`.
- Checkout prefills signed-in account name and email while preserving per-booking guest edits.

## Deliberately deferred

- Email change waits for verified-email delivery; the booking identity is not silently replaced.
- Saved payment cards wait for provider tokenization; HandMeKey does not store raw card data.
- Currency and language preferences wait until conversion/localization engines exist.
- Account deletion waits for explicit privacy and financial-record retention rules.

## Invariants

1. Account state is derived from the persisted server session.
2. Session tokens remain opaque and HTTP-only; token hashes are never returned by account APIs.
3. The current session cannot be closed through the other-session endpoint.
4. Password change rotates the current session after revoking all prior sessions.
5. Profile edits cannot change the sign-in email.
6. Checkout prefill does not change booking rules or bypass booking validation.
