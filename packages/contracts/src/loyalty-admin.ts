import {z} from "zod";

export const loyaltyProgramSettingsSchema = z.object({
  enabled: z.boolean(),
  earningEnabled: z.boolean(),
  redemptionEnabled: z.boolean(),
  eligibleCurrency: z.string().trim().length(3).regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
  memberPointsPerJod: z.number().int().min(1).max(100000),
  goldMinimumNights: z.number().int().min(1).max(10000),
  goldPointsPerJod: z.number().int().min(1).max(100000),
  blackMinimumNights: z.number().int().min(2).max(10000),
  blackPointsPerJod: z.number().int().min(1).max(100000),
  walletPointsPerJod: z.number().int().min(1).max(10000000),
  minimumRedemptionPoints: z.number().int().min(1).max(100000000),
  redemptionStepPoints: z.number().int().min(1).max(100000000),
}).superRefine((value, ctx) => {
  if (value.blackMinimumNights <= value.goldMinimumNights) {
    ctx.addIssue({code:"custom", path:["blackMinimumNights"], message:"Black tier must require more nights than Gold"});
  }
  if (value.minimumRedemptionPoints < value.redemptionStepPoints) {
    ctx.addIssue({code:"custom", path:["minimumRedemptionPoints"], message:"Minimum redemption must be at least one redemption step"});
  }
  if (value.minimumRedemptionPoints % value.redemptionStepPoints !== 0) {
    ctx.addIssue({code:"custom", path:["minimumRedemptionPoints"], message:"Minimum redemption must be divisible by the redemption step"});
  }
});

export const loyaltyMemberUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  tierOverride: z.enum(["MEMBER", "GOLD", "BLACK"]).nullable(),
  qualifyingNights: z.number().int().min(0).max(100000),
  qualifyingStays: z.number().int().min(0).max(100000),
  reason: z.string().trim().min(3).max(500),
});

export const loyaltyPointsAdjustmentSchema = z.object({
  mode: z.enum(["ADD", "REMOVE", "SET"]),
  points: z.number().int().min(0).max(100000000),
  reason: z.string().trim().min(3).max(500),
}).superRefine((value, ctx) => {
  if (value.mode !== "SET" && value.points === 0) {
    ctx.addIssue({code:"custom", path:["points"], message:"Points must be greater than zero"});
  }
});

export type LoyaltyProgramSettingsInput = z.infer<typeof loyaltyProgramSettingsSchema>;
export type LoyaltyMemberUpdateInput = z.infer<typeof loyaltyMemberUpdateSchema>;
export type LoyaltyPointsAdjustmentInput = z.infer<typeof loyaltyPointsAdjustmentSchema>;
