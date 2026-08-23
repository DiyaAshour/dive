import { redirect } from "next/navigation";
import { getHotelWorkspace, listHotelPromotions, listUserHotels } from "@platform/server";
import { PartnerSidebar } from "@/components/partner-sidebar";
import { currentUser } from "@/lib/server-session";
import PromotionManager from "./promotion-manager";

export default async function PromotionsPage({searchParams}:{searchParams:Promise<{hotelId?:string}>}){
  const user=await currentUser();if(!user)redirect("/partner/login");
  const hotels=await listUserHotels(user.id);if(!hotels.length)redirect("/partner/onboarding");
  const query=await searchParams;const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];if(!selected)redirect("/hotel-dashboard");
  const [workspace,promotions]=await Promise.all([getHotelWorkspace(user.id,selected.id),listHotelPromotions(user.id,selected.id)]);
  const ratePlans=workspace.roomTypes.flatMap((room)=>room.ratePlans.map((plan)=>({id:plan.id,name:plan.name,code:plan.code,roomName:room.name})));
  const initial=promotions.map((promotion)=>({id:promotion.id,name:promotion.name,code:promotion.code,discountPercent:Number(promotion.discountPercent),bookingStartsAt:promotion.bookingStartsAt.toISOString(),bookingEndsAt:promotion.bookingEndsAt.toISOString(),stayStartsOn:promotion.stayStartsOn.toISOString().slice(0,10),stayEndsOn:promotion.stayEndsOn.toISOString().slice(0,10),minimumNights:promotion.minimumNights,status:promotion.status,ratePlans:promotion.ratePlans.map((item)=>({id:item.ratePlan.id,name:item.ratePlan.name,code:item.ratePlan.code,roomName:item.ratePlan.roomType.name}))}));
  return <main className="partnerAppShell"><PartnerSidebar hotelId={workspace.id} hotelName={workspace.name} city={workspace.city} status={workspace.status} active="promotions"/><section className="partnerMain"><div className="partnerTopbar"><div><span className="partnerPageEyebrow">Commercial</span><h1>Promotions</h1><p>Build targeted deals without rewriting the hotel’s daily rates.</p></div></div><div className="partnerPageIntro"><strong>One pricing engine</strong><span>Eligible deals are applied server-side across search, hotel offers, quotes and bookings.</span></div><PromotionManager hotelId={selected.id} ratePlans={ratePlans} initialPromotions={initial}/></section></main>;
}
