import type { NextRequest } from "next/server";
import { createHotelDocumentDownload } from "@platform/server";
import { handleApiError } from "@/lib/api";
import { requestAdminUser } from "@/lib/request-auth";

export async function GET(request: NextRequest, {params}: {params: Promise<{documentId: string}>}) {
  try {
    const user = await requestAdminUser(request);
    if (!user) return Response.json({data: null, error: {code: "UNAUTHORIZED", message: "Authentication required"}}, {status: 401});
    const {documentId} = await params;
    const url = await createHotelDocumentDownload(user.id, documentId);
    return Response.redirect(url, 302);
  } catch (error) {
    return handleApiError(error);
  }
}
