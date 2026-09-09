CREATE TABLE "NuiteeContentSyncState" (
    "id" VARCHAR(32) NOT NULL,
    "countryCode" VARCHAR(2) NOT NULL,
    "nextOffset" INTEGER NOT NULL DEFAULT 0,
    "cycle" INTEGER NOT NULL DEFAULT 0,
    "lastCompletedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NuiteeContentSyncState_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NuiteeContentSyncState_countryCode_idx" ON "NuiteeContentSyncState"("countryCode");
