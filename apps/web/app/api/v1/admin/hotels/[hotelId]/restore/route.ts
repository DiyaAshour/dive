import type { NextRequest } from "next/server";
import { restoreSuspendedProperty } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestAdminUser } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const {hotelId} = await params;
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    return ok(await restoreSuspendedProperty(user.id, hotelId));
  } catch (error) {
    return handleApiError(error);
  }
}
