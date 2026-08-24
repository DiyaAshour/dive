import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Plus, ShieldCheck } from "lucide-react";
import { getHotelPublicContentForManagement, getHotelWorkspace, getPublishingReadiness, listHotelMedia, listUserHotels } from "@platform/server";
import { PartnerSidebar } from "@/components/partner-sidebar";
import { PartnerLanguageBar } from "@/components/partner-language-bar";
import { currentUser } from "@/lib/server-session";
import { requestLocale } from "@/lib/request-locale";
import { direction } from "@/lib/i18n";
import { portalDictionary } from "@/lib/portal-i18n";
import SetupManager from "./setup-manager";
import PublicContentManager from "./public-content-manager";
import PublishingManager from "./publishing-manager";
import MediaManager from "./media-manager";

export default async function HotelDashboard({searchParams}: {searchParams: Promise<{hotelId?: string}>}) {
  const user=await currentUser();
  if(!user)redirect("/partner/login");
  const locale=await requestLocale();const copy=portalDictionary(locale).partner;
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

  return <main className="partnerAppShell" dir={direction(locale)}>
    <PartnerSidebar hotelId={workspace.id} hotelName={workspace.name} city={workspace.city} status={workspace.status} active="overview" locale={locale}/>
    <section className="partnerMain">
      <PartnerLanguageBar locale={locale}/>
      <div className="partnerTopbar"><div><span className="partnerPageEyebrow">{copy.workspace}</span><h1>{workspace.name}</h1><p>{workspace.city} · {workspace.countryCode}</p></div><div className="partnerTopbarActions"><span className={`propertyStatus ${workspace.status.toLowerCase()}`}>{workspace.status.replaceAll("_"," ")}</span><Link className="partnerSecondaryAction" href="/partner/onboarding"><Plus size={16}/>{copy.addPropertyShort}</Link></div></div>
      <div className="partnerKpiGrid"><div><span>{copy.publishingReadiness}</span><strong>{readinessDone}/{readiness.checks.length}</strong><small>{copy.requirementsComplete}</small></div><div><span>{copy.roomTypes}</span><strong>{workspace.roomTypes.length}</strong><small>{copy.configuredCategories}</small></div><div><span>{copy.ratePlans}</span><strong>{ratePlanCount}</strong><small>{copy.commercialPackages}</small></div><div><span>{copy.teamMembers}</span><strong>{workspace.memberships.length}</strong><small>{copy.propertyAccess}</small></div><div><span>{copy.serviceCharge}</span><strong>{serviceRate.toFixed(1)}%</strong><small>{copy.pricingConfiguration}</small></div><div><span>{copy.taxCharges}</span><strong>{taxRate.toFixed(1)}%</strong><small>{copy.pricingConfiguration}</small></div></div>
      <div className="partnerInsightGrid"><div className="partnerInsight"><ShieldCheck size={20}/><div><strong>{copy.reviewGated}</strong><p>{copy.reviewGatedBody}</p></div></div><div className="partnerInsight"><Building2 size={20}/><div><strong>{copy.completeListing}</strong><p>{copy.completeListingBody}</p></div></div></div>
      <div className="partnerWorkspaceStack"><PublishingManager hotelId={workspace.id} readiness={{...readiness,latestReview}} locale={locale}/><MediaManager hotelId={workspace.id} initialMedia={mediaProps} locale={locale}/><PublicContentManager hotelId={workspace.id} content={{area:publicContent.area,description:publicContent.description,starRating:publicContent.starRating,latitude:publicContent.latitude,longitude:publicContent.longitude,checkInTime:publicContent.checkInTime,checkOutTime:publicContent.checkOutTime,amenities:publicContent.amenities.map((amenity)=>({code:amenity.code,name:amenity.name,category:amenity.category}))}} locale={locale}/><SetupManager hotelId={workspace.id} overbookingEnabled={workspace.overbookingEnabled} roomTypes={workspace.roomTypes.map((roomType)=>({id:roomType.id,name:roomType.name,code:roomType.code,ratePlans:roomType.ratePlans.map((plan)=>({id:plan.id,name:plan.name,code:plan.code,allowPayNow:plan.allowPayNow,allowPayAtHotel:plan.allowPayAtHotel,cancellationPolicy:plan.cancellationPolicy?{name:plan.cancellationPolicy.name}:null}))}))} locale={locale}/></div>
    </section>
  </main>;
}
