import type { NextResponse } from "next/server";
import { localeCookieName } from "./i18n";
import type { GuestLocale } from "./guest-market";

export function attachLocaleCookie(response: NextResponse, locale: GuestLocale): void {
  response.cookies.set(localeCookieName, locale, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 31_536_000,
  });
}
