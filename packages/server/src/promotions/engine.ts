import { roundMoney } from "@platform/core";

export type PromotionCandidate = Readonly<{
  id: string;
  name: string;
  discountPercent: unknown;
  bookingStartsAt: Date;
  bookingEndsAt: Date;
  stayStartsOn: Date;
  stayEndsOn: Date;
  minimumNights: number;
  status: string;
}>;

export type AppliedPromotion = Readonly<{
  id: string;
  name: string;
  discountPercent: number;
}>;

export function selectBestPromotion(
  candidates: readonly PromotionCandidate[],
  stayDates: readonly Date[],
  now = new Date(),
): AppliedPromotion | null {
  if (stayDates.length === 0) return null;
  const firstNight = stayDates[0];
  const lastNight = stayDates[stayDates.length - 1];
  if (!firstNight || !lastNight) return null;

  const eligible = candidates.flatMap((candidate) => {
    const percent = Number(candidate.discountPercent);
    if (candidate.status !== "ACTIVE") return [];
    if (!Number.isFinite(percent) || percent <= 0 || percent > 80) return [];
    if (now < candidate.bookingStartsAt || now > candidate.bookingEndsAt) return [];
    if (stayDates.length < candidate.minimumNights) return [];
    if (firstNight < candidate.stayStartsOn || lastNight > candidate.stayEndsOn) return [];
    return [{id: candidate.id, name: candidate.name, discountPercent: percent}];
  });

  if (!eligible.length) return null;
  return eligible.sort((a, b) => b.discountPercent - a.discountPercent || a.name.localeCompare(b.name))[0] ?? null;
}

export function promotionBaseRate(baseRate: number, promotion: AppliedPromotion | null): number {
  if (!promotion) return roundMoney(baseRate);
  return roundMoney(baseRate * (1 - promotion.discountPercent / 100));
}
