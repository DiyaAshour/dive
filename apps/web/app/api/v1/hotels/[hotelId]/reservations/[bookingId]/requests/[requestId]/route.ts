import type { NextRequest } from "next/server";
import { updateGuestRequestStatusSchema } from "@platform/contracts";
import { updateGuestRequestStatus } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function PATCH(request: NextRequest, {params}: {params: Promise<{hotelId:string;bookingId:string;requestId:string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed = updateGuestRequestStatusSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId, bookingId, requestId} = await params;
    return ok(await updateGuestRequestStatus(user.id, hotelId, bookingId, requestId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
