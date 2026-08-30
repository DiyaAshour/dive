import {redirect} from "next/navigation";
import {Cable, CheckCircle2, RefreshCcw, ShieldCheck} from "lucide-react";
import {getHotelConnectivityWorkspace, listUserHotels} from "@platform/server";
import {PartnerSidebar} from "@/components/partner-sidebar";
import {PartnerLanguageBar} from "@/components/partner-language-bar";
import {currentUser} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {direction} from "@/lib/i18n";
import ConnectivityManager from "./connectivity-manager";

export const dynamic = "force-dynamic";

export default async function ConnectivityPage({searchParams}: {searchParams: Promise<{hotelId?: string}>}) {
  const user = await currentUser();
  if (!user) redirect("/partner/login");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const hotels = await listUserHotels(user.id);
  if (!hotels.length) redirect("/partner/onboarding");
  const query = await searchParams;
  const selected = hotels.find((hotel) => hotel.id === query.hotelId) ?? hotels[0];
  if (!selected) redirect("/partner/onboarding");
  const workspace = await getHotelConnectivityWorkspace(user.id, selected.id);
  const connection = workspace.connection;
  const roomCount = workspace.rooms.filter((room) => room.active).length;
  const mappedRooms = Array.isArray(connection?.roomMappings) ? connection.roomMappings.length : 0;

  return <main className="partnerAppShell" dir={direction(locale)}>
    <PartnerSidebar hotelId={selected.id} hotelName={selected.name} city={selected.city} status={selected.status} active="connectivity" locale={locale}/>
    <section className="partnerMain">
      <PartnerLanguageBar locale={locale}/>
      <div className="partnerTopbar"><div><span className="partnerPageEyebrow">{ar ? "Property systems" : "Property systems"}</span><h1>{ar ? "الاتصالات والتكامل" : "Connectivity & integrations"}</h1><p>{ar ? "اربط نظام الفندق مرة واحدة. بعدها تنتقل الحجوزات والأسعار والمخزون تلقائيًا بين HandMeKey ونظامك." : "Connect your property system once, then keep reservations, rates and inventory synchronized automatically."}</p></div></div>
      <div className="partnerPageIntro"><strong>{ar ? "مصمم لأي فندق وأي نظام" : "Built for every property system"}</strong><span>{ar ? "Oracle OPERA Cloud هو أول اتصال Enterprise فعلي. نفس الطبقة جاهزة لإضافة SiteMinder وCloudbeds وMews وباقي المزودين بدون تغيير محرك الحجز." : "Oracle OPERA Cloud is the first production enterprise adapter. The same layer is ready for SiteMinder, Cloudbeds, Mews and additional providers without changing the booking engine."}</span></div>
      <div className="partnerKpiGrid">
        <Metric icon={<Cable size={18}/>} label={ar ? "حالة الاتصال" : "Connection"} value={connection?.status ?? (ar ? "غير مربوط" : "Not connected")}/>
        <Metric icon={<ShieldCheck size={18}/>} label={ar ? "الأسرار" : "Credentials"} value={connection?.credentialsConfigured ? (ar ? "مشفرة" : "Encrypted") : "—"}/>
        <Metric icon={<CheckCircle2 size={18}/>} label={ar ? "الغرف المربوطة" : "Mapped rooms"} value={`${mappedRooms}/${roomCount}`}/>
        <Metric icon={<RefreshCcw size={18}/>} label={ar ? "آخر فحص" : "Last health check"} value={connection?.lastHealthCheckAt ? new Date(connection.lastHealthCheckAt).toLocaleString(locale === "ar" ? "ar-JO" : "en-GB") : "—"}/>
      </div>
      <ConnectivityManager hotelId={selected.id} locale={locale} initialConnection={connection} rooms={workspace.rooms} providers={workspace.providers}/>
    </section>
  </main>;
}

function Metric({icon, label, value}: {icon: React.ReactNode; label: string; value: string}) {
  return <div><span>{icon}{label}</span><strong>{value}</strong></div>;
}
