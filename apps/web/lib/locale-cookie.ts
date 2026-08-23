import type { NextResponse } from "next/server";
import { localeCookieName, type Locale } from "./i18n";

export function attachLocaleCookie(response: NextResponse, locale: Locale): void {
  response.cookies.set(localeCookieName, locale, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 31_536_000,
  });
}
