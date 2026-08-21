# API v1

All client-facing application endpoints live under `/api/v1`.

## Response envelope

Success:

```json
{"data": {}, "error": null}
```

Failure:

```json
{"data": null, "error": {"code": "SOME_CODE", "message": "Human readable message"}}
```

Validation failures additionally include structured field issues.

## Authentication

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Browser clients receive an HttpOnly session cookie. Future native apps can send the same opaque session token in `Authorization: Bearer <token>`.

## Hotel workspace

- `GET /api/v1/hotels` — list properties available to the current user
- `POST /api/v1/hotels` — create a DRAFT property and OWNER membership
- `POST /api/v1/hotels/:hotelId/room-types`
- `POST /api/v1/hotels/:hotelId/rate-plans`
- `GET /api/v1/hotels/:hotelId/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `PUT /api/v1/hotels/:hotelId/calendar`
- `PUT /api/v1/hotels/:hotelId/pricing-policy`

Every hotel-scoped write checks the user's membership and role on the server. Client UI visibility is never treated as authorization.

## Pricing

- `GET /api/v1/pricing?base=100&serviceRate=0.07&taxRate=0.086`

This endpoint is a convenience calculator. Persisted hotel pricing is sourced from the hotel's configured service/tax policy.
