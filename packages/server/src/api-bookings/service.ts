import {randomUUID} from "node:crypto";
import type {ApiBookingInput} from "@platform/contracts";
import {database} from "@platform/database";
import {ApplicationError} from "../errors";
import {requirePlatformAdmin} from "../admin/authorization";
import {bookHotelbeds, checkHotelbedsRate} from "../hotelbeds/client";

export async function createApiBooking(input: ApiBookingInput) {
  if (input.paymentMode === "PAY_NOW") throw new ApplicationError("API_PAYMENT_NOT_CONFIGURED", "Online payment is not enabled for Hotelbeds bookings yet", 400);

  const nights = Math.max(1, Math.round((Date.parse(input.departure) - Date.parse(input.arrival)) / 86_400_000));
  const reference = `HMK-API-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const clientReference = `HMKAPI-${randomUUID().replaceAll("-", "").slice(0, 32).toUpperCase()}`;
  const pending = await database().apiBooking.create({data: {
    reference,
    clientReference,
    hotelCode: input.hotelCode,
    hotelName: input.hotelName,
    city: input.city,
    roomName: input.roomName ?? null,
    boardName: input.boardName ?? null,
    rateType: input.rateType ?? null,
    rateKey: input.rateKey,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    phone: input.phone ?? null,
    arrival: new Date(`${input.arrival}T00:00:00.000Z`),
    departure: new Date(`${input.departure}T00:00:00.000Z`),
    adults: input.adults,
    children: input.children,
    childrenAges: input.childrenAges,
    currency: input.currency,
    netAmount: input.netAmount,
    sellingAmount: input.sellingAmount ?? null,
    markupAmount: Math.max(0, input.totalAmount - input.netAmount),
    totalAmount: input.totalAmount,
    paymentMode: input.paymentMode,
    paymentState: "NOT_REQUIRED",
    status: "PENDING",
    cancellationPolicy: input.cancellationPolicy ? jsonSafe(input.cancellationPolicy) : null,
    providerRequest: jsonSafe({rateKey: input.rateKey, clientReference}),
  }});

  try {
    let bookingRateKey = input.rateKey;
    let rate = {net: input.netAmount, sellingRate: input.sellingAmount ?? null, total: input.totalAmount, currency: input.currency};
    if (input.rateType?.toUpperCase() === "RECHECK") {
      const checked = await checkHotelbedsRate(input.rateKey, nights);
      if (!checked) throw new ApplicationError("HOTELBEDS_RATE_UNAVAILABLE", "The selected Hotelbeds rate is no longer available", 409);
      bookingRateKey = checked.offer.rateKey;
      rate = {net: checked.offer.net, sellingRate: checked.offer.sellingRate, total: checked.offer.total, currency: checked.offer.currency};
      await database().apiBooking.update({where: {id: pending.id}, data: {
        rateKey: bookingRateKey,
        netAmount: rate.net,
        sellingAmount: rate.sellingRate,
        markupAmount: Math.max(0, rate.total - rate.net),
        totalAmount: rate.total,
        currency: rate.currency,
        cancellationPolicy: jsonSafe(checked.offer.cancellationPolicy),
        providerResponse: jsonSafe(checked.raw),
        providerRequest: jsonSafe({rateKey: bookingRateKey, clientReference, checked: true}),
      }});
    }

    const result = await bookHotelbeds({
      rateKey: bookingRateKey,
      adults: input.adults,
      holderName: holderFirstName(input.guestName),
      holderSurname: holderSurname(input.guestName),
      email: input.guestEmail,
      ...(input.phone ? {phone: input.phone} : {}),
      clientReference,
      childrenAges: input.childrenAges,
    });
    if (!result.providerReference) throw new ApplicationError("HOTELBEDS_REFERENCE_MISSING", "Hotelbeds did not return a booking reference", 502);

    const booking = await database().apiBooking.update({where: {id: pending.id}, data: {
      status: "CONFIRMED",
      providerReference: result.providerReference,
      rateKey: bookingRateKey,
      netAmount: rate.net,
      sellingAmount: rate.sellingRate,
      markupAmount: Math.max(0, rate.total - rate.net),
      totalAmount: rate.total,
      currency: rate.currency,
      providerResponse: jsonSafe(result.raw),
      confirmedAt: new Date(),
    }});
    return apiBookingView(booking);
  } catch (error) {
    const failure = error instanceof ApplicationError ? error : new ApplicationError("HOTELBEDS_BOOKING_FAILED", "Hotelbeds could not confirm this booking", 502);
    await database().apiBooking.update({where: {id: pending.id}, data: {status: "FAILED", errorCode: failure.code, errorMessage: failure.message}}).catch((updateError) => console.error("Could not record API booking failure", updateError));
    throw failure;
  }
}

export async function getApiBooking(id: string) {
  const booking = await database().apiBooking.findUnique({where: {id}});
  return booking ? apiBookingView(booking) : null;
}

export async function listApiBookings(userId: string, limit = 200) {
  await requirePlatformAdmin(userId);
  const bookings = await database().apiBooking.findMany({orderBy: {createdAt: "desc"}, take: Math.max(1, Math.min(limit, 500))});
  return bookings.map(apiBookingView);
}

function apiBookingView(booking: {
  id: string; reference: string; provider: string; providerReference: string | null; clientReference: string; hotelCode: string; hotelName: string; city: string;
  roomName: string | null; boardName: string | null; rateType: string | null; guestName: string; guestEmail: string; arrival: Date; departure: Date; adults: number; children: number;
  currency: string; netAmount: unknown; sellingAmount: unknown; markupAmount: unknown; totalAmount: unknown; paymentMode: string; paymentState: string; status: string;
  cancellationPolicy: unknown; errorCode: string | null; errorMessage: string | null; confirmedAt: Date | null; cancelledAt: Date | null; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: booking.id,
    reference: booking.reference,
    provider: booking.provider,
    providerReference: booking.providerReference,
    clientReference: booking.clientReference,
    hotel: {code: booking.hotelCode, name: booking.hotelName, city: booking.city},
    roomName: booking.roomName,
    boardName: booking.boardName,
    rateType: booking.rateType,
    guest: {name: booking.guestName, email: booking.guestEmail},
    arrival: dateKey(booking.arrival),
    departure: dateKey(booking.departure),
    adults: booking.adults,
    children: booking.children,
    currency: booking.currency,
    amounts: {net: Number(booking.netAmount), selling: booking.sellingAmount === null ? null : Number(booking.sellingAmount), markup: Number(booking.markupAmount), total: Number(booking.totalAmount)},
    paymentMode: booking.paymentMode,
    paymentState: booking.paymentState,
    status: booking.status,
    cancellationPolicy: booking.cancellationPolicy,
    error: booking.errorCode ? {code: booking.errorCode, message: booking.errorMessage} : null,
    providerBooking: {name: "Hotelbeds", reference: booking.providerReference},
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

function holderFirstName(value: string): string { return value.trim().split(/\s+/)[0] ?? value.trim(); }
function holderSurname(value: string): string { const parts = value.trim().split(/\s+/); return parts.slice(1).join(" ") || parts[0] || "Guest"; }
function dateKey(value: Date): string { return value.toISOString().slice(0, 10); }
function jsonSafe(value: unknown) { return JSON.parse(JSON.stringify(value)); }
