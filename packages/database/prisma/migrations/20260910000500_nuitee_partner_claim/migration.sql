ALTER TABLE "NuiteeContentHotel"
ADD COLUMN "claimedByHotelId" TEXT,
ADD COLUMN "claimedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "NuiteeContentHotel_claimedByHotelId_key"
ON "NuiteeContentHotel"("claimedByHotelId");

CREATE INDEX "NuiteeContentHotel_claimedByHotelId_idx"
ON "NuiteeContentHotel"("claimedByHotelId");
