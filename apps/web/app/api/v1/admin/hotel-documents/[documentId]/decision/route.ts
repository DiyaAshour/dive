import type { NextRequest } from "next/server";
import { documentDecisionSchema } from "@platform/contracts";
import { reviewHotelDocument } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestAdminUser } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{documentId: string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const parsed = documentDecisionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const {documentId} = await params;
    return ok(await reviewHotelDocument(user.id, documentId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
