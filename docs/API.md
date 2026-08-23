# API v1

All client-facing endpoints live under `/api/v1` and use the standard `{data,error}` envelope.

## Authentication

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Browsers use the HttpOnly session cookie. Native clients may send the same opaque session token as `Authorization: Bearer <token>`.

## Hotel workspace

- `GET /api/v1/hotels`
- `POST /api/v1/hotels`
- `POST /api/v1/hotels/:hotelId/room-types`
- `POST /api/v1/hotels/:hotelId/rate-plans`
- `PUT /api/v1/hotels/:hotelId/rate-plans/:ratePlanId/cancellation-policy`
- `GET /api/v1/hotels/:hotelId/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `PUT /api/v1/hotels/:hotelId/calendar`
- `PUT /api/v1/hotels/:hotelId/pricing-policy`

Rate plans explicitly define allowed payment modes and own a persisted cancellation policy. Bookable rates must never depend on an invisible default policy at request time.

## Booking quote

`POST /api/v1/booking-quotes`

```json
{
  "hotelId": "...",
  "roomTypeId": "...",
  "ratePlanId": "...",
  "arrival": "2026-09-01",
  "departure": "2026-09-04"
}
```

Returns the current server-calculated base/service/tax/total, rate-plan payment modes, cancellation terms, and minimum live sellable inventory across the stay. A quote does **not** reserve inventory. Hold creation revalidates everything.

## Booking engine

Mutation requests use an `Idempotency-Key` header (8-128 characters). Guest bookings receive a `bookingAccessToken` once from the hold response. Guest follow-up requests send it in `X-Booking-Token`. Authenticated users can use their session instead when they own the booking or have property permissions.

### Create hold

`POST /api/v1/bookings/holds`

```json
{
  "hotelId": "...",
  "roomTypeId": "...",
  "ratePlanId": "...",
  "guestName": "Guest Name",
  "guestEmail": "guest@example.com",
  "arrival": "2026-09-01",
  "departure": "2026-09-04",
  "paymentMode": "PAY_AT_HOTEL"
}
```

The server verifies that the requested payment mode is enabled on the rate plan, snapshots the cancellation policy, recalculates the price, and reserves every stay date in one serializable transaction. If any date fails, the complete transaction rolls back.

### Read booking

`GET /api/v1/bookings/:bookingId`

Requires booking access token, booking owner session, hotel booking-management permission, or platform admin. Internal token hashes and idempotency fingerprints are never returned.

### Modify booking

`PATCH /api/v1/bookings/:bookingId`

Requires `Idempotency-Key`. A new booking revision and new nightly snapshots are appended. Previous nightly revisions remain stored. A valid new rate plan also produces a new cancellation-policy snapshot. Captured pay-now bookings still reject price-changing modification until payment adjustment support is implemented.

### Confirm booking

`POST /api/v1/bookings/:bookingId/confirm`

Requires `Idempotency-Key`. Pay-at-hotel bookings may confirm directly while the hold is valid. Pay-now bookings require provider-recorded `paymentState=CAPTURED`; there is no client or staff shortcut for payment success.

### Cancellation preview

`GET /api/v1/bookings/:bookingId/cancellation`

Evaluates the booking's stored policy snapshot in the hotel's timezone and returns the current penalty/refundable amount without mutating the reservation.

### Cancel booking

`POST /api/v1/bookings/:bookingId/cancel`

Requires `Idempotency-Key`. Current-revision inventory is released atomically. The policy result is stored on the booking. If captured funds are refundable, a refund **request** is created; cancellation does not claim that provider funds have already been returned.

## Payments

### Capability

`GET /api/v1/payment-capabilities`

Returns whether a real registered online-payment adapter is available. `PAYMENT_PROVIDER=none` means checkout must disable pay-now.

### Initiate payment

`POST /api/v1/bookings/:bookingId/payments`

Headers: `Idempotency-Key`, plus booking/session authorization.

```json
{"returnUrl":"https://example.test/booking/return"}
```

Creates an auditable payment attempt and calls the configured `PaymentProvider`. The application stores provider identifiers/status/redirect/failure metadata, not card numbers, CVV, or raw provider payloads.

A provider result of `CAPTURED` is recorded through the booking payment-capture application service. `REQUIRES_ACTION` may return a redirect URL.

## Refunds

- `POST /api/v1/bookings/:bookingId/refunds` — finance-authorized refund request
- `POST /api/v1/refunds/:refundId/process` — executes the refund through the provider that captured the original payment

There is intentionally **no public `/refunds/:id/complete` endpoint**. Refund completion is an outcome recorded by the provider-backed service. Refund amount cannot exceed captured/refundable value not already committed to another active/completed refund.

## Hold expiry

- `POST /api/v1/internal/booking-holds/expire` — controlled platform-admin execution
- `npm run worker:holds` — deployment-neutral recurring worker

Both call the same `expireStaleHolds()` application service. Scheduler/worker code must not duplicate inventory-release logic.

## Pricing

`GET /api/v1/pricing?base=100&serviceRate=0.07&taxRate=0.086`

Persisted hotel pricing uses the hotel's configured service/tax policy.
