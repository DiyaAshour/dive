import type {NextRequest} from "next/server";
import {revokePlatformManagedUserSession} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function DELETE(request: NextRequest, {params}: {params: Promise<{userId:string;sessionId:string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const {userId, sessionId} = await params;
    return ok(await revokePlatformManagedUserSession(user.id, userId, sessionId));
  } catch (error) {
    return handleApiError(error);
  }
}

function unauthorized() {
  return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
}
