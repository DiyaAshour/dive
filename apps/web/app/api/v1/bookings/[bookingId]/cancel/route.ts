import type { NextRequest } from "next/server";
import { idempotencyKeySchema } from "@platform/contracts";
import { cancelBooking } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { bookingAccessContext, idempotencyKey } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const {bookingId} = await params;
    const parsedKey = idempotencyKeySchema.safeParse(idempotencyKey(request));
    if (!parsedKey.success) return validationError(parsedKey.error);
    return ok(await cancelBooking(bookingId, parsedKey.data, await bookingAccessContext(request)));
  } catch (error) {
    return handleApiError(error);
  }
}
