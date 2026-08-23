import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Plus, ShieldCheck } from "lucide-react";
import { getHotelPublicContentForManagement, getHotelWorkspace, getPublishingReadiness, listHotelMedia, listUserHotels } from "@platform/server";
import { PartnerSidebar } from "@/components/partner-sidebar";
import { currentUser } from "@/lib/server-session";
import SetupManager from "./setup-manager";
import PublicContentManager from "./public-content-manager";
import PublishingManager from "./publishing-manager";
import MediaManager from "./media-manager";

export default async function HotelDashboard({searchParams}: {searchParams: Promise<{hotelId?: string}>}) {
  const user=await currentUser();
  if(!user)redirect("/partner/login");
  const hotels=await listUserHotels(user.id);
  if(hotels.length===0)redirect("/partner/onboarding");
  const query=await searchParams;
  const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];
  if(!selected)redirect("/partner/onboarding");
  const [workspace,publicContent,readiness,media]=await Promise.all([
    getHotelWorkspace(user.id,selected.id),
    getHotelPublicContentForManagement(user.id,selected.id),
    getPublishingReadiness(user.id,selected.id),
    listHotelMedia(user.id,selected.id),
  ]);
  const ratePlanCount=workspace.roomTypes.reduce((sum,roomType)=>sum+roomType.ratePlans.length,0);
  const serviceRate=Number(workspace.serviceRate)*100;
  const taxRate=Number(workspace.taxRate)*100;
  const latestReview=readiness.latestReview?{...readiness.latestReview,submittedAt:readiness.latestReview.submittedAt.toISOString(),reviewedAt:readiness.latestReview.reviewedAt?.toISOString()??null}:null;
  const mediaProps=media.map((item)=>({...item,uploadExpiresAt:item.uploadExpiresAt.toISOString(),uploadedAt:item.uploadedAt?.toISOString()??null,createdAt:item.createdAt.toISOString(),document:item.document?{...item.document,submittedAt:item.document.submittedAt.toISOString(),reviewedAt:item.document.reviewedAt?.toISOString()??null}:null}));
  const readinessDone=readiness.checks.filter((item)=>item.passed).length;

  return <main className="partnerAppShell">
    <PartnerSidebar hotelId={workspace.id} hotelName={workspace.name} city={workspace.city} status={workspace.status} active="overview"/>
    <section className="partnerMain">
      <div className="partnerTopbar"><div><span className="partnerPageEyebrow">Property workspace</span><h1>{workspace.name}</h1><p>{workspace.city} · {workspace.countryCode}</p></div><div className="partnerTopbarActions"><span className={`propertyStatus ${workspace.status.toLowerCase()}`}>{workspace.status.replaceAll("_"," ")}</span><Link className="partnerSecondaryAction" href="/partner/onboarding"><Plus size={16}/>Add property</Link></div></div>
      <div className="partnerKpiGrid"><div><span>Publishing readiness</span><strong>{readinessDone}/{readiness.checks.length}</strong><small>requirements complete</small></div><div><span>Room types</span><strong>{workspace.roomTypes.length}</strong><small>configured categories</small></div><div><span>Rate plans</span><strong>{ratePlanCount}</strong><small>commercial packages</small></div><div><span>Team members</span><strong>{workspace.memberships.length}</strong><small>property access</small></div><div><span>Service charge</span><strong>{serviceRate.toFixed(1)}%</strong><small>pricing configuration</small></div><div><span>Tax / charges</span><strong>{taxRate.toFixed(1)}%</strong><small>pricing configuration</small></div></div>
      <div className="partnerInsightGrid"><div className="partnerInsight"><ShieldCheck size={20}/><div><strong>Publishing stays review-gated</strong><p>Only the exact submitted property revision can become live after platform review.</p></div></div><div className="partnerInsight"><Building2 size={20}/><div><strong>Complete the listing before selling</strong><p>Content, media, commercial setup and approved business documents all feed one readiness gate.</p></div></div></div>
      <div className="partnerWorkspaceStack"><PublishingManager hotelId={workspace.id} readiness={{...readiness,latestReview}}/><MediaManager hotelId={workspace.id} initialMedia={mediaProps}/><PublicContentManager hotelId={workspace.id} content={{area:publicContent.area,description:publicContent.description,starRating:publicContent.starRating,latitude:publicContent.latitude,longitude:publicContent.longitude,checkInTime:publicContent.checkInTime,checkOutTime:publicContent.checkOutTime,amenities:publicContent.amenities.map((amenity)=>({code:amenity.code,name:amenity.name,category:amenity.category}))}}/><SetupManager hotelId={workspace.id} overbookingEnabled={workspace.overbookingEnabled} roomTypes={workspace.roomTypes.map((roomType)=>({id:roomType.id,name:roomType.name,code:roomType.code,ratePlans:roomType.ratePlans.map((plan)=>({id:plan.id,name:plan.name,code:plan.code,allowPayNow:plan.allowPayNow,allowPayAtHotel:plan.allowPayAtHotel,cancellationPolicy:plan.cancellationPolicy?{name:plan.cancellationPolicy.name}:null}))}))}/></div>
    </section>
  </main>;
}
