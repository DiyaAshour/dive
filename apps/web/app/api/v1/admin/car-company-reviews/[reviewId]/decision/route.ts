import type { NextRequest } from "next/server";
import { propertyReviewDecisionSchema } from "@platform/contracts";
import { reviewCarCompanySubmission } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestAdminUser } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{reviewId: string}>}) {
  try {
    const {reviewId} = await params;
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed = propertyReviewDecisionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const decision = parsed.data.reason === undefined
      ? {decision: parsed.data.decision}
      : {decision: parsed.data.decision, reason: parsed.data.reason};
    return ok(await reviewCarCompanySubmission(user.id, reviewId, decision));
  } catch (error) {
    return handleApiError(error);
  }
}
