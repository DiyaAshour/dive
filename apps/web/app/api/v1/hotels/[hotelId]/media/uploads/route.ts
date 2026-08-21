import type { NextRequest } from "next/server";
import { createMediaUploadSchema } from "@platform/contracts";
import { createMediaUpload } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const parsed = createMediaUploadSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId} = await params;
    return ok(await createMediaUpload(user.id, hotelId, parsed.data), {status: 201});
  } catch (error) {
    return handleApiError(error);
  }
}
