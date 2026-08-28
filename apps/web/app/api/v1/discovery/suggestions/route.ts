import type { NextRequest } from "next/server";
import { destinationSuggestionQuerySchema } from "@platform/contracts";
import { searchDestinationSuggestions } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const parsed = destinationSuggestionQuerySchema.safeParse({
      q: request.nextUrl.searchParams.get("q") ?? "",
      locale: request.nextUrl.searchParams.get("locale") ?? "en",
      limit: request.nextUrl.searchParams.get("limit") ?? "8",
    });
    if (!parsed.success) return validationError(parsed.error);
    return ok(await searchDestinationSuggestions(parsed.data.q, parsed.data.locale, parsed.data.limit));
  } catch (error) {
    return handleApiError(error);
  }
}
