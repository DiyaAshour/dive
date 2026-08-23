import type { NextRequest } from "next/server";
import { idempotencyKeySchema, modifyBookingSchema } from "@platform/contracts";
import { bookingView, modifyBooking, requireBookingAccess } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { bookingAccessContext, idempotencyKey } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const {bookingId} = await params;
    await requireBookingAccess(bookingId, await bookingAccessContext(request));
    return ok(await bookingView(bookingId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const {bookingId} = await params;
    const parsed = modifyBookingSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const parsedKey = idempotencyKeySchema.safeParse(idempotencyKey(request));
    if (!parsedKey.success) return validationError(parsedKey.error);
    return ok(await modifyBooking(bookingId, parsed.data, parsedKey.data, await bookingAccessContext(request)));
  } catch (error) {
    return handleApiError(error);
  }
}
