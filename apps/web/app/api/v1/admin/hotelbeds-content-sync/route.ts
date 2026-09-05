import type {NextRequest} from "next/server";
import {requirePlatformAdmin, syncHotelbedsContentCatalog} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestUser} from "@/lib/request-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    await requirePlatformAdmin(user.id);
    return ok(await syncHotelbedsContentCatalog());
  } catch (error) {
    return handleApiError(error);
  }
}
