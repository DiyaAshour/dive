import type {NextRequest} from "next/server";
import {z} from "zod";
import {createPlatformManagedUser} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

const createUserSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(160),
  platformRole: z.enum(["GUEST", "HOTEL_USER", "PLATFORM_ADMIN"]),
  hotelId: z.string().trim().min(1).nullable().optional(),
  hotelRole: z.enum(["OWNER", "MANAGER", "REVENUE", "FRONT_DESK", "FINANCE", "VIEWER"]).nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const parsed = createUserSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    return ok(await createPlatformManagedUser(user.id, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}

function unauthorized() {
  return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
}
