import Link from "next/link";
import { BarChart3, BedDouble, CalendarDays, Hotel, MessageSquare, Settings2, Star, Tags } from "lucide-react";
import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
import type { Locale } from "@/lib/i18n";
import { portalDictionary } from "@/lib/portal-i18n";

type PartnerSidebarProps = Readonly<{
  hotelId: string;
  hotelName: string;
  city?: string;
  status?: string;
  locale: Locale;
  active: "overview" | "rooms" | "reservations" | "performance" | "promotions" | "messages" | "reviews";
}>;

export function PartnerSidebar({hotelId, hotelName, city, status, active, locale}: PartnerSidebarProps) {
  const copy = portalDictionary(locale).partner;
  const href = (path: string) => `${path}?hotelId=${encodeURIComponent(hotelId)}`;
  return <aside className="partnerSidebar">
    <div className="partnerBrand"><Brand href="/partner" inverse/><span>{copy.name}</span></div>
    <div className="propertyContext">
      <span className="propertyContextLabel">{copy.currentProperty}</span>
      <strong>{hotelName}</strong>
      <small>{city ?? ""}{city && status ? " · " : ""}{status ?? ""}</small>
    </div>
    <nav className="partnerNav" aria-label="Partner navigation">
      <span>{copy.operate}</span>
      <Link className={active === "overview" ? "active" : ""} href={href("/hotel-dashboard")}><Hotel size={18}/>{copy.property}</Link>
      <Link className={active === "rooms" ? "active" : ""} href={href("/hotel-dashboard/rooms")}><BedDouble size={18}/>{copy.rooms}</Link>
      <Link className={active === "reservations" ? "active" : ""} href={href("/hotel-dashboard/reservations")}><CalendarDays size={18}/>{copy.reservations}</Link>
      <span>{copy.grow}</span>
      <Link className={active === "performance" ? "active" : ""} href={href("/hotel-dashboard/performance")}><BarChart3 size={18}/>{copy.performance}</Link>
      <Link className={active === "promotions" ? "active" : ""} href={href("/hotel-dashboard/promotions")}><Tags size={18}/>{copy.promotions}</Link>
      <span>{copy.guests}</span>
      <Link className={active === "messages" ? "active" : ""} href={href("/hotel-dashboard/messages")}><MessageSquare size={18}/>{copy.messages}</Link>
      <Link className={active === "reviews" ? "active" : ""} href={href("/hotel-dashboard/reviews")}><Star size={18}/>{copy.reviews}</Link>
    </nav>
    <div className="partnerSidebarFooter"><LanguageSwitcher locale={locale} compact/><Link href="/partner/onboarding"><Settings2 size={16}/>{copy.addProperty}</Link><Link href="/">{copy.openMarketplace}</Link></div>
  </aside>;
}
