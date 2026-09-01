import { CAR_PHOTO_CATEGORIES, deleteCarVehiclePhoto, updateCarVehiclePhoto } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

type Category = (typeof CAR_PHOTO_CATEGORIES)[number];
type MutablePhotoUpdate = {category?: Category; alt?: string | null; sortOrder?: number; isPrimary?: boolean};

export async function PATCH(request: Request, {params}: {params: Promise<{vehicleId: string; mediaId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const {vehicleId, mediaId} = await params;
    const body = await request.json() as Record<string, unknown>;
    const input: MutablePhotoUpdate = {};
    if (typeof body.category === "string") {
      if (!CAR_PHOTO_CATEGORIES.includes(body.category as Category)) {
        return Response.json({data: null, error: {code: "CAR_PHOTO_CATEGORY_INVALID", message: "Invalid vehicle photo category"}}, {status: 400});
      }
      input.category = body.category as Category;
    }
    if (body.alt === null || typeof body.alt === "string") input.alt = body.alt as string | null;
    if (body.sortOrder !== undefined) input.sortOrder = Number(body.sortOrder);
    if (typeof body.isPrimary === "boolean") input.isPrimary = body.isPrimary;
    return ok(await updateCarVehiclePhoto(user.id, vehicleId, mediaId, input));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, {params}: {params: Promise<{vehicleId: string; mediaId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const {vehicleId, mediaId} = await params;
    return ok(await deleteCarVehiclePhoto(user.id, vehicleId, mediaId));
  } catch (error) {
    return handleApiError(error);
  }
}
