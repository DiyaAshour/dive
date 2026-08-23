# Phase 15 — English / Arabic Customer Localization

Phase 15 makes language a real customer preference rather than a decorative toggle.

## Scope

- English (`en`) and Arabic (`ar`) customer experiences.
- Server-rendered `<html lang>` and `dir` so Arabic renders RTL without waiting for client JavaScript.
- Language switcher in the customer header and account center.
- Guest preference persisted in the `hmk_locale` cookie.
- Signed-in traveler preference persisted in PostgreSQL through `TravelerPreference`.
- Existing accounts migrate their current browser preference the first time they sign in after this phase.
- New registrations persist the language active at registration.
- Login restores the saved account language on another device.
- Customer Home, Search, Hotel Detail, Checkout, Login, Trips, Account, Alerts, Security, Booking Status and Guest Booking Tools are localized.

## Product boundaries

1. Localization is a presentation concern. It does not alter availability, pricing, promotions, taxes, cancellation math, payment state or booking rules.
2. Hotel-supplied content such as hotel names, descriptions, amenity names, cancellation-policy names, promotion names, guest reviews and hotel replies is never silently machine-translated.
3. Partner Hub and platform administration remain English in this phase. Their localization is a separate product decision because hotel operations terminology requires its own translation review.
4. Currency is not presented as a language preference. There is no fake currency selector before a real multi-currency engine exists.
5. Locale cookies contain no authentication material or private account data.
6. A guest can choose a language without creating an account. After authentication, the account preference becomes authoritative across devices.
7. API and domain contracts remain language-neutral except for the explicit locale-preference contract.
8. RTL is owned by the document root and layout CSS, not by one-off component patches.

## Persistence

`TravelerPreference` stores only the traveler account locale (`EN` or `AR`). The browser uses `hmk_locale` for immediate server-rendered locale selection. Changing the language updates both PostgreSQL (when authenticated) and the cookie.

## Verification

Phase 15 must pass the existing production dependency audit, Prisma multi-file generation, ephemeral PostgreSQL schema push, full demo catalog seed, workspace TypeScript checks and Next.js production build before it is considered complete.
