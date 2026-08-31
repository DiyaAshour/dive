CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE "HotelSearchDocument" (
    "hotelId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT,
    "countryCode" CHAR(2) NOT NULL,
    "starRating" INTEGER,
    "normalizedText" TEXT NOT NULL,
    "amenities" JSONB NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "revision" INTEGER NOT NULL,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HotelSearchDocument_pkey" PRIMARY KEY ("hotelId")
);

CREATE UNIQUE INDEX "HotelSearchDocument_slug_key" ON "HotelSearchDocument"("slug");
CREATE INDEX "HotelSearchDocument_countryCode_starRating_idx" ON "HotelSearchDocument"("countryCode", "starRating");
CREATE INDEX "HotelSearchDocument_indexedAt_idx" ON "HotelSearchDocument"("indexedAt");
CREATE INDEX "HotelSearchDocument_normalizedText_trgm_idx" ON "HotelSearchDocument" USING GIN ("normalizedText" gin_trgm_ops);
