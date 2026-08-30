import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import { getSiteIdentityConfig } from "@platform/server";
import { HotelMobileCommerceEnhancer } from "@/components/hotel-mobile-commerce";
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
import "./checkout-wallet-amount.css";
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
import "./admin-rewards.css";
import "./admin-access.css";
import "./admin-site-identity.css";
import "./admin-email.css";
import "./production-ops.css";
import "./site-launch.css";
import "./visibility-boost.css";
import "./sponsored-results.css";
import "./search-v2.css";
import "./property-content-manager.css";
import "./hotel-gallery-lightbox.css";
import "./room-product-visuals.css";
import "./dashboard-clarity.css";
import "./mobile-first.css";
import "./responsive-global.css";
import "./responsive-polish.css";
import "./zoom-resilience.css";
import "./home-commerce.css";
import "./hotel-mobile-commerce.css";
import "./hotel-essentials-compact.css";
import "./hotel-mobile-head.css";

export async function generateMetadata(): Promise<Metadata> {
  const identity = await getSiteIdentityConfig();
  return {
    metadataBase: new URL(siteUrl()),
    applicationName: identity.brandName,
    title: {default: identity.siteTitle, template: `%s · ${identity.brandName}`},
    description: identity.description,
    icons: identity.faviconUrl ? {icon: identity.faviconUrl, shortcut: identity.faviconUrl, apple: identity.faviconUrl} : undefined,
    openGraph: {
      type: "website",
      siteName: identity.brandName,
      title: identity.siteTitle,
      description: identity.description,
      images: identity.ogImageUrl ? [{url: identity.ogImageUrl}] : undefined,
    },
    twitter: {
      card: identity.ogImageUrl ? "summary_large_image" : "summary",
      title: identity.siteTitle,
      description: identity.description,
      images: identity.ogImageUrl ? [identity.ogImageUrl] : undefined,
    },
    robots: identity.indexable ? {index: true, follow: true} : {index: false, follow: false},
    alternates: {types: {"application/rss+xml": siteUrl("/feed.xml")}},
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default async function RootLayout({children}: Readonly<{children: ReactNode}>) {
  const initialNow = Date.now();
  const [locale, launchConfig] = await Promise.all([requestLocale(), getSiteLaunchConfig()]);
  return <html lang={locale} dir={direction(locale)} data-scroll-behavior="smooth"><body><SiteLaunchGate locale={locale} config={launchConfig} initialNow={initialNow}>{children}</SiteLaunchGate><Suspense fallback={null}><HotelMobileCommerceEnhancer/></Suspense></body></html>;
}
