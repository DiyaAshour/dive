import { idempotencyKeySchema, initiatePaymentSchema } from "@platform/contracts";
import { initiatePayment } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { bookingAccessContext, idempotencyKey } from "@/lib/request-auth";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest, {params}:{params:Promise<{bookingId:string}>}) {
  try {
    const {bookingId} = await params;
    const body = initiatePaymentSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return validationError(body.error);
    const key = idempotencyKeySchema.safeParse(idempotencyKey(request));
    if (!key.success) return validationError(key.error);
    return ok(await initiatePayment(bookingId, body.data, key.data, await bookingAccessContext(request)), {status: 201});
  } catch (error) {
    return handleApiError(error);
  }
}
