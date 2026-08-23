import type { NextRequest } from "next/server";
import { expectedArrivalInputSchema } from "@platform/contracts";
import { getGuestArrival, updateExpectedArrival } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { bookingAccessContext } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const {bookingId} = await params;
    return ok(await getGuestArrival(bookingId, await bookingAccessContext(request)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const parsed = expectedArrivalInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const {bookingId} = await params;
    return ok(await updateExpectedArrival(bookingId, parsed.data, await bookingAccessContext(request)));
  } catch (error) {
    return handleApiError(error);
  }
}
