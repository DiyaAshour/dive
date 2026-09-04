CREATE TABLE "BlogAsset" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BlogAsset_createdAt_idx" ON "BlogAsset"("createdAt");
