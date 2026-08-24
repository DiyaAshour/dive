import { redirect } from "next/navigation";
import { getHotelWorkspace, listHotelPromotions, listUserHotels } from "@platform/server";
import { PartnerSidebar } from "@/components/partner-sidebar";
import { PartnerLanguageBar } from "@/components/partner-language-bar";
import { currentUser } from "@/lib/server-session";
import { requestLocale } from "@/lib/request-locale";
import { direction } from "@/lib/i18n";
import { portalDictionary } from "@/lib/portal-i18n";
import PromotionManager from "./promotion-manager";

export default async function PromotionsPage({searchParams}:{searchParams:Promise<{hotelId?:string}>}){
  const user=await currentUser();if(!user)redirect("/partner/login");
  const locale=await requestLocale();const copy=portalDictionary(locale).partner;
  const hotels=await listUserHotels(user.id);if(!hotels.length)redirect("/partner/onboarding");
  const query=await searchParams;const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];if(!selected)redirect("/hotel-dashboard");
  const [workspace,promotions]=await Promise.all([getHotelWorkspace(user.id,selected.id),listHotelPromotions(user.id,selected.id)]);
  const ratePlans=workspace.roomTypes.flatMap((room)=>room.ratePlans.map((plan)=>({id:plan.id,name:plan.name,code:plan.code,roomName:room.name})));
  const initial=promotions.map((promotion)=>({id:promotion.id,name:promotion.name,code:promotion.code,discountPercent:Number(promotion.discountPercent),bookingStartsAt:promotion.bookingStartsAt.toISOString(),bookingEndsAt:promotion.bookingEndsAt.toISOString(),stayStartsOn:promotion.stayStartsOn.toISOString().slice(0,10),stayEndsOn:promotion.stayEndsOn.toISOString().slice(0,10),minimumNights:promotion.minimumNights,status:promotion.status,ratePlans:promotion.ratePlans.map((item)=>({id:item.ratePlan.id,name:item.ratePlan.name,code:item.ratePlan.code,roomName:item.ratePlan.roomType.name}))}));
  return <main className="partnerAppShell" dir={direction(locale)}><PartnerSidebar hotelId={workspace.id} hotelName={workspace.name} city={workspace.city} status={workspace.status} active="promotions" locale={locale}/><section className="partnerMain"><PartnerLanguageBar locale={locale}/><div className="partnerTopbar"><div><span className="partnerPageEyebrow">{copy.commercial}</span><h1>{copy.promotionsTitle}</h1><p>{copy.promotionsBody}</p></div></div><div className="partnerPageIntro"><strong>{copy.oneEngine}</strong><span>{copy.oneEngineBody}</span></div><PromotionManager hotelId={selected.id} ratePlans={ratePlans} initialPromotions={initial} locale={locale}/></section></main>;
}
