-- Hotelbeds API reservations stay in a separate ledger from partner-property bookings.
CREATE TYPE "ApiBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED');

CREATE TABLE "ApiBooking" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'HOTELBEDS',
  "providerReference" TEXT,
  "clientReference" TEXT NOT NULL,
  "hotelCode" TEXT NOT NULL,
  "hotelName" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "roomName" TEXT,
  "boardName" TEXT,
  "rateType" TEXT,
  "rateKey" TEXT NOT NULL,
  "guestName" TEXT NOT NULL,
  "guestEmail" TEXT NOT NULL,
  "phone" TEXT,
  "arrival" DATE NOT NULL,
  "departure" DATE NOT NULL,
  "adults" INTEGER NOT NULL DEFAULT 1,
  "children" INTEGER NOT NULL DEFAULT 0,
  "childrenAges" JSONB,
  "currency" CHAR(3) NOT NULL,
  "netAmount" DECIMAL(12,2) NOT NULL,
  "sellingAmount" DECIMAL(12,2),
  "markupAmount" DECIMAL(12,2) NOT NULL,
  "totalAmount" DECIMAL(12,2) NOT NULL,
  "paymentMode" "PaymentMode" NOT NULL,
  "paymentState" "PaymentState" NOT NULL,
  "status" "ApiBookingStatus" NOT NULL DEFAULT 'PENDING',
  "cancellationPolicy" JSONB,
  "providerRequest" JSONB,
  "providerResponse" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiBooking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiBooking_reference_key" ON "ApiBooking"("reference");
CREATE UNIQUE INDEX "ApiBooking_clientReference_key" ON "ApiBooking"("clientReference");
CREATE INDEX "ApiBooking_status_createdAt_idx" ON "ApiBooking"("status", "createdAt");
CREATE INDEX "ApiBooking_guestEmail_createdAt_idx" ON "ApiBooking"("guestEmail", "createdAt");
CREATE INDEX "ApiBooking_arrival_departure_idx" ON "ApiBooking"("arrival", "departure");
CREATE INDEX "ApiBooking_providerReference_idx" ON "ApiBooking"("providerReference");
