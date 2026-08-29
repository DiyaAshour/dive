-- CreateEnum
CREATE TYPE "LoyaltyMembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "LoyaltyAccount"
ADD COLUMN "status" "LoyaltyMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "tierOverride" "LoyaltyTier";

-- CreateTable
CREATE TABLE "LoyaltyProgramConfig" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "earningEnabled" BOOLEAN NOT NULL DEFAULT true,
    "redemptionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "eligibleCurrency" CHAR(3) NOT NULL DEFAULT 'JOD',
    "memberPointsPerJod" INTEGER NOT NULL DEFAULT 10,
    "goldMinimumNights" INTEGER NOT NULL DEFAULT 5,
    "goldPointsPerJod" INTEGER NOT NULL DEFAULT 12,
    "blackMinimumNights" INTEGER NOT NULL DEFAULT 15,
    "blackPointsPerJod" INTEGER NOT NULL DEFAULT 15,
    "walletPointsPerJod" INTEGER NOT NULL DEFAULT 400,
    "minimumRedemptionPoints" INTEGER NOT NULL DEFAULT 400,
    "redemptionStepPoints" INTEGER NOT NULL DEFAULT 20,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoyaltyProgramConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "LoyaltyProgramConfig" (
  "id", "enabled", "earningEnabled", "redemptionEnabled", "eligibleCurrency",
  "memberPointsPerJod", "goldMinimumNights", "goldPointsPerJod",
  "blackMinimumNights", "blackPointsPerJod", "walletPointsPerJod",
  "minimumRedemptionPoints", "redemptionStepPoints", "updatedAt"
) VALUES (
  'HANDMEKEY_REWARDS', true, true, true, 'JOD',
  10, 5, 12, 15, 15, 400, 400, 20, CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
