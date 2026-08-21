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
- free of duplicated pricing, permission, payment, and booking rules.

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

Future mobile and desktop apps use the same versioned HTTP API and do not reimplement pricing, permissions, inventory, cancellation, payment, or booking rules.

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

Phase 4 connects the customer experience to the real booking engine without introducing a fake payment provider.

- Framework-independent cancellation-policy engine in `@platform/core`
- Persisted cancellation rules per rate plan
- Payment modes (`PAY_NOW` / `PAY_AT_HOTEL`) explicitly configured per rate plan
- Cancellation-policy snapshot stored with each booking so later hotel edits never rewrite old terms
- Cancellation preview and policy-driven penalty/refundable calculations in the hotel's timezone
- Provider-neutral `PaymentProvider` interface for payment creation and refunds
- Payment attempts persisted for idempotency and reconciliation without storing card data or raw provider payloads
- Online payment disabled when no real provider adapter is registered
- Refund execution routed through the provider that captured the original payment
- Manual public refund-completion bypass removed
- Live booking quote endpoint with final base/service/tax/total, live inventory, payment modes, and cancellation terms
- Legacy mock checkout removed
- Checkout now creates the real atomic hold and then confirms pay-at-hotel or starts the configured payment provider
- Secure booking-status page
- Separate background worker calls the same `expireStaleHolds()` application service and does not duplicate inventory-release logic

### Payment rule

A UI action, query string, or staff button can never mark payment as successful. `CAPTURED` is an application result recorded from a registered payment provider adapter. The platform does not store card numbers or CVV.

### Cancellation and refund rule

Cancellation uses the policy snapshot stored on the booking. Cancellation may create a refund request for captured refundable value, but it does not mark money as returned. Refund completion is recorded only from the provider-backed payment/refund service.

### Financial design rule

Financial history is append-only. Confirmations create financial events; modifications create delta events; cancellations create explicit adjustments when applicable; completed provider refunds create negative refund events. Old financial records are never rewritten to make later events disappear.

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
5. Create/apply the database migration: `npm run db:migrate -- --name phase4_payments_policy_checkout`.
6. Run the web app: `npm run dev`.
7. In a separate process, run hold expiry: `npm run worker:holds`.

`PAYMENT_PROVIDER=none` is the safe default. Pay-now remains unavailable until a real adapter is registered and configured.

## Architecture documents

- `docs/ARCHITECTURE.md`
- `docs/ENGINEERING_RULES.md`
- `docs/API.md`
- `docs/PHASE3.md`
- `docs/PHASE4.md`

## Deferred by design

A concrete launch payment gateway adapter, signed payment webhooks, chargebacks/disputes, Channel Manager, PMS integrations, specialized search, dynamic pricing, rate intelligence, loyalty, and AI revenue features remain separate future layers. None should be simulated with temporary success flags or duplicated business logic.
