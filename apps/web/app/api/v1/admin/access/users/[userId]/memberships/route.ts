import type {NextRequest} from "next/server";
import {z} from "zod";
import {setPlatformHotelMembership} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

const schema = z.object({
  hotelId: z.string().trim().min(1),
  role: z.enum(["OWNER", "MANAGER", "REVENUE", "FRONT_DESK", "FINANCE", "VIEWER"]),
  status: z.enum(["ACTIVE", "INVITED", "SUSPENDED"]),
});

export async function POST(request: NextRequest, {params}: {params: Promise<{userId:string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const {userId} = await params;
    return ok(await setPlatformHotelMembership(user.id, userId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}

function unauthorized() {
  return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
}
