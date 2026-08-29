import type { NextRequest } from "next/server";
import { idempotencyKeySchema } from "@platform/contracts";
import { ApplicationError, confirmBooking, queueBookingLifecycleEmails } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { demoBookingView } from "@/lib/demo-booking";
import { bookingAccessContext, bookingToken, idempotencyKey } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const {bookingId} = await params;
    const parsedKey = idempotencyKeySchema.safeParse(idempotencyKey(request));
    if (!parsedKey.success) return validationError(parsedKey.error);

    if (bookingId.startsWith("demo-booking-")) {
      const booking = await demoBookingView(bookingId, bookingToken(request));
      if (!booking) throw new ApplicationError("INVALID_BOOKING_ACCESS", "Demo reservation access expired or is invalid", 401);
      return ok(booking);
    }

    const booking = await confirmBooking(bookingId, parsedKey.data, await bookingAccessContext(request));
    await queueBookingLifecycleEmails(bookingId, "CONFIRMED").catch((error) => console.error("[booking-email] confirm queue failed", error));
    return ok(booking);
  } catch (error) {
    return handleApiError(error);
  }
}
