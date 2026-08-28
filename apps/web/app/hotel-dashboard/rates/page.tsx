import Link from "next/link";
import {redirect} from "next/navigation";
import {CalendarDays, Gauge, Layers3, ShieldCheck} from "lucide-react";
import {getRateManagementWorkspace, listUserHotels} from "@platform/server";
import {PartnerSidebar} from "@/components/partner-sidebar";
import {PartnerLanguageBar} from "@/components/partner-language-bar";
import {currentUser} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {direction} from "@/lib/i18n";
import RateManager from "./rate-manager";

export const dynamic = "force-dynamic";

export default async function RatesPage({searchParams}: {searchParams: Promise<{hotelId?: string}>}) {
  const user = await currentUser();
  if (!user) redirect("/partner/login");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const hotels = await listUserHotels(user.id);
  if (!hotels.length) redirect("/partner/onboarding");
  const query = await searchParams;
  const selected = hotels.find((hotel) => hotel.id === query.hotelId) ?? hotels[0];
  if (!selected) redirect("/partner/onboarding");
  const workspace = await getRateManagementWorkspace(user.id, selected.id);
  const activeRooms = workspace.roomTypes.filter((room) => room.active).length;
  const activePlans = workspace.roomTypes.reduce((sum, room) => sum + room.ratePlans.filter((plan) => plan.active).length, 0);
  const roomTypes = workspace.roomTypes.map((room) => ({
    id: room.id,
    name: room.name,
    code: room.code,
    quantity: room.quantity,
    active: room.active,
    ratePlans: room.ratePlans.map((plan) => ({id: plan.id, name: plan.name, code: plan.code, active: plan.active, refundable: plan.refundable, mealPlan: plan.mealPlan})),
  }));

  return <main className="partnerAppShell" dir={direction(locale)}>
    <PartnerSidebar hotelId={selected.id} hotelName={selected.name} city={selected.city} status={selected.status} active="rates" locale={locale}/>
    <section className="partnerMain">
      <PartnerLanguageBar locale={locale}/>
      <div className="partnerTopbar"><div><span className="partnerPageEyebrow">{ar ? "إدارة الإيرادات" : "Revenue operations"}</span><h1>{ar ? "الأسعار والمخزون" : "Rates & inventory"}</h1><p>{ar ? "غيّر أسعار يوم واحد أو موسم كامل من نفس المصدر الذي يقرأ منه محرك الحجز." : "Control a single day or a full season from the same source of truth used by the booking engine."}</p></div><Link className="secondaryButton" href={`/hotel-dashboard/rooms?hotelId=${selected.id}`}>{ar ? "إدارة الغرف وخطط الأسعار" : "Manage rooms & rate plans"}</Link></div>
      <div className="partnerPageIntro"><strong>{ar ? "تقويم تشغيل حقيقي، وليس إدخال سعر بسطر واحد" : "An operating calendar, not a one-rate form"}</strong><span>{ar ? "تعديل جماعي حتى 366 يوماً، أيام أسبوع محددة، سعر ومخزون وحد أدنى/أقصى للإقامة ووقف بيع مع سجل تدقيق لكل عملية." : "Bulk-edit up to 366 days, target weekdays, rates, inventory, stay limits and stop-sell with an audit trail for every operation."}</span></div>
      <div className="partnerKpiGrid"><Metric icon={<Layers3 size={18}/>} label={ar ? "أنواع الغرف النشطة" : "Active room types"} value={activeRooms}/><Metric icon={<Gauge size={18}/>} label={ar ? "خطط الأسعار النشطة" : "Active rate plans"} value={activePlans}/><Metric icon={<CalendarDays size={18}/>} label={ar ? "أقصى تعديل جماعي" : "Bulk horizon"} value={366} suffix={ar ? " يوم" : " days"}/><Metric icon={<ShieldCheck size={18}/>} label={ar ? "تجاوز الحجز" : "Overbooking"} value={workspace.overbookingEnabled ? (ar ? "مفعّل" : "Enabled") : (ar ? "متوقف" : "Off")}/></div>
      <RateManager hotelId={selected.id} currency={workspace.currency} overbookingEnabled={workspace.overbookingEnabled} rooms={roomTypes} locale={locale}/>
    </section>
  </main>;
}

function Metric({icon, label, value, suffix = ""}: {icon: React.ReactNode; label: string; value: number | string; suffix?: string}) {
  return <div><span>{icon}{label}</span><strong>{value}{suffix}</strong></div>;
}
