export type HandMeKeyLoyaltyTier = "MEMBER" | "GOLD" | "BLACK";

export const LOYALTY_ELIGIBLE_CURRENCY = "JOD" as const;

export const LOYALTY_TIERS = Object.freeze({
  MEMBER: Object.freeze({minimumNights: 0, pointsPerJod: 10}),
  GOLD: Object.freeze({minimumNights: 5, pointsPerJod: 12}),
  BLACK: Object.freeze({minimumNights: 15, pointsPerJod: 15}),
});

export function loyaltyTierForNights(qualifyingNights: number): HandMeKeyLoyaltyTier {
  const nights = normalizedWholeNumber(qualifyingNights, "qualifyingNights");
  if (nights >= LOYALTY_TIERS.BLACK.minimumNights) return "BLACK";
  if (nights >= LOYALTY_TIERS.GOLD.minimumNights) return "GOLD";
  return "MEMBER";
}

export function loyaltyPointsPerJod(tier: HandMeKeyLoyaltyTier): number {
  return LOYALTY_TIERS[tier].pointsPerJod;
}

export function calculateLoyaltyPoints(baseAmount: number, tier: HandMeKeyLoyaltyTier, currency: string): number {
  if (currency.toUpperCase() !== LOYALTY_ELIGIBLE_CURRENCY) return 0;
  if (!Number.isFinite(baseAmount) || baseAmount < 0) throw new RangeError("baseAmount must be a non-negative finite number");
  return Math.floor((baseAmount + Number.EPSILON) * loyaltyPointsPerJod(tier));
}

export function loyaltyTierProgress(qualifyingNights: number): Readonly<{
  tier: HandMeKeyLoyaltyTier;
  nextTier: HandMeKeyLoyaltyTier | null;
  currentMinimumNights: number;
  nextMinimumNights: number | null;
  nightsToNextTier: number;
  percent: number;
}> {
  const nights = normalizedWholeNumber(qualifyingNights, "qualifyingNights");
  const tier = loyaltyTierForNights(nights);
  if (tier === "BLACK") return {
    tier,
    nextTier: null,
    currentMinimumNights: LOYALTY_TIERS.BLACK.minimumNights,
    nextMinimumNights: null,
    nightsToNextTier: 0,
    percent: 100,
  };

  const currentMinimumNights = LOYALTY_TIERS[tier].minimumNights;
  const nextTier: HandMeKeyLoyaltyTier = tier === "MEMBER" ? "GOLD" : "BLACK";
  const nextMinimumNights = LOYALTY_TIERS[nextTier].minimumNights;
  const span = nextMinimumNights - currentMinimumNights;
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
