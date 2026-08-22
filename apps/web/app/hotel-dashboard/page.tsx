import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Building2, CalendarDays, CircleDollarSign, Hotel, MessageSquare, ShieldCheck, Star, Tags, Users } from "lucide-react";
import { getHotelPublicContentForManagement, getHotelWorkspace, getPublishingReadiness, listHotelMedia, listUserHotels } from "@platform/server";
import { currentUser } from "@/lib/server-session";
import SetupManager from "./setup-manager";
import PublicContentManager from "./public-content-manager";
import PublishingManager from "./publishing-manager";
import MediaManager from "./media-manager";

export default async function HotelDashboard({searchParams}: {searchParams: Promise<{hotelId?: string}>}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const hotels = await listUserHotels(user.id);
  if (hotels.length === 0) redirect("/partner/onboarding");
  const query = await searchParams;
  const selected = hotels.find((hotel) => hotel.id === query.hotelId) ?? hotels[0];
  if (!selected) redirect("/partner/onboarding");
  const [workspace, publicContent, readiness, media] = await Promise.all([
    getHotelWorkspace(user.id, selected.id),
    getHotelPublicContentForManagement(user.id, selected.id),
    getPublishingReadiness(user.id, selected.id),
    listHotelMedia(user.id, selected.id),
  ]);
  const ratePlanCount = workspace.roomTypes.reduce((sum, roomType) => sum + roomType.ratePlans.length, 0);
  const serviceRate = Number(workspace.serviceRate) * 100;
  const taxRate = Number(workspace.taxRate) * 100;
  const latestReview = readiness.latestReview ? {...readiness.latestReview,submittedAt: readiness.latestReview.submittedAt.toISOString(),reviewedAt: readiness.latestReview.reviewedAt?.toISOString() ?? null} : null;
  const mediaProps = media.map((item) => ({...item,uploadExpiresAt: item.uploadExpiresAt.toISOString(),uploadedAt: item.uploadedAt?.toISOString() ?? null,createdAt: item.createdAt.toISOString(),document: item.document ? {...item.document, submittedAt: item.document.submittedAt.toISOString(), reviewedAt: item.document.reviewedAt?.toISOString() ?? null} : null}));

  return <main className="dashboardBg"><aside className="sidebar"><Link href="/" className="brandMark light">B</Link><div className="sideGroup"><span>PROPERTY</span><Link className="active" href={`/hotel-dashboard?hotelId=${workspace.id}`}><Hotel size={18}/>Setup overview</Link><Link href={`/hotel-dashboard/reservations?hotelId=${workspace.id}`}><CalendarDays size={18}/>Reservations</Link><a><Users size={18}/>Team & roles</a></div><div className="sideGroup"><span>GUEST & COMMERCIAL</span><Link href={`/hotel-dashboard/performance?hotelId=${workspace.id}`}><BarChart3 size={18}/>Performance</Link><Link href={`/hotel-dashboard/promotions?hotelId=${workspace.id}`}><Tags size={18}/>Promotions</Link><Link href={`/hotel-dashboard/messages?hotelId=${workspace.id}`}><MessageSquare size={18}/>Guest messages</Link><Link href={`/hotel-dashboard/reviews?hotelId=${workspace.id}`}><Star size={18}/>Reviews</Link><a><CircleDollarSign size={18}/>Finance</a></div></aside><section className="dashboardMain"><div className="dashTop"><div><span className="eyebrow">Hotel partner workspace</span><h1>{workspace.name}</h1><p className="muted">{workspace.city} · {workspace.countryCode} · {workspace.status}</p></div><Link className="secondaryButton" href="/partner/onboarding">Add property</Link></div><div className="kpiGrid"><div className="kpi"><span>Property status</span><strong>{workspace.status}</strong></div><div className="kpi"><span>Room types</span><strong>{workspace.roomTypes.length}</strong></div><div className="kpi"><span>Rate plans</span><strong>{ratePlanCount}</strong></div><div className="kpi"><span>Team members</span><strong>{workspace.memberships.length}</strong></div><div className="kpi"><span>Service charge</span><strong>{serviceRate.toFixed(1)}%</strong></div><div className="kpi"><span>Tax / charges</span><strong>{taxRate.toFixed(1)}%</strong></div></div><div className="alertGrid"><div className="alertCard"><ShieldCheck size={19}/><div><strong>Review-gated publishing</strong><p>The property becomes discoverable only after the current publish revision passes platform review.</p></div></div><div className="alertCard"><Building2 size={19}/><div><strong>First-party performance intelligence</strong><p>Search demand, property views and checkout conversion are measured from platform events without guest fingerprinting.</p></div></div></div><PublishingManager hotelId={workspace.id} readiness={{...readiness,latestReview}}/><MediaManager hotelId={workspace.id} initialMedia={mediaProps}/><PublicContentManager hotelId={workspace.id} content={{area:publicContent.area,description:publicContent.description,starRating:publicContent.starRating,latitude:publicContent.latitude,longitude:publicContent.longitude,checkInTime:publicContent.checkInTime,checkOutTime:publicContent.checkOutTime,amenities:publicContent.amenities.map((amenity)=>({code:amenity.code,name:amenity.name,category:amenity.category}))}}/><SetupManager hotelId={workspace.id} overbookingEnabled={workspace.overbookingEnabled} roomTypes={workspace.roomTypes.map((roomType)=>({id:roomType.id,name:roomType.name,code:roomType.code,ratePlans:roomType.ratePlans.map((plan)=>({id:plan.id,name:plan.name,code:plan.code,allowPayNow:plan.allowPayNow,allowPayAtHotel:plan.allowPayAtHotel,cancellationPolicy:plan.cancellationPolicy?{name:plan.cancellationPolicy.name}:null}))}))}/></section></main>;
}
