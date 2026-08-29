import type { NextRequest } from "next/server";
import { visibilityBoostCampaignSchema } from "@platform/contracts";
import { createHotelVisibilityBoostCampaign, listHotelVisibilityBoostCampaigns } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const {hotelId} = await params;
    return ok(await listHotelVisibilityBoostCampaigns(user.id, hotelId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed = visibilityBoostCampaignSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId} = await params;
    return ok(await createHotelVisibilityBoostCampaign(user.id, hotelId, parsed.data), {status: 201});
  } catch (error) {
    return handleApiError(error);
  }
}
