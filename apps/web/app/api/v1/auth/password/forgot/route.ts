import { forgotPasswordRequestSchema } from "@platform/contracts";
import { requestPasswordReset } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const parsed = forgotPasswordRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    await requestPasswordReset(parsed.data.email);
    return ok({accepted: true});
  } catch (error) { return handleApiError(error); }
}
