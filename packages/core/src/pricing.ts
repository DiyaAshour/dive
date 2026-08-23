export type PricingPolicy = Readonly<{
  serviceRate: number;
  taxRate: number;
}>;

export type PriceBreakdown = Readonly<{
  base: number;
  service: number;
  tax: number;
  total: number;
}>;

export const DEFAULT_PRICING_POLICY: PricingPolicy = Object.freeze({
  serviceRate: 0.07,
  taxRate: 0.086,
});

export function calculatePrice(baseRate: number, policy: PricingPolicy = DEFAULT_PRICING_POLICY): PriceBreakdown {
  assertNonNegativeFinite(baseRate, "baseRate");
  assertRate(policy.serviceRate, "serviceRate");
  assertRate(policy.taxRate, "taxRate");

  const service = baseRate * policy.serviceRate;
  const tax = baseRate * policy.taxRate;

  return {
    base: roundMoney(baseRate),
    service: roundMoney(service),
    tax: roundMoney(tax),
    total: roundMoney(baseRate + service + tax),
  };
}

export function calculateStayPrice(baseRatePerNight: number, nights: number, policy: PricingPolicy = DEFAULT_PRICING_POLICY): PriceBreakdown {
  if (!Number.isInteger(nights) || nights < 1) throw new RangeError("nights must be a positive integer");
  return calculatePrice(baseRatePerNight * nights, policy);
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertNonNegativeFinite(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${field} must be a non-negative finite number`);
}

function assertRate(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${field} must be between 0 and 1`);
}
