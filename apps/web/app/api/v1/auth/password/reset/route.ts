import { resetPasswordRequestSchema } from "@platform/contracts";
import { resetPasswordWithToken } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const parsed = resetPasswordRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    return ok(await resetPasswordWithToken(parsed.data.token, parsed.data.newPassword));
  } catch (error) { return handleApiError(error); }
}
