# Hotel Platform MVP

Unbranded custom hotel booking marketplace under active development.

## Current MVP surfaces

- Guest homepage and hotel search
- Hotel detail page with room/rate-plan comparison
- Transparent checkout with final price before payment
- Hotel partner dashboard for rates, availability, arrivals and guest requests
- Platform admin dashboard for hotels, bookings, commissions and finance alerts
- Pricing API and hotel search API
- PostgreSQL/Prisma data model for hotels, room types, physical rooms, rate plans, inventory and bookings

## Pricing rule currently implemented

- Base room rate × 1.156 = guest final price
- 7% of base rate = service charge
- Remaining 8.6% of base rate = tax / other charge layer

The calculation is isolated in `lib/pricing.ts` so it can later become configurable per hotel, market or tax regime.

## Routes

- `/` — customer homepage
- `/search` — hotel search results
- `/hotel/h1` — hotel detail and room comparison
- `/checkout?hotel=h1&plan=rp1` — checkout
- `/hotel-dashboard` — hotel partner operations
- `/admin` — platform control center
- `/api/hotels` — current hotel result feed
- `/api/pricing?base=100` — price breakdown example

## Architecture principles

The MVP intentionally starts simple: Next.js + TypeScript + PostgreSQL. Advanced search, Redis, channel managers, PMS integrations, dynamic pricing and AI are deferred until real scale requires them.

Core correctness requirements are already reflected in the model: atomic booking transactions, temporary holds, idempotency keys, explicit overbooking limits, separate financial components, UTC timestamps, and auditable financial records.

## Next milestone

1. Add authentication and roles for guest, hotel staff and admin
2. Add real PostgreSQL persistence and seed data
3. Build hotel onboarding and verification
4. Build rate/inventory calendar CRUD and bulk edit
5. Implement transaction-safe booking hold and confirmation
6. Add modification, cancellation and refund lifecycle
7. Add commission ledger and financial reporting
8. Add email notifications and booking-linked messaging
