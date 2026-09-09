CREATE TABLE "NuiteeContentHotel" (
    "providerHotelId" VARCHAR(128) NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" VARCHAR(2),
    "city" TEXT,
    "area" TEXT,
    "address" TEXT,
    "starRating" DOUBLE PRECISION,
    "contentHash" VARCHAR(64),
    "raw" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NuiteeContentHotel_pkey" PRIMARY KEY ("providerHotelId")
);

CREATE INDEX "NuiteeContentHotel_countryCode_city_idx" ON "NuiteeContentHotel"("countryCode", "city");
CREATE INDEX "NuiteeContentHotel_syncedAt_idx" ON "NuiteeContentHotel"("syncedAt");
