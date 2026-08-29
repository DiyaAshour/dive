import { redirect } from "next/navigation";
import { getHotelWorkspace, listHotelVisibilityBoostCampaigns, listUserHotels } from "@platform/server";
import { PartnerSidebar } from "@/components/partner-sidebar";
import { PartnerLanguageBar } from "@/components/partner-language-bar";
import { currentUser } from "@/lib/server-session";
import { requestLocale } from "@/lib/request-locale";
import { direction } from "@/lib/i18n";
import VisibilityBoostManager from "./visibility-boost-manager";

export default async function VisibilityBoostPage({searchParams}:{searchParams:Promise<{hotelId?:string}>}) {
  const user = await currentUser();
  if (!user) redirect("/partner/login");
  const locale = await requestLocale();
  const hotels = await listUserHotels(user.id);
  if (!hotels.length) redirect("/partner/onboarding");
  const query = await searchParams;
  const selected = hotels.find((hotel) => hotel.id === query.hotelId) ?? hotels[0];
  if (!selected) redirect("/hotel-dashboard");
  const [workspace, campaigns] = await Promise.all([
    getHotelWorkspace(user.id, selected.id),
    listHotelVisibilityBoostCampaigns(user.id, selected.id),
  ]);
  return <main className="partnerAppShell" dir={direction(locale)}>
    <PartnerSidebar hotelId={workspace.id} hotelName={workspace.name} city={workspace.city} status={workspace.status} active="visibility" locale={locale}/>
    <section className="partnerMain">
      <PartnerLanguageBar locale={locale}/>
      <div className="partnerTopbar"><div><span className="partnerPageEyebrow">GROW</span><h1>{locale === "ar" ? "زيادة الظهور" : "Visibility Boost"}</h1><p>{locale === "ar" ? "استهدف الأسواق التي تريدها وارفع ظهور الفندق مقابل عمولة إضافية فقط على حجوزات الحملة." : "Target the markets you want and increase property visibility with extra commission only on campaign bookings."}</p></div></div>
      <VisibilityBoostManager hotelId={selected.id} baseCommissionRate={Number(workspace.commissionRate)} initialCampaigns={campaigns} locale={locale}/>
    </section>
  </main>;
}
