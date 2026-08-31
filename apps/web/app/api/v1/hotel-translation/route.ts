import type { NextRequest } from "next/server";
import { getPublicHotelTranslation } from "@platform/server";
import { ok } from "@/lib/api";

export async function GET(request: NextRequest) {
  const hotelId = request.nextUrl.searchParams.get("hotelId")?.trim() ?? "";
  const locale = request.nextUrl.searchParams.get("locale")?.trim() ?? "";
  if (!hotelId || !locale) {
    return Response.json({data: null, error: {code: "INVALID_TRANSLATION_QUERY", message: "hotelId and locale are required"}}, {status: 400});
  }
  return ok({translation: await getPublicHotelTranslation(hotelId, locale)});
}
