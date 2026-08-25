# Phase 30 — Hotel trust, highlights and location layer

Phase 30 enriches the public hotel page with trustworthy property storytelling inspired by high-conversion OTA information architecture while preserving HandMeKey's own visual identity.

## Public hotel page

- Verified guest-rating breakdown for overall, cleanliness, staff/service, location, facilities, comfort and value.
- No synthetic scores: demo properties with zero verified stays render the rating framework with an explicit waiting-for-verified-reviews state.
- Property highlights derived from actual published review averages and actual hotel amenities.
- Short-stay benefit groups built from real property amenities (food, wellness, activities and convenience).
- Prominent facilities grid using the property's real amenity inventory.
- Stronger about/property-story section.
- Verified guest quote card when a published review actually exists.
- Location discovery section using the property's coordinates and curated Jordan landmark coordinates; displayed distances are clearly labelled approximate straight-line distances.
- A live-date signal uses real offer availability only; it does not invent booking-frequency or demand claims.

## Integrity rules

- No seeded guest reviews or fabricated ratings.
- No invented cleanliness/service/location scores.
- No fake “booked every X minutes” claims.
- A highlight is rendered only when its supporting review score or amenity exists.
- Nearby-place distance is computed from hotel coordinates and labelled approximate.
