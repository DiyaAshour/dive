import type { NextRequest } from "next/server";
import { staffArrivalInputSchema } from "@platform/contracts";
import { updateHotelArrival } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function PATCH(request: NextRequest, {params}: {params: Promise<{hotelId: string; bookingId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed = staffArrivalInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId, bookingId} = await params;
    return ok(await updateHotelArrival(user.id, hotelId, bookingId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
