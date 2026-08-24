import type {NextRequest} from "next/server";
import {updatePlatformHotelSchema} from "@platform/contracts";
import {getPlatformHotel, updatePlatformHotel} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

function unauthorized() {
  return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
}

export async function GET(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    return ok(await getPlatformHotel(user.id, (await params).hotelId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const parsed = updatePlatformHotelSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    return ok(await updatePlatformHotel(user.id, (await params).hotelId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
