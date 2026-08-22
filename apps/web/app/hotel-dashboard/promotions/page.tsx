import Link from "next/link";
import { redirect } from "next/navigation";
import { getHotelWorkspace, listHotelPromotions, listUserHotels } from "@platform/server";
import { currentUser } from "@/lib/server-session";
import PromotionManager from "./promotion-manager";

export default async function PromotionsPage({searchParams}:{searchParams:Promise<{hotelId?:string}>}){
  const user=await currentUser();if(!user)redirect("/login");
  const hotels=await listUserHotels(user.id);if(!hotels.length)redirect("/partner/onboarding");
  const query=await searchParams;const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];if(!selected)redirect("/hotel-dashboard");
  const [workspace,promotions]=await Promise.all([getHotelWorkspace(user.id,selected.id),listHotelPromotions(user.id,selected.id)]);
  const ratePlans=workspace.roomTypes.flatMap((room)=>room.ratePlans.map((plan)=>({id:plan.id,name:plan.name,code:plan.code,roomName:room.name})));
  const initial=promotions.map((promotion)=>({id:promotion.id,name:promotion.name,code:promotion.code,discountPercent:Number(promotion.discountPercent),bookingStartsAt:promotion.bookingStartsAt.toISOString(),bookingEndsAt:promotion.bookingEndsAt.toISOString(),stayStartsOn:promotion.stayStartsOn.toISOString().slice(0,10),stayEndsOn:promotion.stayEndsOn.toISOString().slice(0,10),minimumNights:promotion.minimumNights,status:promotion.status,ratePlans:promotion.ratePlans.map((item)=>({id:item.ratePlan.id,name:item.ratePlan.name,code:item.ratePlan.code,roomName:item.ratePlan.roomType.name}))}));
  return <main className="soft"><header className="shell topbar"><Link href="/" className="brand">B</Link><nav><Link href={`/hotel-dashboard?hotelId=${selected.id}`}>Property</Link><Link href={`/hotel-dashboard/messages?hotelId=${selected.id}`}>Messages</Link><Link href={`/hotel-dashboard/reviews?hotelId=${selected.id}`}>Reviews</Link></nav></header><section className="shell section"><div className="sectionHead"><div><span className="eyebrow">Commercial</span><h1>Promotions · {selected.name}</h1><p className="muted">Deals change the room base through the shared pricing engine. Daily rates remain untouched.</p></div></div><PromotionManager hotelId={selected.id} ratePlans={ratePlans} initialPromotions={initial}/></section></main>;
}
