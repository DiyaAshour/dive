CREATE TABLE "HotelbedsContentHotel" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "destinationCode" TEXT,
    "destinationName" TEXT,
    "countryCode" CHAR(2),
    "zoneName" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "categoryCode" TEXT,
    "categoryName" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "phone" TEXT,
    "description" TEXT,
    "facilities" JSONB,
    "images" JSONB,
    "issues" JSONB,
    "raw" JSONB,
    "providerUpdatedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HotelbedsContentHotel_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "HotelbedsRateCommentCache" (
    "id" TEXT NOT NULL,
    "incoming" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "rateCodes" TEXT NOT NULL,
    "hotelCode" TEXT,
    "comments" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HotelbedsRateCommentCache_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HotelbedsContentHotel_name_idx" ON "HotelbedsContentHotel"("name");
CREATE INDEX "HotelbedsContentHotel_destinationCode_idx" ON "HotelbedsContentHotel"("destinationCode");
CREATE INDEX "HotelbedsContentHotel_countryCode_destinationCode_idx" ON "HotelbedsContentHotel"("countryCode", "destinationCode");
CREATE INDEX "HotelbedsContentHotel_syncedAt_idx" ON "HotelbedsContentHotel"("syncedAt");
CREATE INDEX "HotelbedsRateCommentCache_incoming_code_rateCodes_idx" ON "HotelbedsRateCommentCache"("incoming", "code", "rateCodes");
CREATE INDEX "HotelbedsRateCommentCache_hotelCode_idx" ON "HotelbedsRateCommentCache"("hotelCode");
CREATE INDEX "HotelbedsRateCommentCache_syncedAt_idx" ON "HotelbedsRateCommentCache"("syncedAt");
