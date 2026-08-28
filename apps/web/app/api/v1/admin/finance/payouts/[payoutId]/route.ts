import {adminPayoutUpdateSchema} from "@platform/contracts";
import {updatePlatformPayout} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

export async function PATCH(request: Request, {params}: {params: Promise<{payoutId: string}>}) {
  try {
    const admin = await requestAdminUser(request);
    if (!admin) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Administrator authentication required"}}, {status: 401});
    const parsed = adminPayoutUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const {payoutId} = await params;
    return ok(await updatePlatformPayout(admin.id, payoutId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
