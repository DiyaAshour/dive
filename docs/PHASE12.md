# Phase 12 — Fictional demo catalog

Phase 12 adds a staging-only catalog so HandMeKey can be evaluated with realistic search, hotel-detail, promotion, inventory, cancellation and checkout data before real hotel partners are onboarded.

## Command

After PostgreSQL is running, migrations are applied and Prisma Client is generated:

```bash
npm run db:seed-demo
```

The command replaces only hotels whose slug begins with `demo-`. Non-demo properties are never deleted or modified.

## Catalog

The seed creates exactly 20 fictional Jordan properties:

- 12 in Amman
- 4 in Aqaba
- 2 in Petra
- 2 in the Dead Sea area

Each property is seeded as `ACTIVE + verified` so it is immediately discoverable in the staging marketplace.

Each property includes:

- property content and approximate demo coordinates;
- 3–5 star classification;
- real amenity records;
- Classic King and Family Suite room types;
- Flexible Breakfast and Saver rate plans;
- cancellation policies and rules;
- 120 days of live daily rates;
- 120 days of inventory;
- an active 10–18% staging promotion on the Saver King rate;
- Pay Now and Pay at Hotel capability flags so payment-mode UI can be exercised.

## Deliberately not seeded

- No `HotelPhoto` or `MediaObject` records are created. Customer UI therefore renders `Photo pending` until real media is uploaded.
- No guest reviews or synthetic scores are created.
- No fake bookings, payments, financial events or guest identities are created.
- Names are fictional and descriptions explicitly identify the properties as HandMeKey staging data.

## Reset behavior

Every run deletes and recreates only `demo-*` properties. This keeps the 120-day rate and inventory horizon fresh. Because demo-property children cascade with the property, test bookings made against demo hotels are also removed on the next demo-seed run. Never use `demo-*` slugs for real partner properties.

## Invariant

Demo data may make staging useful, but it must never impersonate a real hotel or fabricate trust signals. Property photos, reviews, bookings and payment success remain real-domain data only.
