CREATE TABLE "ApiPaymentAttempt" (
    "id" TEXT NOT NULL,
    "apiBookingId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'INITIATED',
    "amount" DECIMAL(12, 2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "externalPaymentId" TEXT,
    "returnUrl" TEXT NOT NULL,
    "redirectUrl" TEXT,
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "ApiPaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiPaymentAttempt_idempotencyKey_key" ON "ApiPaymentAttempt"("idempotencyKey");
CREATE UNIQUE INDEX "ApiPaymentAttempt_provider_externalPaymentId_key" ON "ApiPaymentAttempt"("provider", "externalPaymentId");
CREATE INDEX "ApiPaymentAttempt_apiBookingId_createdAt_idx" ON "ApiPaymentAttempt"("apiBookingId", "createdAt");
CREATE INDEX "ApiPaymentAttempt_provider_status_createdAt_idx" ON "ApiPaymentAttempt"("provider", "status", "createdAt");

ALTER TABLE "ApiPaymentAttempt"
  ADD CONSTRAINT "ApiPaymentAttempt_apiBookingId_fkey"
  FOREIGN KEY ("apiBookingId") REFERENCES "ApiBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
