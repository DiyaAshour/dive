ALTER TABLE "DailyRate"
  ADD COLUMN "minAdvanceBookingDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxAdvanceBookingDays" INTEGER,
  ADD COLUMN "closedToArrival" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "closedToDeparture" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "DailyRate_date_closedToArrival_closedToDeparture_idx"
  ON "DailyRate"("date", "closedToArrival", "closedToDeparture");
