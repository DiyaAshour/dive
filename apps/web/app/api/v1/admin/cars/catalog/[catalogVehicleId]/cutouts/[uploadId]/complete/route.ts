import { NextRequest } from "next/server";
import { completeCarCatalogCutoutUpload } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestAdminUser } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{catalogVehicleId:string;uploadId:string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}}, {status:401});
    const {catalogVehicleId, uploadId} = await params;
    return ok(await completeCarCatalogCutoutUpload(user.id, catalogVehicleId, uploadId));
  } catch (error) {
    return handleApiError(error);
  }
}
