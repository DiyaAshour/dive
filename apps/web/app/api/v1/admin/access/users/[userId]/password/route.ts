import type {NextRequest} from "next/server";
import {z} from "zod";
import {resetPlatformManagedUserPassword} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

const schema = z.object({password: z.string().min(10).max(160)});

export async function POST(request: NextRequest, {params}: {params: Promise<{userId:string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return unauthorized();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const {userId} = await params;
    return ok(await resetPlatformManagedUserPassword(user.id, userId, parsed.data.password));
  } catch (error) {
    return handleApiError(error);
  }
}

function unauthorized() {
  return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
}
