import { verifyEmailRequestSchema } from "@platform/contracts";
import { verifyEmailAddress } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const parsed = verifyEmailRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    return ok(await verifyEmailAddress(parsed.data.token));
  } catch (error) { return handleApiError(error); }
}
