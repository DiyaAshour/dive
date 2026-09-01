import { CAR_PHOTO_CATEGORIES, createCarVehiclePhotoUpload, listCarVehicleMedia } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(request: Request, {params}: {params: Promise<{vehicleId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const {vehicleId} = await params;
    return ok(await listCarVehicleMedia(user.id, vehicleId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, {params}: {params: Promise<{vehicleId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const {vehicleId} = await params;
    const body = await request.json() as Record<string, unknown>;
    const fileName = typeof body.fileName === "string" ? body.fileName : "";
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const sizeBytes = typeof body.sizeBytes === "number" ? body.sizeBytes : Number(body.sizeBytes);
    const category = typeof body.category === "string" ? body.category : "OTHER";
    const alt = typeof body.alt === "string" ? body.alt : undefined;
    if (!IMAGE_TYPES.has(contentType) || !CAR_PHOTO_CATEGORIES.includes(category as (typeof CAR_PHOTO_CATEGORIES)[number])) {
      return Response.json({data: null, error: {code: "INVALID_CAR_PHOTO", message: "Invalid vehicle image type or category"}}, {status: 400});
    }
    const input = {fileName, contentType, sizeBytes, category, alt} as Parameters<typeof createCarVehiclePhotoUpload>[2];
    return ok(await createCarVehiclePhotoUpload(user.id, vehicleId, input), {status: 201});
  } catch (error) {
    return handleApiError(error);
  }
}
