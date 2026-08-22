import type { DiscoverySearchInput, HotelPerformanceQuery } from "@platform/contracts";
import { database } from "@platform/database";
import { requireHotelPermission } from "../hotels/authorization";

const MAX_IMPRESSIONS_PER_SEARCH = 100;

export async function captureSearchDemand(input: DiscoverySearchInput, hotelIds: readonly string[]): Promise<void> {
  await captureTelemetry(async () => {
    const db = database();
    const common = {
      arrival: dateOnly(input.arrival),
      departure: dateOnly(input.departure),
    };
    await db.$transaction([
      db.searchDemandEvent.create({data: {
        destination: input.destination.trim(),
        destinationKey: destinationKey(input.destination),
        ...common,
        adults: input.adults,
        children: input.children,
        resultCount: hotelIds.length,
      }}),
      ...hotelIds.slice(0, MAX_IMPRESSIONS_PER_SEARCH).map((hotelId) => db.growthEvent.create({data: {
        type: "HOTEL_IMPRESSION",
        hotelId,
        ...common,
        metadata: {destination: input.destination.trim()},
      }})),
    ]);
  });
}

export async function captureHotelView(hotelId: string, stay: Readonly<{arrival: string; departure: string}>): Promise<void> {
  await captureGrowthEvent("HOTEL_VIEW", hotelId, stay);
}

export async function captureCheckoutStarted(input: Readonly<{hotelId: string; roomTypeId: string; ratePlanId: string; arrival: string; departure: string}>): Promise<void> {
  await captureTelemetry(async () => {
    await database().growthEvent.create({data: {
      type: "CHECKOUT_STARTED",
      hotelId: input.hotelId,
      roomTypeId: input.roomTypeId,
      ratePlanId: input.ratePlanId,
      arrival: dateOnly(input.arrival),
      departure: dateOnly(input.departure),
    }});
  });
}

export async function getHotelPerformance(userId: string, hotelId: string, query: HotelPerformanceQuery) {
  await requireHotelPermission(userId, hotelId, "analytics:view");
  const db = database();
  const hotel = await db.hotel.findUnique({where: {id: hotelId}, select: {id: true, name: true, city: true, currency: true}});
  if (!hotel) throw new Error("Hotel not found");

  const to = new Date();
  const from = new Date(to.getTime() - query.days * 86_400_000);
  const eventRows = await db.growthEvent.groupBy({
    by: ["type"],
    where: {hotelId, occurredAt: {gte: from, lte: to}},
    _count: {_all: true},
  });
  const eventCount = new Map(eventRows.map((row) => [row.type, row._count._all]));

  const [holds, confirmed, cancelled, expired, bookedValue, demandRows] = await Promise.all([
    db.booking.count({where: {hotelId, createdAt: {gte: from, lte: to}}}),
    db.booking.count({where: {hotelId, confirmedAt: {gte: from, lte: to}}}),
    db.booking.count({where: {hotelId, status: "CANCELLED", confirmedAt: {gte: from, lte: to}}}),
    db.booking.count({where: {hotelId, status: "EXPIRED", createdAt: {gte: from, lte: to}}}),
    db.booking.aggregate({where: {hotelId, confirmedAt: {gte: from, lte: to}, status: {in: ["CONFIRMED", "MODIFIED"]}}, _sum: {totalAmount: true}}),
    db.searchDemandEvent.findMany({
      where: {
        destinationKey: destinationKey(hotel.city),
        createdAt: {gte: from, lte: to},
        arrival: {gte: stripTime(new Date())},
      },
      select: {arrival: true, adults: true, children: true, resultCount: true},
      take: 10_000,
    }),
  ]);

  const impressions = eventCount.get("HOTEL_IMPRESSION") ?? 0;
  const views = eventCount.get("HOTEL_VIEW") ?? 0;
  const checkoutStarts = eventCount.get("CHECKOUT_STARTED") ?? 0;
  const topDemandDates = aggregateDemand(demandRows).slice(0, 10);
  const funnel = {
    impressions,
    views,
    checkoutStarts,
    holds,
    confirmed,
    viewRate: rate(views, impressions),
    checkoutRate: rate(checkoutStarts, views),
    holdRate: rate(holds, checkoutStarts),
    bookingRateFromCheckout: rate(confirmed, checkoutStarts),
    bookingRateFromImpression: rate(confirmed, impressions),
  };

  return {
    hotel: {id: hotel.id, name: hotel.name, city: hotel.city, currency: hotel.currency},
    window: {days: query.days, from, to},
    funnel,
    outcomes: {
      confirmed,
      cancelled,
      expired,
      cancellationRate: rate(cancelled, confirmed),
      holdExpiryRate: rate(expired, holds),
      activeBookedValue: Number(bookedValue._sum.totalAmount ?? 0),
    },
    demand: {topArrivalDates: topDemandDates},
    signals: opportunitySignals({funnel, cancelled, expired, topDemandDates}),
  };
}

async function captureGrowthEvent(type: "HOTEL_VIEW", hotelId: string, stay: Readonly<{arrival: string; departure: string}>): Promise<void> {
  await captureTelemetry(async () => {
    await database().growthEvent.create({data: {
      type,
      hotelId,
      arrival: dateOnly(stay.arrival),
      departure: dateOnly(stay.departure),
    }});
  });
}

async function captureTelemetry(write: () => Promise<unknown>): Promise<void> {
  try {
    await write();
  } catch (error) {
    // Growth telemetry is intentionally non-authoritative: a metrics outage must never block search or booking.
    console.error("[growth-telemetry] write failed", error);
  }
}

function aggregateDemand(rows: readonly {arrival: Date; adults: number; children: number; resultCount: number}[]) {
  const map = new Map<string, {date: string; searches: number; guestDemand: number; zeroResultSearches: number}>();
  for (const row of rows) {
    const date = row.arrival.toISOString().slice(0, 10);
    const current = map.get(date) ?? {date, searches: 0, guestDemand: 0, zeroResultSearches: 0};
    current.searches += 1;
    current.guestDemand += row.adults + row.children;
    if (row.resultCount === 0) current.zeroResultSearches += 1;
    map.set(date, current);
  }
  return [...map.values()].sort((a, b) => b.searches - a.searches || a.date.localeCompare(b.date));
}

function opportunitySignals(input: Readonly<{
  funnel: {impressions: number; views: number; checkoutStarts: number; holds: number; confirmed: number; viewRate: number; checkoutRate: number; holdRate: number; bookingRateFromCheckout: number; bookingRateFromImpression: number};
  cancelled: number;
  expired: number;
  topDemandDates: readonly {date: string; searches: number; guestDemand: number; zeroResultSearches: number}[];
}>) {
  const signals: Array<{code: string; severity: "INFO" | "OPPORTUNITY" | "ATTENTION"; title: string; detail: string}> = [];
  if (input.funnel.impressions >= 20 && input.funnel.viewRate < 0.08) signals.push({code: "LOW_VIEW_RATE", severity: "OPPORTUNITY", title: "Search visibility is not turning into hotel views", detail: `Only ${(input.funnel.viewRate * 100).toFixed(1)}% of impressions became property views. Review cover photo, headline value and displayed offer.`});
  if (input.funnel.views >= 10 && input.funnel.checkoutRate < 0.08) signals.push({code: "LOW_CHECKOUT_RATE", severity: "OPPORTUNITY", title: "Guests view the property but rarely choose a rate", detail: `Only ${(input.funnel.checkoutRate * 100).toFixed(1)}% of property views reached checkout. Compare package value, cancellation flexibility and final price.`});
  if (input.funnel.checkoutStarts >= 5 && input.funnel.bookingRateFromCheckout < 0.25) signals.push({code: "CHECKOUT_DROP", severity: "ATTENTION", title: "Checkout abandonment is high", detail: `${input.funnel.confirmed} of ${input.funnel.checkoutStarts} checkout starts became confirmed bookings. Inspect payment availability, policies and price changes.`});
  if (input.funnel.holds >= 5 && rate(input.expired, input.funnel.holds) >= 0.25) signals.push({code: "HOLD_EXPIRY", severity: "ATTENTION", title: "Too many booking holds expire", detail: `${input.expired} holds from this reporting cohort expired. This can indicate payment friction or hesitation at the final step.`});
  const strongestDemand = input.topDemandDates[0];
  if (strongestDemand && strongestDemand.searches >= 5) signals.push({code: "HIGH_DEMAND_DATE", severity: "INFO", title: `Demand signal for ${strongestDemand.date}`, detail: `${strongestDemand.searches} destination searches requested arrival on this date, representing ${strongestDemand.guestDemand} guests.`});
  if (!signals.length) signals.push({code: "INSUFFICIENT_SIGNAL", severity: "INFO", title: "Keep collecting demand data", detail: "The funnel does not yet have enough volume for a strong deterministic opportunity signal."});
  return signals;
}

function destinationKey(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function stripTime(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}
