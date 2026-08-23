import { redirect } from "next/navigation";
import { listHotelConversations, listUserHotels } from "@platform/server";
import { PartnerSidebar } from "@/components/partner-sidebar";
import { currentUser } from "@/lib/server-session";
import MessageInbox from "./message-inbox";

export default async function MessagesPage({searchParams}:{searchParams:Promise<{hotelId?:string}>}){
  const user=await currentUser();if(!user)redirect("/partner/login");
  const hotels=await listUserHotels(user.id);if(!hotels.length)redirect("/partner/onboarding");
  const query=await searchParams;const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];if(!selected)redirect("/hotel-dashboard");
  const conversations=await listHotelConversations(user.id,selected.id);
  const initial=conversations.map((item)=>({...item,updatedAt:item.updatedAt.toISOString(),latestMessage:item.latestMessage?{...item.latestMessage,createdAt:item.latestMessage.createdAt.toISOString()}:null}));
  return <main className="partnerAppShell"><PartnerSidebar hotelId={selected.id} hotelName={selected.name} active="messages"/><section className="partnerMain"><div className="partnerTopbar"><div><span className="partnerPageEyebrow">Guest communication</span><h1>Messages</h1><p>Booking-context conversations for {selected.name}.</p></div></div><div className="partnerPageIntro"><strong>Every thread has a reservation behind it</strong><span>Guest messages stay separate from private front-desk notes and anonymous public chat.</span></div><MessageInbox hotelId={selected.id} initialConversations={initial}/></section></main>;
}
