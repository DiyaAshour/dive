CREATE TABLE "PlatformProjectionCursor" (
    "key" TEXT NOT NULL,
    "cursorAt" TIMESTAMP(3),
    "cursorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformProjectionCursor_pkey" PRIMARY KEY ("key")
);
