# Hotel Platform

Unbranded custom hotel booking platform. The product name is intentionally omitted while the platform architecture is being built.

## Non-negotiable engineering rule: no patches

This project must **never** be developed through temporary patches, one-off fixes, duplicated business logic, hidden fallbacks, or code that only works for one screen.

Every change must solve the underlying problem at the correct layer. If a feature exposes an architectural weakness, fix the architecture first. Do not stack another workaround on top of it.

A change is not considered complete unless it is understandable without tribal knowledge, typed and validated at system boundaries, reusable where the same business rule exists, secure by default, auditable for sensitive mutations, and free of duplicated pricing, permission, payment, publishing, media, booking, operations, promotion, review, messaging, growth, analytics, or alerting rules.

**No quick patch is allowed to become production architecture.** If an emergency hotfix is ever required in production, it must be followed by a root-cause fix before normal feature development continues.

## Cross-device rule

The web application is only one client of the platform. Business logic must not live inside React components or Next.js route handlers.

```text
apps/
  web/                 Next.js web client and HTTP API host
  worker/              background application worker
  mobile/              future iOS + Android client
  desktop/             future desktop client if needed
packages/
  core/                pure business rules; no framework dependency
  contracts/           shared API validation and DTO contracts
  database/            PostgreSQL / Prisma persistence adapter
  server/              backend application services, authorization and provider boundaries
```

Future mobile and desktop apps use the same versioned HTTP API and do not reimplement pricing, permissions, inventory, cancellation, payment, publishing, media, guest-trip, reservation-operations, promotion, review, messaging, growth-intelligence, or booking rules.

## Phase 2 foundation

- Workspace / monorepo architecture
- Shared domain and API contracts
- PostgreSQL persistence package
- Account registration and login
- Revocable opaque sessions for browser and future native clients
- Platform and hotel RBAC
- Hotel onboarding lifecycle
- Room types, rate plans and daily calendar CRUD
- Configurable service and tax rates per hotel
- Versioned API under `/api/v1`

## Phase 3 booking engine

- 15-minute temporary booking holds
- Serializable inventory transactions
- Atomic compare-and-decrement inventory reservation
- Full rollback when any stay date fails
- Explicit overbooking floors only when enabled
- Idempotency for hold, confirmation, modification and cancellation
- Guest booking access tokens with hashes stored only
- Booking revisions and nightly price snapshots
- Inventory release on cancellation and hold expiry
- Append-only financial events

## Phase 4 payments, policies, and live checkout

- Framework-independent cancellation-policy engine
- Persisted cancellation rules per rate plan
- Explicit `PAY_NOW` / `PAY_AT_HOTEL` modes
- Cancellation-policy snapshots on bookings
- Provider-neutral payment boundary
- Persisted payment attempts for reconciliation
- Live booking quote endpoint
- Checkout creates the real atomic hold
- Worker expires stale holds through the booking service

### Payment rule

A UI action, query string, or staff button can never mark payment as successful. `CAPTURED` must be recorded from a registered payment provider adapter. Card numbers and CVV are not stored.

## Phase 5 live discovery and hotel content

- PostgreSQL-backed public hotel content
- Searchable amenities and media-backed property photos
- Live destination search and filters
- Full-stay rate, restriction, capacity and inventory validation
- No mock hotel data in Home/Search/Hotel pages
- Shared pricing logic
- Only `ACTIVE + verified` hotels are discoverable

## Phase 6 publishing and verification

- Explicit publishing permissions
- Readiness gate before review
- Immutable property-review history
- `publishRevision` advances on review-relevant changes
- Pending reviews become stale when the revision changes
- Admin approval publishes exactly the reviewed revision
- Rejection returns the hotel to Draft
- Suspension removes discovery immediately

### Publishing invariant

A property must never become `ACTIVE + verified` through a UI flag, direct client request, or ordinary hotel edit. Activation only occurs through platform-admin review after readiness and revision checks pass.

## Phase 7 secure media and verification documents

- One storage-backed `MediaObject` lifecycle for public images and private verification documents
- Direct client-to-storage presigned uploads
- S3-compatible provider boundary
- Exact size/MIME plus JPEG/PNG/WebP/PDF magic-byte verification before `READY`
- No manual external photo URLs
- Private verification documents use short-lived admin-only downloads
- Commercial Registration and Business License required before Go-Live
- Pending-upload cleanup in the background worker

### Media invariant

A filename, extension, browser-supplied MIME type, or successful PUT is never enough to publish a file. Storage metadata and actual file signature must be verified before `READY`.

## Phase 8 guest trips and reservation operations

- Authenticated **My Trips** sourced from bookings linked to the user account
- Guest bookings can be linked to an account only with the booking access token and matching account email
- Expected arrival time stored as hotel-local `HH:mm`
- Arrival operational state is separate from commercial `BookingStatus`
- Guest requests are durable records with `OPEN / ACKNOWLEDGED / RESOLVED` lifecycle
- Private front-desk notes are staff-only and never returned by guest/public APIs
- Hotel operations workspace supports Arrivals, Departures, In-house, and Daily Operations views
- Daily reservation CSV export uses the same live booking dataset
- Guest cancellation UI previews the stored cancellation policy before an idempotent cancel request
- Staff operational changes create booking events and audit records

### Operations invariant

Do not overload the booking lifecycle with check-in state or private notes. Commercial reservation state, arrival state, guest requests, and private hotel notes remain separate concerns with separate authorization rules.

## Phase 9 reviews, promotions, and booking messaging

- Verified-stay reviews: one review per completed booking, with 1–10 overall and category scores
- Public hotel scores come only from persisted verified-stay reviews; no synthetic ratings
- Hotel responses to reviews are permission-scoped and audit logged
- Promotions target explicit rate plans and have booking/stay windows plus minimum-night rules
- The same server promotion engine prices discovery, quotes, holds, and modifications
- Discounts apply to room base before service and tax, while `DailyRate` remains unchanged
- Promotion name and percentage are snapshotted on the booking
- Guest ↔ hotel messaging is attached to confirmed bookings, not an anonymous chat channel
- Guest and hotel unread state is tracked separately
- Private front-desk notes remain isolated from guest-facing messages

### Engagement invariant

The displayed deal, quoted deal, and booked deal must be derived from the same server-side promotion rule. Reviews require a completed accessible booking, and booking messages require booking access or property-scoped hotel permissions.

## Phase 10 growth intelligence

- First-party search demand and hotel-impression telemetry
- Server-side hotel-view and checkout-start measurement
- Hotel conversion funnel: impression → view → checkout → hold → confirmed booking
- Confirmed booking counts and value remain authoritative booking-domain data, not analytics reconstruction
- Market demand by future arrival date for the hotel's city
- Deterministic opportunity signals for low view rate, low checkout rate, checkout abandonment, hold expiry, and strong demand dates
- Authenticated saved searches
- Live hotel price watches using the same promotion, service, tax, restriction, inventory, and pricing logic as booking
- Durable in-app price-drop and target-price notifications
- Background price-watch evaluation in the existing worker
- Separate Prisma growth schema file loaded through the schema folder

### Growth-intelligence invariant

Analytics must never invent demand, ratings, traffic, or conversion. Price watches must re-price through the live booking rules, background checks must not inflate views, and analytics write failure must never block search or booking. Deterministic signals are not presented as AI.

## Current pricing default

- base room rate × **1.156** = final guest price;
- **7%** of base rate = employee service charge;
- **8.6%** of base rate = tax / remaining mandatory charge layer.

These values are hotel configuration and are calculated by `@platform/core`; they are not hard-coded in UI components.

## Local development

1. Copy `.env.example` to `.env` and replace all placeholder secrets.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Install dependencies: `npm install`.
4. Generate Prisma Client: `npm run db:generate`.
5. Create/apply the database migration: `npm run db:migrate -- --name phase10_growth_intelligence`.
6. Run the web app: `npm run dev`.
7. Run the background worker separately: `npm run worker:holds`.

`PAYMENT_PROVIDER=none` and `STORAGE_PROVIDER=none` are safe defaults. Pay-now and media uploads remain unavailable until real providers are configured; the platform never simulates success.

## Architecture documents

- `docs/ARCHITECTURE.md`
- `docs/ENGINEERING_RULES.md`
- `docs/API.md`
- `docs/PHASE3.md`
- `docs/PHASE4.md`
- `docs/PHASE5.md`
- `docs/PHASE6.md`
- `docs/PHASE7.md`
- `docs/PHASE8.md`
- `docs/PHASE9.md`
- `docs/PHASE10.md`

## Deferred by design

Physical room assignment, housekeeping workflow, passport/ID capture, police/nationality reports, PMS and Channel Manager integrations, specialized search, dynamic pricing, competitor scraping, loyalty, and AI revenue features remain separate future layers. None should be simulated with temporary flags or duplicated business logic.
