import { parseDateOnly } from "./booking";
import { roundMoney } from "./pricing";

export const PENALTY_TYPES = ["NONE", "PERCENTAGE", "FIXED_AMOUNT", "FIRST_NIGHT", "FULL_STAY"] as const;
export type PenaltyType = (typeof PENALTY_TYPES)[number];

export type CancellationRuleSnapshot = Readonly<{
  minimumDaysBeforeArrival: number;
  penaltyType: PenaltyType;
  penaltyValue?: number | null;
}>;

export type CancellationPolicySnapshot = Readonly<{
  name: string;
  rules: readonly CancellationRuleSnapshot[];
  noShowPenaltyType: PenaltyType;
  noShowPenaltyValue?: number | null;
}>;

export type CancellationEvaluation = Readonly<{
  daysBeforeArrival: number;
  penaltyType: PenaltyType;
  penaltyAmount: number;
  refundableAmount: number;
  rule: "CANCELLATION" | "NO_SHOW";
}>;

export function evaluateCancellation(input: Readonly<{
  arrival: string;
  hotelTimeZone: string;
  totalAmount: number;
  firstNightAmount: number;
  policy: CancellationPolicySnapshot;
  now?: Date;
}>): CancellationEvaluation {
  if (!input.policy.rules.length) throw new RangeError("Cancellation policy requires at least one rule");
  assertMoney(input.totalAmount, "totalAmount");
  assertMoney(input.firstNightAmount, "firstNightAmount");
  const today = localDateInTimeZone(input.now ?? new Date(), input.hotelTimeZone);
  const daysBeforeArrival = calendarDayDifference(today, input.arrival);

  if (daysBeforeArrival < 0) {
    const penaltyAmount = penalty(input.policy.noShowPenaltyType, input.policy.noShowPenaltyValue, input.totalAmount, input.firstNightAmount);
    return {daysBeforeArrival, penaltyType: input.policy.noShowPenaltyType, penaltyAmount, refundableAmount: roundMoney(input.totalAmount - penaltyAmount), rule: "NO_SHOW"};
  }

  const applicable = [...input.policy.rules]
    .sort((a, b) => b.minimumDaysBeforeArrival - a.minimumDaysBeforeArrival)
    .find((rule) => daysBeforeArrival >= rule.minimumDaysBeforeArrival);
  if (!applicable) throw new RangeError("Cancellation policy has no rule for the current cancellation window");
  const penaltyAmount = penalty(applicable.penaltyType, applicable.penaltyValue, input.totalAmount, input.firstNightAmount);
  return {daysBeforeArrival, penaltyType: applicable.penaltyType, penaltyAmount, refundableAmount: roundMoney(input.totalAmount - penaltyAmount), rule: "CANCELLATION"};
}

export function localDateInTimeZone(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {timeZone, year: "numeric", month: "2-digit", day: "2-digit"}).formatToParts(value);
  const get = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value;
  const year = get("year");
  const month = get("month");
  const day = get("day");
  if (!year || !month || !day) throw new RangeError("Unable to resolve hotel local date");
  return `${year}-${month}-${day}`;
}

function calendarDayDifference(from: string, to: string): number {
  return Math.round((parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / 86_400_000);
}

function penalty(type: PenaltyType, value: number | null | undefined, total: number, firstNight: number): number {
  switch (type) {
    case "NONE": return 0;
    case "FIRST_NIGHT": return roundMoney(Math.min(firstNight, total));
    case "FULL_STAY": return roundMoney(total);
    case "PERCENTAGE": {
      if (value === null || value === undefined || !Number.isFinite(value) || value < 0 || value > 1) throw new RangeError("Percentage penalty requires a value between 0 and 1");
      return roundMoney(total * value);
    }
    case "FIXED_AMOUNT": {
      if (value === null || value === undefined || !Number.isFinite(value) || value < 0) throw new RangeError("Fixed penalty requires a non-negative value");
      return roundMoney(Math.min(value, total));
    }
  }
}

function assertMoney(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${field} must be a non-negative finite number`);
}
