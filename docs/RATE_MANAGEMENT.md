# Partner rate and inventory management

HandMeKey's Partner Hub exposes the operating calendar at `/hotel-dashboard/rates`.

## Source of truth

The rate manager does not maintain a second price table. It writes the existing `DailyRate` and `InventoryDay` records consumed by the public offer and booking services. A partner change therefore flows through the same pricing and inventory source used by Search, hotel offers, quote and booking creation.

## Calendar operations

Partners can:

- browse a month at a time by room type and rate plan;
- see the daily base rate, remaining inventory, minimum/maximum stay and stop-sell/closed state;
- edit one day from the calendar drawer;
- bulk-edit a date range of up to 366 calendar days;
- target only selected weekdays inside that range;
- set a rate, add/subtract a fixed amount, or adjust the existing rate by percentage;
- change room inventory without rewriting unrelated rate fields;
- set minimum and maximum stay restrictions;
- open/close the rate or apply/remove stop-sell;
- configure an overbooking limit only when controlled overbooking is enabled for the hotel.

Fields disabled in the bulk editor are intentionally preserved. Relative rate changes and rate restrictions require an existing base rate. A `SET` rate operation can create a missing daily rate.

## Safety rules

Bulk requests are permission-scoped to `rates:manage`, limited to 366 days, validate that the selected rate plan belongs to the selected room type and hotel, and run in one database transaction.

Availability entered by the partner cannot exceed the physical quantity configured for the room type. Controlled overbooking is represented separately by `overbookingLimit`; the booking engine may consume inventory below zero only to that configured floor when hotel-level overbooking is enabled.

Every successful bulk mutation creates one publishing revision and an attributable `RATE_CALENDAR_BULK_UPDATED` audit event containing the date range, weekdays and changed fields.

## Current restriction model

The production model currently supports base rate, inventory, overbooking limit, minimum stay, maximum stay, closed and stop-sell. Closed-to-arrival and closed-to-departure are not represented yet and must be introduced through a versioned database migration plus booking-engine enforcement before being exposed in the Partner Hub.

## CI coverage

`npm run rate-management:smoke` creates an isolated partner hotel and verifies bulk rate creation, percentage repricing, inventory persistence, stay restrictions, stop-sell, room-quantity safeguards, overbooking safeguards and audit creation against PostgreSQL. CI runs this smoke before workspace typecheck and the production web build.
