import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DateIntentGate } from "@/components/date-intent-gate";
import { direction } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";
import "./phase2.css";
import "./account.css";
import "./trips.css";
import "./rewards.css";
import "./content.css";
import "./hotel-vitality.css";
import "./hotel-density.css";
import "./hotel-trust.css";
import "./hotel-essentials.css";
import "./hotel-trust-layout.css";
import "./hotel-sticky-fix.css";
import "./hotel-conversion.css";
import "./date-intent.css";
import "./localization.css";
import "./booking-details.css";
import "./admin.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {default: "HandMeKey — Hotels, clearly priced", template: "%s · HandMeKey"},
  description: "Search verified hotels, compare live rates and book with the final stay price visible before checkout.",
  alternates: {types: {"application/rss+xml": siteUrl("/feed.xml")}},
};

export default async function RootLayout({children}: Readonly<{children: ReactNode}>) {
  const locale = await requestLocale();
  return <html lang={locale} dir={direction(locale)} data-scroll-behavior="smooth"><body><DateIntentGate/>{children}</body></html>;
}
