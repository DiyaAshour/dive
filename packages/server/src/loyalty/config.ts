import type {LoyaltyRuleSet} from "@platform/core";
import {database} from "@platform/database";

export const LOYALTY_PROGRAM_CONFIG_ID = "HANDMEKEY_REWARDS";

export type LoyaltyProgramSettings = Readonly<{
  enabled: boolean;
  earningEnabled: boolean;
  redemptionEnabled: boolean;
  eligibleCurrency: string;
  memberPointsPerJod: number;
  goldMinimumNights: number;
  goldPointsPerJod: number;
  blackMinimumNights: number;
  blackPointsPerJod: number;
  walletPointsPerJod: number;
  minimumRedemptionPoints: number;
  redemptionStepPoints: number;
  updatedByUserId: string | null;
  updatedAt: Date;
}>;

const DEFAULT_CREATE = {
  id: LOYALTY_PROGRAM_CONFIG_ID,
  enabled: true,
  earningEnabled: true,
  redemptionEnabled: true,
  eligibleCurrency: "JOD",
  memberPointsPerJod: 10,
  goldMinimumNights: 5,
  goldPointsPerJod: 12,
  blackMinimumNights: 15,
  blackPointsPerJod: 15,
  walletPointsPerJod: 400,
  minimumRedemptionPoints: 400,
  redemptionStepPoints: 20,
} as const;

export async function getLoyaltyProgramConfig(): Promise<LoyaltyProgramSettings> {
  const row = await database().loyaltyProgramConfig.upsert({
    where: {id: LOYALTY_PROGRAM_CONFIG_ID},
    create: DEFAULT_CREATE,
    update: {},
  });
  return mapProgramSettings(row);
}

export function loyaltyRuleSetFromProgram(program: LoyaltyProgramSettings): LoyaltyRuleSet {
  return {
    eligibleCurrency: program.eligibleCurrency,
    tiers: {
      MEMBER: {minimumNights: 0, pointsPerJod: program.memberPointsPerJod},
      GOLD: {minimumNights: program.goldMinimumNights, pointsPerJod: program.goldPointsPerJod},
      BLACK: {minimumNights: program.blackMinimumNights, pointsPerJod: program.blackPointsPerJod},
    },
  };
}

export function mapProgramSettings(row: {
  enabled: boolean;
  earningEnabled: boolean;
  redemptionEnabled: boolean;
  eligibleCurrency: string;
  memberPointsPerJod: number;
  goldMinimumNights: number;
  goldPointsPerJod: number;
  blackMinimumNights: number;
  blackPointsPerJod: number;
  walletPointsPerJod: number;
  minimumRedemptionPoints: number;
  redemptionStepPoints: number;
  updatedByUserId: string | null;
  updatedAt: Date;
}): LoyaltyProgramSettings {
  return {
    enabled: row.enabled,
    earningEnabled: row.earningEnabled,
    redemptionEnabled: row.redemptionEnabled,
    eligibleCurrency: row.eligibleCurrency,
    memberPointsPerJod: row.memberPointsPerJod,
    goldMinimumNights: row.goldMinimumNights,
    goldPointsPerJod: row.goldPointsPerJod,
    blackMinimumNights: row.blackMinimumNights,
    blackPointsPerJod: row.blackPointsPerJod,
    walletPointsPerJod: row.walletPointsPerJod,
    minimumRedemptionPoints: row.minimumRedemptionPoints,
    redemptionStepPoints: row.redemptionStepPoints,
    updatedByUserId: row.updatedByUserId,
    updatedAt: row.updatedAt,
  };
}
