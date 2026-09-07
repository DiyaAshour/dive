import Link from "next/link";
import { BarChart3, BedDouble, Cable, CalendarDays, DollarSign, Hotel, Landmark, MessageSquare, Settings2, Star, Tags } from "lucide-react";
import { hotelRoleCan, type HotelPermission, type HotelRole } from "@platform/core";
import { listUserHotels } from "@platform/server";
import { Brand } from "./brand";
import { LanguageSwitcher } from "./language-switcher";
import type { Locale } from "@/lib/i18n";
import { portalDictionary } from "@/lib/portal-i18n";
import { currentUser } from "@/lib/server-session";

type PartnerSidebarProps = Readonly<{
  hotelId: string;
  hotelName: string;
  city?: string;
  status?: string;
  locale: Locale;
  active: "overview" | "rooms" | "rates" | "connectivity" | "reservations" | "finance" | "performance" | "promotions" | "visibility" | "messages" | "reviews";
}>;

export async function PartnerSidebar({hotelId, hotelName, city, status, active, locale}: PartnerSidebarProps) {
  const copy = portalDictionary(locale).partner;
  const href = (path: string) => `${path}?hotelId=${encodeURIComponent(hotelId)}`;
  const user = await currentUser();
  const membership = user ? (await listUserHotels(user.id)).find((hotel) => hotel.id === hotelId) : null;
  const role = membership?.role as HotelRole | undefined;
  const can = (permission: HotelPermission) => !role || hotelRoleCan(role, permission);
  const canRates = can("rates:manage") || can("inventory:manage");
  const live = status === "ACTIVE";

  return <aside className="partnerSidebar">
    <div className="partnerBrand"><Brand href="/partner" inverse/><span>{copy.name}</span></div>
    <div className="propertyContext">
      <span className="propertyContextLabel">{copy.currentProperty}</span>
      <strong>{hotelName}</strong>
      <small>{city ?? ""}{city && status ? " · " : ""}{status ?? ""}{role ? ` · ${roleLabel(role, locale === "ar")}` : ""}</small>
    </div>
    <nav className="partnerNav" aria-label="Partner navigation">
      <span>{copy.operate}</span>
      <Link className={active === "overview" ? "active" : ""} href={href("/hotel-dashboard")}><Hotel size={18}/>{live ? (locale === "ar" ? "اليوم" : "Today") : (locale === "ar" ? "إعداد الفندق" : "Property setup")}</Link>
      {can("bookings:view") && <Link className={active === "reservations" ? "active" : ""} href={href("/hotel-dashboard/reservations")}><CalendarDays size={18}/>{copy.reservations}</Link>}
      {canRates && <Link className={active === "rates" ? "active" : ""} href={href("/hotel-dashboard/rates")}><DollarSign size={18}/>{locale === "ar" ? "الأسعار والمخزون" : "Rates & inventory"}</Link>}
      {can("rooms:manage") && <Link className={active === "rooms" ? "active" : ""} href={href("/hotel-dashboard/rooms")}><BedDouble size={18}/>{copy.rooms}</Link>}
      {can("finance:view") && <Link className={active === "finance" ? "active" : ""} href={href("/hotel-dashboard/finance")}><Landmark size={18}/>{locale === "ar" ? "المالية والفواتير" : "Finance & statements"}</Link>}

      {(can("analytics:view") || can("rates:manage")) && <span>{copy.grow}</span>}
      {can("analytics:view") && <Link className={active === "performance" ? "active" : ""} href={href("/hotel-dashboard/performance")}><BarChart3 size={18}/>{copy.performance}</Link>}
      {can("rates:manage") && <Link className={active === "promotions" ? "active" : ""} href={href("/hotel-dashboard/promotions")}><Tags size={18}/>{copy.promotions}</Link>}

      {can("bookings:view") && <span>{copy.guests}</span>}
      {can("bookings:view") && <Link className={active === "messages" ? "active" : ""} href={href("/hotel-dashboard/messages")}><MessageSquare size={18}/>{copy.messages}</Link>}
      {can("hotel:view") && <Link className={active === "reviews" ? "active" : ""} href={href("/hotel-dashboard/reviews")}><Star size={18}/>{copy.reviews}</Link>}
    </nav>
    <div className="partnerSidebarFooter">
      <LanguageSwitcher locale={locale} compact/>
      {can("hotel:edit") && <Link href={href("/hotel-dashboard/property")}><Settings2 size={16}/>{locale === "ar" ? "إعدادات الفندق" : "Property settings"}</Link>}
      {can("hotel:edit") && <Link href={href("/hotel-dashboard/connectivity")}><Cable size={16}/>{locale === "ar" ? "الربط والتكاملات" : "Integrations"}</Link>}
      {can("hotel:edit") && <Link href="/partner/onboarding"><Settings2 size={16}/>{copy.addProperty}</Link>}
      <Link href="/">{copy.openMarketplace}</Link>
    </div>
  </aside>;
}

function roleLabel(role: HotelRole, ar: boolean) {
  if (!ar) return role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  const labels: Record<HotelRole, string> = {
    OWNER: "مالك",
    MANAGER: "مدير",
    REVENUE: "إيرادات",
    FRONT_DESK: "استقبال",
    FINANCE: "مالية",
    VIEWER: "مشاهدة",
  };
  return labels[role];
}
