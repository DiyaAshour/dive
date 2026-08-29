import { redirect } from "next/navigation";
import { getHotelWorkspace, listHotelVisibilityBoostCampaigns, listUserHotels } from "@platform/server";
import { PartnerSidebar } from "@/components/partner-sidebar";
import { PartnerLanguageBar } from "@/components/partner-language-bar";
import { currentUser } from "@/lib/server-session";
import { requestLocale } from "@/lib/request-locale";
import { direction } from "@/lib/i18n";
import VisibilityBoostManager from "./visibility-boost-manager";

function propertyStatusLabel(status: string, verified: boolean, ar: boolean) {
  if (status === "ACTIVE" && verified) return ar ? "منشأة مباشرة وموثقة" : "Live and verified";
  if (status === "ACTIVE") return ar ? "مباشرة، بانتظار التوثيق" : "Live, verification pending";
  if (status === "PENDING_REVIEW") return ar ? "قيد المراجعة" : "Pending review";
  if (status === "SUSPENDED") return ar ? "موقوفة" : "Suspended";
  return ar ? "مسودة" : "Draft";
}

export default async function VisibilityBoostPage({searchParams}:{searchParams:Promise<{hotelId?:string}>}) {
  const user = await currentUser();
  if (!user) redirect("/partner/login");
  const locale = await requestLocale();
  const ar = locale === "ar";
  const hotels = await listUserHotels(user.id);
  if (!hotels.length) redirect("/partner/onboarding");
  const query = await searchParams;
  const selected = hotels.find((hotel) => hotel.id === query.hotelId) ?? hotels[0];
  if (!selected) redirect("/hotel-dashboard");
  const workspace = await getHotelWorkspace(user.id, selected.id);
  const eligible = workspace.status === "ACTIVE" && workspace.verified;
  const campaigns = eligible ? await listHotelVisibilityBoostCampaigns(user.id, selected.id) : [];

  return <main className="partnerAppShell" dir={direction(locale)}>
    <PartnerSidebar hotelId={workspace.id} hotelName={workspace.name} city={workspace.city} status={workspace.status} active="visibility" locale={locale}/>
    <section className="partnerMain">
      <PartnerLanguageBar locale={locale}/>
      <div className="partnerTopbar"><div><span className="partnerPageEyebrow">GROW</span><h1>{ar ? "زيادة الظهور" : "Visibility Boost"}</h1><p>{ar ? "استهدف الأسواق التي تريدها وارفع ظهور الفندق مقابل عمولة إضافية فقط على حجوزات الحملة." : "Target the markets you want and increase property visibility with extra commission only on campaign bookings."}</p></div></div>
      {eligible ? <VisibilityBoostManager hotelId={selected.id} baseCommissionRate={Number(workspace.commissionRate)} initialCampaigns={campaigns} locale={locale}/> : <section className="boostEligibilityPanel" aria-labelledby="visibility-eligibility-title">
        <div className="boostEligibilityMark" aria-hidden="true">HMK</div>
        <div className="boostEligibilityBody">
          <span className="boostKicker">{ar ? "الأهلية التجارية" : "Commercial eligibility"}</span>
          <h2 id="visibility-eligibility-title">{ar ? "زيادة الظهور غير متاحة لهذه المنشأة بعد" : "Visibility Boost is not available for this property yet"}</h2>
          <p>{ar ? "تتوفر الأداة فقط بعد اعتماد المنشأة ونشرها مباشرة على HandMeKey. المنشآت المسودة أو غير الموثقة لا يمكنها إنشاء أو تشغيل حملات زيادة ظهور." : "This tool becomes available only after the property is approved, verified and live on HandMeKey. Draft or unverified properties cannot create or activate visibility campaigns."}</p>
          <div className="boostEligibilityStatus">
            <div><span>{ar ? "المنشأة" : "Property"}</span><strong>{workspace.name}</strong></div>
            <div><span>{ar ? "الحالة الحالية" : "Current status"}</span><strong>{propertyStatusLabel(workspace.status, workspace.verified, ar)}</strong></div>
            <div><span>{ar ? "المطلوب" : "Required"}</span><strong>{ar ? "ACTIVE + موثقة" : "ACTIVE + verified"}</strong></div>
          </div>
          <div className="boostEligibilityNote">{ar ? "أي حملة أُنشئت سابقًا بالخطأ لن تدخل في ترتيب البحث ولن تُنسب لها عمولة إضافية ما دامت المنشأة غير مؤهلة." : "Any campaign created previously in error is excluded from search ranking and extra-commission attribution while the property remains ineligible."}</div>
        </div>
      </section>}
    </section>
  </main>;
}
