# Phase 16 — Booking Details UX Polish

Phase 16 rebuilds the customer booking-management cards as a coherent action system without changing booking-domain behavior.

## Scope

- Shared `BookingActionCard` visual primitive for booking actions.
- Dedicated responsive booking-details stylesheet with RTL-aware behavior.
- Two logical desktop columns: communication actions and booking-management actions; one-column mobile flow.
- Hotel requests now show recent request history, readable status pills, a larger composer, character count and action-specific loading/notice states.
- Hotel messages now render as a conversation thread with guest/property bubbles, timestamps, a larger composer and character count.
- Expected arrival now has controlled state, quick-time choices, saved-time feedback and disables saving when nothing changed.
- Review, account linking and cancellation adopt the same hierarchy and spacing system.
- Cancellation uses a visually distinct danger treatment while preserving the existing preview-before-cancel flow.
- Each action has independent busy state; sending a message no longer disables unrelated booking actions.

## Product boundaries

1. Booking APIs, access control, booking tokens, inventory, payments, cancellation calculations and review eligibility are unchanged.
2. Existing backend guest-request categories remain authoritative; the redesign improves their labels rather than inventing unsupported request types.
3. English and Arabic remain supported, including document-level RTL from Phase 15.
4. This phase does not change the database schema.
5. No new operational workflow is simulated in the UI; request status comes from real stored request state.

## Verification

Phase 16 must pass the production dependency audit, Prisma generation, demo seed validation/runtime, workspace TypeScript checks and Next.js production build before completion.
