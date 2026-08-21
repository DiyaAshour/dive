import type { NextRequest } from "next/server";
import { getPublishingReadiness, submitPropertyForReview } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const {hotelId} = await params;
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    return ok(await getPublishingReadiness(user.id, hotelId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const {hotelId} = await params;
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    return ok(await submitPropertyForReview(user.id, hotelId), {status: 201});
  } catch (error) {
    return handleApiError(error);
  }
}
