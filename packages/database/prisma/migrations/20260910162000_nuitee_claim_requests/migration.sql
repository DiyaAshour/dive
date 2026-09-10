-- CreateEnum
CREATE TYPE "NuiteeClaimRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED');

-- CreateTable
CREATE TABLE "NuiteeHotelClaimRequest" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "providerHotelId" VARCHAR(128) NOT NULL,
    "status" "NuiteeClaimRequestStatus" NOT NULL DEFAULT 'PENDING',
    "submittedByUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "snapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NuiteeHotelClaimRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NuiteeHotelClaimRequest_hotelId_key" ON "NuiteeHotelClaimRequest"("hotelId");

-- CreateIndex
CREATE INDEX "NuiteeHotelClaimRequest_providerHotelId_status_idx" ON "NuiteeHotelClaimRequest"("providerHotelId", "status");

-- CreateIndex
CREATE INDEX "NuiteeHotelClaimRequest_status_submittedAt_idx" ON "NuiteeHotelClaimRequest"("status", "submittedAt");
