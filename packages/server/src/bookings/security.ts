import { createHash, createHmac, randomBytes } from "node:crypto";

export function fingerprint(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function bookingAccessToken(idempotencyKey: string): string {
  const secret = process.env.BOOKING_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error("BOOKING_TOKEN_SECRET must be at least 32 characters");
  return createHmac("sha256", secret).update(`booking-access:${idempotencyKey}`).digest("base64url");
}

export function bookingAccessTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function reservationReference(): string {
  return `RES-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}
