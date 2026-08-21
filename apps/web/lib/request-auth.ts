import type { NextRequest } from "next/server";
import { getSessionUser } from "@platform/server";
import { sessionCookieName } from "./session";

export async function requestUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
  const token = bearer || request.cookies.get(sessionCookieName())?.value || null;
  return getSessionUser(token);
}

export function bookingToken(request: NextRequest): string | null {
  return request.headers.get("x-booking-token")?.trim() || null;
}

export async function bookingAccessContext(request: NextRequest): Promise<{userId: string | null; accessToken: string | null}> {
  const user = await requestUser(request);
  return {userId: user?.id ?? null, accessToken: bookingToken(request)};
}

export function idempotencyKey(request: NextRequest): string | null {
  return request.headers.get("idempotency-key")?.trim() || null;
}
