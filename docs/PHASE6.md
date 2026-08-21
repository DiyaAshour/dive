# Phase 6 — Publishing and Platform Verification

Phase 6 establishes a review-gated publishing lifecycle. The goal is to make `ACTIVE + verified` a controlled platform state, not a field that hotel users or UI code can set directly.

## Lifecycle

```text
DRAFT
  │ submit when readiness passes
  ▼
PENDING_REVIEW
  │ approve                     │ reject
  ▼                             ▼
ACTIVE + verified               DRAFT
  │ suspend
  ▼
SUSPENDED
  │ restore
  ▼
DRAFT → must pass review again
```

If review-relevant data changes while a property is `PENDING_REVIEW`, the pending review becomes `STALE` and the property returns to `DRAFT` automatically.

## Publish revisions

Every hotel owns a monotonically increasing `publishRevision`. Mutations that affect the initial publishing decision advance that revision through one shared server helper:

- public property content;
- room types;
- rate plans;
- cancellation policy;
- daily rates and inventory;
- service/tax pricing policy.

A `PropertyReview` stores `submittedRevision`. Admin approval succeeds only when the hotel still has that exact revision. This prevents an administrator from approving data that changed after submission.

`publishedRevision` records the revision last approved by the platform. Operational edits made after a property is already active do not silently create a new platform approval; the fields remain auditable and the revision continues to advance.

## Readiness gate

Initial submission currently requires all of the following:

1. Property description of at least 80 characters.
2. Official star rating from 1–5.
3. Check-in and check-out times.
4. At least three property photos.
5. At least three amenities.
6. At least one active room type.
7. At least one active rate plan with a payment mode and cancellation policy.
8. At least seven sellable calendar dates within the next 30 days.

A sellable date means an active rate plan has a rate for that date, is not closed or stop-sell, and its room type has inventory above the configured sellable floor.

The readiness result is stored as JSON on the review submission so the platform can later reconstruct what was checked at submission time.

## Permissions

- `OWNER`: may submit property for review.
- `MANAGER`: may submit property for review.
- Other hotel roles cannot publish even when they can manage specific operational data.
- Only `PLATFORM_ADMIN` can approve, reject, suspend, or restore a property.

## Review history

Reviews are not overwritten. Each `PropertyReview` stores:

- submitter;
- submitted revision;
- readiness snapshot;
- submission time;
- status (`PENDING`, `APPROVED`, `REJECTED`, `STALE`);
- reviewer when applicable;
- review time;
- decision reason.

Rejection requires an explicit reason. A new submission creates a new review record instead of reusing the rejected record.

## Suspension

Platform suspension immediately sets:

```text
status = SUSPENDED
verified = false
```

Discovery and booking already require `ACTIVE + verified`, so suspension removes the property from sale through the existing source-of-truth rule rather than a new blacklist layer.

Restoring a suspended hotel returns it to `DRAFT`, not directly to `ACTIVE`. It must satisfy the readiness gate and pass platform review again.

## HTTP API

Hotel:

- `GET /api/v1/hotels/:hotelId/publishing`
- `POST /api/v1/hotels/:hotelId/publishing`

Platform admin:

- `GET /api/v1/admin/property-reviews`
- `POST /api/v1/admin/property-reviews/:reviewId/decision`
- `POST /api/v1/admin/hotels/:hotelId/suspend`
- `POST /api/v1/admin/hotels/:hotelId/restore`

## Invariants

1. Hotel users cannot activate or verify their own property.
2. UI state cannot bypass the server publishing service.
3. Approval targets one exact publish revision.
4. Any review-relevant mutation invalidates a pending review.
5. Rejected and stale reviews remain in history.
6. Rejection feedback is persistent and attributable.
7. Suspension uses the same `ACTIVE + verified` discovery rule; there is no second hidden availability switch.
8. Restore never bypasses re-review.
9. Review and lifecycle mutations are audit logged.
10. Future mobile and desktop clients use the same publishing endpoints and rules.
