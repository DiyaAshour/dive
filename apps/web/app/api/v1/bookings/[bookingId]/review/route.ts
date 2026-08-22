import type { NextRequest } from "next/server";
import { createGuestReviewSchema } from "@platform/contracts";
import { createGuestReview, getReviewEligibility } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { bookingAccessContext } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const {bookingId} = await params;
    return ok(await getReviewEligibility(bookingId, await bookingAccessContext(request)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const parsed = createGuestReviewSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const {bookingId} = await params;
    return ok(await createGuestReview(bookingId, parsed.data, await bookingAccessContext(request)), {status: 201});
  } catch (error) {
    return handleApiError(error);
  }
}
