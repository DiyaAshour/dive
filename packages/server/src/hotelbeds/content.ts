import {createHash} from "node:crypto";

const TEST_CONTENT_BASE = "https://api.test.hotelbeds.com/hotel-content-api/1.0";
const LIVE_CONTENT_BASE = "https://api.hotelbeds.com/hotel-content-api/1.0";

export async function getHotelbedsRateCommentDetails(rateCommentsId: string, checkIn: string, language = "ENG"): Promise<string | null> {
  const code = rateCommentsId.trim();
  if (!code || !/^\d+\|\d+\|\d+$/.test(code)) return null;
  const apiKey = process.env.HOTELBEDS_API_KEY?.trim();
  const secret = process.env.HOTELBEDS_SECRET?.trim();
  if (!apiKey || !secret) return null;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash("sha256").update(apiKey + secret + timestamp).digest("hex");
  const url = new URL(`${contentBase()}/types/ratecommentdetails`);
  url.searchParams.set("code", code);
  url.searchParams.set("fields", "all");
  url.searchParams.set("language", language.trim().toUpperCase() || "ENG");
  url.searchParams.set("from", "1");
  url.searchParams.set("to", "100");
  url.searchParams.set("useSecondaryLanguage", "True");
  url.searchParams.set("date", checkIn);
  const response = await fetch(url, {
    headers: {accept: "application/json", "accept-encoding": "gzip", "api-key": apiKey, "x-signature": signature},
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const raw = await response.text();
  if (!response.ok) {
    console.warn("Hotelbeds rate comments unavailable", {status: response.status, code});
    return null;
  }
  try {
    return extractHotelbedsRateComments(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function extractHotelbedsRateComments(payload: unknown): string | null {
  const found: string[] = [];
  visit(payload, "", found);
  const unique = [...new Set(found.map((value) => value.replace(/\s+/g, " ").trim()).filter((value) => value.length >= 3))];
  return unique.length ? unique.join("\n") : null;
}

function visit(value: unknown, key: string, found: string[]): void {
  if (typeof value === "string") {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.includes("comment") || normalizedKey === "content" || normalizedKey.includes("remark")) found.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) visit(item, key, found);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) visit(childValue, childKey, found);
}

function contentBase(): string {
  const environment = (process.env.HOTELBEDS_ENV ?? "test").trim().toLowerCase();
  if (environment === "live") return LIVE_CONTENT_BASE;
  if (environment === "test") return TEST_CONTENT_BASE;
  throw new Error("HOTELBEDS_ENV must be either 'test' or 'live'");
}
