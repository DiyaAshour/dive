# Partner reservation operations center

The Partner Hub reservation center lives at `/hotel-dashboard/reservations`.

## Operational views

The center is organized around a hotel-local operational date and supports:

- Daily board
- Arrivals
- Departures
- In-house stays
- Cancelled reservations
- No-show reservations
- Search by booking reference, guest name or guest email
- CSV export using the active date, scope and search query

The list is a working queue. Selecting a reservation opens a detailed operational panel without mixing private front-desk notes with guest-visible content.

## Reservation detail

The detail panel shows the current booking revision, room and rate plan, occupancy, stay dates, payment state, amount breakdown, nightly price snapshots, guest requests, private front-desk notes and booking event history.

Arrival status remains operationally separate from the commercial booking status. Front-desk staff can save the expected arrival time or mark the guest as arrived.

## Safe hotel-side modification

Hotel-side modification reuses the existing booking engine. It does not directly rewrite booking columns.

A modification verifies `bookings:manage`, hotel ownership, arrival state, rates, occupancy and inventory before it creates a new booking revision and financial deltas. Checked-in and past-arrival reservations are protected, and captured pay-now reservations remain protected until payment-adjustment support is available.

## Cancellation

The hotel can preview cancellation before committing it. The preview uses the cancellation policy snapshot stored on the booking, so a later rate-plan policy change cannot silently rewrite the guest's contracted terms.

Confirmed cancellation uses the existing wallet-aware cancellation service. It evaluates the penalty, releases inventory, creates the financial adjustment/refund when eligible and reconciles HandMeKey Wallet credit. The reservation center then records `BOOKING_CANCELLED_BY_HOTEL`.

Checked-in stays cannot be cancelled from this center. Once the scheduled arrival date has passed, the center routes the reservation to the dedicated no-show action instead of allowing an ordinary cancellation classification.

## No-show

No-show is deliberately conservative. A reservation can be marked no-show only when its status is `CONFIRMED` or `MODIFIED`, the guest has not been marked `ARRIVED`, and the hotel's local calendar date is later than the scheduled arrival date.

The flow first executes the existing cancellation settlement after arrival. That causes the stored no-show penalty rule to be evaluated and safely releases inventory/refunds. Once the settlement event is verified, the final booking status is changed from `CANCELLED` to `NO_SHOW` and an attributable `BOOKING_MARKED_NO_SHOW` audit event is written.

This approach does not require a new database enum or a second financial implementation.

## Current lifecycle boundary

The current database distinguishes `ARRIVED` but does not yet store an explicit checked-out/departed timestamp or status. The center therefore derives in-house and departure queues from arrival/departure dates plus `arrivalStatus`.

A future property-operations phase can add explicit check-out/room-turnover state without changing the commercial reservation history.

## CI coverage

`npm run reservation-management:smoke` creates an isolated partner hotel and verifies hotel-side modification with repricing and inventory movement, cancellation preview, protection against premature no-show, policy-aware cancellation, no-show settlement, inventory restoration, cancelled/no-show operational scopes, reservation search and attributable audit records.

CI runs this smoke before workspace typecheck and the production web build.
