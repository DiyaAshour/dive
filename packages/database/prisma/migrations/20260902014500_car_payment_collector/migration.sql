CREATE TYPE "CarPaymentCollector" AS ENUM ('HANDMEKEY', 'COMPANY');

ALTER TABLE "CarReservation"
ADD COLUMN "paymentCollector" "CarPaymentCollector" NOT NULL DEFAULT 'COMPANY';

UPDATE "CarReservation"
SET "paymentCollector" = 'HANDMEKEY'
WHERE "paymentMode" = 'PAY_NOW';

DROP INDEX IF EXISTS "CarReservation_companyId_paymentMode_status_createdAt_idx";
CREATE INDEX "CarReservation_companyId_paymentCollector_paymentMode_status_createdAt_idx"
ON "CarReservation"("companyId", "paymentCollector", "paymentMode", "status", "createdAt");

ALTER TABLE "CarFinanceSettlementItem"
ADD COLUMN "paymentCollector" TEXT;

UPDATE "CarFinanceSettlementItem" item
SET "paymentCollector" = CASE
  WHEN reservation."paymentCollector" = 'HANDMEKEY' THEN 'HANDMEKEY'
  ELSE 'COMPANY'
END
FROM "CarReservation" reservation
WHERE reservation."id" = item."reservationId";

ALTER TABLE "CarFinanceSettlementItem"
ALTER COLUMN "paymentCollector" SET NOT NULL;
