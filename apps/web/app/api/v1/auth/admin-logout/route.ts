import {revokeAdminSession} from "@platform/server";
import type {NextRequest} from "next/server";
import {clearAdminSessionCookie, readAdminSessionToken} from "@/lib/admin-session";
import {handleApiError, ok} from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    await revokeAdminSession(readAdminSessionToken(request));
    const response = ok({loggedOut: true});
    clearAdminSessionCookie(response);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
