import { HOTEL_CONTENT_LOCALES, type HotelContentLocale } from "@platform/contracts";
import { database } from "@platform/database";

const supportedLocales = new Set<string>(HOTEL_CONTENT_LOCALES);

export function normalizeHotelContentLocale(value: string): HotelContentLocale | null {
  const locale = value.trim().toLowerCase().split(/[-_]/)[0];
  return supportedLocales.has(locale) ? locale as HotelContentLocale : null;
}

export async function getPublicHotelTranslation(hotelIdentifier: string, requestedLocale: string) {
  const locale = normalizeHotelContentLocale(requestedLocale);
  if (!locale) return null;
  try {
    const db = database();
    const hotel = await db.hotel.findFirst({
      where: {status: "ACTIVE", verified: true, OR: [{id: hotelIdentifier}, {slug: hotelIdentifier}]},
      select: {id: true},
    });
    if (!hotel) return null;
    return db.hotelTranslation.findUnique({
      where: {hotelId_locale: {hotelId: hotel.id, locale}},
      select: {locale: true, name: true, description: true},
    });
  } catch (error) {
    // Public hotel pages already have a resilient demo fallback. A translation lookup
    // should never take the whole page down if the database is temporarily unavailable.
    console.warn("[hotel-translation] public lookup failed", error);
    return null;
  }
}
