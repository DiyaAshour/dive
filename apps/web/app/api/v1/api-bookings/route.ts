import {apiBookingSchema} from "@platform/contracts";
import {createApiBooking} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = apiBookingSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return validationError(body.error);
    return ok(await createApiBooking(body.data), {status: 201});
  } catch (error) {
    return handleApiError(error);
  }
}
