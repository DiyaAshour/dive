import type { NextRequest } from "next/server";
import { updatePromotionStatusSchema } from "@platform/contracts";
import { updateHotelPromotionStatus } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function PATCH(request: NextRequest, {params}: {params: Promise<{hotelId: string; promotionId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed = updatePromotionStatusSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId, promotionId} = await params;
    return ok(await updateHotelPromotionStatus(user.id, hotelId, promotionId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
