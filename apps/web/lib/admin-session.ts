import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";

export function adminSessionCookieName(): string {
  return process.env.ADMIN_SESSION_COOKIE_NAME ?? "hp_admin_session";
}

export function readAdminSessionToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim() || null;
  return request.cookies.get(adminSessionCookieName())?.value ?? null;
}

export function attachAdminSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set(adminSessionCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set(adminSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });
}
