# Phase 10 — Growth Intelligence

Phase 10 turns first-party platform activity into two concrete products: customer price intelligence and hotel conversion intelligence.

## Customer intelligence

- Authenticated users can save a search with stay dates, guests, and filter snapshot.
- Authenticated users can create one active price watch per hotel/stay/guest combination.
- A price watch snapshots the first live final total, latest checked total, lowest observed total, and optional target total.
- The background worker recalculates price watches through the same live discovery, promotion, service-charge, tax, restriction, and inventory logic used by the customer booking flow.
- A watch never uses a cached or invented price as source of truth.
- New all-time lows require at least a 1% improvement before a price-drop notification is created, unless an explicit target is crossed.
- Price alerts are durable in-app notifications stored in PostgreSQL; an email provider is not required for the feature to work.

## Hotel performance intelligence

The hotel performance workspace measures:

1. search impressions;
2. property views;
3. checkout starts;
4. booking holds;
5. confirmed bookings;
6. cancellation and hold-expiry outcomes;
7. active confirmed booking value;
8. destination search demand by future arrival date.

Search demand stores destination, dates, guest counts, result count, and timestamp. It does not store guest identity, IP address, device fingerprint, or advertising identifier.

## Opportunity signals

Opportunity signals are deterministic rules over first-party metrics. They are deliberately not presented as AI recommendations.

Examples:

- low impression → property-view rate;
- low property-view → checkout rate;
- high checkout abandonment;
- high hold-expiry rate;
- strong destination search demand for a future arrival date.

The rule, underlying numerator/denominator, and measured rate remain inspectable.

## Telemetry failure policy

Growth telemetry is non-authoritative. Search, hotel discovery, checkout, payment, or booking must not fail because an analytics write fails. Telemetry writes therefore fail open and emit an explicit server error log.

Authoritative commercial metrics such as confirmed bookings and booking value are read from the booking domain, not reconstructed from telemetry events.

## Analytics storage boundary

Growth projections live in `packages/database/prisma/growth.prisma` while booking and operational entities remain in `schema.prisma`. Prisma loads the `prisma` folder as one schema set.

High-volume analytics records intentionally store immutable entity IDs instead of cascade relations. This preserves historical funnel data if operational records are later removed and avoids coupling telemetry writes to transactional entity lifecycles.

## Invariants

1. Customer price watches must use the same server-side pricing rules as booking.
2. Background price checks must not count as hotel views or search demand.
3. Next.js link prefetch must not inflate hotel-view analytics.
4. Confirmed booking counts and value come from the booking database domain, not growth telemetry.
5. Search demand never stores personally identifying visitor data.
6. Opportunity signals are deterministic and must expose their measured basis.
7. Growth telemetry failure must not block commerce.
8. An external email provider is optional; durable in-app notifications are the base notification channel.
9. Saved searches and price watches are account scoped and cannot be read or removed by another user.
10. This phase does not implement dynamic pricing, competitor scraping, or AI revenue recommendations.
