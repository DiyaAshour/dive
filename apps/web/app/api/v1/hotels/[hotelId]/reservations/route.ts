import type {NextRequest} from "next/server";
import {reservationCenterQuerySchema} from "@platform/contracts";
import {listHotelReservationCenter} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {requestUser} from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const {hotelId} = await params;
    const parsed = reservationCenterQuerySchema.safeParse({
      date: request.nextUrl.searchParams.get("date"),
      scope: request.nextUrl.searchParams.get("scope") ?? "ALL",
      q: request.nextUrl.searchParams.get("q") ?? "",
    });
    if (!parsed.success) return validationError(parsed.error);
    return ok(await listHotelReservationCenter(user.id, hotelId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
