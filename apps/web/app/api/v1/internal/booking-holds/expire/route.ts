import type { NextRequest } from "next/server";
import { expireStaleHolds, forbidden, unauthorized } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request);
    if (!user) unauthorized();
    if (user.platformRole !== "PLATFORM_ADMIN") forbidden();
    const expired = await expireStaleHolds(100);
    return ok({expired});
  } catch (error) {
    return handleApiError(error);
  }
}
