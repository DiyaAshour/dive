# Hotelbeds certification request email — draft

> Status: READY AS A DRAFT ONLY. Do not send until the blockers in `HOTELBEDS_CERTIFICATION.md` are closed and the final test evidence is captured.

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
- We do not intend to sell Hotelbeds opaque/package-only rates as standalone hotel-only products.
- [FINALIZE BEFORE SENDING: state the exact destination scope if it is still restricted, or remove this line if global Hotelbeds hotel discovery is complete.]
- [FINALIZE BEFORE SENDING: describe how rates requiring Hotelbeds payment data are handled/excluded in the certified product scope.]

**Voucher**

Our confirmed-booking voucher contains the Hotelbeds booking reference, agency reference, hotel and stay details, holder/passenger information, child ages where applicable, room type, board type, applicable rate comments, and the required supplier payment statement. It is available to the customer as a printable / Save PDF page.

**Content**

[FINALIZE BEFORE SENDING: describe the locally stored Hotelbeds Content API catalogue, refresh frequency, and the exact static fields implemented by HandMeKey.]

**Certification access**

URL: https://handmekey.com

No login is required for the public search and booking funnel unless you advise us that you need access to a protected administration page. We can provide separate review credentials if required.

**Test evidence**

[FINALIZE BEFORE SENDING: add the date of the controlled test run and any test booking/reference or screenshots Hotelbeds requests. Do not include API secrets, private keys or certificate passphrases.]

Please let us know if you would like us to provide screenshots, a short booking-flow video, specific test cases, or any additional information for the certification review.

Thank you,

Diya Ashour  
HandMeKey  
https://handmekey.com

---

## Final send checklist

Before sending this email:

- Close all blocker items in `HOTELBEDS_CERTIFICATION.md`.
- Replace every `[FINALIZE BEFORE SENDING: ...]` placeholder.
- Confirm the production review URL is the intended certification URL.
- Confirm the current Hotelbeds test API key/certificate association is valid.
- Capture controlled test evidence after the Evaluation quota resets or the account is moved to certification quota.
- Do not attach or paste the API Secret, mTLS private key, key passphrase, Vercel secrets, or payment credentials.
