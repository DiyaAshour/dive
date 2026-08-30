import {getSessionUser, testHotelConnectivity, unauthorized} from "@platform/server";
import {NextRequest} from "next/server";
import {handleApiError, ok} from "@/lib/api";
import {readSessionToken} from "@/lib/session";

export async function POST(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await getSessionUser(readSessionToken(request));
    if (!user) unauthorized();
    const {hotelId} = await params;
    return ok(await testHotelConnectivity(user.id, hotelId));
  } catch (error) { return handleApiError(error); }
}
