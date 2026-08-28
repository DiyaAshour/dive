import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";
import {ApplicationError, resolveGoogleHotelLanding} from "@platform/server";
import {siteUrl} from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const hotelId = (params.get("hotel_id") ?? "").trim();
  if (!hotelId || hotelId.length > 128) return new Response("Hotel not found", {status: 404});
  try {
    const hotel = await resolveGoogleHotelLanding(hotelId);
    const target = new URL(siteUrl(`/hotel/${hotel.slug}`));
    copyDate(params, target.searchParams, "checkin", "arrival");
    copyDate(params, target.searchParams, "checkout", "departure");
    copyCount(params, target.searchParams, "adults", "adults", 1, 30);
    copyCount(params, target.searchParams, "children", "children", 0, 20);
    target.searchParams.set("rooms", "1");
    const language = params.get("language")?.trim().toLowerCase();
    if (language === "ar" || language === "en") target.searchParams.set("lang", language);
    target.searchParams.set("utm_source", "google");
    target.searchParams.set("utm_medium", "free_booking_links");
    target.searchParams.set("utm_campaign", "google_hotels");
    return NextResponse.redirect(target, 302);
  } catch (error) {
    if (error instanceof ApplicationError && error.status === 404) return new Response("Hotel not found", {status: 404});
    throw error;
  }
}

function copyDate(source: URLSearchParams, target: URLSearchParams, sourceKey: string, targetKey: string) {
  const value = source.get(sourceKey)?.trim();
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) target.set(targetKey, value);
}

function copyCount(source: URLSearchParams, target: URLSearchParams, sourceKey: string, targetKey: string, min: number, max: number) {
  const value = Number.parseInt(source.get(sourceKey) ?? "", 10);
  if (Number.isInteger(value) && value >= min && value <= max) target.set(targetKey, String(value));
}
