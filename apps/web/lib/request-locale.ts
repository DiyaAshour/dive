import { cookies } from "next/headers";
import { isLocale, localeCookieName, type Locale } from "./i18n";

export async function requestLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(localeCookieName)?.value;
  return isLocale(value) ? value : "en";
}
