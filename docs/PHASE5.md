# Phase 5 — Live discovery and hotel content

Phase 5 removes customer-facing hotel mock data and makes the platform database the source of truth for property discovery.

## Public hotel content

Hotels can manage customer-facing content independently from booking and financial configuration:

- area / neighborhood
- description
- official star rating
- latitude and longitude
- check-in and check-out times
- ordered property photos
- searchable amenities

Content mutations require hotel edit permission and create an audit record. Draft or unverified hotels remain invisible to public discovery.

## Discovery engine

`@platform/server` owns discovery logic. The web application and public HTTP API call the same service.

A hotel is returned for a stay only when:

- the property is `ACTIVE` and verified;
- the room type can accommodate the requested adults and children;
- every night has inventory configured;
- sellable inventory remains for every night;
- every night has a rate configured for the selected rate plan;
- stop-sell / closed flags do not block the rate;
- minimum and maximum stay restrictions are satisfied;
- a persisted cancellation policy exists.

Final base, service, tax and total amounts are calculated with `@platform/core`. Search never trusts a price sent by a browser.

## Search filters

Phase 5 supports:

- destination text across property name, city, area, address and country code
- arrival / departure
- adult and child capacity
- minimum and maximum average nightly total
- official star rating
- required amenities
- free cancellation at the time of search
- payment mode
- recommended / price / star sorting

The free-cancellation filter evaluates the persisted cancellation policy using the hotel's timezone and the live stay price.

## Customer flow

`Home → Search → Hotel details → Checkout`

All four stages now use database-backed hotel IDs, room-type IDs, rate-plan IDs, live rates, live inventory and stored policies. Phase 4 remains responsible for the atomic hold, confirmation, payment-provider boundary and booking lifecycle.

## Public API

- `GET /api/v1/discovery/search`
- `GET /api/v1/discovery/hotels/:hotelId`

Hotel management API:

- `GET /api/v1/hotels/:hotelId/content`
- `PUT /api/v1/hotels/:hotelId/content`

## Invariants

- No customer-facing hotel mock data.
- No fabricated review score when no review system exists.
- No fallback price when rates are incomplete.
- No fallback availability when inventory is incomplete.
- No public discovery of draft, suspended, unverified or inactive properties.
- Search and checkout use the same pricing and policy foundations rather than duplicating formulas in UI code.
