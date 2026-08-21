import { bookingQuoteSchema } from "@platform/contracts";
import { quoteBooking } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = bookingQuoteSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return validationError(body.error);
    return ok(await quoteBooking(body.data));
  } catch (error) {
    return handleApiError(error);
  }
}
