ALTER TABLE "CarReservation"
ADD COLUMN "requestedExtras" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
