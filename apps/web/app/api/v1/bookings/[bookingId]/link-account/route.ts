import type { NextRequest } from "next/server";
import { linkBookingToAccount } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { bookingToken, requestUser } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const {bookingId} = await params;
    return ok(await linkBookingToAccount(user.id, bookingId, bookingToken(request)));
  } catch (error) {
    return handleApiError(error);
  }
}
