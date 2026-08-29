import type { NextRequest } from "next/server";
import { updateHotelPhotoSchema } from "@platform/contracts";
import { deleteHotelMediaWithCategory, updateHotelPhotoWithCategory } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function PATCH(request: NextRequest, {params}: {params: Promise<{hotelId: string; mediaId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const parsed = updateHotelPhotoSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId, mediaId} = await params;
    return ok(await updateHotelPhotoWithCategory(user.id, hotelId, mediaId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, {params}: {params: Promise<{hotelId: string; mediaId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const {hotelId, mediaId} = await params;
    return ok(await deleteHotelMediaWithCategory(user.id, hotelId, mediaId));
  } catch (error) {
    return handleApiError(error);
  }
}
