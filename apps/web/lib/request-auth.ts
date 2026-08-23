import { getAdminSessionPrincipal, getSessionUser } from "@platform/server";
import { adminSessionCookieName } from "./admin-session";
import { sessionCookieName } from "./session";

export async function requestUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
  const token = bearer || cookieValue(request.headers.get("cookie"), sessionCookieName()) || null;
  return getSessionUser(token);
}

export async function requestAdminUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
  const token = bearer || cookieValue(request.headers.get("cookie"), adminSessionCookieName()) || null;
  return (await getAdminSessionPrincipal(token))?.user ?? null;
}

export function bookingToken(request: Request): string | null {
  return request.headers.get("x-booking-token")?.trim() || null;
}

export async function bookingAccessContext(request: Request): Promise<{userId: string | null; accessToken: string | null}> {
  const user = await requestUser(request);
  return {userId: user?.id ?? null, accessToken: bookingToken(request)};
}

export function idempotencyKey(request: Request): string | null {
  return request.headers.get("idempotency-key")?.trim() || null;
}

function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const item of header.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    const key = item.slice(0, separator).trim();
    if (key !== name) continue;
    const value = item.slice(separator + 1).trim();
    try { return decodeURIComponent(value); } catch { return value; }
  }
  return null;
}
