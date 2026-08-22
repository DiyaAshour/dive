import { revokeAccountSession } from "@platform/server";
import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";
import { readSessionToken } from "@/lib/session";

export async function DELETE(request: NextRequest, {params}: {params: Promise<{sessionId:string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const {sessionId} = await params;
    return ok(await revokeAccountSession(user.id, sessionId, readSessionToken(request)));
  } catch (error) { return handleApiError(error); }
}
