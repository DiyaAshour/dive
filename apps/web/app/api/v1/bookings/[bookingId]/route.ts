import type { NextRequest } from "next/server";
import { idempotencyKeySchema, modifyBookingSchema } from "@platform/contracts";
import { bookingView, modifyBooking, requireBookingAccess } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { bookingToken, idempotencyKey, requestUser } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const {bookingId} = await params;
    const user = await requestUser(request);
    await requireBookingAccess(bookingId, {userId: user?.id, accessToken: bookingToken(request)});
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
    const user = await requestUser(request);
    return ok(await modifyBooking(bookingId, parsed.data, parsedKey.data, {userId: user?.id, accessToken: bookingToken(request)}));
  } catch (error) {
    return handleApiError(error);
  }
}
