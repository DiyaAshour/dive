import {database} from "@platform/database";
import {ApplicationError} from "../errors";
import {bookHotelbeds, HotelbedsConfigurationError} from "../hotelbeds/client";

export async function confirmApiBookingAfterPayment(apiBookingId: string) {
  const booking = await database().apiBooking.findUnique({where: {id: apiBookingId}});
  if (!booking) throw new ApplicationError("API_BOOKING_NOT_FOUND", "API booking was not found", 404);
  if (booking.status === "CONFIRMED") return booking;
  if (booking.paymentMode !== "PAY_NOW" || booking.paymentState !== "CAPTURED") {
    throw new ApplicationError("API_PAYMENT_NOT_CAPTURED", "The API booking payment has not been captured", 409);
  }
  if (booking.providerReference) {
    return database().apiBooking.update({where: {id: booking.id}, data: {status: "CONFIRMED", confirmedAt: booking.confirmedAt ?? new Date(), errorCode: null, errorMessage: null}});
  }

  try {
    const result = await bookHotelbeds({
      rateKey: booking.rateKey,
      adults: booking.adults,
      holderName: holderFirstName(booking.guestName),
      holderSurname: holderSurname(booking.guestName),
      email: booking.guestEmail,
      ...(booking.phone ? {phone: booking.phone} : {}),
      clientReference: booking.clientReference,
      childrenAges: childAges(booking.childrenAges),
    });
    if (!result.providerReference) throw new ApplicationError("HOTELBEDS_REFERENCE_MISSING", "Hotelbeds did not return a booking reference", 502);
    return database().apiBooking.update({where: {id: booking.id}, data: {
      status: "CONFIRMED",
      providerReference: result.providerReference,
      providerResponse: jsonSafe(result.raw),
      confirmedAt: new Date(),
      errorCode: null,
      errorMessage: null,
    }});
  } catch (error) {
    const failure = error instanceof ApplicationError
      ? error
      : error instanceof HotelbedsConfigurationError
        ? new ApplicationError("HOTELBEDS_NOT_CONFIGURED", "Hotelbeds API is not configured for this deployment", 503)
        : new ApplicationError("HOTELBEDS_POST_PAYMENT_FAILED", "Hotelbeds could not confirm this paid booking", 502);
    await database().apiBooking.updateMany({where: {id: booking.id, status: {not: "CONFIRMED"}}, data: {status: "FAILED", errorCode: failure.code, errorMessage: failure.message}}).catch((updateError) => console.error("Could not record paid API booking failure", updateError));
    throw failure;
  }
}

function childAges(value: unknown): number[] {
  return Array.isArray(value) ? value.map(Number).filter((age) => Number.isInteger(age) && age >= 0 && age <= 17) : [];
}

function holderFirstName(value: string): string { return value.trim().split(/\s+/)[0] ?? value.trim(); }
function holderSurname(value: string): string { const parts = value.trim().split(/\s+/); return parts.slice(1).join(" ") || parts[0] || "Guest"; }
function jsonSafe(value: unknown) { return value === undefined ? null : JSON.parse(JSON.stringify(value)); }
