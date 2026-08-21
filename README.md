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

The repository is organized so future clients can reuse the same platform:

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

Future mobile apps call the same versioned HTTP API used by the web application. They do not reimplement pricing, permissions, inventory, or booking rules.

## Phase 2 scope

- Workspace / monorepo architecture
- Shared domain and API contracts
- PostgreSQL persistence package
- Account registration and login
- Revocable opaque sessions for browser and future mobile clients
- Platform and hotel role-based permissions
- Hotel onboarding in DRAFT / PENDING_REVIEW lifecycle
- Room type and rate plan creation APIs
- Daily rate and inventory calendar CRUD foundation
- Configurable service and tax rates per hotel
- Versioned API under `/api/v1`

## Current pricing default

The current default pricing policy is:

- base room rate × **1.156** = final guest price;
- **7%** of base rate = employee service charge;
- **8.6%** of base rate = tax / remaining mandatory charge layer.

These values are stored as hotel configuration and calculated by `@platform/core`; they are not hard-coded inside UI components.

## Local development

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Install dependencies: `npm install`.
4. Generate Prisma Client: `npm run db:generate`.
5. Create the database migration: `npm run db:migrate -- --name init`.
6. Run the web app: `npm run dev`.

## Architecture documents

- `docs/ARCHITECTURE.md`
- `docs/ENGINEERING_RULES.md`
- `docs/API.md`

## Deferred by design

Redis, a specialized search engine, Channel Manager, PMS integrations, automatic dynamic pricing, rate intelligence, loyalty, and AI revenue features remain deferred until the core booking platform is proven.
