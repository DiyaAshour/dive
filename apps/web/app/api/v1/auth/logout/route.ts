import { revokeSession } from "@platform/server";
import { NextRequest } from "next/server";
import { clearSessionCookie, readSessionToken } from "@/lib/session";
import { handleApiError, ok } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    await revokeSession(readSessionToken(request));
    const response = ok({loggedOut: true});
    clearSessionCookie(response);
    return response;
  } catch (error) { return handleApiError(error); }
}
