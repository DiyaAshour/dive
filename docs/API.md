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
- `GET /api/v1/hotels/:hotelId/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `PUT /api/v1/hotels/:hotelId/calendar`
- `PUT /api/v1/hotels/:hotelId/pricing-policy`

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

The operation reserves every stay date in one serializable transaction. If any date fails, the complete transaction rolls back.

### Read booking

`GET /api/v1/bookings/:bookingId`

Requires booking access token, booking owner session, hotel booking-management permission, or platform admin. Internal token hashes and idempotency fingerprints are never returned.

### Modify booking

`PATCH /api/v1/bookings/:bookingId`

Requires `Idempotency-Key`. A new booking revision and new nightly snapshots are appended. Previous nightly revisions remain stored. Captured pay-now bookings currently reject price-changing modification until the payment-adjustment layer is implemented.

### Confirm booking

`POST /api/v1/bookings/:bookingId/confirm`

Requires `Idempotency-Key`. Pay-at-hotel bookings may confirm directly while the hold is valid. Pay-now bookings require `paymentState=CAPTURED`; there is deliberately no fake payment-success shortcut.

### Cancel booking

`POST /api/v1/bookings/:bookingId/cancel`

Requires `Idempotency-Key`. Current-revision inventory is released atomically. Cancellation itself does not invent or complete a refund.

## Refunds

- `POST /api/v1/bookings/:bookingId/refunds` — finance-authorized refund request
- `POST /api/v1/refunds/:refundId/complete` — finance-authorized completion and append-only refund financial event

Refund amount cannot exceed captured value not already committed to another active/completed refund.

## Hold expiry

`POST /api/v1/internal/booking-holds/expire`

Platform-admin controlled execution of the reusable stale-hold expiry service. Production scheduling must call the same application service instead of implementing separate inventory-release logic.

## Pricing

`GET /api/v1/pricing?base=100&serviceRate=0.07&taxRate=0.086`

Persisted hotel pricing uses the hotel's configured service/tax policy.
