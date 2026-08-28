import type {NextRequest} from "next/server";
import {idempotencyKeySchema} from "@platform/contracts";
import {cancelHotelReservation, queueBookingLifecycleEmails} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {idempotencyKey, requestUser} from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{hotelId: string; bookingId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const parsedKey = idempotencyKeySchema.safeParse(idempotencyKey(request));
    if (!parsedKey.success) return validationError(parsedKey.error);
    const {hotelId, bookingId} = await params;
    const booking = await cancelHotelReservation(user.id, hotelId, bookingId, parsedKey.data);
    await queueBookingLifecycleEmails(bookingId, "CANCELLED").catch((error) => console.error("[booking-email] partner cancellation queue failed", error));
    return ok(booking);
  } catch (error) {
    return handleApiError(error);
  }
}
