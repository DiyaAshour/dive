import { bookingQuoteSchema } from "@platform/contracts";
import { captureCheckoutStarted, quoteBooking } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = bookingQuoteSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return validationError(body.error);
    const quote = await quoteBooking(body.data);
    await captureCheckoutStarted(body.data);
    return ok(quote);
  } catch (error) {
    return handleApiError(error);
  }
}
