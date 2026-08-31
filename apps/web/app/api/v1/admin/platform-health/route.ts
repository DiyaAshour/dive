import type {NextRequest} from "next/server";
import {platformOperationalHealth} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    return ok(await platformOperationalHealth());
  } catch (error) {
    return handleApiError(error);
  }
}
