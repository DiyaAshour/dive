CREATE TYPE "CarFinanceTransactionType" AS ENUM ('CUSTOMER_PAYMENT', 'COMPANY_COLLECTED_PAYMENT', 'PLATFORM_COMMISSION', 'COMPANY_PAYOUT', 'COMPANY_REMITTANCE', 'REFUND', 'CHARGEBACK', 'ADJUSTMENT');
CREATE TYPE "CarSettlementStatus" AS ENUM ('READY', 'PAID', 'VOID');
CREATE TYPE "CarSettlementDirection" AS ENUM ('PLATFORM_OWES_COMPANY', 'COMPANY_OWES_PLATFORM', 'BALANCED');
CREATE TYPE "CarPaymentCollector" AS ENUM ('HANDMEKEY', 'COMPANY');

ALTER TABLE "CarReservation" ADD COLUMN "paymentCollector" "CarPaymentCollector" NOT NULL DEFAULT 'COMPANY';
ALTER TABLE "CarReservation" ADD COLUMN "commissionRate" DECIMAL(6,5) NOT NULL DEFAULT 0.10;
ALTER TABLE "CarReservation" ADD COLUMN "commissionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "CarReservation"
SET "paymentCollector" = 'HANDMEKEY'
WHERE "paymentMode" = 'PAY_NOW';

UPDATE "CarReservation" r
SET "commissionRate" = c."commissionRate",
    "commissionAmount" = ROUND((r."total" * c."commissionRate")::numeric, 2)
FROM "CarRentalCompany" c
WHERE c."id" = r."companyId";

CREATE INDEX "CarReservation_companyId_paymentCollector_paymentMode_status_createdAt_idx" ON "CarReservation"("companyId", "paymentCollector", "paymentMode", "status", "createdAt");

CREATE TABLE "CarFinanceTransaction" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "reservationId" TEXT,
  "settlementId" TEXT,
  "type" "CarFinanceTransactionType" NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "companyBalanceDelta" DECIMAL(14,2) NOT NULL,
  "metadata" JSONB,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarFinanceTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarFinanceSettlement" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "settlementNumber" TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "bookingCount" INTEGER NOT NULL DEFAULT 0,
  "grossBookingValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "platformCollectedGross" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "companyCollectedGross" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "platformCommission" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "companyCommissionReceivable" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "companyGrossPayable" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "netAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "direction" "CarSettlementDirection" NOT NULL,
  "status" "CarSettlementStatus" NOT NULL DEFAULT 'READY',
  "externalReference" TEXT,
  "notes" TEXT,
  "attachmentUrl" TEXT,
  "snapshot" JSONB NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "paidByUserId" TEXT,
  "paidAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarFinanceSettlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarFinanceSettlementItem" (
  "id" TEXT NOT NULL,
  "settlementId" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "reservationReference" TEXT NOT NULL,
  "paymentMode" TEXT NOT NULL,
  "paymentCollector" TEXT NOT NULL,
  "grossAmount" DECIMAL(14,2) NOT NULL,
  "commissionAmount" DECIMAL(14,2) NOT NULL,
  "companyPayable" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "companyReceivable" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "netCompanyDelta" DECIMAL(14,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CarFinanceSettlementItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CarFinanceSettlement_settlementNumber_key" ON "CarFinanceSettlement"("settlementNumber");
CREATE INDEX "CarFinanceSettlement_companyId_status_periodEnd_idx" ON "CarFinanceSettlement"("companyId", "status", "periodEnd");
CREATE INDEX "CarFinanceSettlement_companyId_createdAt_idx" ON "CarFinanceSettlement"("companyId", "createdAt");
CREATE UNIQUE INDEX "CarFinanceSettlementItem_reservationId_key" ON "CarFinanceSettlementItem"("reservationId");
CREATE INDEX "CarFinanceSettlementItem_settlementId_createdAt_idx" ON "CarFinanceSettlementItem"("settlementId", "createdAt");
CREATE INDEX "CarFinanceSettlementItem_reservationReference_idx" ON "CarFinanceSettlementItem"("reservationReference");
CREATE INDEX "CarFinanceTransaction_companyId_createdAt_idx" ON "CarFinanceTransaction"("companyId", "createdAt");
CREATE INDEX "CarFinanceTransaction_reservationId_createdAt_idx" ON "CarFinanceTransaction"("reservationId", "createdAt");
CREATE INDEX "CarFinanceTransaction_settlementId_createdAt_idx" ON "CarFinanceTransaction"("settlementId", "createdAt");
CREATE INDEX "CarFinanceTransaction_type_createdAt_idx" ON "CarFinanceTransaction"("type", "createdAt");

ALTER TABLE "CarFinanceSettlement" ADD CONSTRAINT "CarFinanceSettlement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CarRentalCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarFinanceSettlementItem" ADD CONSTRAINT "CarFinanceSettlementItem_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "CarFinanceSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarFinanceSettlementItem" ADD CONSTRAINT "CarFinanceSettlementItem_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "CarReservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarFinanceTransaction" ADD CONSTRAINT "CarFinanceTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CarRentalCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarFinanceTransaction" ADD CONSTRAINT "CarFinanceTransaction_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "CarReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CarFinanceTransaction" ADD CONSTRAINT "CarFinanceTransaction_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "CarFinanceSettlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
