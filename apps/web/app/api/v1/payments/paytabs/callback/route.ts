import { handlePayTabsCallback } from "@platform/server";
import { handleApiError, ok } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("signature");
    return ok(await handlePayTabsCallback(rawBody, signature));
  } catch (error) { return handleApiError(error); }
}
