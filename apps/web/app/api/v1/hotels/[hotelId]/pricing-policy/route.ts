import { updatePricingPolicyRequestSchema } from "@platform/contracts";
import { getSessionUser, unauthorized, updateHotelPricingPolicy } from "@platform/server";
import { NextRequest } from "next/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export async function PUT(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await getSessionUser(readSessionToken(request));
    if (!user) unauthorized();
    const parsed = updatePricingPolicyRequestSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId} = await params;
    return ok({pricingPolicy: await updateHotelPricingPolicy(user.id, hotelId, parsed.data)});
  } catch (error) { return handleApiError(error); }
}
