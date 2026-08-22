import type { Metadata } from "next";
import type { ReactNode } from "react";
import { direction } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import "./globals.css";
import "./phase2.css";
import "./account.css";
import "./localization.css";

export const metadata: Metadata = {
  title: {default: "HandMeKey — Hotels, clearly priced", template: "%s · HandMeKey"},
  description: "Search verified hotels, compare live rates and book with the final stay price visible before checkout.",
};

export default async function RootLayout({children}: Readonly<{children: ReactNode}>) {
  const locale = await requestLocale();
  return <html lang={locale} dir={direction(locale)}><body>{children}</body></html>;
}
