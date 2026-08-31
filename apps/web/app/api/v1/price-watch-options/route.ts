import { publicStaySchema } from "@platform/contracts";
import { getPublicHotelDetails } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const hotelId = url.searchParams.get("hotelId")?.trim();
    if (!hotelId) return Response.json({data:null,error:{code:"VALIDATION_ERROR",message:"hotelId is required"}},{status:400});

    const parsed = publicStaySchema.safeParse({
      arrival: url.searchParams.get("arrival"),
      departure: url.searchParams.get("departure"),
      adults: url.searchParams.get("adults") ?? "2",
      children: url.searchParams.get("children") ?? "0",
    });
    if (!parsed.success) return validationError(parsed.error);

    const hotel = await getPublicHotelDetails(hotelId, parsed.data, {trackView:false});
    const rooms = new Map<string,{roomTypeId:string;roomName:string;currentTotal:number}>();
    for (const offer of hotel.offers) {
      const existing = rooms.get(offer.roomTypeId);
      if (!existing || offer.total < existing.currentTotal) {
        rooms.set(offer.roomTypeId, {roomTypeId:offer.roomTypeId,roomName:offer.roomName,currentTotal:offer.total});
      }
    }

    return ok({
      currency: hotel.currency,
      rooms: [...rooms.values()].sort((left,right)=>left.currentTotal-right.currentTotal),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
