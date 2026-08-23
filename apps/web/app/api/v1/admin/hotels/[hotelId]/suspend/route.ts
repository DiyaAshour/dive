import type { NextRequest } from "next/server";
import { suspendPropertySchema } from "@platform/contracts";
import { suspendProperty } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestAdminUser } from "@/lib/request-auth";

export async function POST(request: NextRequest, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const {hotelId} = await params;
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const parsed = suspendPropertySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    return ok(await suspendProperty(user.id, hotelId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
