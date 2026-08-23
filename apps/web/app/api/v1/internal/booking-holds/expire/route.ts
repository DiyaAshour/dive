import type { NextRequest } from "next/server";
import { expireStaleHolds, forbidden, unauthorized } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestAdminUser } from "@/lib/request-auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) unauthorized();
    if (user.platformRole !== "PLATFORM_ADMIN") forbidden();
    const expired = await expireStaleHolds(100);
    return ok({expired});
  } catch (error) {
    return handleApiError(error);
  }
}
