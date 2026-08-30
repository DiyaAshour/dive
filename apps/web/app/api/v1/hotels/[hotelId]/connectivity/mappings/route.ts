import {getSessionUser, unauthorized, updateHotelConnectivityMappings} from "@platform/server";
import {NextRequest} from "next/server";
import {handleApiError, ok} from "@/lib/api";
import {readSessionToken} from "@/lib/session";

export async function PUT(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await getSessionUser(readSessionToken(request));
    if (!user) unauthorized();
    const {hotelId} = await params;
    const body = await request.json() as {roomMappings?: Array<{localId?: unknown; externalCode?: unknown}>; ratePlanMappings?: Array<{localId?: unknown; externalCode?: unknown}>};
    const normalize = (rows: Array<{localId?: unknown; externalCode?: unknown}> | undefined) => (rows ?? []).map((row) => ({localId: String(row.localId ?? ""), externalCode: String(row.externalCode ?? "")}));
    const connection = await updateHotelConnectivityMappings(user.id, hotelId, {
      roomMappings: normalize(body.roomMappings),
      ratePlanMappings: normalize(body.ratePlanMappings),
    });
    return ok({connection});
  } catch (error) { return handleApiError(error); }
}
