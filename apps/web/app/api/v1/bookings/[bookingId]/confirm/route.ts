import type { NextRequest } from "next/server";
import { idempotencyKeySchema } from "@platform/contracts";
import { confirmBooking, queueBookingLifecycleEmails } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { bookingAccessContext, idempotencyKey } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const {bookingId} = await params;
    const parsedKey = idempotencyKeySchema.safeParse(idempotencyKey(request));
    if (!parsedKey.success) return validationError(parsedKey.error);
    const booking = await confirmBooking(bookingId, parsedKey.data, await bookingAccessContext(request));
    await queueBookingLifecycleEmails(bookingId, "CONFIRMED").catch((error) => console.error("[booking-email] confirm queue failed", error));
    return ok(booking);
  } catch (error) {
    return handleApiError(error);
  }
}
