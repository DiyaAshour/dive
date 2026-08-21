# Architecture

## Goal

Build one booking platform that can serve web, iOS, Android, desktop, hotel partner tools, and administration without duplicating business logic.

## Boundaries

### `@platform/core`
Pure TypeScript. Pricing, permission definitions, booking invariants, and other domain rules. It cannot import Next.js, Prisma, React, or Node-specific transport code.

### `@platform/contracts`
Zod schemas and DTO types for public HTTP boundaries. Both server and clients can consume these contracts.

### `@platform/database`
PostgreSQL persistence through Prisma. It owns the schema, generated client, connection adapter, and database-level constraints.

### `@platform/server`
Application services. It combines domain rules with persistence: authentication, authorization, hotel onboarding, room/rate management, and calendar updates. It does not render UI.

### `@platform/web`
Next.js web experience and the first HTTP transport. Route handlers validate requests with `@platform/contracts`, call `@platform/server`, and format responses. React components do not access Prisma directly.

## API strategy

All client-consumable endpoints are versioned under `/api/v1`. Future mobile applications use these endpoints rather than importing server-only code.

Authentication uses opaque random session tokens. Only a SHA-256 hash of a token is persisted. The browser receives the raw token in an HttpOnly secure cookie; future native apps can send the same token through `Authorization: Bearer`.

## Data ownership

- PostgreSQL is the source of truth for inventory, rates, bookings, permissions, and money.
- Calendar updates use database transactions.
- Booking confirmation will use row-level transactional checks and idempotency keys.
- Monetary records are append-oriented; financial history must not be silently overwritten or deleted.
- Dates representing hotel stay days use date semantics; audit timestamps use UTC instants.

## Mobile readiness

Do not couple domain behavior to HTML, cookies, or Next.js. Transport-specific session extraction happens only in `apps/web`; session validation lives in `packages/server`.

When mobile development begins, add `apps/mobile` and consume `/api/v1` plus shared contracts. The core pricing and display-safe domain helpers may also be imported directly where appropriate.
