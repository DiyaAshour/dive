export type HandMeKeyLoyaltyTier = "MEMBER" | "GOLD" | "BLACK";

export type LoyaltyRuleSet = Readonly<{
  eligibleCurrency: string;
  tiers: Readonly<{
    MEMBER: Readonly<{minimumNights: number; pointsPerJod: number}>;
    GOLD: Readonly<{minimumNights: number; pointsPerJod: number}>;
    BLACK: Readonly<{minimumNights: number; pointsPerJod: number}>;
  }>;
}>;

export const DEFAULT_LOYALTY_RULES: LoyaltyRuleSet = Object.freeze({
  eligibleCurrency: "JOD",
  tiers: Object.freeze({
    MEMBER: Object.freeze({minimumNights: 0, pointsPerJod: 10}),
    GOLD: Object.freeze({minimumNights: 5, pointsPerJod: 12}),
    BLACK: Object.freeze({minimumNights: 15, pointsPerJod: 15}),
  }),
});

export const LOYALTY_ELIGIBLE_CURRENCY = DEFAULT_LOYALTY_RULES.eligibleCurrency as "JOD";
export const LOYALTY_TIERS = DEFAULT_LOYALTY_RULES.tiers;

export function loyaltyTierForNights(qualifyingNights: number, rules: LoyaltyRuleSet = DEFAULT_LOYALTY_RULES): HandMeKeyLoyaltyTier {
  const nights = normalizedWholeNumber(qualifyingNights, "qualifyingNights");
  if (nights >= rules.tiers.BLACK.minimumNights) return "BLACK";
  if (nights >= rules.tiers.GOLD.minimumNights) return "GOLD";
  return "MEMBER";
}

export function loyaltyPointsPerJod(tier: HandMeKeyLoyaltyTier, rules: LoyaltyRuleSet = DEFAULT_LOYALTY_RULES): number {
  return rules.tiers[tier].pointsPerJod;
}

export function calculateLoyaltyPoints(baseAmount: number, tier: HandMeKeyLoyaltyTier, currency: string, rules: LoyaltyRuleSet = DEFAULT_LOYALTY_RULES): number {
  if (currency.toUpperCase() !== rules.eligibleCurrency.toUpperCase()) return 0;
  if (!Number.isFinite(baseAmount) || baseAmount < 0) throw new RangeError("baseAmount must be a non-negative finite number");
  return Math.floor((baseAmount + Number.EPSILON) * loyaltyPointsPerJod(tier, rules));
}

export function loyaltyTierProgress(qualifyingNights: number, rules: LoyaltyRuleSet = DEFAULT_LOYALTY_RULES): Readonly<{
  tier: HandMeKeyLoyaltyTier;
  nextTier: HandMeKeyLoyaltyTier | null;
  currentMinimumNights: number;
  nextMinimumNights: number | null;
  nightsToNextTier: number;
  percent: number;
}> {
  const nights = normalizedWholeNumber(qualifyingNights, "qualifyingNights");
  const tier = loyaltyTierForNights(nights, rules);
  if (tier === "BLACK") return {
    tier,
    nextTier: null,
    currentMinimumNights: rules.tiers.BLACK.minimumNights,
    nextMinimumNights: null,
    nightsToNextTier: 0,
    percent: 100,
  };

  const currentMinimumNights = rules.tiers[tier].minimumNights;
  const nextTier: HandMeKeyLoyaltyTier = tier === "MEMBER" ? "GOLD" : "BLACK";
  const nextMinimumNights = rules.tiers[nextTier].minimumNights;
  const span = Math.max(1, nextMinimumNights - currentMinimumNights);
  const progress = Math.max(0, nights - currentMinimumNights);
  return {
    tier,
    nextTier,
    currentMinimumNights,
    nextMinimumNights,
    nightsToNextTier: Math.max(0, nextMinimumNights - nights),
    percent: Math.max(0, Math.min(100, Math.round((progress / span) * 100))),
  };
}

function normalizedWholeNumber(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) throw new RangeError(`${label} must be a non-negative integer`);
  return value;
}
