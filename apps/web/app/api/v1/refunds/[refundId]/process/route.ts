import { processRefund, queueRefundCompletedEmail } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { requestUser } from "@/lib/request-auth";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest, {params}:{params:Promise<{refundId:string}>}) {
  try {
    const {refundId} = await params;
    const user = await requestUser(request);
    if (!user) return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});
    const refund = await processRefund(refundId, user.id);
    if (refund?.status === "COMPLETED") {
      await queueRefundCompletedEmail(refundId).catch((error) => {
        console.error(JSON.stringify({event:"refund_completed_email_failed",refundId,message:error instanceof Error?error.message:"unknown error"}));
      });
    }
    return ok(refund);
  } catch (error) {
    return handleApiError(error);
  }
}
