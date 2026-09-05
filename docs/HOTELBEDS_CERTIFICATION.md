# Hotelbeds certification readiness — HandMeKey

Last audited: 2026-09-05

This checklist tracks the current HandMeKey Hotelbeds Hotels API integration against the Hotelbeds certification review areas. It is intentionally conservative: an item is marked complete only when the implementation is present and we have enough evidence to defend it during certification.

## Certification scope

- Review URL: `https://handmekey.com`
- Business model: B2C hotel marketplace.
- Current Hotelbeds environment: `test` / Evaluation until Hotelbeds upgrades the account.
- Hotelbeds product is labelled `Hotelbeds API` in the customer flow and stored separately from direct HandMeKey partner-property bookings.
- Current Hotelbeds product scope is single-room booking.
- Current destination/name-discovery code is Jordan-first. Do not describe global hotel-name search as complete yet.

## 1. Technical

- [x] API authentication uses `Api-key` + SHA-256 `X-Signature`.
- [x] Hotel Booking API mTLS uses the official mTLS hosts when enabled:
  - Test: `api-mtls.test.hotelbeds.com`
  - Production: `api-mtls.hotelbeds.com`
- [x] Content API calls are not forced through the Booking API mTLS transport.
- [x] Certificate/private-key material is supplied through Vercel secrets and is not committed to the repository.
- [x] Responses support gzip/deflate/br.
- [x] Availability and CheckRate calls have bounded timeouts.
- [x] Booking confirmation uses a 65-second timeout (Hotelbeds asks for at least 60 seconds).
- [x] Unknown response properties are ignored and response-property order is not assumed.

## 2. Booking workflow

Expected booking flow:

1. Availability (`POST /hotels`)
2. CheckRate (`POST /checkrates`) only when the selected rate has `rateType=RECHECK`
3. Booking (`POST /bookings`)

HandMeKey status:

- [x] `BOOKABLE` rates do not trigger CheckRate.
- [x] `RECHECK` rates trigger one CheckRate before confirmation.
- [x] Checkout does not repeat Availability after a rate has been selected.
- [x] A signed server-side checkout snapshot protects the selected provider quote from client tampering.
- [x] Child ages are mandatory whenever children are included.
- [x] Current booking product sends the single room and all its paxes in one Booking request.
- [!] Multi-room booking is not exposed. Disclose this as current product scope during certification.
- [ ] Filter out Hotelbeds opaque/package-only rates (`packaging=true`) from standalone hotel sales unless HandMeKey later sells them as a qualifying package.

## 3. Availability, CheckRate and presentation

- [x] Hotel name, dates, room type, board type, category when supplied, price, payment mode and cancellation policy are shown.
- [x] `rateType` is preserved and drives the correct booking workflow.
- [x] Cancellation policies from Hotelbeds are shown before confirmation.
- [x] `sourceMarket` is derived from the requesting guest market when available.
- [x] Hotelbeds allotment is preserved as `availableToSell` internally.
- [ ] Display the Hotelbeds allotment / number of rooms in the Hotelbeds rate UI where appropriate for certification evidence.
- [ ] Preserve cancellation penalty date/time without converting it through the guest browser timezone. Hotelbeds cancellation deadlines are based on the destination/hotel timezone.
- [ ] Decide how to handle rates that require Hotelbeds payment data. Either implement the required secure payment-data flow or exclude those rates from the certification test/product scope.
- [ ] Capture final test-environment screenshots and request/response evidence after the Evaluation quota resets.

## 4. Voucher

Confirmed Hotelbeds bookings expose a printable voucher at:

`/api-booking/{id}/voucher`

Implemented:

- [x] Hotel name.
- [x] Hotelbeds booking reference.
- [x] Agency/client reference and HandMeKey reference.
- [x] Check-in and check-out dates.
- [x] Room type.
- [x] Board type.
- [x] Lead passenger.
- [x] Child ages when applicable.
- [x] Rate comments when available in the stored booking snapshot/response.
- [x] Supplier name, VAT number when supplied, and provider reference in the supplier payment statement.
- [x] Print / Save PDF action.

Certification blocker:

- [ ] Hotel address is mandatory on the Hotelbeds voucher, but the current voucher can fall back to `Address unavailable`. Populate the address from locally stored Content API hotel data and snapshot it into the booking/voucher.

Recommended improvements before review:

- [ ] Show hotel category on the voucher when available.
- [ ] Show hotel phone number when available from locally stored content.

## 5. Content API

Current implementation:

- [x] Booking response content is normalized into the live booking flow.
- [x] Rate comment identifiers are preserved.
- [!] `RateCommentDetails` is currently fetched from Content API in real time during checkout. Hotelbeds explicitly says static Content API information must not be retrieved in real time and warns that doing so can lead to credential blocking.
- [!] Hotel-name discovery currently probes Booking API Availability across supported Jordan destination codes. This consumes booking quota and is not the scalable Hotelbeds content-search design.

Required before certification submission:

- [ ] Build a local Hotelbeds Content API catalogue persisted in HandMeKey.
- [ ] Use the local catalogue for hotel-name autocomplete/search (for example `Signia by Hilton`).
- [ ] Store at minimum: Hotelbeds hotel code, name, destination, address, category, coordinates when available, phone, images/facilities used by HandMeKey, and other fields we explicitly claim in certification.
- [ ] Move RateCommentDetails/static rate-comment content to the local content refresh path rather than fetching it in the live checkout request.
- [ ] Implement a scheduled refresh strategy (at least weekly; preferably differential/daily where practical).
- [ ] Document exactly which Content API fields are implemented before emailing Hotelbeds.

## 6. Post-booking / live readiness

- [x] Confirmed Hotelbeds bookings are stored in a separate API booking ledger with provider reference and provider response.
- [x] Confirmation page links to the voucher.
- [ ] Implement Hotelbeds Booking cancellation (`DELETE /bookings/{reference}` with the correct cancellation flag) and persist the cancelled state/provider response.
- [ ] Add a safe cancellation simulation path if used operationally before committing a cancellation.

Do not perform a live certification booking until Hotelbeds issues live credentials and explicitly coordinates the test.

After live credentials are issued:

- [ ] Make one refundable live test booking roughly six months ahead with the occupancy requested by Hotelbeds (their current certification page states 2 adults + 2 children).
- [ ] Save/send the voucher and price evidence requested by Hotelbeds.
- [ ] Confirm with Hotelbeds before cancellation.
- [ ] Cancel the live test booking so it does not remain chargeable.

## Evidence still required

The Evaluation key has returned `403 Quota exceeded`. Once the quota resets, perform one controlled certification smoke test rather than repeatedly refreshing public search:

1. Availability with a known destination/hotel.
2. A `BOOKABLE` rate path proving no CheckRate occurs.
3. A `RECHECK` rate path proving exactly one CheckRate occurs.
4. Test Booking confirmation.
5. Voucher generated from the confirmed test booking.
6. Error handling evidence for an unavailable/expired rate.

Do not use a LIVE booking for this evidence until Hotelbeds authorizes the live test.

## Certification request package

Before sending the request to `apitude@hotelbeds.com`, include:

- HandMeKey business model and workflow.
- Implemented operations.
- Current commercial scope/exclusions (including single-room-only and any destination restrictions that still apply).
- Certification URL.
- Login credentials only if Hotelbeds actually needs them to review the site.
- Payment test information only if required and safe to provide.
- Clear instructions for identifying Hotelbeds product versus HandMeKey direct partner inventory.
- Known limitations disclosed clearly.

Never email private keys, certificate passphrases, Hotelbeds API secrets, Vercel secrets or payment credentials.

## Current verdict

**Do not send a “fully ready” certification request yet.**

The core Booking API workflow, mTLS transport, confirmation and voucher framework are in place. The remaining high-priority blockers are:

1. Local Content API catalogue and removal of real-time static Content API lookup.
2. Guaranteed hotel address on every Hotelbeds voucher.
3. Filtering package-only/opaque rates for standalone hotel sale.
4. Correct destination-timezone handling for cancellation deadlines.
5. Post-booking Hotelbeds cancellation before the final live test.
6. One controlled test-environment evidence run after quota reset.

Once these are closed, the certification email draft in `docs/HOTELBEDS_CERTIFICATION_REQUEST_EMAIL.md` can be sent with final evidence details filled in.
