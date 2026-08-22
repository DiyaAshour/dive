import type { NextRequest } from "next/server";
import { hotelPerformanceQuerySchema } from "@platform/contracts";
import { getHotelPerformance } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{hotelId:string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsed = hotelPerformanceQuerySchema.safeParse({days: request.nextUrl.searchParams.get("days") ?? "30"});
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId} = await params;
    return ok(await getHotelPerformance(user.id, hotelId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
