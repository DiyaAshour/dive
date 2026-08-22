import type { NextRequest } from "next/server";
import { hotelReservationQuerySchema } from "@platform/contracts";
import { hotelReservationCsv } from "@platform/server";
import { handleApiError, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const {hotelId} = await params;
    const parsed = hotelReservationQuerySchema.safeParse({
      date: request.nextUrl.searchParams.get("date"),
      scope: request.nextUrl.searchParams.get("scope") ?? "ALL",
    });
    if (!parsed.success) return validationError(parsed.error);
    const csv = await hotelReservationCsv(user.id, hotelId, parsed.data);
    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="reservations-${parsed.data.date}-${parsed.data.scope.toLowerCase()}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
