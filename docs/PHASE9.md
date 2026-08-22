# Phase 9 — Reviews, Promotions, and Booking Messaging

Phase 9 adds booking-platform trust, conversion, and communication features. It deliberately does not expand into PMS, housekeeping, or physical-room operations.

## Reviews

A guest review is a verified-stay artifact, not an anonymous hotel comment.

- A booking can have at most one review.
- Review submission uses the existing booking-access boundary.
- The booking must be `CONFIRMED` or `MODIFIED`.
- The hotel-local calendar date must be on or after the booking departure date.
- Public scores come only from persisted `PUBLISHED` verified-stay reviews.
- The UI must never fabricate a score when a property has no reviews.
- Public guest identity is intentionally reduced to first name plus last initial.
- Hotel replies require property booking permissions and are audit logged.

## Promotions

Promotions are commercial pricing rules layered on top of persisted daily rates. They do not rewrite `DailyRate`.

A promotion has:

- a hotel;
- an explicit set of eligible rate plans;
- a booking window;
- a stay window;
- a minimum length of stay;
- a percentage discount;
- an explicit lifecycle (`DRAFT`, `ACTIVE`, `PAUSED`, `ARCHIVED`).

The shared server-side promotion engine selects the highest eligible discount. The discount is applied to the room base before service and tax are calculated.

Search, hotel details, booking quote, booking hold, and booking modification must use the same promotion-selection rule. The browser never calculates the discount.

When a booking is created or repriced, the promotion name and percentage are snapshotted onto the booking. Later edits to the promotion cannot rewrite historical booking pricing.

## Booking messaging

Messaging is contextual communication around a real reservation.

- A booking has at most one conversation.
- Guest message access uses the same booking access token/account authorization as booking management.
- Hotel access requires property booking permissions.
- Messages can be created only for confirmed or modified reservations.
- Guest and hotel read timestamps are independent.
- Private front-desk notes from Phase 8 are never copied into guest messaging.
- There is no anonymous pre-booking chat in this phase.

## Invariants

1. No review without a completed, accessible booking.
2. No more than one review per booking.
3. No synthetic review score or placeholder rating.
4. No client-side promotion calculation.
5. Search price and booking-engine price must be derived from the same promotion rules.
6. Promotions never mutate historical daily rates to simulate a deal.
7. Booking promotion snapshots survive later promotion changes.
8. Booking messages cannot expose private front-desk notes.
9. Hotel messaging authorization is property-scoped.
10. Phase 9 does not introduce PMS, housekeeping, or physical-room assignment behavior.
