import type { NextRequest } from "next/server";
import { idempotencyKeySchema } from "@platform/contracts";
import { confirmBooking } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { bookingToken, idempotencyKey, requestUser } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const {bookingId} = await params;
    const parsedKey = idempotencyKeySchema.safeParse(idempotencyKey(request));
    if (!parsedKey.success) return validationError(parsedKey.error);
    const user = await requestUser(request);
    return ok(await confirmBooking(bookingId, parsedKey.data, {userId: user?.id, accessToken: bookingToken(request)}));
  } catch (error) {
    return handleApiError(error);
  }
}
