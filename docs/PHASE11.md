# Phase 11 — HandMeKey Product UI and Partner Extranet

Phase 11 changes the product presentation layer without moving business rules into the UI.

## Product surfaces

### Traveler marketplace

Production origin: `https://handmekey.com`

Primary surfaces:

- `/` — discovery home
- `/search` — live hotel search
- `/hotel/:id` — hotel details, live rates, reviews and price watch
- `/checkout` — booking checkout
- `/trips` — authenticated trips
- `/account/alerts` — saved searches and price alerts
- `/login` — traveler authentication

The traveler UI prioritizes property media, final stay price, live availability, verified reviews and cancellation/payment context.

### Partner Hub

Production origin: `https://partners.handmekey.com`

During local/staging development the same surfaces are reachable through the current app paths:

- `/partner` — partner acquisition landing page
- `/partner/login` — partner authentication
- `/partner/onboarding` — property creation
- `/hotel-dashboard` — property workspace
- `/hotel-dashboard/reservations`
- `/hotel-dashboard/performance`
- `/hotel-dashboard/promotions`
- `/hotel-dashboard/messages`
- `/hotel-dashboard/reviews`

Deployment routing may map the partner hostname to these existing application surfaces. Authentication and domain services remain shared; there is no duplicate partner business logic.

### Platform administration

Recommended production origin: `https://admin.handmekey.com`

Admin access remains role-gated by the platform authorization layer. The admin hostname must not create a second admin authorization system.

### API

Current contract: `/api/v1` on the application origin.

Recommended long-term production origin: `https://api.handmekey.com`.

Native apps and web clients must consume the same versioned API and must not reimplement pricing, inventory, booking, publishing, review, promotion, messaging or analytics rules.

### Media

Recommended public media origin: `https://media.handmekey.com` backed by the configured object-storage/CDN provider. Private verification documents never use the public media origin.

## Authentication separation

Traveler and partner authentication deliberately have separate product entry points while using the same secure identity system.

- Traveler registration/login redirects into traveler account surfaces.
- Partner registration redirects to property onboarding.
- Partner login redirects to Partner Hub.
- Hotel permissions are still granted per property.

A guest account must never be pushed into property onboarding simply because the platform supports hotel roles.

## UI invariants

1. Real hotel media only; no stock-photo fallback that could misrepresent a property.
2. No synthetic review score or demand metric.
3. Final prices displayed to travelers are returned by server pricing logic.
4. Partner UI may visualize commercial metrics but cannot calculate authoritative booking or financial values in React.
5. Traveler and partner experiences share the HandMeKey brand but use intentionally different information density and navigation.
6. Partner navigation only exposes implemented product surfaces; placeholder links are not used as fake functionality.
7. Responsive layouts must keep booking/search actions usable on mobile.

## Design direction

- Traveler: warm ivory + deep navy, media-first property cards, strong final-price hierarchy, low-friction navigation.
- Partner Hub: dark navy extranet rail, property context, dense but readable commercial workspaces.
- Typography: Manrope display hierarchy with DM Sans/system fallback for UI copy.
- Brand: HandMeKey wordmark with key mark. The temporary single-letter `B` identity is retired from customer and partner surfaces.
