import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarDays, CircleDollarSign, Hotel, ShieldCheck, Users } from "lucide-react";
import { getHotelWorkspace, listUserHotels } from "@platform/server";
import { currentUser } from "@/lib/server-session";
import SetupManager from "./setup-manager";

export default async function HotelDashboard({searchParams}: {searchParams: Promise<{hotelId?: string}>}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const hotels = await listUserHotels(user.id);
  if (hotels.length === 0) redirect("/partner/onboarding");
  const query = await searchParams;
  const selected = hotels.find((hotel) => hotel.id === query.hotelId) ?? hotels[0];
  if (!selected) redirect("/partner/onboarding");
  const workspace = await getHotelWorkspace(user.id, selected.id);
  const ratePlanCount = workspace.roomTypes.reduce((sum, roomType) => sum + roomType.ratePlans.length, 0);
  const serviceRate = Number(workspace.serviceRate) * 100;
  const taxRate = Number(workspace.taxRate) * 100;

  return <main className="dashboardBg"><aside className="sidebar"><Link href="/" className="brandMark light">B</Link><div className="sideGroup"><span>PROPERTY</span><a className="active"><Hotel size={18}/>Setup overview</a><a><CalendarDays size={18}/>Rates & availability</a><a><Users size={18}/>Team & roles</a></div><div className="sideGroup"><span>COMMERCIAL</span><a><CircleDollarSign size={18}/>Finance</a></div></aside><section className="dashboardMain"><div className="dashTop"><div><span className="eyebrow">Hotel partner workspace</span><h1>{workspace.name}</h1><p className="muted">{workspace.city} · {workspace.countryCode} · {workspace.status}</p></div><Link className="secondaryButton" href="/partner/onboarding">Add property</Link></div><div className="kpiGrid"><div className="kpi"><span>Property status</span><strong>{workspace.status}</strong></div><div className="kpi"><span>Room types</span><strong>{workspace.roomTypes.length}</strong></div><div className="kpi"><span>Rate plans</span><strong>{ratePlanCount}</strong></div><div className="kpi"><span>Team members</span><strong>{workspace.memberships.length}</strong></div><div className="kpi"><span>Service charge</span><strong>{serviceRate.toFixed(1)}%</strong></div><div className="kpi"><span>Tax / charges</span><strong>{taxRate.toFixed(1)}%</strong></div></div><div className="alertGrid"><div className="alertCard"><ShieldCheck size={19}/><div><strong>Draft-first publishing</strong><p>The property cannot become bookable until verification and inventory setup are complete.</p></div></div><div className="alertCard"><Building2 size={19}/><div><strong>Role-based access active</strong><p>Your access is scoped to this property. Other hotel workspaces remain isolated.</p></div></div></div><SetupManager hotelId={workspace.id} overbookingEnabled={workspace.overbookingEnabled} roomTypes={workspace.roomTypes.map((roomType)=>({id:roomType.id,name:roomType.name,code:roomType.code,ratePlans:roomType.ratePlans.map((plan)=>({id:plan.id,name:plan.name,code:plan.code}))}))}/></section></main>;
}
