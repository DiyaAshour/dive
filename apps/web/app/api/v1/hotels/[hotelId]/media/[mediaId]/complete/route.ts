import type { NextRequest } from "next/server";
import { completeMediaUpload } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{hotelId: string; mediaId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const {hotelId, mediaId} = await params;
    return ok(await completeMediaUpload(user.id, hotelId, mediaId));
  } catch (error) {
    return handleApiError(error);
  }
}
