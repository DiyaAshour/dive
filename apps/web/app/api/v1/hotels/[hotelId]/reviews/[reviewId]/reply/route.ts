import type { NextRequest } from "next/server";
import { hotelReviewReplySchema } from "@platform/contracts";
import { replyToGuestReview } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{hotelId: string; reviewId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed = hotelReviewReplySchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId, reviewId} = await params;
    return ok(await replyToGuestReview(user.id, hotelId, reviewId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
