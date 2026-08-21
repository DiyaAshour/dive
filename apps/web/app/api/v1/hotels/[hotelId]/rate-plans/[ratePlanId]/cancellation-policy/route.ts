import { updateCancellationPolicySchema } from "@platform/contracts";
import { updateRatePlanCancellationPolicy } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";
import type { NextRequest } from "next/server";

export async function PUT(request: NextRequest, {params}:{params:Promise<{hotelId:string;ratePlanId:string}>}) {
  try {
    const {hotelId, ratePlanId} = await params;
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const body = updateCancellationPolicySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return validationError(body.error);
    return ok(await updateRatePlanCancellationPolicy(user.id, hotelId, ratePlanId, body.data));
  } catch (error) {
    return handleApiError(error);
  }
}
