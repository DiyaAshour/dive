import type {NextRequest} from "next/server";
import {listPlatformManagedUserSessions, revokePlatformManagedUserSessions} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{userId:string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const {userId} = await params;
    return ok(await listPlatformManagedUserSessions(user.id, userId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, {params}: {params: Promise<{userId:string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const {userId} = await params;
    return ok(await revokePlatformManagedUserSessions(user.id, userId));
  } catch (error) {
    return handleApiError(error);
  }
}

function unauthorized() {
  return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
}
