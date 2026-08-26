import type { NextRequest } from "next/server";
import { idempotencyKeySchema } from "@platform/contracts";
import { applyWalletToBooking } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { idempotencyKey, requestUser } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{bookingId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsedKey = idempotencyKeySchema.safeParse(idempotencyKey(request));
    if (!parsedKey.success) return validationError(parsedKey.error);
    const payload = await request.json().catch(() => null) as {amount?: unknown} | null;
    if (!payload || typeof payload.amount !== "number" || !Number.isFinite(payload.amount) || payload.amount <= 0) {
      return Response.json({data:null,error:{code:"VALIDATION_ERROR",message:"A positive wallet amount is required"}},{status:400});
    }
    const {bookingId} = await params;
    return ok(await applyWalletToBooking(bookingId, user.id, payload.amount, parsedKey.data));
  } catch (error) {
    return handleApiError(error);
  }
}
