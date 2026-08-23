import Link from "next/link";
import { BarChart3, CalendarDays, Hotel, MessageSquare, Settings2, Star, Tags } from "lucide-react";
import { Brand } from "./brand";

type PartnerSidebarProps = Readonly<{
  hotelId: string;
  hotelName: string;
  city?: string;
  status?: string;
  active: "overview" | "reservations" | "performance" | "promotions" | "messages" | "reviews";
}>;

export function PartnerSidebar({hotelId, hotelName, city, status, active}: PartnerSidebarProps) {
  const href = (path: string) => `${path}?hotelId=${encodeURIComponent(hotelId)}`;
  return <aside className="partnerSidebar">
    <div className="partnerBrand"><Brand href="/partner" inverse/><span>Partner Hub</span></div>
    <div className="propertyContext">
      <span className="propertyContextLabel">Current property</span>
      <strong>{hotelName}</strong>
      <small>{city ?? ""}{city && status ? " · " : ""}{status ?? ""}</small>
    </div>
    <nav className="partnerNav" aria-label="Partner navigation">
      <span>Operate</span>
      <Link className={active === "overview" ? "active" : ""} href={href("/hotel-dashboard")}><Hotel size={18}/>Property</Link>
      <Link className={active === "reservations" ? "active" : ""} href={href("/hotel-dashboard/reservations")}><CalendarDays size={18}/>Reservations</Link>
      <span>Grow</span>
      <Link className={active === "performance" ? "active" : ""} href={href("/hotel-dashboard/performance")}><BarChart3 size={18}/>Performance</Link>
      <Link className={active === "promotions" ? "active" : ""} href={href("/hotel-dashboard/promotions")}><Tags size={18}/>Promotions</Link>
      <span>Guests</span>
      <Link className={active === "messages" ? "active" : ""} href={href("/hotel-dashboard/messages")}><MessageSquare size={18}/>Messages</Link>
      <Link className={active === "reviews" ? "active" : ""} href={href("/hotel-dashboard/reviews")}><Star size={18}/>Reviews</Link>
    </nav>
    <div className="partnerSidebarFooter"><Link href="/partner/onboarding"><Settings2 size={16}/>Add another property</Link><Link href="/">Open HandMeKey</Link></div>
  </aside>;
}
