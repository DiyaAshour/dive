CREATE TYPE "CarCompanyReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'STALE');

ALTER TABLE "CarRentalCompany"
  ADD COLUMN "publishRevision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "publishedRevision" INTEGER,
  ADD COLUMN "lastPublishedAt" TIMESTAMP(3);

CREATE TABLE "CarCompanyReview" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "submittedByUserId" TEXT NOT NULL,
  "reviewedByUserId" TEXT,
  "submittedRevision" INTEGER NOT NULL,
  "status" "CarCompanyReviewStatus" NOT NULL DEFAULT 'PENDING',
  "readinessSnapshot" JSONB NOT NULL,
  "decisionReason" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "CarCompanyReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CarCompanyReview_companyId_submittedAt_idx" ON "CarCompanyReview"("companyId", "submittedAt");
CREATE INDEX "CarCompanyReview_status_submittedAt_idx" ON "CarCompanyReview"("status", "submittedAt");
CREATE INDEX "CarCompanyReview_reviewedByUserId_reviewedAt_idx" ON "CarCompanyReview"("reviewedByUserId", "reviewedAt");

ALTER TABLE "CarCompanyReview"
  ADD CONSTRAINT "CarCompanyReview_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "CarRentalCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
