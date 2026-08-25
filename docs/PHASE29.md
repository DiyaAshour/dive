# Phase 29 — Hotel offer density and conversion surface

Phase 29 removes the large empty vertical gaps from the public hotel rate area and turns the booking surface into a dense, information-rich marketplace layout inspired by the useful density of large OTAs while keeping HandMeKey's own visual language.

## What changed

- Hotel booking area now uses a main rate matrix plus a sticky live-price summary rail on desktop.
- Each room remains a distinct room product with image, capacity, bed layout, facilities and honest low-inventory signal.
- Each rate is rendered as a compact four-column matrix: offer/meal, cancellation, payment/benefits, and final price/action.
- Best-price badges are calculated only from the real offers inside the same room product.
- Flexible badges require live free-cancellation eligibility.
- Full-board rates may receive a factual included-stay badge.
- Payment chips come from actual `paymentModes`.
- Low-inventory badges come from actual `availableToSell` values.
- Promotions use existing promotion data only.
- HandMeKey Rewards points are calculated through `calculateLoyaltyPoints` from the eligible room base amount at the Member earning floor; service and tax are not counted.
- The side rail repeats the current stay, lowest live total, minimum Member points and a jump-to-rates action.
- Tablet and mobile layouts collapse the dense matrix without preserving desktop dead space.

## Integrity

This phase does not create synthetic reviews, fake urgency, invented discounts, or fake savings. Visual emphasis is derived from server-authoritative offer data.
