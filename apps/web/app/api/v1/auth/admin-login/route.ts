import {loginRequestSchema} from "@platform/contracts";
import {loginPlatformAdmin} from "@platform/server";
import type {NextRequest} from "next/server";
import {attachAdminSessionCookie} from "@/lib/admin-session";
import {handleApiError, ok, validationError} from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const parsed = loginRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const result = await loginPlatformAdmin(parsed.data, {
      userAgent: request.headers.get("user-agent"),
      ipAddress: forwardedFor || request.headers.get("x-real-ip"),
    });
    const response = ok({user: result.user, expiresAt: result.session.expiresAt});
    attachAdminSessionCookie(response, result.session.token, result.session.expiresAt);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
