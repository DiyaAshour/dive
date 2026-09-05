# Hotelbeds certification readiness — HandMeKey

This checklist tracks the HBX/Hotelbeds certification requirements against the HandMeKey integration.

## Certification URL

- Production review URL: `https://handmekey.com`
- Hotelbeds environment during certification: `test`
- Hotelbeds product is labeled `Hotelbeds API` in the customer flow and is stored separately from direct HandMeKey partner-property bookings.

## 1. Technical

- [x] API authentication uses `Api-key` + SHA-256 `X-Signature`.
- [x] Optional Hotelbeds client-certificate mTLS transport is enabled through Vercel secrets.
- [x] Requests send `Accept-Encoding: gzip` and responses support gzip/deflate/br.
- [x] Availability/CheckRate calls have bounded timeouts.
- [x] Booking confirmation uses a 65-second timeout (Hotelbeds requires at least 60 seconds).
- [x] Unknown response properties are ignored; the integration does not depend on a fixed response-property order.

## 2. Certified booking workflow

Expected flow:

1. Availability (`POST /hotels`)
2. CheckRate (`POST /checkrates`) **only** when Availability returns `rateType=RECHECK`
3. Booking (`POST /bookings`)

HandMeKey status:

- [x] `BOOKABLE` rates do not trigger CheckRate.
- [x] `RECHECK` rates trigger one CheckRate before final confirmation.
- [x] Checkout no longer repeats Availability after the user selects a rate.
- [x] A signed server-side checkout snapshot preserves the selected Availability result between pages and prevents client tampering.
- [x] Child ages are mandatory whenever children are included.
- [x] All rooms/pax for the current single-room product are sent in one Booking request.
- [ ] Multi-room booking is not currently exposed. This should be disclosed during certification rather than simulated.

## 3. Availability / rate presentation

- [x] Hotel name, dates, room type, board type, star category when supplied, price, payment mode and cancellation policy are displayed.
- [x] `rateType` is preserved and used to select the correct workflow.
- [x] Cancellation policies returned by Hotelbeds are displayed before confirmation.
- [x] Provider rate comments are loaded before confirmation when available.
- [x] `sourceMarket` is derived from the requesting guest market when available.
- [ ] Final test-environment screenshots/evidence still need to be captured after the Evaluation quota resets.

## 4. Voucher

Confirmed Hotelbeds bookings expose a printable voucher at:

`/api-booking/{id}/voucher`

Voucher includes:

- [x] Hotel name
- [x] Hotel address when returned by provider/selected hotel snapshot
- [x] Hotelbeds booking reference
- [x] HandMeKey/agency reference
- [x] Check-in and check-out dates
- [x] Room type
- [x] Board type
- [x] Lead passenger
- [x] Child ages when applicable
- [x] Rate comments when applicable
- [x] Supplier name, VAT number when supplied, and provider booking reference in the supplier payment statement
- [x] Print / Save PDF action

## 5. Content

- [x] Live booking results show Hotelbeds content available in the booking response.
- [x] RateCommentDetails online lookup is implemented for `rateCommentsId`.
- [ ] Build a local Hotelbeds Content API catalogue for hotel-name autocomplete/search and weekly refresh. This is the preferred scalable solution and avoids consuming Availability calls for name discovery.
- [ ] Record exactly which Content API fields HandMeKey will claim as implemented before sending certification request.

## 6. Live environment

Do **not** perform the live certification booking until Hotelbeds has issued live credentials and explicitly asks for the test.

After live credentials are issued:

- [ ] Make one refundable live test booking roughly six months ahead with the occupancy requested by Hotelbeds.
- [ ] Save the voucher and price evidence.
- [ ] Confirm with Hotelbeds before cancellation when instructed.
- [ ] Cancel the live test booking to avoid charges.

## Current blocker

The Evaluation API key has returned `403 Quota exceeded`. Do not burn requests by repeatedly refreshing the public search. Wait for the quota window to reset, then perform a controlled certification smoke test.

## Certification request package

Before emailing `apitude@hotelbeds.com`, send:

- HandMeKey workflow description
- Commercial decisions / exclusions
- Certification URL
- Login details only if Hotelbeds needs them
- Payment test information only if required
- English guide if needed
- Clear instructions for isolating Hotelbeds product from any other supplier/direct inventory
- Any limitations such as current single-room-only support

Do not send private keys, mTLS key passphrases, Hotelbeds secrets, or Vercel credentials in the certification email.
