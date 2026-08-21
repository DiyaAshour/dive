import { database } from "@platform/database";
import { forbidden, notFound, unauthorized } from "../errors";
import { requireHotelPermission } from "../hotels/authorization";
import { bookingAccessTokenHash } from "./security";

export async function requireBookingAccess(
  bookingId: string,
  context: Readonly<{userId?: string | null; accessToken?: string | null}>,
) {
  const booking = await database().booking.findUnique({where: {id: bookingId}});
  if (!booking) notFound("Booking");

  if (context.accessToken && booking.accessTokenHash === bookingAccessTokenHash(context.accessToken)) return booking;
  if (!context.userId) unauthorized("Booking access token or authenticated user required");
  if (booking.userId && booking.userId === context.userId) return booking;

  try {
    await requireHotelPermission(context.userId, booking.hotelId, "bookings:manage");
    return booking;
  } catch {
    forbidden("You cannot manage this booking");
  }
}
