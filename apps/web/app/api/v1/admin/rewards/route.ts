import type {NextRequest} from "next/server";
import {loyaltyProgramSettingsSchema} from "@platform/contracts";
import {getAdminRewardsControlCenter, updateAdminRewardsProgram} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() || undefined;
    const userId = url.searchParams.get("userId")?.trim() || undefined;
    return ok(await getAdminRewardsControlCenter(user.id, {search, userId}));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const parsed = loyaltyProgramSettingsSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    return ok(await updateAdminRewardsProgram(user.id, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}

function unauthorized() {
  return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
}
