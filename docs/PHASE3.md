# Phase 3 — Booking Engine

## Invariants

1. A booking hold reserves every stay date in one serializable transaction.
2. If one date cannot be reserved, no date is changed.
3. Inventory updates use compare-and-decrement semantics to detect races.
4. Idempotency keys cannot be reused for different requests.
5. Guest booking access tokens are HMAC-derived and only their hashes are persisted.
6. Booking night history is revisioned; previous nightly prices are never deleted during modification.
7. Confirmation creates financial events. Modification appends financial deltas. Refund completion appends a negative refund event.
8. Cancellation releases inventory but does not fabricate a refund.
9. Pay-now reservations cannot confirm before payment capture is recorded by a payment adapter.
10. Public booking views use an allow-list and never return security internals.

## Deferred intentionally

- Payment gateway implementation
- Cancellation-policy calculation engine
- Automated production scheduler wiring
- Multi-room bookings in a single reservation
- PMS / Channel Manager synchronization

These are separate layers and must not be simulated with temporary success flags or duplicated business logic.
