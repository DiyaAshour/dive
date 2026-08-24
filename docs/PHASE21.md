# Phase 21 — Partner Room Product Studio

Phase 21 replaces the add-only room setup with a structured room product that a property can reopen and edit at any time. The same stored record drives partner operations, publishing readiness, discovery and the guest hotel page.

## Product model

Each room or accommodation unit now stores:

- guest-facing name, internal code, description, unit type and number of identical units;
- total fit plus adult, child and infant occupancy limits;
- bedroom, living-room and bathroom counts;
- size and unit, bathroom privacy and smoking policy;
- sleeping areas with a typed bed and quantity per area;
- cribs, extra beds and whether both may be requested together;
- room-level facilities and an assigned room gallery;
- active/inactive selling state, existing rate plans and operational counts.

Edits replace the complete structured bed and facility configuration in one transaction, increment the property's publishing revision and write a before/after audit event. Deactivating a room removes it from new offers without deleting historical bookings.

## Partner experience

`/hotel-dashboard/rooms` is the room catalog and creation entry point. `/hotel-dashboard/rooms/[roomTypeId]` is the full editor. It includes a live guest-card preview and a seven-part completeness meter so partners can see how the product will be presented before publishing it.

Photos remain in the secure media workflow. Each public image can be assigned either to the property gallery or to a particular room. Publishing readiness now requires every active room to have structured occupancy, a bed layout, size, a useful description, at least three facilities and a completed room photo.

## Guest experience

The hotel page groups all rate plans under one room product instead of repeating the same room. Its room card renders the configured fit, adult/child/infant limits, beds grouped by sleeping area, crib and extra-bed availability, size, bathroom privacy, facilities, room image and description. Pricing, payment and cancellation choices remain separate rate rows under that room.

Adult and child counts now travel with the selected rate into quote and hold creation. The booking engine re-checks all three capacity limits (`maxGuests`, `maxAdults`, `maxChildren`) instead of trusting a client-selected room ID, and stores the accepted occupancy on the reservation for partner operations and CSV export.

## Booking.com research baseline

The model was checked against Booking.com's official Connectivity documentation rather than copied from the consumer page:

- Rooms API unit creation and modification: https://developers.booking.com/connectivity/docs/rooms-api/managing-units
- occupancy, room configuration and bed validations: https://developers.booking.com/connectivity/docs/rooms-api/rooms-api-validations
- room-level facilities: https://developers.booking.com/connectivity/docs/content-api-modules/facilities-api/manage-room-facilities
- property and room galleries: https://developers.booking.com/connectivity/docs/photo-api/understanding-the-photo-api

HandMeKey adds a live guest preview, an explicit completeness gate and attributable publishing revisions on top of that structured baseline.

## Verification

CI now executes `npm run room-product:smoke` after the repeatable demo catalog seed. The smoke flow creates a partner property and room, edits its occupancy and two-bedroom bed layout, checks the audit record, creates a live rate and inventory day, assigns a room photo and verifies that discovery projects the same structured data to the public offer.
