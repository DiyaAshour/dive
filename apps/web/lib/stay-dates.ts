export function defaultStayDates(now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const arrival = new Date(today);
  arrival.setUTCDate(arrival.getUTCDate() + 1);
  const departure = new Date(arrival);
  departure.setUTCDate(departure.getUTCDate() + 2);
  return {arrival: dateOnly(arrival), departure: dateOnly(departure)};
}

export function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
