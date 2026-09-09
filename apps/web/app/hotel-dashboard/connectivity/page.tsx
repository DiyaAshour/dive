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
  const activeRooms = workspace.rooms.filter((room) => room.active);
  const activePlans = activeRooms.flatMap((room) => room.ratePlans.filter((plan) => plan.active));
  const activeRoomIds = new Set(activeRooms.map((room) => room.id));
  const activePlanIds = new Set(activePlans.map((plan) => plan.id));
  const mappedRooms = mappedLocalIds(connection?.roomMappings).filter((id) => activeRoomIds.has(id)).length;
  const mappedPlans = mappedLocalIds(connection?.ratePlanMappings).filter((id) => activePlanIds.has(id)).length;
  const mappingsComplete = mappedRooms === activeRooms.length && mappedPlans === activePlans.length && activeRooms.length > 0 && activePlans.length > 0;
  const healthPassed = connection?.status === "CONNECTED" && Boolean(connection.lastHealthyAt);
  const setupReady = Boolean(connection?.credentialsConfigured && healthPassed && mappingsComplete);

  return <main className="partnerAppShell" dir={direction(locale)}>
    <PartnerSidebar hotelId={selected.id} hotelName={selected.name} city={selected.city} status={selected.status} active="connectivity" locale={locale}/>
    <section className="partnerMain">
      <PartnerLanguageBar locale={locale}/>
      <div className="partnerTopbar"><div><span className="partnerPageEyebrow">{ar ? "أنظمة الفندق" : "Property systems"}</span><h1>{ar ? "الاتصالات والتكامل" : "Connectivity & integrations"}</h1><p>{ar ? "اربط نظام الفندق، افحص بيانات الدخول، وأكمل Mapping الغرف وخطط الأسعار. المزامنة الحية ثنائية الاتجاه تُفعّل فقط بعد تجهيز عامل التسليم الخاص بالموصل." : "Connect the property system, validate credentials and complete room/rate-plan mappings. Live two-way synchronization is enabled only after the connector delivery worker is configured."}</p></div></div>
      <div className="partnerPageIntro"><strong>{setupReady ? (ar ? "إعداد الاتصال جاهز للانتقال إلى مرحلة المزامنة" : "Connection setup is ready for the synchronization stage") : (ar ? "أكمل متطلبات الجاهزية قبل تشغيل المزامنة" : "Complete go-live prerequisites before synchronization")}</strong><span>{ar ? "Oracle OPERA Cloud / OHIP لديه الآن طبقة اتصال فعلية للمصادقة والـmapping وفحص الصحة. لا تعتبر الحجوزات والأسعار والمخزون متزامنة حتى يتم تشغيل ومراقبة delivery worker." : "Oracle OPERA Cloud / OHIP has a real authentication, mapping and health-check foundation. Reservations, rates and inventory are not considered synchronized until a delivery worker is running and monitored."}</span></div>
      <div className="partnerKpiGrid">
        <Metric icon={<Cable size={18}/>} label={ar ? "حالة الاتصال" : "Connection"} value={connection?.status ?? (ar ? "غير مربوط" : "Not connected")}/>
        <Metric icon={<ShieldCheck size={18}/>} label={ar ? "بيانات الدخول" : "Credentials"} value={connection?.credentialsConfigured ? (ar ? "مشفرة" : "Encrypted") : "—"}/>
        <Metric icon={<CheckCircle2 size={18}/>} label={ar ? "الغرف المربوطة" : "Mapped rooms"} value={`${mappedRooms}/${activeRooms.length}`}/>
        <Metric icon={<CheckCircle2 size={18}/>} label={ar ? "خطط الأسعار المربوطة" : "Mapped rate plans"} value={`${mappedPlans}/${activePlans.length}`}/>
        <Metric icon={<RefreshCcw size={18}/>} label={ar ? "آخر فحص صحة" : "Last health check"} value={connection?.lastHealthCheckAt ? new Date(connection.lastHealthCheckAt).toLocaleString(locale === "ar" ? "ar-JO" : "en-GB") : "—"}/>
        <Metric icon={<RefreshCcw size={18}/>} label={ar ? "آخر مزامنة فعلية" : "Last live sync"} value={connection?.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString(locale === "ar" ? "ar-JO" : "en-GB") : (ar ? "لم تبدأ" : "Not started")}/>
      </div>
      <ConnectivityManager hotelId={selected.id} locale={locale} initialConnection={connection} rooms={workspace.rooms} providers={workspace.providers}/>
    </section>
  </main>;
}

function Metric({icon, label, value}: {icon: React.ReactNode; label: string; value: string}) {
  return <div><span>{icon}{label}</span><strong>{value}</strong></div>;
}

function mappedLocalIds(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const localId = (item as Record<string, unknown>).localId;
    return typeof localId === "string" ? [localId] : [];
  });
}
