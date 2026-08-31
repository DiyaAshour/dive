import type { NextRequest } from "next/server";
import { idempotencyKeySchema } from "@platform/contracts";
import { cancelBookingWithWallet, queueBookingLifecycleEmails, withBookingConcurrencyRetry } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { bookingAccessContext, idempotencyKey } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const {bookingId} = await params;
    const parsedKey = idempotencyKeySchema.safeParse(idempotencyKey(request));
    if (!parsedKey.success) return validationError(parsedKey.error);
    const access = await bookingAccessContext(request);
    const booking = await withBookingConcurrencyRetry(() => cancelBookingWithWallet(bookingId, parsedKey.data, access));
    await queueBookingLifecycleEmails(bookingId, "CANCELLED").catch((error) => console.error("[booking-email] cancellation queue failed", error));
    return ok(booking);
  } catch (error) {
    return handleApiError(error);
  }
}
