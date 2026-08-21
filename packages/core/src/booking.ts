export const DEFAULT_HOLD_TTL_MINUTES = 15;

export type StayDates = Readonly<{
  arrival: string;
  departure: string;
  nights: readonly string[];
}>;

export function buildStayDates(arrival: string, departure: string): StayDates {
  const start = parseDateOnly(arrival);
  const end = parseDateOnly(departure);
  if (end.getTime() <= start.getTime()) throw new RangeError("departure must be after arrival");

  const nights: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() < end.getTime()) {
    nights.push(formatDateOnly(cursor));
    if (nights.length > 366) throw new RangeError("stay cannot exceed 366 nights");
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {arrival, departure, nights};
}

export function holdExpiresAt(now = new Date(), ttlMinutes = DEFAULT_HOLD_TTL_MINUTES): Date {
  if (!Number.isInteger(ttlMinutes) || ttlMinutes < 1 || ttlMinutes > 120) throw new RangeError("ttlMinutes must be between 1 and 120");
  return new Date(now.getTime() + ttlMinutes * 60_000);
}

export function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError("date must use YYYY-MM-DD");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || formatDateOnly(date) !== value) throw new RangeError("invalid calendar date");
  return date;
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
