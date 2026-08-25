# Phase 25 — HandMeKey Rewards

Phase 25 introduces the first loyalty layer for traveler accounts. The design borrows the durable mechanics of hotel loyalty programs—points, visible status and stay-based progression—without copying another program's names, rules or benefits.

## Member experience

- New `/account/rewards` surface in English and Arabic.
- Visible points balance, lifetime earned points, tier, earning rate and tier progress.
- Rewards summary appears on the Account Center overview.
- Append-only recent points ledger shows the booking and hotel that produced each stay earning.
- No fake redemption control: using points at checkout is intentionally deferred until redemption is integrated with booking pricing and financial events.

## Launch tiers

| Tier | Qualifying nights | Earning rate |
| --- | ---: | ---: |
| Member | 0 | 10 points / eligible JOD |
| Key Gold | 5 | 12 points / eligible JOD |
| Key Black | 15 | 15 points / eligible JOD |

Tier qualification is lifetime qualifying nights in this launch phase. A future annual-status policy can replace this without moving earning logic into the UI.

## Earning rules

- Launch currency: `JOD` only.
- Earning base: persisted booking `baseAmount` after active promotion pricing.
- Taxes, service charges and mandatory-charge layers do not earn points.
- Only bookings linked to a signed-in traveler account can earn.
- Booking status must be `CONFIRMED` or `MODIFIED`.
- Points post only after the hotel's local departure date, matching the completed-stay rule used by verified reviews.
- `CANCELLED`, `NO_SHOW`, `EXPIRED` and temporary `HOLD` bookings never earn.
- Points are whole integers and round down.

## Integrity model

Rewards are not stored as a mutable number alone.

- `LoyaltyAccount` keeps the current balance, lifetime earned points and qualification counters.
- `LoyaltyLedgerEntry` is the durable points ledger.
- Every completed-stay earning uses `LOYALTY_STAY_EARN:<bookingId>` as an idempotency key.
- Re-opening Account Center or Rewards cannot award a stay twice.
- Settlement reads the persisted booking amount; the browser cannot submit an earning amount or tier multiplier.
- Tier and point calculations live in `@platform/core`, not React or route handlers.

## Settlement behavior

Phase 25 settles newly eligible linked stays when the traveler opens Account Center or Rewards. This is deterministic and idempotent. A later background settlement phase should add a booking-level settlement marker or relation before scanning the entire booking table, rather than relying on an inefficient global negative lookup.

## Deferred by design

- Points redemption at checkout.
- Monetary point valuation.
- Annual tier reset / rolling qualification windows.
- Promotional bonus-point campaigns.
- Partner-funded bonus points.
- Post-stay refund/recovery reversals.
- Non-JOD earning and FX normalization.
- Admin manual adjustments and expiry policies.

These are intentionally deferred so redemption and liability accounting can be added through the same booking and financial-event architecture rather than as UI discounts.
