export const SERVICE_RATE = 0.07;
export const TOTAL_MULTIPLIER = 1.156;
export const TAX_RATE = TOTAL_MULTIPLIER - 1 - SERVICE_RATE;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function priceBreakdown(baseRate: number) {
  const base = round2(baseRate);
  const service = round2(base * SERVICE_RATE);
  const tax = round2(base * TAX_RATE);
  const total = round2(base * TOTAL_MULTIPLIER);
  return { base, service, tax, total };
}

export function stayPrice(baseRate: number, nights: number) {
  const nightly = priceBreakdown(baseRate);
  return {
    nightly,
    nights,
    base: round2(nightly.base * nights),
    service: round2(nightly.service * nights),
    tax: round2(nightly.tax * nights),
    total: round2(nightly.total * nights),
  };
}
