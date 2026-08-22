import type { NextRequest } from "next/server";
import { bookingMessageInputSchema } from "@platform/contracts";
import { listGuestBookingMessages, sendGuestBookingMessage } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { bookingAccessContext } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const {bookingId} = await params;
    return ok(await listGuestBookingMessages(bookingId, await bookingAccessContext(request)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const parsed = bookingMessageInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const {bookingId} = await params;
    return ok(await sendGuestBookingMessage(bookingId, parsed.data, await bookingAccessContext(request)), {status: 201});
  } catch (error) {
    return handleApiError(error);
  }
}
