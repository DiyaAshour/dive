import { database } from "@platform/database";
import { recordAnalyticsEvent } from "./platform";

const CURSOR_KEY = "booking-events-to-analytics-v1";
const TRACKED_TYPES = [
  "HOLD_CREATED",
  "CONFIRMED",
  "MODIFIED",
  "CANCELLED",
  "EXPIRED",
  "PAYMENT_INITIATED",
  "PAYMENT_CAPTURED",
  "PAYMENT_FAILED",
  "REFUND_RECORDED",
] as const;

export async function syncBookingAnalyticsEvents(limit = 500): Promise<{scanned:number; emitted:number; reused:number; hasMore:boolean}> {
  const db = database();
  const take = clamp(limit, 1, 2000);
  const cursor = await db.platformProjectionCursor.findUnique({where: {key: CURSOR_KEY}});
  const where = cursor?.cursorAt
    ? {
        type: {in: [...TRACKED_TYPES]},
        OR: [
          {createdAt: {gt: cursor.cursorAt}},
          {createdAt: cursor.cursorAt, id: {gt: cursor.cursorId ?? ""}},
        ],
      }
    : {type: {in: [...TRACKED_TYPES]}};

  const events = await db.bookingEvent.findMany({
    where,
    include: {booking: {select: {id:true, hotelId:true, roomTypeId:true, ratePlanId:true, status:true, paymentMode:true, paymentState:true, currency:true, totalAmount:true, arrival:true, departure:true}}},
    orderBy: [{createdAt:"asc"},{id:"asc"}],
    take,
  });

  let emitted = 0;
  let reused = 0;
  for (const event of events) {
    const result = await recordAnalyticsEvent({
      eventId: `booking-event:${event.id}`,
      name: analyticsName(event.type),
      schemaVersion: 1,
      hotelId: event.booking.hotelId,
      bookingId: event.bookingId,
      source: "system",
      occurredAt: event.createdAt,
      properties: {
        bookingEventId: event.id,
        bookingEventType: event.type,
        roomTypeId: event.booking.roomTypeId,
        ratePlanId: event.booking.ratePlanId,
        bookingStatus: event.booking.status,
        paymentMode: event.booking.paymentMode,
        paymentState: event.booking.paymentState,
        currency: event.booking.currency,
        totalAmount: Number(event.booking.totalAmount),
        arrival: event.booking.arrival.toISOString().slice(0,10),
        departure: event.booking.departure.toISOString().slice(0,10),
      },
    });
    result.reused ? reused += 1 : emitted += 1;
  }

  const last = events[events.length - 1];
  if (last) {
    await db.platformProjectionCursor.upsert({
      where: {key: CURSOR_KEY},
      create: {key: CURSOR_KEY, cursorAt: last.createdAt, cursorId: last.id},
      update: {cursorAt: last.createdAt, cursorId: last.id},
    });
  }

  return {scanned:events.length, emitted, reused, hasMore:events.length === take};
}

export async function resetBookingAnalyticsCursor(): Promise<void> {
  await database().platformProjectionCursor.deleteMany({where: {key: CURSOR_KEY}});
}

function analyticsName(type: string): string {
  switch (type) {
    case "HOLD_CREATED": return "booking_hold_created";
    case "CONFIRMED": return "booking_confirmed";
    case "MODIFIED": return "booking_modified";
    case "CANCELLED": return "booking_cancelled";
    case "EXPIRED": return "booking_hold_expired";
    case "PAYMENT_INITIATED": return "payment_initiated";
    case "PAYMENT_CAPTURED": return "payment_captured";
    case "PAYMENT_FAILED": return "payment_failed";
    case "REFUND_RECORDED": return "refund_recorded";
    default: return `booking_${type.toLowerCase()}`;
  }
}

function clamp(value:number,min:number,max:number):number {
  return Number.isFinite(value) ? Math.max(min,Math.min(max,Math.trunc(value))) : min;
}
