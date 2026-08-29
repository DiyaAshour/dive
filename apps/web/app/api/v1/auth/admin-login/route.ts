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
    if (process.env.NODE_ENV !== "production" && isLocalDatabaseSetupError(error)) {
      return Response.json({
        data: null,
        error: {
          code: "ADMIN_DATABASE_NOT_READY",
          message: "Local administrator database is not ready. Run scripts/repair-local-admin.ps1, then try again.",
        },
      }, {status: 503});
    }
    return handleApiError(error);
  }
}

function isLocalDatabaseSetupError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const value = error as {code?: unknown; message?: unknown};
  const code = typeof value.code === "string" ? value.code : "";
  if (["P1000", "P1001", "P1002", "P1003", "P2021", "P2022"].includes(code)) return true;
  const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
  return message.includes("can't reach database server")
    || message.includes("does not exist in the current database")
    || message.includes("database server") && message.includes("not reachable");
}
