import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { CreateBookingHoldInput } from "@platform/contracts";
import { getDemoBookingQuote, getPublicHotelDetails } from "@platform/server";

type DemoBookingPayload = Readonly<{
  version: 1;
  bookingId: string;
  createdAt: string;
  guestName: string;
  guestEmail: string;
  paymentMode: "PAY_NOW" | "PAY_AT_HOTEL";
  selection: Readonly<{
    hotelId: string;
    roomTypeId: string;
    ratePlanId: string;
    arrival: string;
    departure: string;
    adults: number;
    children: number;
  }>;
}>;

const TOKEN_PREFIX = "demo.v1";
const DEMO_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function createDemoBookingHold(input: CreateBookingHoldInput) {
  if (!input.hotelId.startsWith("demo-")) return null;
  const quote = getDemoBookingQuote(input);
  if (!quote) return null;

  const bookingId = `demo-booking-${randomUUID()}`;
  const createdAt = new Date().toISOString();
  const payload: DemoBookingPayload = {
    version: 1,
    bookingId,
    createdAt,
    guestName: input.guestName.trim(),
    guestEmail: input.guestEmail.trim(),
    paymentMode: input.paymentMode,
    selection: {
      hotelId: input.hotelId,
      roomTypeId: input.roomTypeId,
      ratePlanId: input.ratePlanId,
      arrival: input.arrival,
      departure: input.departure,
      adults: input.adults,
      children: input.children,
    },
  };

  return {
    booking: {
      id: bookingId,
      status: "HOLD",
      holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    },
    bookingAccessToken: encodeDemoBookingToken(payload),
    reused: false,
  };
}

export async function demoBookingView(bookingId: string, token: string | null) {
  const payload = decodeDemoBookingToken(token);
  if (!payload || payload.bookingId !== bookingId) return null;

  const age = Date.now() - Date.parse(payload.createdAt);
  if (!Number.isFinite(age) || age < 0 || age > DEMO_TOKEN_TTL_MS) return null;

  const quote = getDemoBookingQuote(payload.selection);
  if (!quote) return null;

  const hotel = await getPublicHotelDetails(payload.selection.hotelId, {
    arrival: payload.selection.arrival,
    departure: payload.selection.departure,
    adults: payload.selection.adults,
    children: payload.selection.children,
  }, { trackView: false });
  if (!hotel) return null;

  const today = new Date().toISOString().slice(0, 10);
  const stayPhase = phaseFor(payload.selection.arrival, payload.selection.departure, today);
  const cancellationCurrent = {
    policy: quote.cancellationPolicy,
    penaltyAmount: 0,
    refundableAmount: quote.amounts.total,
    alreadyCancelled: false,
  };

  return {
    id: bookingId,
    reference: `DEMO-${bookingId.slice(-8).toUpperCase()}`,
    status: "CONFIRMED",
    paymentState: payload.paymentMode === "PAY_AT_HOTEL" ? "NOT_REQUIRED" : "PENDING",
    paymentMode: payload.paymentMode,
    currency: quote.hotel.currency,
    hotel: {
      id: hotel.id,
      name: hotel.name,
      city: hotel.city,
      countryCode: hotel.countryCode,
      address: hotel.address,
      checkInTime: hotel.checkInTime,
      checkOutTime: hotel.checkOutTime,
      timezone: hotel.timezone,
    },
    roomType: { id: quote.roomType.id, name: quote.roomType.name },
    ratePlan: { id: quote.ratePlan.id, name: quote.ratePlan.name },
    occupancy: quote.occupancy,
    arrival: quote.arrival,
    departure: quote.departure,
    nights: demoNights(quote.arrival, quote.departure, quote.amounts),
    amounts: quote.amounts,
    holdExpiresAt: null,
    confirmedAt: payload.createdAt,
    cancelledAt: null,
    account: { linked: false },
    viewer: { signedIn: false },
    arrivalInfo: { expectedArrivalTime: null, status: "PENDING" },
    today,
    stayPhase,
    cancellation: {
      policy: quote.cancellationPolicy,
      penaltyAmount: 0,
      refundableAmount: quote.amounts.total,
      current: cancellationCurrent,
    },
    wallet: { appliedAmount: 0, remainingAmount: quote.amounts.total },
    demo: true,
  };
}

function encodeDemoBookingToken(payload: DemoBookingPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${TOKEN_PREFIX}.${body}.${signature(body)}`;
}

function decodeDemoBookingToken(token: string | null): DemoBookingPayload | null {
  if (!token) return null;
  const [prefix, body, suppliedSignature, extra] = token.split(".");
  if (prefix !== "demo" || body !== "v1" || !suppliedSignature || extra) {
    // Tokens are emitted as demo.v1.<payload>.<signature>; parse that shape below.
    const parts = token.split(".");
    if (parts.length !== 4 || `${parts[0]}.${parts[1]}` !== TOKEN_PREFIX) return null;
    return decodeBody(parts[2]!, parts[3]!);
  }
  return null;
}

function decodeBody(body: string, suppliedSignature: string): DemoBookingPayload | null {
  const expected = signature(body);
  const supplied = Buffer.from(suppliedSignature);
  const wanted = Buffer.from(expected);
  if (supplied.length !== wanted.length || !timingSafeEqual(supplied, wanted)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DemoBookingPayload;
    if (parsed.version !== 1 || !parsed.bookingId?.startsWith("demo-booking-") || !parsed.selection?.hotelId?.startsWith("demo-")) return null;
    return parsed;
  } catch {
    return null;
  }
}

function signature(body: string): string {
  return createHmac("sha256", demoSecret()).update(body).digest("base64url");
}

function demoSecret(): string {
  return process.env.DEMO_BOOKING_SECRET?.trim() || "handmekey-demo-reservations-v1";
}

function phaseFor(arrival: string, departure: string, today: string) {
  if (today < arrival) return "UPCOMING" as const;
  if (today === arrival) return "ARRIVAL_DAY" as const;
  if (today >= departure) return "COMPLETED" as const;
  return "IN_STAY" as const;
}

function demoNights(arrival: string, departure: string, amounts: { base: number; service: number; tax: number; total: number }) {
  const start = new Date(`${arrival}T00:00:00Z`);
  const end = new Date(`${departure}T00:00:00Z`);
  const count = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10);
    return {
      date,
      base: round(amounts.base / count),
      service: round(amounts.service / count),
      tax: round(amounts.tax / count),
      total: round(amounts.total / count),
    };
  });
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
