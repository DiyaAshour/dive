import type { NextRequest } from "next/server";
import { createBookingHoldSchema, idempotencyKeySchema } from "@platform/contracts";
import { createBookingHoldWithVisibilityBoost, VISIBILITY_BOOST_COOKIE } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { idempotencyKey, requestUser } from "@/lib/request-auth";

export async function POST(request: NextRequest) {
  try {
    const body = createBookingHoldSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return validationError(body.error);
    const parsedKey = idempotencyKeySchema.safeParse(idempotencyKey(request));
    if (!parsedKey.success) return validationError(parsedKey.error);
    const user = await requestUser(request);
    const travelerCountry = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? request.headers.get("x-country-code");
    const visibilityBoostToken = request.cookies.get(VISIBILITY_BOOST_COOKIE)?.value ?? null;
    const result = await createBookingHoldWithVisibilityBoost(body.data, {
      userId: user?.id ?? null,
      idempotencyKey: parsedKey.data,
      travelerCountry,
      visibilityBoostToken,
    });
    return ok(result, {status: result.reused ? 200 : 201});
  } catch (error) {
    return handleApiError(error);
  }
}
