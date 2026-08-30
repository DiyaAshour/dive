import type {NextRequest} from "next/server";
import {completeSiteAssetUpload} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const body = await request.json().catch(() => null) as {assetKey?: unknown} | null;
    if (!body || typeof body.assetKey !== "string") {
      return Response.json({data:null,error:{code:"INVALID_REQUEST",message:"assetKey is required"}},{status:400});
    }
    return ok(await completeSiteAssetUpload(user.id, body.assetKey));
  } catch (error) {
    return handleApiError(error);
  }
}

function unauthorized() {
  return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
}
