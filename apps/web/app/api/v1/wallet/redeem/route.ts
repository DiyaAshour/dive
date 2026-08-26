import type { NextRequest } from "next/server";
import { idempotencyKeySchema } from "@platform/contracts";
import { convertRewardsToWallet } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { idempotencyKey, requestUser } from "@/lib/request-auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const parsedKey = idempotencyKeySchema.safeParse(idempotencyKey(request));
    if (!parsedKey.success) return validationError(parsedKey.error);
    const payload = await request.json().catch(() => null) as {points?: unknown} | null;
    if (!payload || typeof payload.points !== "number" || !Number.isFinite(payload.points)) {
      return Response.json({data:null,error:{code:"VALIDATION_ERROR",message:"A numeric points amount is required"}},{status:400});
    }
    return ok(await convertRewardsToWallet(user.id, payload.points, parsedKey.data));
  } catch (error) {
    return handleApiError(error);
  }
}
