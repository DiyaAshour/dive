import { discoverySearchSchema } from "@platform/contracts";
import { searchHotels } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const parsed = discoverySearchSchema.safeParse({
      destination: query.get("destination") ?? "",
      arrival: query.get("arrival") ?? "",
      departure: query.get("departure") ?? "",
      adults: query.get("adults") ?? 2,
      children: query.get("children") ?? 0,
      minPrice: optional(query.get("minPrice")),
      maxPrice: optional(query.get("maxPrice")),
      stars: repeated(query, "stars"),
      amenities: repeated(query, "amenities"),
      freeCancellation: query.get("freeCancellation") === "true",
      paymentMode: optional(query.get("paymentMode")),
      sort: query.get("sort") ?? "RECOMMENDED",
    });
    if (!parsed.success) return validationError(parsed.error);
    return ok(await searchHotels(parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}

function optional(value: string | null): string | undefined {
  return value && value.trim() ? value : undefined;
}

function repeated(params: URLSearchParams, name: string): string[] {
  return params.getAll(name).flatMap((value) => value.split(",")).map((item) => item.trim()).filter(Boolean);
}
