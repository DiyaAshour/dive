import { completeCarVehiclePhotoUpload } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function POST(request: Request, {params}: {params: Promise<{vehicleId: string; mediaId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const {vehicleId, mediaId} = await params;
    return ok(await completeCarVehiclePhotoUpload(user.id, vehicleId, mediaId));
  } catch (error) {
    return handleApiError(error);
  }
}
