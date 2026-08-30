import type {NextRequest} from "next/server";
import {createSiteAssetUpload, siteAssetUploadSpecs} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    return ok(siteAssetUploadSpecs());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({data:null,error:{code:"INVALID_REQUEST",message:"A site asset payload is required"}},{status:400});
    }
    return ok(await createSiteAssetUpload(user.id, body as Parameters<typeof createSiteAssetUpload>[1]));
  } catch (error) {
    return handleApiError(error);
  }
}

function unauthorized() {
  return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
}
