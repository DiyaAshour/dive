-- CreateEnum
CREATE TYPE "PartnerPayoutStatus" AS ENUM ('READY', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PartnerReconciliationStatus" AS ENUM ('CLEAN', 'REVIEW_REQUIRED');

-- CreateTable
CREATE TABLE "PartnerReconciliation" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "reconciliationNumber" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "PartnerReconciliationStatus" NOT NULL,
    "eligibleBookingCount" INTEGER NOT NULL DEFAULT 0,
    "issueCount" INTEGER NOT NULL DEFAULT 0,
    "expectedCollected" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "actualCollected" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "completedRefunds" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "platformCommission" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payAtHotelCommission" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "partnerNet" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "collectionVariance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "snapshot" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPayout" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "payoutNumber" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "statementId" TEXT,
    "platformCollectedGross" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "completedRefunds" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "platformCommission" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payAtHotelCommission" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "partnerNet" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "PartnerPayoutStatus" NOT NULL DEFAULT 'READY',
    "externalReference" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "paidByUserId" TEXT,
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerReconciliation_reconciliationNumber_key" ON "PartnerReconciliation"("reconciliationNumber");

-- CreateIndex
CREATE INDEX "PartnerReconciliation_hotelId_periodEnd_status_idx" ON "PartnerReconciliation"("hotelId", "periodEnd", "status");

-- CreateIndex
CREATE INDEX "PartnerReconciliation_hotelId_createdAt_idx" ON "PartnerReconciliation"("hotelId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPayout_payoutNumber_key" ON "PartnerPayout"("payoutNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPayout_hotelId_periodStart_periodEnd_currency_key" ON "PartnerPayout"("hotelId", "periodStart", "periodEnd", "currency");

-- CreateIndex
CREATE INDEX "PartnerPayout_hotelId_status_periodEnd_idx" ON "PartnerPayout"("hotelId", "status", "periodEnd");

-- CreateIndex
CREATE INDEX "PartnerPayout_reconciliationId_idx" ON "PartnerPayout"("reconciliationId");

-- CreateIndex
CREATE INDEX "PartnerPayout_createdAt_idx" ON "PartnerPayout"("createdAt");
