-- CreateEnum
CREATE TYPE "DestinationType" AS ENUM ('COUNTRY', 'REGION', 'CITY', 'AREA', 'LANDMARK');

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "type" "DestinationType" NOT NULL,
    "slug" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT,
    "parentId" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "radiusKm" DECIMAL(8,2),
    "seoTitleEn" TEXT,
    "seoTitleAr" TEXT,
    "seoDescriptionEn" TEXT,
    "seoDescriptionAr" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestinationAlias" (
    "id" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "locale" CHAR(2),
    "weight" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestinationAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelDestination" (
    "hotelId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "distanceKm" DECIMAL(8,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelDestination_pkey" PRIMARY KEY ("hotelId","destinationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Destination_slug_key" ON "Destination"("slug");

-- CreateIndex
CREATE INDEX "Destination_countryCode_type_active_sortOrder_idx" ON "Destination"("countryCode", "type", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "Destination_parentId_active_sortOrder_idx" ON "Destination"("parentId", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "Destination_nameEn_idx" ON "Destination"("nameEn");

-- CreateIndex
CREATE INDEX "Destination_nameAr_idx" ON "Destination"("nameAr");

-- CreateIndex
CREATE INDEX "DestinationAlias_normalized_weight_idx" ON "DestinationAlias"("normalized", "weight");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationAlias_destinationId_normalized_key" ON "DestinationAlias"("destinationId", "normalized");

-- CreateIndex
CREATE INDEX "HotelDestination_destinationId_primary_hotelId_idx" ON "HotelDestination"("destinationId", "primary", "hotelId");

-- CreateIndex
CREATE INDEX "HotelDestination_hotelId_primary_idx" ON "HotelDestination"("hotelId", "primary");

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Destination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationAlias" ADD CONSTRAINT "DestinationAlias_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelDestination" ADD CONSTRAINT "HotelDestination_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelDestination" ADD CONSTRAINT "HotelDestination_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Search 2 ranking support. Prisma does not model PostgreSQL trigram operator classes.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "DestinationAlias_normalized_trgm_idx" ON "DestinationAlias" USING GIN ("normalized" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Destination_nameEn_trgm_idx" ON "Destination" USING GIN (LOWER("nameEn") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Destination_nameAr_trgm_idx" ON "Destination" USING GIN (LOWER(COALESCE("nameAr", '')) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Hotel_name_trgm_idx" ON "Hotel" USING GIN (LOWER("name") gin_trgm_ops);
