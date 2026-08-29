import type {NextRequest} from "next/server";
import {removePlatformHotelMembership} from "@platform/server";
import {handleApiError, ok} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function DELETE(request: NextRequest, {params}: {params: Promise<{userId:string;membershipId:string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const {userId, membershipId} = await params;
    return ok(await removePlatformHotelMembership(user.id, userId, membershipId));
  } catch (error) {
    return handleApiError(error);
  }
}

function unauthorized() {
  return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
}
