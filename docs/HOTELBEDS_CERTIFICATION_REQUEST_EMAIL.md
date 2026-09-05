# Hotelbeds certification request email — draft

> Status: READY AS A DRAFT ONLY. Do not send until the controlled TEST evidence run is complete and the payment-type scope below is finalized.

## To

`apitude@hotelbeds.com`

## Subject

`Hotel API Certification Request — HandMeKey (B2C Hotel Marketplace)`

## Email

Hello Hotelbeds / HBX Group API Certification Team,

We would like to request certification of our Hotel Booking API integration for **HandMeKey**.

**Business model**  
HandMeKey is a B2C hotel marketplace. The public certification site is:

https://handmekey.com

HandMeKey combines direct partner-property inventory with Hotelbeds inventory. Hotelbeds products are explicitly labelled **“Hotelbeds API”** in the booking flow and Hotelbeds reservations are stored separately from direct HandMeKey partner-property reservations.

**Current certification scope**

- Hotel Booking API integration.
- Availability search.
- CheckRate only when the selected Availability rate returns `rateType=RECHECK`.
- Direct Booking for `BOOKABLE` rates without an unnecessary CheckRate.
- Booking confirmation and provider reference storage.
- Booking detail retrieval.
- Cancellation simulation followed by explicit cancellation when confirmed by an administrator.
- Single-room bookings in the current customer-facing scope.
- Child ages are collected and sent whenever children are included.
- Cancellation policies and applicable provider remarks are shown before booking.
- A printable customer voucher is generated for confirmed Hotelbeds bookings.
- Hotelbeds mTLS is enabled for the Hotel Booking API using the official test mTLS endpoint.

**Booking workflow**

1. Availability — `POST /hotel-api/1.0/hotels`
2. CheckRate — `POST /hotel-api/1.0/checkrates` only when the selected rate is `RECHECK`
3. Booking confirmation — `POST /hotel-api/1.0/bookings`

After the customer selects a rate, HandMeKey preserves the selected quote server-side and does not repeat Availability in the checkout confirmation path.

**Commercial / implementation decisions to disclose**

- The current public Hotelbeds booking scope is single-room booking.
- Current Hotelbeds content/name-discovery scope is Jordan-first: Amman, Aqaba, Petra and Dead Sea. We can expand the local catalogue scope without changing the booking workflow.
- Hotelbeds rates marked `packaging=true` are excluded from HandMeKey standalone hotel sales.
- Cancellation deadlines are shown with the provider/destination offset and are not converted through the customer's browser timezone.
- [FINALIZE BEFORE SENDING: describe how `AT_WEB` and any rate requiring Hotelbeds/provider-specific payment data are supported or excluded in the certified product scope.]

**Voucher**

Our confirmed-booking voucher contains the Hotelbeds booking reference, agency reference, hotel name and address, stay details, holder/passenger information, child ages where applicable, room type, board type, applicable rate comments, and the required supplier payment statement. A Hotelbeds booking is blocked if the mandatory hotel address is not available in our local content catalogue. The voucher is available to the customer as a printable / Save PDF page.

**Content**

HandMeKey persists Hotelbeds static hotel content in a local catalogue instead of retrieving static Content API data during the customer checkout request. The current catalogue stores the Hotelbeds hotel code, hotel name, destination, address, category, coordinates when supplied, phone, description, facilities, images and provider issues used by our product. The catalogue is refreshed by a scheduled daily sync and can also be bootstrapped manually by an authenticated platform administrator. Hotel-name discovery is performed against this local catalogue, and a Booking API Availability request is made only after a Hotelbeds hotel code has been resolved.

Rate-comment identifiers are preserved. A local offline rate-comment cache and synchronization path are available so static rate-comment content does not need to be retrieved from Content API during checkout.

**Post-booking**

HandMeKey stores Hotelbeds bookings in a separate provider ledger. Booking detail retrieval, cancellation simulation and cancellation are implemented. The administrator is shown the simulation result before the real cancellation action is exposed, and the cancelled provider response/state is retained in HandMeKey.

**Certification access**

URL: https://handmekey.com

No login is required for the public search and booking funnel unless you advise us that you need access to a protected administration page. We can provide separate review credentials if required.

**Test evidence**

[FINALIZE BEFORE SENDING: add the date of the controlled TEST run, test booking/reference, voucher evidence, BOOKABLE/RECHECK evidence and cancellation-simulation evidence requested by Hotelbeds. Do not include API secrets, private keys or certificate passphrases.]

Please let us know if you would like us to provide screenshots, a short booking-flow video, specific test cases, or any additional information for the certification review.

Thank you,

Diya Ashour  
HandMeKey  
https://handmekey.com

---

## Final send checklist

Before sending this email:

- Complete the initial local Content API bootstrap and verify a known hotel-name search.
- Populate/test offline rate comments if needed by the selected certification rate.
- Finalize the payment-type scope placeholder.
- Replace the TEST evidence placeholder.
- Confirm the production review URL is the intended certification URL.
- Confirm the current Hotelbeds test API key/certificate association is valid.
- Do not attach or paste the API Secret, mTLS private key, key passphrase, Vercel secrets, or payment credentials.
