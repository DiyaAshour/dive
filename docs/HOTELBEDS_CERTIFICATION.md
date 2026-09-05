# Hotelbeds certification readiness — HandMeKey

Last audited: 2026-09-05

This checklist tracks the current HandMeKey Hotelbeds Hotels API integration against the Hotelbeds certification review areas. An item is marked complete only when the implementation is present; live/test evidence is tracked separately.

## Certification scope

- Review URL: `https://handmekey.com`
- Business model: B2C hotel marketplace.
- Current Hotelbeds environment: `test` / Evaluation until Hotelbeds upgrades the account.
- Hotelbeds product is labelled `Hotelbeds API` in the customer flow and stored separately from direct HandMeKey partner-property bookings.
- Current Hotelbeds product scope is single-room booking.
- Current content/discovery scope is Jordan-first (`AMM`, `AQJ`, `PET`, `DSE`) unless `HOTELBEDS_CONTENT_DESTINATIONS` is expanded.

## 1. Technical

- [x] API authentication uses `Api-key` + SHA-256 `X-Signature`.
- [x] Hotel Booking API mTLS uses the official mTLS hosts when enabled:
  - Test: `api-mtls.test.hotelbeds.com`
  - Production: `api-mtls.hotelbeds.com`
- [x] Content API calls are not forced through the Booking API mTLS transport.
- [x] Certificate/private-key material is supplied through Vercel secrets and is not committed to the repository.
- [x] Responses support gzip/deflate/br.
- [x] Availability and CheckRate calls have bounded timeouts.
- [x] Booking confirmation uses a 65-second timeout.
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
- [x] Hotelbeds opaque/package-only rates (`packaging=true`) are filtered from standalone hotel sales.
- [!] Multi-room booking is not exposed. Disclose this as current product scope during certification.

## 3. Availability, CheckRate and presentation

- [x] Hotel name, dates, room type, board type, category when supplied, price, payment mode and cancellation policy are shown.
- [x] `rateType` is preserved and drives the correct booking workflow.
- [x] Cancellation policies from Hotelbeds are shown before confirmation.
- [x] `sourceMarket` is derived from the requesting guest market when available.
- [x] Hotelbeds allotment is preserved and displayed as `availableToSell` in checkout.
- [x] Cancellation penalty date/time is displayed with the provider/destination offset instead of being converted through the guest browser timezone.
- [ ] Finalize the certification scope for Hotelbeds payment types (especially `AT_WEB`) and confirm whether HandMeKey will support or exclude any rate requiring provider-specific payment data.
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
- [x] Booking is blocked if the mandatory hotel address is not available from the local Content API catalogue, so a confirmed Hotelbeds booking cannot produce an address-less voucher.

Recommended improvements before review:

- [ ] Show hotel category on the voucher when available.
- [ ] Show hotel phone number when available from locally stored content.

## 5. Content API

Implemented:

- [x] Local `HotelbedsContentHotel` catalogue is persisted in HandMeKey.
- [x] Stored hotel fields include code, name, destination, address, category, coordinates, phone, description, facilities/images/issues and raw provider content.
- [x] Hotel-name search uses the local catalogue rather than probing several Booking API destinations.
- [x] After a local hotel-name match, Availability is requested only for the strongest matching provider hotel code(s), reducing Booking API quota consumption.
- [x] Checkout no longer fetches static `RateCommentDetails` in real time.
- [x] A local `HotelbedsRateCommentCache` and offline rate-comment sync path exist.
- [x] Daily Content API hotel refresh is scheduled in `vercel.json` and protected by `CRON_SECRET`.
- [x] An admin-only manual catalogue bootstrap/sync control is available at `/admin/api-bookings`.

Evidence / bootstrap still required:

- [ ] Run the initial Hotelbeds Content API bootstrap after the Evaluation quota window permits it and confirm the catalogue contains the expected Jordan hotels (including Signia if returned by Hotelbeds content).
- [ ] Enable/populate/test the offline rate-comment catalogue for the certification test if the selected `BOOKABLE` rate depends on a `rateCommentsId`.
- [ ] Confirm the exact Content API fields HandMeKey will claim in the certification email.

## 6. Post-booking / live readiness

- [x] Confirmed Hotelbeds bookings are stored in a separate API booking ledger with provider reference and provider response.
- [x] Confirmation page links to the voucher.
- [x] Booking detail retrieval is implemented.
- [x] Cancellation simulation is implemented before commitment.
- [x] Actual Hotelbeds cancellation is implemented and persists `CANCELLED`, `cancelledAt` and provider cancellation evidence.
- [x] Admin UI requires simulation before exposing the real cancellation action and asks for confirmation before commitment.
- [ ] Exercise cancellation simulation against a controlled TEST booking and capture evidence.

Do not perform a live certification booking until Hotelbeds issues live credentials and explicitly coordinates the test.

After live credentials are issued:

- [ ] Make the refundable live test booking requested by Hotelbeds.
- [ ] Save/send the voucher and price evidence requested by Hotelbeds.
- [ ] Confirm with Hotelbeds before cancellation.
- [ ] Cancel the live test booking so it does not remain chargeable.

## Evidence still required

The Evaluation key has returned `403 Quota exceeded`. Once the quota resets, perform one controlled certification run rather than repeatedly refreshing public search:

1. Run one initial Content API catalogue bootstrap from `/admin/api-bookings`.
2. Confirm a known hotel-name lookup (for example Signia) resolves locally.
3. Availability with the selected provider hotel.
4. A `BOOKABLE` rate path proving no CheckRate occurs.
5. A `RECHECK` rate path proving exactly one CheckRate occurs.
6. TEST Booking confirmation.
7. Voucher generated from the confirmed TEST booking with hotel address.
8. Cancellation simulation evidence; actual TEST cancellation only when appropriate.
9. Error handling evidence for an unavailable/expired rate.

Do not use a LIVE booking for this evidence until Hotelbeds authorizes the live test.

## Certification request package

Before sending the request to `apitude@hotelbeds.com`, include:

- HandMeKey business model and workflow.
- Implemented operations.
- Current commercial scope/exclusions (single-room and Jordan-first discovery unless expanded before review).
- Certification URL.
- Login details only if Hotelbeds actually needs them to review protected pages.
- Payment test information only if required and safe to provide.
- Clear instructions for identifying Hotelbeds product versus HandMeKey direct partner inventory.
- Known limitations disclosed clearly.

Never email private keys, certificate passphrases, Hotelbeds API secrets, Vercel secrets or payment credentials.

## Current verdict

**Implementation blockers are substantially closed, but do not send the final certification request until the controlled TEST evidence run is complete.**

Remaining actions before sending:

1. Initial local Content API catalogue bootstrap and Signia/name-search verification.
2. Offline rate-comment cache evidence if needed by the selected certification rate.
3. Final decision/documentation for Hotelbeds payment-type scope (`AT_WEB` and any provider-payment-data requirement).
4. One controlled end-to-end TEST booking/voucher/cancellation-simulation evidence run after quota reset.
5. Fill the final evidence and scope placeholders in `docs/HOTELBEDS_CERTIFICATION_REQUEST_EMAIL.md`.
