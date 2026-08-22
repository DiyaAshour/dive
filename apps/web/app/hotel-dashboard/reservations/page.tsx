import Link from "next/link";
import { redirect } from "next/navigation";
import { localDateInTimeZone } from "@platform/core";
import { hotelReservationQuerySchema } from "@platform/contracts";
import { getHotelWorkspace, listHotelReservationOperations, listUserHotels } from "@platform/server";
import { currentUser } from "@/lib/server-session";
import OperationsBoard from "./operations-board";

export const dynamic = "force-dynamic";

export default async function ReservationsPage({searchParams}:{searchParams:Promise<{hotelId?:string;date?:string;scope?:string}>}) {
  const user=await currentUser();
  if(!user)redirect("/login");
  const hotels=await listUserHotels(user.id);
  if(!hotels.length)redirect("/partner/onboarding");
  const query=await searchParams;
  const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];
  if(!selected)redirect("/partner/onboarding");
  const workspace=await getHotelWorkspace(user.id,selected.id);
  const fallbackDate=localDateInTimeZone(new Date(),workspace.timezone);
  const parsed=hotelReservationQuerySchema.safeParse({date:query.date??fallbackDate,scope:query.scope??"ALL"});
  const filters=parsed.success?parsed.data:{date:fallbackDate,scope:"ALL" as const};
  const report=await listHotelReservationOperations(user.id,workspace.id,filters);
  const reservations=report.reservations.map((booking)=>({...booking,guestRequests:booking.guestRequests.map((request)=>({...request,createdAt:request.createdAt.toISOString()})),frontDeskNotes:booking.frontDeskNotes.map((note)=>({...note,createdAt:note.createdAt.toISOString()}))}));

  return <main className="dashboardBg"><aside className="sidebar"><Link href="/" className="brandMark light">B</Link><div className="sideGroup"><span>OPERATIONS</span><Link href={`/hotel-dashboard?hotelId=${workspace.id}`}>Property setup</Link><Link className="active" href={`/hotel-dashboard/reservations?hotelId=${workspace.id}&date=${filters.date}&scope=ALL`}>Reservations</Link></div></aside><section className="dashboardMain"><div className="dashTop"><div><span className="eyebrow">Front desk operations</span><h1>{workspace.name}</h1><p className="muted">{workspace.timezone} · operational booking data only</p></div><Link className="secondaryButton" href={`/hotel-dashboard?hotelId=${workspace.id}`}>Back to setup</Link></div><OperationsBoard hotelId={workspace.id} initialDate={filters.date} initialScope={filters.scope} initialReservations={reservations}/></section></main>;
}
