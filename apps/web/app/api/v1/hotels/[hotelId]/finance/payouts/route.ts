import {partnerPayoutRequestSchema} from "@platform/contracts";
import {createPartnerPayout} from "@platform/server";
import {handleApiError, ok, validationError} from "@/lib/api";
import {requestUser} from "@/lib/request-auth";

export async function POST(request: Request, {params}: {params: Promise<{hotelId: string}>}) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const parsed = partnerPayoutRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const {hotelId} = await params;
    return ok(await createPartnerPayout(user.id, hotelId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}
