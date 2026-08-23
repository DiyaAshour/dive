import type { NextRequest } from "next/server";
import { propertyReviewDecisionSchema } from "@platform/contracts";
import { reviewPropertySubmission } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestAdminUser } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{reviewId: string}>}) {
  try {
    const {reviewId} = await params;
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const parsed = propertyReviewDecisionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    return ok(await reviewPropertySubmission(user.id, reviewId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
