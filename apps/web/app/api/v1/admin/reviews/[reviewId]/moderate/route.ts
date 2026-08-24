import type {NextRequest} from "next/server";
import {moderateGuestReviewSchema} from "@platform/contracts";
import {moderatePlatformGuestReview} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{reviewId: string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const parsed = moderateGuestReviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    return ok(await moderatePlatformGuestReview(user.id, (await params).reviewId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
