import type { NextRequest } from "next/server";
import { z } from "zod";
import { completeRefund, unauthorized } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";

const bodySchema = z.object({externalReference: z.string().trim().max(120).optional()});

export async function POST(request: NextRequest, {params}: {params: Promise<{refundId: string}>}) {
  try {
    const {refundId} = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return validationError(parsed.error);
    const user = await requestUser(request);
    if (!user) unauthorized();
    return ok(await completeRefund(refundId, user.id, parsed.data.externalReference));
  } catch (error) {
    return handleApiError(error);
  }
}
