import type {NextRequest} from "next/server";
import {idempotencyKeySchema, modifyBookingSchema} from "@platform/contracts";
import {getHotelReservationDetail, modifyHotelReservation, queueBookingLifecycleEmails} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {idempotencyKey, requestUser} from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{hotelId: string; bookingId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const {hotelId, bookingId} = await params;
    return ok(await getHotelReservationDetail(user.id, hotelId, bookingId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, {params}: {params: Promise<{hotelId: string; bookingId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const parsed = modifyBookingSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const parsedKey = idempotencyKeySchema.safeParse(idempotencyKey(request));
    if (!parsedKey.success) return validationError(parsedKey.error);
    const {hotelId, bookingId} = await params;
    const booking = await modifyHotelReservation(user.id, hotelId, bookingId, parsed.data, parsedKey.data);
    await queueBookingLifecycleEmails(bookingId, "MODIFIED").catch((error) => console.error("[booking-email] partner modification queue failed", error));
    return ok(booking);
  } catch (error) {
    return handleApiError(error);
  }
}
