# Phase 8 — Guest trips and hotel reservation operations

Phase 8 turns confirmed bookings into an operational workflow for both the guest and the hotel without mixing operational state into the booking/payment lifecycle.

## Non-negotiable invariants

1. `BookingStatus` remains the commercial reservation lifecycle. Arrival/check-in information uses a separate `ArrivalStatus`.
2. Expected arrival time is stored as hotel-local `HH:mm`, not as an invented UTC timestamp.
3. A guest can update arrival details and create requests only for a booking they can access through their account or booking access token.
4. A guest cannot change arrival details after hotel staff mark the guest `ARRIVED`.
5. Guest requests are appendable records with explicit statuses (`OPEN`, `ACKNOWLEDGED`, `RESOLVED`); they are not a single mutable notes field.
6. Front-desk notes are private operational records and are never returned through guest booking APIs or discovery APIs.
7. Front-desk notes cannot be authored anonymously. The staff user ID is persisted.
8. Hotel operations require hotel RBAC (`bookings:view` / `bookings:manage`). A booking token never grants access to hotel-private notes.
9. A guest booking is not auto-linked to an account merely because email strings match. Linking requires both an authenticated account and the booking access token, and the account email must match the booking email.
10. Cancellation from the guest UI must use the stored cancellation-policy preview before the idempotent cancellation request.
11. Daily operations reports are derived from the booking database. CSV export does not maintain a second reporting data store.
12. Operational mutations create booking events and hotel audit records where staff actions are involved.
13. APIs stay under `/api/v1` and are reusable by future mobile clients; business rules do not live in React components.

## Guest account workflow

```text
Authenticated guest
  -> /trips
  -> bookings where Booking.userId = account id
  -> booking page
       -> expected arrival
       -> guest requests
       -> cancellation preview + cancellation
```

A booking created without an account can be linked later:

```text
Authenticated account + X-Booking-Token
  -> POST /api/v1/bookings/:bookingId/link-account
  -> token hash verified
  -> account email must match booking guest email
  -> Booking.userId set once
  -> ACCOUNT_LINKED booking event
```

No email-only claiming is allowed.

## Guest request lifecycle

```text
OPEN
  -> ACKNOWLEDGED
  -> RESOLVED
```

The hotel may move a request between these operational states. The original request message remains stored.

## Arrival lifecycle

```text
NOT_PROVIDED
  -> EXPECTED (with HH:mm local time)
  -> ARRIVED
```

Hotel staff can correct the status. Once `ARRIVED`, guest-side arrival editing is blocked.

## Hotel operations workspace

`/hotel-dashboard/reservations` provides date-scoped views:

- Arrivals
- Departures
- In-house
- Daily operations

Each reservation exposes the booking reference, guest, room type, rate plan, payment state, expected arrival, guest requests, and the latest private front-desk notes.

The same dataset can be exported as CSV through:

`GET /api/v1/hotels/:hotelId/reservations/export?date=YYYY-MM-DD&scope=ARRIVALS|DEPARTURES|IN_HOUSE|ALL`

## API surface

Guest/account:

- `GET /api/v1/me/trips`
- `POST /api/v1/bookings/:bookingId/link-account`
- `GET/PUT /api/v1/bookings/:bookingId/arrival`
- `GET/POST /api/v1/bookings/:bookingId/requests`

Hotel operations:

- `GET /api/v1/hotels/:hotelId/reservations`
- `GET /api/v1/hotels/:hotelId/reservations/export`
- `PATCH /api/v1/hotels/:hotelId/reservations/:bookingId/arrival`
- `PATCH /api/v1/hotels/:hotelId/reservations/:bookingId/requests/:requestId`
- `GET/POST /api/v1/hotels/:hotelId/reservations/:bookingId/notes`

## Deferred by design

Phase 8 does not yet introduce physical room assignment, housekeeping task workflow, guest chat, passport/ID capture, police/nationality reports, or PMS synchronization. Those should build on the operational layer rather than be inserted as fields into the booking model.