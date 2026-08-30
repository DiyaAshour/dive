import {getHotelConnectivityWorkspace, getSessionUser, disconnectHotelConnectivity, unauthorized} from "@platform/server";
import {NextRequest} from "next/server";
import {handleApiError, ok} from "@/lib/api";
import {readSessionToken} from "@/lib/session";

export async function GET(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await getSessionUser(readSessionToken(request));
    if (!user) unauthorized();
    const {hotelId} = await params;
    return ok(await getHotelConnectivityWorkspace(user.id, hotelId));
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await getSessionUser(readSessionToken(request));
    if (!user) unauthorized();
    const {hotelId} = await params;
    return ok(await disconnectHotelConnectivity(user.id, hotelId));
  } catch (error) { return handleApiError(error); }
}
