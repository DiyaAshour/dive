import { database } from "@platform/database";
import { notFound } from "../errors";

export type BookingStayPhase = "HOLD" | "UPCOMING" | "ARRIVAL_DAY" | "IN_STAY" | "COMPLETED" | "CLOSED";

export async function getBookingExperienceContext(bookingId: string) {
  const booking = await database().booking.findUnique({
    where: {id: bookingId},
    select: {
      userId: true,
      status: true,
      arrival: true,
      departure: true,
      expectedArrivalTime: true,
      arrivalStatus: true,
      hotel: {
        select: {
          city: true,
          countryCode: true,
          address: true,
          checkInTime: true,
          checkOutTime: true,
          timezone: true,
        },
      },
    },
  });
  if (!booking) notFound("Booking");

  const arrival = dateKey(booking.arrival);
  const departure = dateKey(booking.departure);
  const today = dateInTimeZone(new Date(), booking.hotel.timezone);

  return {
    hotel: booking.hotel,
    account: {linked: booking.userId !== null},
    arrivalInfo: {
      expectedArrivalTime: booking.expectedArrivalTime,
      status: booking.arrivalStatus,
    },
    today,
    stayPhase: stayPhase(booking.status, today, arrival, departure),
  } as const;
}

function stayPhase(status: string, today: string, arrival: string, departure: string): BookingStayPhase {
  if (status === "CANCELLED" || status === "NO_SHOW" || status === "EXPIRED") return "CLOSED";
  if (status === "HOLD") return "HOLD";
  if (today < arrival) return "UPCOMING";
  if (today === arrival) return "ARRIVAL_DAY";
  if (today < departure) return "IN_STAY";
  return "COMPLETED";
}

function dateInTimeZone(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    if (values.year && values.month && values.day) return `${values.year}-${values.month}-${values.day}`;
  } catch {
    // Fall back to UTC if a property has an invalid legacy timezone value.
  }
  return date.toISOString().slice(0, 10);
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
