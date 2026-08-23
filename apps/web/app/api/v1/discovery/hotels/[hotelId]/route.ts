import { publicStaySchema } from "@platform/contracts";
import { getPublicHotelDetails } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";

export async function GET(request: Request, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const {hotelId} = await params;
    const query = new URL(request.url).searchParams;
    const parsed = publicStaySchema.safeParse({
      arrival: query.get("arrival") ?? "",
      departure: query.get("departure") ?? "",
      adults: query.get("adults") ?? 2,
      children: query.get("children") ?? 0,
    });
    if (!parsed.success) return validationError(parsed.error);
    return ok(await getPublicHotelDetails(hotelId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
