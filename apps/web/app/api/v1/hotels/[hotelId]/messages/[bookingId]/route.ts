import type { NextRequest } from "next/server";
import { bookingMessageInputSchema } from "@platform/contracts";
import { listHotelBookingMessages, sendHotelBookingMessage } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{hotelId: string; bookingId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const {hotelId, bookingId} = await params;
    return ok(await listHotelBookingMessages(user.id, hotelId, bookingId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, {params}: {params: Promise<{hotelId: string; bookingId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed = bookingMessageInputSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId, bookingId} = await params;
    return ok(await sendHotelBookingMessage(user.id, hotelId, bookingId, parsed.data), {status: 201});
  } catch (error) {
    return handleApiError(error);
  }
}
