import {timingSafeEqual} from "node:crypto";
import type {NextRequest} from "next/server";

export function googleHotelsFeedAuthorized(request: NextRequest): boolean {
  const expectedUsername = process.env.GOOGLE_HOTELS_FEED_USERNAME?.trim() ?? "";
  const expectedPassword = process.env.GOOGLE_HOTELS_FEED_PASSWORD?.trim() ?? "";
  if (!expectedUsername && !expectedPassword) return true;
  if (!expectedUsername || !expectedPassword) return false;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(authorization.slice(6).trim(), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    return safeEqual(decoded.slice(0, separator), expectedUsername) && safeEqual(decoded.slice(separator + 1), expectedPassword);
  } catch {
    return false;
  }
}

function safeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
