-- Prevent a partner from being paid twice for the same departure dates.
-- Exact duplicate periods were already protected by a unique index; this also
-- blocks partially overlapping READY/PAID periods for the same hotel/currency.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "PartnerPayout"
ADD CONSTRAINT "PartnerPayout_no_overlapping_active_periods"
EXCLUDE USING gist (
    "hotelId" WITH =,
    "currency" WITH =,
    daterange("periodStart", "periodEnd", '[]') WITH &&
)
WHERE ("status" <> 'VOID');
