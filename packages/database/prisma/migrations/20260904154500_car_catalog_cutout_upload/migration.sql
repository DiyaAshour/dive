CREATE TYPE "CarCatalogAssetUploadState" AS ENUM ('PENDING_UPLOAD', 'READY', 'DELETED');

CREATE TABLE "CarCatalogAssetUpload" (
    "id" TEXT NOT NULL,
    "catalogVehicleId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "type" "CarCatalogAssetType" NOT NULL,
    "angle" TEXT,
    "objectKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "expectedSizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sourceRef" TEXT,
    "state" "CarCatalogAssetUploadState" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "uploadExpiresAt" TIMESTAMP(3) NOT NULL,
    "uploadedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarCatalogAssetUpload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CarCatalogAssetUpload_objectKey_key" ON "CarCatalogAssetUpload"("objectKey");
CREATE INDEX "CarCatalogAssetUpload_catalogVehicleId_state_createdAt_idx" ON "CarCatalogAssetUpload"("catalogVehicleId", "state", "createdAt");
CREATE INDEX "CarCatalogAssetUpload_uploadExpiresAt_state_idx" ON "CarCatalogAssetUpload"("uploadExpiresAt", "state");

ALTER TABLE "CarCatalogAssetUpload"
ADD CONSTRAINT "CarCatalogAssetUpload_catalogVehicleId_fkey"
FOREIGN KEY ("catalogVehicleId") REFERENCES "CarCatalogVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
