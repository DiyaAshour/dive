import { listAccountSessions } from "@platform/server";
import { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";
import { readSessionToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    return ok(await listAccountSessions(user.id, readSessionToken(request)));
  } catch (error) { return handleApiError(error); }
}
