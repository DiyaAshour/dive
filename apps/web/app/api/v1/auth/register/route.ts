import { registerRequestSchema } from "@platform/contracts";
import { registerUser, setTravelerLocale } from "@platform/server";
import { NextRequest } from "next/server";
import { handleApiError, ok, validationError } from "@/lib/api";
import { isLocale, localeCookieName } from "@/lib/i18n";
import { attachLocaleCookie } from "@/lib/locale-cookie";
import { attachSessionCookie } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const parsed = registerRequestSchema.safeParse(await request.json());
    if (!parsed.success) return validationError(parsed.error);
    const localeValue = request.cookies.get(localeCookieName)?.value;
    const locale = isLocale(localeValue) ? localeValue : "en";
    const result = await registerUser(parsed.data);
    await setTravelerLocale(result.user.id, {locale});
    const response = ok({user: result.user}, {status: 201});
    attachSessionCookie(response, result.session.token, result.session.expiresAt);
    attachLocaleCookie(response, locale);
    return response;
  } catch (error) { return handleApiError(error); }
}
