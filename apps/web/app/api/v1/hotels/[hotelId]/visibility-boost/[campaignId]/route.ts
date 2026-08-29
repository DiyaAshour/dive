import type { NextRequest } from "next/server";
import { visibilityBoostCampaignSchema } from "@platform/contracts";
import { updateHotelVisibilityBoostCampaign } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function PUT(request: NextRequest, {params}: {params: Promise<{hotelId: string; campaignId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed = visibilityBoostCampaignSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId, campaignId} = await params;
    return ok(await updateHotelVisibilityBoostCampaign(user.id, hotelId, campaignId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
