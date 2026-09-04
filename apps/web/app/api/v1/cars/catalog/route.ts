import { searchCarCatalog } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() || undefined;
    const make = url.searchParams.get("make")?.trim() || undefined;
    const yearValue = Number(url.searchParams.get("year"));
    const limitValue = Number(url.searchParams.get("limit"));
    const year = Number.isInteger(yearValue) && yearValue > 0 ? yearValue : undefined;
    const limit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : 30;
    return ok(await searchCarCatalog({query, make, year, limit}));
  } catch (error) {
    return handleApiError(error);
  }
}
