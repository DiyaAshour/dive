import type { NextRequest } from "next/server";
import { destinationSuggestionQuerySchema } from "@platform/contracts";
import { searchDestinationSuggestions, searchNuiteeHotelSuggestions } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const parsed = destinationSuggestionQuerySchema.safeParse({
      q: request.nextUrl.searchParams.get("q") ?? "",
      locale: request.nextUrl.searchParams.get("locale") ?? "en",
      limit: request.nextUrl.searchParams.get("limit") ?? "8",
    });
    if (!parsed.success) return validationError(parsed.error);

    const query = parsed.data.q.trim();
    const localPromise = searchDestinationSuggestions(parsed.data.q, parsed.data.locale, parsed.data.limit);
    if (query.length < 2) return ok(await localPromise);

    const providerPromise = searchNuiteeHotelSuggestions(query, Math.min(5, parsed.data.limit)).catch((error) => {
      console.warn("Hotel supplier autocomplete unavailable; returning local suggestions", error);
      return [];
    });
    const [local, providerHotels] = await Promise.all([localPromise, providerPromise]);
    if (!providerHotels.length) return ok(local);

    const seen = new Set(local.filter((item) => item.kind === "HOTEL").map((item) => item.label.trim().toLowerCase()));
    const liveHotels = providerHotels.flatMap((hotel) => {
      const key = hotel.name.trim().toLowerCase();
      if (!key || seen.has(key)) return [];
      seen.add(key);
      const location = [hotel.city, hotel.countryCode].filter(Boolean).join(", ");
      return [{
        kind: "HOTEL" as const,
        id: `nuitee:${hotel.id}`,
        label: hotel.name,
        searchValue: hotel.name,
        secondary: location || hotel.address || "Live hotel inventory",
        type: "HOTEL",
        landingPath: `/hotel/nuitee-${hotel.id}`,
      }];
    });

    const destinations = local.filter((item) => item.kind === "DESTINATION");
    const localHotels = local.filter((item) => item.kind === "HOTEL");
    const hotelSlots = Math.min(liveHotels.length + localHotels.length, Math.max(3, parsed.data.limit - Math.min(destinations.length, 3)));
    const destinationSlots = Math.max(0, parsed.data.limit - hotelSlots);
    return ok([
      ...destinations.slice(0, destinationSlots),
      ...localHotels,
      ...liveHotels,
    ].slice(0, parsed.data.limit));
  } catch (error) {
    return handleApiError(error);
  }
}
