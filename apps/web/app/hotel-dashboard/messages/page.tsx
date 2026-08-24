import { redirect } from "next/navigation";
import { listHotelConversations, listUserHotels } from "@platform/server";
import { PartnerSidebar } from "@/components/partner-sidebar";
import { PartnerLanguageBar } from "@/components/partner-language-bar";
import { currentUser } from "@/lib/server-session";
import { requestLocale } from "@/lib/request-locale";
import { direction } from "@/lib/i18n";
import { portalDictionary } from "@/lib/portal-i18n";
import MessageInbox from "./message-inbox";

export default async function MessagesPage({searchParams}:{searchParams:Promise<{hotelId?:string}>}){
  const user=await currentUser();if(!user)redirect("/partner/login");
  const locale=await requestLocale();const copy=portalDictionary(locale).partner;
  const hotels=await listUserHotels(user.id);if(!hotels.length)redirect("/partner/onboarding");
  const query=await searchParams;const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];if(!selected)redirect("/hotel-dashboard");
  const conversations=await listHotelConversations(user.id,selected.id);
  const initial=conversations.map((item)=>({...item,updatedAt:item.updatedAt.toISOString(),latestMessage:item.latestMessage?{...item.latestMessage,createdAt:item.latestMessage.createdAt.toISOString()}:null}));
  return <main className="partnerAppShell" dir={direction(locale)}><PartnerSidebar hotelId={selected.id} hotelName={selected.name} active="messages" locale={locale}/><section className="partnerMain"><PartnerLanguageBar locale={locale}/><div className="partnerTopbar"><div><span className="partnerPageEyebrow">{copy.guestCommunication}</span><h1>{copy.messagesTitle}</h1><p>{copy.messagesBody} {selected.name}.</p></div></div><div className="partnerPageIntro"><strong>{copy.everyThread}</strong><span>{copy.everyThreadBody}</span></div><MessageInbox hotelId={selected.id} initialConversations={initial} locale={locale}/></section></main>;
}
