import type { NextRequest } from "next/server";
import { listHotelMediaWithCategories } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const {hotelId} = await params;
    return ok(await listHotelMediaWithCategories(user.id, hotelId));
  } catch (error) {
    return handleApiError(error);
  }
}
