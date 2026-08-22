import { getPublicHotelReviews } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";

export async function GET(_: Request, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const {hotelId} = await params;
    return ok(await getPublicHotelReviews(hotelId));
  } catch (error) {
    return handleApiError(error);
  }
}
