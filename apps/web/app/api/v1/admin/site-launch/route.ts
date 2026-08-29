import type {NextRequest} from "next/server";
import {handleApiError, ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";
import {getSiteLaunchConfig, updateSiteLaunchConfig} from "@/lib/site-launch";

export async function GET(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    return ok(await getSiteLaunchConfig());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) return badRequest("Invalid launch settings payload");

    const enabled = body.enabled === true;
    const launchAtValue = typeof body.launchAt === "string" && body.launchAt.trim() ? body.launchAt.trim() : null;
    const launchAtDate = launchAtValue ? new Date(launchAtValue) : null;
    if (launchAtDate && Number.isNaN(launchAtDate.getTime())) return badRequest("Launch date is invalid");
    if (enabled && (!launchAtDate || launchAtDate.getTime() <= Date.now())) return badRequest("Choose a future launch date before enabling pre-launch mode");

    const title = typeof body.title === "string" ? body.title : "";
    const message = typeof body.message === "string" ? body.message : "";
    const config = await updateSiteLaunchConfig(user.id, {
      enabled,
      launchAt: launchAtDate?.toISOString() ?? null,
      title,
      message,
    });
    return ok(config);
  } catch (error) {
    return handleApiError(error);
  }
}

function unauthorized() {
  return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
}

function badRequest(message: string) {
  return Response.json({data: null, error: {code: "INVALID_LAUNCH_SETTINGS", message}}, {status: 400});
}
