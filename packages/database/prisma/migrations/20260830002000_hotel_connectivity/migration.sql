-- HandMeKey universal hotel connectivity foundation.
-- Credentials are application-encrypted before being written to this table.

CREATE TABLE "HotelConnectivityConnection" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "environment" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "gatewayUrl" TEXT,
    "enterpriseId" TEXT,
    "externalHotelCode" TEXT,
    "encryptedCredentials" TEXT,
    "capabilities" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "roomMappings" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "ratePlanMappings" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastHealthyAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HotelConnectivityConnection_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HotelConnectivityConnection_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HotelConnectivityConnection_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelConnectivityConnection_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HotelConnectivityConnection_hotelId_key" ON "HotelConnectivityConnection"("hotelId");
CREATE INDEX "HotelConnectivityConnection_provider_status_idx" ON "HotelConnectivityConnection"("provider", "status");

CREATE TABLE "HotelConnectivityEvent" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "externalId" TEXT,
    "idempotencyKey" TEXT,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HotelConnectivityEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HotelConnectivityEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "HotelConnectivityConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HotelConnectivityEvent_connectionId_idempotencyKey_key"
ON "HotelConnectivityEvent"("connectionId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
CREATE INDEX "HotelConnectivityEvent_status_nextAttemptAt_idx" ON "HotelConnectivityEvent"("status", "nextAttemptAt");
CREATE INDEX "HotelConnectivityEvent_connectionId_createdAt_idx" ON "HotelConnectivityEvent"("connectionId", "createdAt");
