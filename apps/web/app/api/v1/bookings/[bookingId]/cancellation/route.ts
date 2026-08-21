import { previewCancellation } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";
import { bookingAccessContext } from "@/lib/request-auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest, {params}:{params:Promise<{bookingId:string}>}) {
  try {
    const {bookingId} = await params;
    return ok(await previewCancellation(bookingId, await bookingAccessContext(request)));
  } catch (error) {
    return handleApiError(error);
  }
}
