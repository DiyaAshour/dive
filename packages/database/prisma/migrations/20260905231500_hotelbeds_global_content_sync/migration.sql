CREATE TABLE "HotelbedsContentSyncState" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ENG',
    "nextFrom" INTEGER NOT NULL DEFAULT 1,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "lastFullSyncAt" TIMESTAMP(3),
    "lastDifferentialSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelbedsContentSyncState_pkey" PRIMARY KEY ("id")
);
