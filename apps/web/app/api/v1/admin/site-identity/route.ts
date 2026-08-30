import type {NextRequest} from "next/server";
import {getPlatformAccessControl, getSiteIdentityConfig, updateSiteIdentityConfig} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const [config, access] = await Promise.all([
      getSiteIdentityConfig(),
      getPlatformAccessControl(user.id),
    ]);
    return ok({config, owner: access.owner, isOwner: access.actor.isOwner});
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({data:null,error:{code:"INVALID_REQUEST",message:"A site identity payload is required"}},{status:400});
    }
    return ok(await updateSiteIdentityConfig(user.id, body as Parameters<typeof updateSiteIdentityConfig>[1]));
  } catch (error) {
    return handleApiError(error);
  }
}

function unauthorized() {
  return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
}
