import { localePreferenceSchema } from "@platform/contracts";
import { setTravelerLocale } from "@platform/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { attachLocaleCookie } from "@/lib/locale-cookie";
import { requestAdminUser, requestUser } from "@/lib/request-auth";

export async function POST(request: Request) {
  try {
    const parsed = localePreferenceSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);

    const user = await requestUser(request) ?? await requestAdminUser(request);
    if (user) await setTravelerLocale(user.id, parsed.data);

    const response = ok({locale: parsed.data.locale});
    attachLocaleCookie(response, parsed.data.locale);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
