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
- auditable for booking, inventory, permission, and financial mutations;
- free of duplicated pricing, permission, and booking rules.

**No quick patch is allowed to become production architecture.** If an emergency hotfix is ever required in production, it must be followed by a root-cause fix before normal feature development continues.

## Cross-device rule

The web application is only one client of the platform. Business logic must not live inside React components or Next.js route handlers.

```text
apps/
  web/                 Next.js web client and HTTP API host
  mobile/              future iOS + Android client
  desktop/             future desktop client if needed
packages/
  core/                pure business rules; no framework dependency
  contracts/           shared API validation and DTO contracts
  database/            PostgreSQL / Prisma persistence adapter
  server/              backend application services and authorization
```

Future mobile and desktop apps use the same versioned HTTP API and do not reimplement pricing, permissions, inventory, or booking rules.

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

Phase 3 establishes the reservation lifecycle before payment gateway and channel integrations are added.

- 15-minute temporary booking holds
- Serializable database transactions for inventory mutations
- Optimistic compare-and-decrement inventory reservation to prevent double booking
- Full rollback when any stay date cannot be reserved
- Explicit overbooking floor support only when the hotel enables it
- Client idempotency keys for hold, confirmation, modification and cancellation
- Deterministic HMAC booking access tokens for guest bookings; only token hashes are stored
- Current booking revision plus historical nightly price snapshots for every modification
- Confirmation, modification, cancellation and expiration events
- Automatic inventory release on cancellation and expired holds
- Pay-now bookings cannot confirm until a payment adapter records `CAPTURED`
- Refund request/completion lifecycle restricted by hotel finance permissions
- Append-only financial events for gross booking value, room base, employee service charge, tax, platform commission and refunds
- Public booking responses use an explicit allow-list and never expose access-token hashes, request fingerprints or idempotency internals

### Financial design rule

Financial history is append-only. Confirmations create financial events; later modifications create delta events rather than rewriting history; refunds create negative refund events. Cancellation does not silently rewrite revenue or invent a refund—the applicable cancellation/refund policy will determine financial action separately.

### Hold expiry

Expired holds are released by the reusable `expireStaleHolds()` application service. An authenticated internal/admin endpoint exists for controlled execution. Production deployment should schedule the same application service rather than duplicating expiry logic in another system.

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
5. Create/apply the database migration: `npm run db:migrate -- --name phase3_booking_engine`.
6. Run the web app: `npm run dev`.

## Architecture documents

- `docs/ARCHITECTURE.md`
- `docs/ENGINEERING_RULES.md`
- `docs/API.md`

## Deferred by design

A real payment gateway, cancellation-policy engine, Channel Manager, PMS integrations, Redis, specialized search, dynamic pricing, rate intelligence, loyalty, and AI revenue features remain deferred until booking correctness is verified. No fake payment-success path is allowed as a shortcut.
