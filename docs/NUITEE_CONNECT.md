# Nuitee Connect integration

HandMeKey integrates Nuitee Connect as an external hotel supplier alongside direct partner inventory and Hotelbeds.

## Environment variables

Set these only in the server environment (Vercel Project Settings → Environment Variables). Never expose the API key to browser code or commit it to Git.

- `NUITEE_API_KEY` — required. Use a `sand_...` key for Sandbox and the production key only after commercial activation.
- `NUITEE_MARGIN_PERCENT` — optional request-level markup percentage, for example `8`.
- `NUITEE_BOOKING_PAYMENT_METHOD` — production-only booking method after Nuitee confirms the commercial payment setup. Sandbox defaults to `ACC_CREDIT_CARD`.

## Flow

1. Search calls `POST https://api.liteapi.travel/v3.0/hotels/rates` server-side and joins Nuitee results into HandMeKey search.
2. A Nuitee result opens through the normal `/hotel/nuitee-<id>` URL, internally rewritten to the Nuitee detail route.
3. Selecting a rate calls Prebook on the server to confirm availability and price.
4. Sandbox booking calls the Nuitee Book endpoint with `ACC_CREDIT_CARD`; production booking remains gated until a production payment method is configured.

## Security

The Nuitee key is read only from `process.env.NUITEE_API_KEY`. Client components call HandMeKey server routes and never receive the supplier API key.
