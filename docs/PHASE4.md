# Phase 4 — Payments, Cancellation Policy, and Live Checkout

## Invariants

1. A booking quote is informational only. Inventory is not reduced until the Phase 3 hold transaction succeeds.
2. Checkout never trusts browser-calculated prices. The server reloads rates, restrictions, hotel charges, policy, and inventory before creating the hold.
3. Payment success can only come from a registered payment provider adapter. UI flags, query strings, staff buttons, or client callbacks cannot mark money as captured.
4. Payment provider code stays behind the `PaymentProvider` interface. Booking services do not import vendor SDKs.
5. The platform does not store card numbers, CVV, or raw payment-provider payloads.
6. Payment attempts are idempotent and keep provider/status/reference/failure metadata for reconciliation.
7. Every rate plan explicitly declares allowed payment modes. Checkout cannot offer a mode the rate plan disallows.
8. Every bookable rate plan has a persisted cancellation policy. There is no hidden runtime fallback policy.
9. The cancellation policy is snapshotted into the booking at hold creation (and again on a valid rate-plan modification). Future hotel policy edits never rewrite old booking terms.
10. Cancellation evaluates the booking snapshot in the hotel's timezone and stores the resulting penalty/refundable amounts.
11. Cancellation releases inventory but does not claim that money was refunded. Captured refundable value becomes a refund request and is completed only through the payment provider result.
12. Manual public refund-completion endpoints are forbidden. The provider-backed refund service is the financial execution path.
13. Hold expiry is executed by a separate worker that calls the same `expireStaleHolds()` application service used everywhere else; inventory-release logic is never duplicated in scheduler code.
14. Pay-now is disabled when no real provider adapter is registered. There is no demo provider in production architecture.
15. Financial history remains append-only. Cancellation/refund adjustments are new events, never rewrites of original booking revenue events.

## Deferred intentionally

- A concrete payment gateway adapter (selected based on launch market/acquirer)
- Provider webhook signature verification and asynchronous payment/refund reconciliation
- Multi-currency settlement and FX accounting
- Chargebacks/disputes
- Complex policy variants such as per-night tiered penalties, local tax refund rules, and package-component refundability
- Multi-room checkout in a single reservation

These capabilities must extend the provider/policy boundaries above rather than bypassing them.
