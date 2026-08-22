import Link from "next/link";
import { redirect } from "next/navigation";
import { listHotelConversations, listUserHotels } from "@platform/server";
import { currentUser } from "@/lib/server-session";
import MessageInbox from "./message-inbox";

export default async function MessagesPage({searchParams}:{searchParams:Promise<{hotelId?:string}>}){
  const user=await currentUser();if(!user)redirect("/login");const hotels=await listUserHotels(user.id);if(!hotels.length)redirect("/partner/onboarding");
  const query=await searchParams;const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];if(!selected)redirect("/hotel-dashboard");
  const conversations=await listHotelConversations(user.id,selected.id);
  const initial=conversations.map((item)=>({...item,updatedAt:item.updatedAt.toISOString(),latestMessage:item.latestMessage?{...item.latestMessage,createdAt:item.latestMessage.createdAt.toISOString()}:null}));
  return <main className="soft"><header className="shell topbar"><Link href="/" className="brand">B</Link><nav><Link href={`/hotel-dashboard?hotelId=${selected.id}`}>Property</Link><Link href={`/hotel-dashboard/promotions?hotelId=${selected.id}`}>Promotions</Link><Link href={`/hotel-dashboard/reviews?hotelId=${selected.id}`}>Reviews</Link></nav></header><section className="shell section"><div className="sectionHead"><div><span className="eyebrow">Guest communication</span><h1>Messages · {selected.name}</h1><p className="muted">Every conversation is tied to a confirmed booking.</p></div></div><MessageInbox hotelId={selected.id} initialConversations={initial}/></section></main>;
}
