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

export function idempotencyKey(request: NextRequest): string | null {
  return request.headers.get("idempotency-key")?.trim() || null;
}
