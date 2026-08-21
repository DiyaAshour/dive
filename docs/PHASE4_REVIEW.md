# Phase 4 review notes

Phase 4 is complete only when these boundaries remain true:

- Checkout uses live booking quotes and creates real booking holds.
- Pay-at-hotel confirmation uses the booking engine; online payment never bypasses provider capture.
- Payment providers implement the shared `PaymentProvider` contract and are selected by deployment configuration.
- Payment initiation and refund processing are protected against duplicate provider calls under concurrent retries.
- Cancellation rules belong to rate plans and are snapshotted into bookings so later policy edits cannot rewrite historical terms.
- Cancellation preview and cancellation execution use the same core evaluator.
- Hold expiry runs through the shared application service and may be hosted by the dedicated worker without duplicating inventory-release rules.
- Public booking responses never expose token hashes, request fingerprints, or provider secrets.
- No mock gateway or forced payment-success path is permitted in production architecture.
