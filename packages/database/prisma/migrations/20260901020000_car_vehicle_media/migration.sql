CREATE TYPE "CarVehiclePhotoCategory" AS ENUM (
  'EXTERIOR_FRONT',
  'EXTERIOR_REAR',
  'EXTERIOR_LEFT',
  'EXTERIOR_RIGHT',
  'INTERIOR_DASHBOARD',
  'INTERIOR_FRONT_SEATS',
  'INTERIOR_REAR_SEATS',
  'TRUNK',
  'INFOTAINMENT',
  'STEERING_WHEEL',
  'ODOMETER',
  'KEYS_ACCESSORIES',
  'OTHER'
);

CREATE TYPE "CarVehiclePhotoState" AS ENUM ('PENDING_UPLOAD', 'READY', 'DELETED');

CREATE TABLE "CarVehiclePhoto" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "category" "CarVehiclePhotoCategory" NOT NULL DEFAULT 'OTHER',
  "objectKey" TEXT NOT NULL,
  "publicUrl" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "expectedSizeBytes" INTEGER NOT NULL,
  "alt" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "state" "CarVehiclePhotoState" NOT NULL DEFAULT 'PENDING_UPLOAD',
  "uploadExpiresAt" TIMESTAMP(3) NOT NULL,
  "uploadedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CarVehiclePhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CarVehiclePhoto_objectKey_key" ON "CarVehiclePhoto"("objectKey");
CREATE INDEX "CarVehiclePhoto_vehicleId_state_isPrimary_sortOrder_idx" ON "CarVehiclePhoto"("vehicleId", "state", "isPrimary", "sortOrder");
CREATE INDEX "CarVehiclePhoto_vehicleId_category_state_sortOrder_idx" ON "CarVehiclePhoto"("vehicleId", "category", "state", "sortOrder");
CREATE INDEX "CarVehiclePhoto_uploadExpiresAt_state_idx" ON "CarVehiclePhoto"("uploadExpiresAt", "state");

ALTER TABLE "CarVehiclePhoto"
ADD CONSTRAINT "CarVehiclePhoto_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "CarVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
