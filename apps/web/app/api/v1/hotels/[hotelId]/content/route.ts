import type { NextRequest } from "next/server";
import { updateHotelPublicContentSchema } from "@platform/contracts";
import { getHotelPublicContentForManagement, updateHotelPublicContent } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const {hotelId} = await params;
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    return ok(await getHotelPublicContentForManagement(user.id, hotelId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const {hotelId} = await params;
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const parsed = updateHotelPublicContentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    await updateHotelPublicContent(user.id, hotelId, parsed.data);
    return ok(await getHotelPublicContentForManagement(user.id, hotelId));
  } catch (error) {
    return handleApiError(error);
  }
}
