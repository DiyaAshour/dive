import { database } from "@platform/database";
import { requireBookingAccess } from "../bookings/authorization";
import { notFound } from "../errors";
import type { OperationsBookingAccess } from "./service";

export async function getGuestArrival(bookingId: string, context: OperationsBookingAccess) {
  await requireBookingAccess(bookingId, context);
  const booking = await database().booking.findUnique({
    where: {id: bookingId},
    select: {id: true, status: true, expectedArrivalTime: true, arrivalStatus: true},
  });
  if (!booking) notFound("Booking");
  return booking;
}
