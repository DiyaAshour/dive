import type {NextRequest} from "next/server";
import {updateRoomTypeRequestSchema} from "@platform/contracts";
import {updateRoomType} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {requestUser} from "@/lib/request-auth";

export async function PATCH(request: NextRequest, {params}: {params: Promise<{hotelId: string; roomTypeId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const parsed = updateRoomTypeRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId, roomTypeId} = await params;
    return ok({roomType: await updateRoomType(user.id, hotelId, roomTypeId, parsed.data)});
  } catch (error) {
    return handleApiError(error);
  }
}
