# Hotel Platform

Unbranded custom hotel booking platform. The product name is intentionally omitted while the platform architecture is being built.

## Non-negotiable engineering rule: no patches

This project must **never** be developed through temporary patches, one-off fixes, duplicated business logic, hidden fallbacks, or code that only works for one screen.

Every change must solve the underlying problem at the correct layer. If a feature exposes an architectural weakness, fix the architecture first. Do not stack another workaround on top of it.

A change is not considered complete unless it is:

- understandable without tribal knowledge;
- typed and validated at system boundaries;
- reusable where the same business rule exists;
- tested or designed so it can be tested in isolation;
- backward-conscious for public API contracts;
- secure by default;
- auditable for booking, inventory, permission, publishing, media, review, and financial mutations;
- free of duplicated pricing, permission, payment, publishing, media, and booking rules.

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

Future mobile and desktop apps use the same versioned HTTP API and do not reimplement pricing, permissions, inventory, cancellation, payment, publishing, media, or booking rules.

## Phase 2 foundation

- Workspace / monorepo architecture
- Shared domain and API contracts
- PostgreSQL persistence package
- Account registration and login
- Revocable opaque sessions for browser and future native clients
- Platform and hotel role-based permissions
- Hotel onboarding lifecycle
- Room types, rate plans and daily calendar CRUD
- Configurable service and tax rates per hotel
- Versioned API under `/api/v1`

## Phase 3 booking engine

- 15-minute temporary booking holds
- Serializable database transactions for inventory mutations
- Optimistic compare-and-decrement inventory reservation to prevent double booking
- Full rollback when any stay date cannot be reserved
- Explicit overbooking floor support only when the hotel enables it
- Client idempotency keys for hold, confirmation, modification and cancellation
- Guest booking access tokens; only token hashes are stored
- Booking revisions and historical nightly price snapshots
- Confirmation, modification, cancellation and expiration events
- Automatic inventory release on cancellation and expired holds
- Pay-now bookings cannot confirm until a payment adapter records `CAPTURED`
- Append-only financial events
- Public booking responses use explicit allow-lists

## Phase 4 payments, policies, and live checkout

- Framework-independent cancellation-policy engine in `@platform/core`
- Persisted cancellation rules per rate plan
- Payment modes (`PAY_NOW` / `PAY_AT_HOTEL`) explicitly configured per rate plan
- Cancellation-policy snapshot stored with each booking
- Provider-neutral `PaymentProvider` interface for payment creation and refunds
- Payment attempts persisted for idempotency and reconciliation without card data
- Online payment disabled when no real provider adapter is registered
- Live booking quote endpoint with final base/service/tax/total and live inventory
- Checkout creates the real atomic hold
- Separate background worker expires stale holds through the same booking service

### Payment rule

A UI action, query string, or staff button can never mark payment as successful. `CAPTURED` is an application result recorded from a registered payment provider adapter. The platform does not store card numbers or CVV.

### Financial design rule

Financial history is append-only. Confirmations create financial events; modifications create delta events; cancellations create explicit adjustments when applicable; completed provider refunds create negative refund events.

## Phase 5 live discovery and hotel content

- PostgreSQL-backed public hotel content
- Ordered property photos and searchable amenities
- Live destination search and filters
- Full-stay rate, restriction, capacity and inventory validation
- Home, search and hotel pages no longer use mock hotel data
- Final prices are calculated by shared domain logic
- Only `ACTIVE + verified` properties are discoverable and bookable
- Public discovery API can be reused by future native applications

## Phase 6 publishing and verification

- Explicit `publishing:manage` permission for hotel owners and managers
- Publishing readiness gate before review submission
- Minimum public-content, room, rate-plan, cancellation-policy and live-calendar requirements
- At least seven sellable dates inside the next 30 days are required for initial publishing review
- Immutable review history records submitter, submitted revision, readiness snapshot, reviewer, decision and reason
- Hotel `publishRevision` advances whenever review-relevant content, rates or inventory change
- Pending reviews automatically become `STALE` when their submitted revision changes
- Admin approval publishes exactly the revision that was reviewed
- Rejection returns the hotel to draft with persistent review feedback
- Platform suspension removes the hotel from discovery immediately; restoration returns it to draft and requires review again
- Review and publishing mutations are audit logged

### Publishing invariant

A property must never become `ACTIVE + verified` through a UI flag, direct client request, or ordinary hotel edit. Activation only occurs through the platform-admin review service after readiness and revision checks pass.

## Phase 7 secure media and verification documents

- One storage-backed `MediaObject` lifecycle for public hotel images and private verification documents
- Direct client-to-storage presigned uploads; raw file bytes do not pass through JSON or the platform database
- Provider-neutral object-storage boundary with an S3-compatible AWS Signature V4 adapter
- Exact storage size and MIME verification plus JPEG/PNG/WebP/PDF magic-byte checks before a file becomes `READY`
- Manual external hotel-photo URLs removed from the content contract and dashboard
- Discovery reads only completed media-backed public photos
- Private verification documents use short-lived admin-only signed downloads
- Document approval/rejection is persisted and audit logged
- Commercial Registration and Business License must be approved before property Go-Live
- Expired pending upload intents are cleaned by the background worker
- Media and document changes participate in the same `publishRevision` stale-review protection as the rest of the property

### Media invariant

A filename, extension, browser-supplied MIME type, or successful PUT is never enough to publish a file. The server must verify storage metadata and the actual file signature before marking media `READY`. Verification documents never receive public URLs.

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
5. Create/apply the database migration: `npm run db:migrate -- --name phase7_media_documents`.
6. Run the web app: `npm run dev`.
7. In a separate process, run the background worker: `npm run worker:holds`.

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

## Deferred by design

A concrete launch payment gateway adapter, signed payment webhooks, malware-scanning provider, OCR, chargebacks/disputes, Channel Manager, PMS integrations, specialized search, dynamic pricing, rate intelligence, loyalty, and AI revenue features remain separate future layers. None should be simulated with temporary success flags or duplicated business logic.
