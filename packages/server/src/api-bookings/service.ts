import {randomUUID} from "node:crypto";
import type {ApiBookingInput} from "@platform/contracts";
import {database} from "@platform/database";
import {ApplicationError} from "../errors";
import {requirePlatformAdmin} from "../admin/authorization";
import {bookHotelbeds, checkHotelbedsRate, HotelbedsConfigurationError, verifyHotelbedsQuote} from "../hotelbeds/client";
import {readHotelbedsCheckoutToken} from "../hotelbeds/checkout-token";
import {getHotelbedsContentHotel} from "../hotelbeds/catalog";
import {cancelHotelbedsBooking, getHotelbedsBookingDetail, simulateHotelbedsBookingCancellation} from "../hotelbeds/post-booking";
import {paymentCapabilities} from "../payments/registry";
import {initiateApiBookingPayment} from "../payments/api-bookings";

export async function createApiBooking(input: ApiBookingInput) {
  if (input.paymentMode === "PAY_NOW" && !paymentCapabilities().onlinePaymentAvailable) throw new ApplicationError("API_PAYMENT_NOT_CONFIGURED", "Online payment is not configured for Hotelbeds bookings yet", 503);

  const nights = Math.max(1, Math.round((Date.parse(input.departure) - Date.parse(input.arrival)) / 86_400_000));
  const reference = `HMK-API-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const clientReference = `HMKAPI-${randomUUID().replaceAll("-", "").slice(0, 32).toUpperCase()}`;
  const snapshot = input.checkoutQuote ? readHotelbedsCheckoutToken(input.checkoutQuote) : null;
  if (input.checkoutQuote && !snapshot) throw new ApplicationError("HOTELBEDS_CHECKOUT_EXPIRED", "The Hotelbeds checkout quote is invalid or expired", 409);
  if (snapshot && !snapshotMatchesInput(snapshot, input)) throw new ApplicationError("HOTELBEDS_CHECKOUT_MISMATCH", "The Hotelbeds checkout details changed after rate selection", 409);
  let pendingId: string | null = null;
  try {
    // Certified workflow: Availability -> CheckRate only for RECHECK -> Booking.
    // New checkout pages carry a signed server snapshot. RECHECK is completed
    // once on the checkout page and the finalized BOOKABLE snapshot arrives here.
    const snapshotRateType = snapshot?.offer.rateType.trim().toUpperCase();
    if (snapshot) {
      if (snapshotRateType !== "BOOKABLE") throw new ApplicationError("HOTELBEDS_RATE_NOT_FINAL", "The Hotelbeds rate must be BOOKABLE before confirmation", 409);
      if (snapshot.sourceRateType === "RECHECK" && !snapshot.checked) throw new ApplicationError("HOTELBEDS_RECHECK_REQUIRED", "Hotelbeds requires CheckRate before this booking", 409);
      if (!snapshot.offer.paymentModes.includes(input.paymentMode)) throw new ApplicationError("HOTELBEDS_PAYMENT_MODE_CHANGED", "The selected payment mode is no longer available for this rate", 409);
    }

    const legacyRateType = input.rateType?.trim().toUpperCase();
    const requiresLegacyCheckRate = !snapshot && (!legacyRateType || legacyRateType === "RECHECK");
    if (!snapshot && legacyRateType && legacyRateType !== "RECHECK" && legacyRateType !== "BOOKABLE") throw new ApplicationError("HOTELBEDS_RATE_INVALID", "The selected Hotelbeds rate type is invalid", 409);
    const checked = requiresLegacyCheckRate ? await checkHotelbedsRate(input.rateKey, nights, input.hotelCode) : null;
    if (requiresLegacyCheckRate && !checked) throw new ApplicationError("HOTELBEDS_RATE_UNAVAILABLE", "The selected Hotelbeds rate is no longer available", 409);
    if (checked && !checked.offer.paymentModes.includes(input.paymentMode)) throw new ApplicationError("HOTELBEDS_PAYMENT_MODE_CHANGED", "The selected payment mode is no longer available for this rate", 409);

    const quotePaymentModes = input.quotePaymentModes;
    if (!snapshot && !checked && (!input.quoteSignature || !quotePaymentModes?.includes(input.paymentMode) || !verifyHotelbedsQuote({
      hotelCode: input.hotelCode,
      rateKey: input.rateKey,
      rateType: legacyRateType ?? "BOOKABLE",
      arrival: input.arrival,
      departure: input.departure,
      net: input.netAmount,
      sellingRate: input.sellingAmount ?? null,
      total: input.totalAmount,
      currency: input.currency,
      paymentModes: quotePaymentModes ?? [],
      quoteSignature: input.quoteSignature,
    }))) throw new ApplicationError("HOTELBEDS_QUOTE_INVALID", "The selected Hotelbeds quote is no longer valid", 409);

    const trustedOffer = snapshot?.offer ?? checked?.offer ?? null;
    const hotelCode = snapshot?.hotel.providerHotelCode ?? input.hotelCode;
    const catalogHotel = await getHotelbedsContentHotel(hotelCode).catch(() => null);
    const hotelName = catalogHotel?.name ?? snapshot?.hotel.name ?? input.hotelName;
    const city = catalogHotel?.destinationName ?? snapshot?.hotel.city ?? input.city;
    const hotelAddress = catalogHotel?.address ?? snapshot?.hotel.address ?? checked?.hotel.address ?? null;
    if (!hotelAddress) throw new ApplicationError("HOTELBEDS_CONTENT_NOT_READY", "Hotelbeds hotel content is not cached yet; booking is blocked until the mandatory voucher address is available", 503);
    const roomName = trustedOffer?.roomName ?? input.roomName ?? null;
    const boardName = trustedOffer?.boardName ?? trustedOffer?.boardCode ?? input.boardName ?? null;
    const rateType = trustedOffer?.rateType ?? input.rateType ?? null;
    const rateKey = trustedOffer?.rateKey ?? input.rateKey;
    const rate = trustedOffer
      ? {net: trustedOffer.net, sellingRate: trustedOffer.sellingRate, total: trustedOffer.total, currency: trustedOffer.currency}
      : {net: input.netAmount, sellingRate: input.sellingAmount ?? null, total: input.totalAmount, currency: input.currency};
    const cancellationPolicy = trustedOffer?.cancellationPolicy ?? input.cancellationPolicy ?? null;

    const pending = await database().apiBooking.create({data: {
      reference,
      clientReference,
      hotelCode,
      hotelName,
      city,
      roomName,
      boardName,
      rateType,
      rateKey,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      phone: input.phone ?? null,
      arrival: new Date(`${input.arrival}T00:00:00.000Z`),
      departure: new Date(`${input.departure}T00:00:00.000Z`),
      adults: input.adults,
      children: input.children,
      childrenAges: input.childrenAges,
      currency: rate.currency,
      netAmount: rate.net,
      sellingAmount: rate.sellingRate,
      markupAmount: Math.max(0, rate.total - rate.net),
      totalAmount: rate.total,
      paymentMode: input.paymentMode,
      paymentState: input.paymentMode === "PAY_NOW" ? "PENDING" : "NOT_REQUIRED",
      status: "PENDING",
      cancellationPolicy: jsonSafe(cancellationPolicy),
      providerRequest: jsonSafe({
        hotelCode,
        rateKey,
        clientReference,
        checked: snapshot?.checked ?? Boolean(checked),
        sourceRateType: snapshot?.sourceRateType ?? legacyRateType ?? null,
        hotelAddress,
        rateComments: snapshot?.rateComments ?? null,
      }),
      providerResponse: checked ? jsonSafe(checked.raw) : null,
    }});
    pendingId = pending.id;

    if (input.paymentMode === "PAY_NOW") {
      const payment = await initiateApiBookingPayment(pending.id);
      const current = await database().apiBooking.findUnique({where: {id: pending.id}});
      return {...apiBookingView(current ?? pending), payment};
    }

    const result = await bookHotelbeds({
      rateKey,
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
      rateKey,
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
    const failure = error instanceof ApplicationError
      ? error
      : error instanceof HotelbedsConfigurationError
        ? new ApplicationError("HOTELBEDS_NOT_CONFIGURED", "Hotelbeds API is not configured for this deployment", 503)
        : new ApplicationError("HOTELBEDS_BOOKING_FAILED", "Hotelbeds could not confirm this booking", 502);
    if (pendingId) await database().apiBooking.update({where: {id: pendingId}, data: {status: "FAILED", errorCode: failure.code, errorMessage: failure.message}}).catch((updateError) => console.error("Could not record API booking failure", updateError));
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

export async function simulateApiBookingCancellation(userId: string, id: string) {
  await requirePlatformAdmin(userId);
  const booking = await database().apiBooking.findUnique({where: {id}});
  if (!booking) throw new ApplicationError("API_BOOKING_NOT_FOUND", "Hotelbeds booking was not found", 404);
  if (!booking.providerReference) throw new ApplicationError("HOTELBEDS_REFERENCE_MISSING", "Hotelbeds booking reference is missing", 409);
  if (booking.status === "CANCELLED") throw new ApplicationError("API_BOOKING_ALREADY_CANCELLED", "This Hotelbeds booking is already cancelled", 409);
  await getHotelbedsBookingDetail(booking.providerReference);
  const simulation = await simulateHotelbedsBookingCancellation(booking.providerReference);
  return {booking: apiBookingView(booking), simulation: {reference: simulation.reference, status: simulation.status, currency: simulation.currency, amount: simulation.amount}};
}

export async function cancelApiBooking(userId: string, id: string) {
  await requirePlatformAdmin(userId);
  const booking = await database().apiBooking.findUnique({where: {id}});
  if (!booking) throw new ApplicationError("API_BOOKING_NOT_FOUND", "Hotelbeds booking was not found", 404);
  if (!booking.providerReference) throw new ApplicationError("HOTELBEDS_REFERENCE_MISSING", "Hotelbeds booking reference is missing", 409);
  if (booking.status === "CANCELLED") return apiBookingView(booking);

  // Retrieve first to verify the provider reference, then simulate charges before
  // committing the cancellation. The calling admin UI must show/accept simulation.
  await getHotelbedsBookingDetail(booking.providerReference);
  const simulation = await simulateHotelbedsBookingCancellation(booking.providerReference);
  const result = await cancelHotelbedsBooking(booking.providerReference);
  const status = result.status?.trim().toUpperCase();
  if (status && status !== "CANCELLED" && status !== "CANCELED") throw new ApplicationError("HOTELBEDS_CANCELLATION_NOT_CONFIRMED", "Hotelbeds did not confirm the cancellation", 502);

  const updated = await database().apiBooking.update({where: {id}, data: {
    status: "CANCELLED",
    cancelledAt: new Date(),
    providerResponse: jsonSafe({booking: booking.providerResponse, cancellationSimulation: simulation.raw, cancellation: result.raw}),
    errorCode: null,
    errorMessage: null,
  }});
  return apiBookingView(updated);
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

function snapshotMatchesInput(snapshot: NonNullable<ReturnType<typeof readHotelbedsCheckoutToken>>, input: ApiBookingInput): boolean {
  if (snapshot.hotel.providerHotelCode !== input.hotelCode || snapshot.offer.rateKey !== input.rateKey) return false;
  if (snapshot.stay.arrival !== input.arrival || snapshot.stay.departure !== input.departure || snapshot.stay.adults !== input.adults || snapshot.stay.children !== input.children) return false;
  const expectedAges = [...snapshot.stay.childrenAges];
  return expectedAges.length === input.childrenAges.length && expectedAges.every((age, index) => age === input.childrenAges[index]);
}

function holderFirstName(value: string): string { return value.trim().split(/\s+/)[0] ?? value.trim(); }
function holderSurname(value: string): string { const parts = value.trim().split(/\s+/); return parts.slice(1).join(" ") || parts[0] || "Guest"; }
function dateKey(value: Date): string { return value.toISOString().slice(0, 10); }
function jsonSafe(value: unknown) { return value === undefined ? null : JSON.parse(JSON.stringify(value)); }
