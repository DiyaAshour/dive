# Phase 20 — Bilingual portal operations

Phase 20 turns the Partner Hub and Control Center into operational bilingual surfaces rather than English-only monitoring pages.

## Language

- English and Arabic are available in the Partner Hub, partner sign-in/onboarding, and the administrator Control Center.
- Arabic uses RTL layout and localized navigation, headings, controls, states, forms, and operational copy.
- The locale is stored in the existing account preference when either a standard or administrator-scoped session is present; the locale cookie still supports signed-out pages.
- The administrator and traveler session scopes remain separate. Locale persistence does not weaken authorization.

## Property administration

- `/admin/properties` supports property search and status filtering.
- `/admin/properties/[hotelId]` exposes an administrator editor for identity, location, public content, amenities, operations, and commercial configuration.
- The slug and publishing status are intentionally excluded from the general editor. Suspension, restoration, and verification remain separate, reasoned actions.
- Every administrator save increments the publishing revision and records a complete before/after audit event.
- `GET/PATCH /api/v1/admin/hotels/[hotelId]` requires an administrator-scoped session and repeats platform-admin authorization in the domain service.

## Review integrity

- `/admin/reviews` supports search, property filtering, and visibility filtering.
- Administrators can hide or restore a review only with a reason of at least ten characters.
- Original guest text and the hotel reply are preserved. Moderation records the actor, timestamp, reason, prior state, and new state.
- Hidden reviews are excluded from public review summaries and hotel pages by the existing published-status query.
- Hotel partners can edit their own public response; reply creation and reply updates have distinct audit actions.

## Verification

- Prisma schema validation
- Prisma Client generation
- Strict TypeScript across contracts, database, server, worker, and web
- Next.js production build, including the new administrator pages and API routes
- The administrator domain smoke covers audited property updates, public filtering of hidden reviews, restoration, and scope isolation when PostgreSQL is available
