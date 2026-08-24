import { redirect } from "next/navigation";
import { localDateInTimeZone } from "@platform/core";
import { hotelReservationQuerySchema } from "@platform/contracts";
import { getHotelWorkspace, listHotelReservationOperations, listUserHotels } from "@platform/server";
import { PartnerSidebar } from "@/components/partner-sidebar";
import { PartnerLanguageBar } from "@/components/partner-language-bar";
import { currentUser } from "@/lib/server-session";
import { requestLocale } from "@/lib/request-locale";
import { direction } from "@/lib/i18n";
import { portalDictionary } from "@/lib/portal-i18n";
import OperationsBoard from "./operations-board";

export const dynamic="force-dynamic";

export default async function ReservationsPage({searchParams}:{searchParams:Promise<{hotelId?:string;date?:string;scope?:string}>}){
  const user=await currentUser();if(!user)redirect("/partner/login");
  const locale=await requestLocale();const copy=portalDictionary(locale).partner;
  const hotels=await listUserHotels(user.id);if(!hotels.length)redirect("/partner/onboarding");
  const query=await searchParams;const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];if(!selected)redirect("/partner/onboarding");
  const workspace=await getHotelWorkspace(user.id,selected.id);
  const fallbackDate=localDateInTimeZone(new Date(),workspace.timezone);
  const parsed=hotelReservationQuerySchema.safeParse({date:query.date??fallbackDate,scope:query.scope??"ALL"});
  const filters=parsed.success?parsed.data:{date:fallbackDate,scope:"ALL" as const};
  const report=await listHotelReservationOperations(user.id,workspace.id,filters);
  const reservations=report.reservations.map((booking)=>({...booking,guestRequests:booking.guestRequests.map((request)=>({...request,createdAt:request.createdAt.toISOString()})),frontDeskNotes:booking.frontDeskNotes.map((note)=>({...note,createdAt:note.createdAt.toISOString()}))}));
  return <main className="partnerAppShell" dir={direction(locale)}><PartnerSidebar hotelId={workspace.id} hotelName={workspace.name} city={workspace.city} status={workspace.status} active="reservations" locale={locale}/><section className="partnerMain"><PartnerLanguageBar locale={locale}/><div className="partnerTopbar"><div><span className="partnerPageEyebrow">{copy.reservationsEyebrow}</span><h1>{copy.stayOperations}</h1><p>{workspace.name} · {workspace.timezone}</p></div></div><div className="partnerPageIntro"><strong>{copy.commercialContext}</strong><span>{copy.commercialContextBody}</span></div><OperationsBoard hotelId={workspace.id} initialDate={filters.date} initialScope={filters.scope} initialReservations={reservations} locale={locale}/></section></main>;
}
