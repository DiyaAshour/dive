# Google Hotels distribution

HandMeKey generates the two partner artifacts needed before Hotel Center certification:

- Hotel List feed: `/api/v1/integrations/google-hotels/hotel-list.xml`
- Landing Pages feed: `/api/v1/integrations/google-hotels/landing-pages.xml`

The feeds are generated from the current HandMeKey database. There is no per-property integration switch: an `ACTIVE` and `verified` property with a valid name, slug, address, city and two-letter country code is automatically eligible for the Hotel List feed.

## Property matching quality

The Google distribution console is available at `/admin/distribution/google-hotels`.

A property is classified as:

- `READY`: eligible for the hosted Hotel List feed.
- `NEEDS_DATA`: active and verified, but missing required feed data.
- `EXCLUDED`: not active or not verified.

Latitude and longitude are not required by HandMeKey to emit the listing, but the console highlights properties that have them because accurate geo data materially improves Google property matching. The platform does not claim a property is `MATCHED` or `LIVE` until that status can be obtained from a real Hotel Center connection.

## Deep links

The Landing Pages feed sends Google traffic through `/google/hotel`. Google supplies the HandMeKey hotel ID, stay dates and occupancy. The gateway validates those inputs and redirects to the current canonical hotel slug, preserving dates/occupancy and adding Google attribution parameters.

This means hotel slugs can evolve without changing the stable partner hotel ID in the Hotel List feed.

## Feed authentication

The hosted XML endpoints can be public or protected with HTTP Basic authentication. Configure both values to require authentication:

```env
GOOGLE_HOTELS_FEED_USERNAME=...
GOOGLE_HOTELS_FEED_PASSWORD=...
```

Leaving both blank keeps the XML endpoints public. Never configure only one value.

## Hotel Center onboarding

Do not set `GOOGLE_HOTELS_ENABLED=true` merely because the XML endpoints work. It represents commercial/operational activation and should be enabled only after HandMeKey has an onboarded Hotel Center partner account.

Configure the identifiers supplied during onboarding:

```env
GOOGLE_HOTELS_ENABLED=true
GOOGLE_HOTELS_ACCOUNT_ID=...
GOOGLE_HOTELS_PARTNER_ID=...
```

Provide Google with the production HTTPS Hotel List and Landing Pages URLs from the admin console. Monitor Hotel Center's matching report and correct only unmatched or low-quality property records.

## ARI rates and inventory

HandMeKey already owns room types, rate plans, nightly rates, inventory, promotions and cancellation rules. Those are the source of truth for a future Google ARI adapter.

Real ARI delivery remains deliberately disabled until Google connectivity onboarding supplies/approves the actual endpoint and credentials:

```env
GOOGLE_HOTELS_ARI_ENDPOINT=...
GOOGLE_HOTELS_ARI_USERNAME=...
GOOGLE_HOTELS_ARI_PASSWORD=...
```

The admin console reports ARI as awaiting connection until all values are present. Credentials alone do not mean Google certification has succeeded. HandMeKey must not report `LIVE`, synced rates, or price accuracy before real acknowledgements exist.

## Production checklist

1. Deploy HandMeKey on its final HTTPS domain.
2. Complete hotel names, addresses and ISO country codes; add coordinates wherever possible.
3. Confirm Hotel List XML is reachable by Google (including Basic auth if configured).
4. Confirm Landing Pages XML points at the production HandMeKey domain.
5. Onboard the HandMeKey Hotel Center connectivity account.
6. Submit the Hotel List and Landing Pages configuration.
7. Monitor property matching and fix exceptions.
8. Complete ARI certification and implement/enable the approved push transport.
9. Validate Google's price-accuracy crawler against HandMeKey checkout totals.
10. Activate Free Booking Links, then Hotel Ads only if commercially desired.

The architecture intentionally treats Google as a distribution channel, not as the source of hotel rates or inventory. HandMeKey remains the source of truth.
