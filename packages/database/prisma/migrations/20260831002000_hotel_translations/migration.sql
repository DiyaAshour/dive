-- CreateTable
CREATE TABLE "HotelTranslation" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HotelTranslation_hotelId_locale_key" ON "HotelTranslation"("hotelId", "locale");
CREATE INDEX "HotelTranslation_hotelId_idx" ON "HotelTranslation"("hotelId");
CREATE INDEX "HotelTranslation_locale_idx" ON "HotelTranslation"("locale");

-- Keep translations tied to the property even though the Prisma model is intentionally relation-light.
ALTER TABLE "HotelTranslation"
ADD CONSTRAINT "HotelTranslation_hotelId_fkey"
FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing demo property: make the Arabic hotel page localized immediately after deploy.
INSERT INTO "HotelTranslation" ("id", "hotelId", "locale", "name", "description", "updatedAt")
SELECT
  h."id" || '-ar',
  h."id",
  'ar',
  NULL,
  'يقع Citadel House Amman في جبل القلعة في عمّان، وهو فندق تجريبي ضمن HandMeKey يُستخدم لاختبار تجربة الحجز وعرض خصائص المنصة. يتميز بموقع قريب من وسط عمّان ومعالمها التاريخية، مع مرافق مناسبة لإقامة مريحة في المدينة.',
  CURRENT_TIMESTAMP
FROM "Hotel" h
WHERE h."slug" = 'demo-citadel-house-amman'
ON CONFLICT ("hotelId", "locale") DO UPDATE SET
  "description" = EXCLUDED."description",
  "updatedAt" = CURRENT_TIMESTAMP;
