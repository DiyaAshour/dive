import type {NextRequest} from "next/server";
import {getPlatformExperiment} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{key:string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const {key} = await params;
    return ok(await getPlatformExperiment(user.id, decodeURIComponent(key)));
  } catch (error) {
    return handleApiError(error);
  }
}
