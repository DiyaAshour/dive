import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteLaunchGate } from "@/components/site-launch-gate";
import { direction } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import { getSiteLaunchConfig } from "@/lib/site-launch";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";
import "./phase2.css";
import "./room-amenities-dnd.css";
import "./account.css";
import "./trips.css";
import "./rewards.css";
import "./wallet.css";
import "./content.css";
import "./blog-cms.css";
import "./blog-taxonomy.css";
import "./hotel-vitality.css";
import "./hotel-density.css";
import "./hotel-trust.css";
import "./hotel-essentials.css";
import "./hotel-trust-layout.css";
import "./hotel-sticky-fix.css";
import "./hotel-conversion.css";
import "./localization.css";
import "./booking-details.css";
import "./booking-center.css";
import "./admin.css";
import "./admin-email.css";
import "./production-ops.css";
import "./site-launch.css";
import "./visibility-boost.css";
import "./search-v2.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {default: "HandMeKey — Hotels, clearly priced", template: "%s · HandMeKey"},
  description: "Search verified hotels, compare live rates and book with the final stay price visible before checkout.",
  alternates: {types: {"application/rss+xml": siteUrl("/feed.xml")}},
};

export default async function RootLayout({children}: Readonly<{children: ReactNode}>) {
  const initialNow = Date.now();
  const [locale, launchConfig] = await Promise.all([requestLocale(), getSiteLaunchConfig()]);
  return <html lang={locale} dir={direction(locale)} data-scroll-behavior="smooth"><body><SiteLaunchGate locale={locale} config={launchConfig} initialNow={initialNow}>{children}</SiteLaunchGate></body></html>;
}
