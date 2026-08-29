CREATE TABLE "HotelPhotoCategoryAssignment" (
  "photoId" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "category" VARCHAR(32) NOT NULL DEFAULT 'OTHER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HotelPhotoCategoryAssignment_pkey" PRIMARY KEY ("photoId")
);

CREATE INDEX "HotelPhotoCategoryAssignment_hotelId_category_idx"
  ON "HotelPhotoCategoryAssignment"("hotelId", "category");

INSERT INTO "HotelPhotoCategoryAssignment" ("photoId", "hotelId", "category", "createdAt", "updatedAt")
SELECT "id", "hotelId", CASE WHEN "roomTypeId" IS NULL THEN 'OTHER' ELSE 'ROOM' END, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "HotelPhoto";
