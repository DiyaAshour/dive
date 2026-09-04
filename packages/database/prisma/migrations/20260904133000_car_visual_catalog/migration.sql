CREATE TYPE "CarCatalogAssetProvider" AS ENUM ('MANUAL', 'IMAGIN', 'EVOX', 'OEM');
CREATE TYPE "CarCatalogAssetType" AS ENUM (
  'HERO',
  'EXTERIOR_FRONT',
  'EXTERIOR_FRONT_LEFT',
  'EXTERIOR_FRONT_RIGHT',
  'EXTERIOR_SIDE_LEFT',
  'EXTERIOR_SIDE_RIGHT',
  'EXTERIOR_REAR_LEFT',
  'EXTERIOR_REAR_RIGHT',
  'EXTERIOR_REAR',
  'SPIN_FRAME',
  'INTERIOR_DASHBOARD',
  'INTERIOR_FRONT_SEATS',
  'INTERIOR_REAR_SEATS',
  'INTERIOR_PANORAMA',
  'TRUNK',
  'INFOTAINMENT',
  'STEERING_WHEEL',
  'OTHER'
);

CREATE TABLE "CarCatalogVehicle" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "make" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "generation" TEXT,
  "trim" TEXT,
  "bodyType" TEXT,
  "category" TEXT NOT NULL,
  "transmission" "CarTransmission",
  "fuel" "CarFuel",
  "seats" INTEGER,
  "bags" INTEGER,
  "doors" INTEGER,
  "provider" "CarCatalogAssetProvider" NOT NULL DEFAULT 'MANUAL',
  "providerVehicleId" TEXT,
  "providerRevision" TEXT,
  "primaryImageUrl" TEXT,
  "exterior360Available" BOOLEAN NOT NULL DEFAULT false,
  "interior360Available" BOOLEAN NOT NULL DEFAULT false,
  "reviewed" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarCatalogVehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarCatalogAsset" (
  "id" TEXT NOT NULL,
  "catalogVehicleId" TEXT NOT NULL,
  "type" "CarCatalogAssetType" NOT NULL,
  "provider" "CarCatalogAssetProvider" NOT NULL DEFAULT 'MANUAL',
  "url" TEXT NOT NULL,
  "angle" TEXT,
  "spinFrame" INTEGER,
  "paintCode" TEXT,
  "paintName" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sourceRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarCatalogAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarVehicleCatalogLink" (
  "vehicleId" TEXT NOT NULL,
  "catalogVehicleId" TEXT NOT NULL,
  "matchedBy" TEXT NOT NULL DEFAULT 'PARTNER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarVehicleCatalogLink_pkey" PRIMARY KEY ("vehicleId")
);

CREATE UNIQUE INDEX "CarCatalogVehicle_slug_key" ON "CarCatalogVehicle"("slug");
CREATE INDEX "CarCatalogVehicle_make_model_year_active_idx" ON "CarCatalogVehicle"("make", "model", "year", "active");
CREATE INDEX "CarCatalogVehicle_provider_providerVehicleId_idx" ON "CarCatalogVehicle"("provider", "providerVehicleId");
CREATE INDEX "CarCatalogVehicle_year_category_active_idx" ON "CarCatalogVehicle"("year", "category", "active");
CREATE INDEX "CarCatalogAsset_catalogVehicleId_active_type_sortOrder_idx" ON "CarCatalogAsset"("catalogVehicleId", "active", "type", "sortOrder");
CREATE INDEX "CarCatalogAsset_catalogVehicleId_paintCode_type_spinFrame_idx" ON "CarCatalogAsset"("catalogVehicleId", "paintCode", "type", "spinFrame");
CREATE INDEX "CarVehicleCatalogLink_catalogVehicleId_idx" ON "CarVehicleCatalogLink"("catalogVehicleId");

ALTER TABLE "CarCatalogAsset"
  ADD CONSTRAINT "CarCatalogAsset_catalogVehicleId_fkey"
  FOREIGN KEY ("catalogVehicleId") REFERENCES "CarCatalogVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CarVehicleCatalogLink"
  ADD CONSTRAINT "CarVehicleCatalogLink_catalogVehicleId_fkey"
  FOREIGN KEY ("catalogVehicleId") REFERENCES "CarCatalogVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CarVehicleCatalogLink"
  ADD CONSTRAINT "CarVehicleCatalogLink_vehicleId_fkey"
  FOREIGN KEY ("vehicleId") REFERENCES "CarVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
