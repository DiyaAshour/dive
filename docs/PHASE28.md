# Phase 28 — Demo showcase catalog

Phase 28 turns the fictional `demo-*` catalog into a deliberate product showcase instead of twenty near-identical test hotels.

## What the demo catalog now showcases

- destination-specific property descriptions and amenity sets;
- 3 room products per property / 60 room products total;
- ROOM, STUDIO, SUITE, APARTMENT, VILLA, CHALET and BUNGALOW unit types where destination-appropriate;
- king, twin, sofa-bed and multi-room sleeping layouts;
- varied room sizes, occupancies, bathrooms, cribs and extra-bed support;
- 3 commercial rate plans per room / 180 rate plans total;
- PAY_NOW-only, PAY_AT_HOTEL-capable and dual-payment choices;
- ROOM_ONLY, BREAKFAST, HALF_BOARD and FULL_BOARD meal plans across the catalog;
- free-cancellation and non-refundable policies plus staged cancellation windows;
- actual Promotion rows linked to eligible rate plans;
- deterministic near-term low inventory on selected premium units so the existing inventory-scarcity UI can be evaluated honestly;
- 120 days of daily prices and inventory;
- 8 licensed demo photos per property with room-level photo associations.

## Destination personality

- Amman demonstrates city rooms, studios, suites and apartment-style family products.
- Aqaba demonstrates sea-view rooms, family suites, marina studios and beach bungalows.
- Petra demonstrates canyon rooms, twin products and family chalets.
- Dead Sea demonstrates sea-view rooms, spa suites and private-pool villa products.

## Integrity rules

The catalog remains unmistakably fictional. Descriptions and addresses explicitly identify the properties as showcase/demo inventory.

The seed creates **zero guest reviews, zero bookings and zero payments**. No synthetic rating or demand record is introduced. Any low-inventory message comes from the actual seeded `InventoryDay.available` value, and any promotion shown to a traveler comes from an actual active `Promotion` record.

Reseeding deletes only `demo-*` properties and disposable demo dependencies. Non-demo hotels are left untouched.
