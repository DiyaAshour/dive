import { bookingQuoteSchema } from "@platform/contracts";
import {
  ApplicationError,
  captureCheckoutStarted,
  getDemoBookingQuote,
  quoteBooking,
} from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = bookingQuoteSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return validationError(body.error);

    const isDemo = body.data.hotelId.startsWith("demo-");
    const quote = isDemo
      ? getDemoBookingQuote(body.data)
      : await quoteBooking(body.data);

    if (!quote) {
      throw new ApplicationError(
        "DEMO_RATE_NOT_FOUND",
        "The selected demo room or rate is no longer available",
        404,
      );
    }

    if (!isDemo) {
      await captureCheckoutStarted(body.data);
    }

    return ok(quote);
  } catch (error) {
    return handleApiError(error);
  }
}
