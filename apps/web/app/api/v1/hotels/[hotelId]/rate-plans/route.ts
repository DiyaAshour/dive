import { createRatePlanRequestSchema } from "@platform/contracts";
import { createRatePlan, getSessionUser, unauthorized } from "@platform/server";
import { NextRequest } from "next/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { readSessionToken } from "@/lib/session";

export async function POST(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await getSessionUser(readSessionToken(request));
    if (!user) unauthorized();
    const parsed = createRatePlanRequestSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId} = await params;
    return ok({ratePlan: await createRatePlan(user.id, hotelId, parsed.data)}, {status: 201});
  } catch (error) { return handleApiError(error); }
}
