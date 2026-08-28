import type {NextRequest} from "next/server";
import {previewHotelReservationCancellation} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestUser} from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{hotelId: string; bookingId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const {hotelId, bookingId} = await params;
    return ok(await previewHotelReservationCancellation(user.id, hotelId, bookingId));
  } catch (error) {
    return handleApiError(error);
  }
}
