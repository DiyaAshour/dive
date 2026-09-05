import type {NextRequest} from "next/server";
import {cancelApiBooking, simulateApiBookingCancellation} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestUser} from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{id:string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const {id} = await params;
    const body = await request.json().catch(() => null) as {confirm?: boolean} | null;
    return ok(body?.confirm ? await cancelApiBooking(user.id,id) : await simulateApiBookingCancellation(user.id,id));
  } catch (error) {
    return handleApiError(error);
  }
}
