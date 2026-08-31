import Link from "next/link";
import { redirect } from "next/navigation";
import { BedDouble, Building2, CheckCircle2, Images, Plus, Send, ShieldCheck } from "lucide-react";
import { getHotelPublicContentForManagement, getHotelWorkspace, getPublishingReadiness, listHotelMediaWithCategories, listUserHotels } from "@platform/server";
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
  const locale=await requestLocale();
  const ar=locale==="ar";
  const copy=portalDictionary(locale).partner;
  const hotels=await listUserHotels(user.id);
  if(hotels.length===0)redirect("/partner/onboarding");
  const query=await searchParams;
  const selected=hotels.find((hotel)=>hotel.id===query.hotelId)??hotels[0];
  if(!selected)redirect("/partner/onboarding");
  const [workspace,publicContent,readiness,media]=await Promise.all([
    getHotelWorkspace(user.id,selected.id),
    getHotelPublicContentForManagement(user.id,selected.id),
    getPublishingReadiness(user.id,selected.id),
    listHotelMediaWithCategories(user.id,selected.id),
  ]);
  const ratePlanCount=workspace.roomTypes.reduce((sum,roomType)=>sum+roomType.ratePlans.length,0);
  const serviceRate=Number(workspace.serviceRate)*100;
  const taxRate=Number(workspace.taxRate)*100;
  const latestReview=readiness.latestReview?{...readiness.latestReview,submittedAt:readiness.latestReview.submittedAt.toISOString(),reviewedAt:readiness.latestReview.reviewedAt?.toISOString()??null}:null;
  const mediaProps=media.map((item)=>({...item,uploadExpiresAt:item.uploadExpiresAt.toISOString(),uploadedAt:item.uploadedAt?.toISOString()??null,createdAt:item.createdAt.toISOString(),document:item.document?{...item.document,submittedAt:item.document.submittedAt.toISOString(),reviewedAt:item.document.reviewedAt?.toISOString()??null}:null}));
  const readinessDone=readiness.checks.filter((item)=>item.passed).length;
  const passed=(code:string)=>readiness.checks.find((item)=>item.code===code)?.passed??false;
  const profileDone=["DESCRIPTION","STAR_RATING","CHECK_TIMES","AMENITIES"].every(passed);
  const photosDone=passed("PHOTOS");
  const commercialDone=["ROOM_TYPES","ROOM_PRODUCTS","RATE_PLANS","SELLABLE_CALENDAR"].every(passed);
  const publishDone=readiness.ready;
  const steps=[
    {href:"#property-profile",icon:Building2,title:ar?"1. معلومات الفندق":"1. Property details",body:ar?"اكتب الوصف، التصنيف، أوقات الدخول والمغادرة والمرافق.":"Add the description, star rating, check-in/out times and facilities.",done:profileDone},
    {href:"#property-photos",icon:Images,title:ar?"2. الصور والمعرض":"2. Photos & gallery",body:ar?"ارفع الصور وصنّفها: غرف، حمامات، لوبي، استقبال، مطاعم وغيرها.":"Upload and categorize rooms, bathrooms, lobby, reception, restaurants and more.",done:photosDone},
    {href:"#rooms-rates",icon:BedDouble,title:ar?"3. الغرف والأسعار":"3. Rooms & rates",body:ar?"أنشئ الغرف، خطط الأسعار، سياسة الإلغاء والأسعار والمخزون.":"Create rooms, rate plans, cancellation rules, rates and inventory.",done:commercialDone},
    {href:"#publishing",icon:Send,title:ar?"4. التحقق والنشر":"4. Review & publish",body:ar?"راجع الأشياء المتبقية ثم أرسل المنشأة للمراجعة عندما تصبح جاهزة.":"Review anything still missing, then submit the property when it is ready.",done:publishDone},
  ];

  return <main className="partnerAppShell" dir={direction(locale)}>
    <PartnerSidebar hotelId={workspace.id} hotelName={workspace.name} city={workspace.city} status={workspace.status} active="overview" locale={locale}/>
    <section className="partnerMain">
      <PartnerLanguageBar locale={locale}/>
      <div className="partnerTopbar"><div><span className="partnerPageEyebrow">{copy.workspace}</span><h1>{workspace.name}</h1><p>{workspace.city} · {workspace.countryCode}</p></div><div className="partnerTopbarActions"><span className={`propertyStatus ${workspace.status.toLowerCase()}`}>{statusLabel(workspace.status,ar)}</span><Link className="partnerSecondaryAction" href="/partner/onboarding"><Plus size={16}/>{copy.addPropertyShort}</Link></div></div>

      <section className="dashboardStartHere" aria-label={ar?"خطوات إعداد المنشأة":"Property setup steps"}>
        <div className="dashboardStartHereHead"><div><span className="eyebrow">{ar?"ابدأ من هنا":"Start here"}</span><h2>{ar?"جهّز منشأتك بأربع خطوات واضحة":"Set up your property in four clear steps"}</h2><p>{ar?"امشِ بالترتيب من 1 إلى 4. كل خطوة مكتملة تتحول إلى ✓، وقائمة النشر في آخر الصفحة تعرض فقط الأشياء التي ما زالت ناقصة.":"Work from step 1 to 4. Completed steps turn into a checkmark, and the publishing section only shows what is still missing."}</p></div><div className="dashboardOverallProgress"><strong>{readinessDone}/{readiness.checks.length}</strong><span>{ar?"متطلبات مكتملة":"requirements complete"}</span></div></div>
        <div className="dashboardStepGrid">{steps.map((step)=>{const Icon=step.icon;return <a href={step.href} className={`dashboardStepCard${step.done?" done":""}`} key={step.href}><span className="dashboardStepIcon">{step.done?<CheckCircle2 size={19}/>:<Icon size={19}/>}</span><div><strong>{step.title}</strong><p>{step.body}</p></div><b>{step.done?(ar?"مكتمل":"Done"):(ar?"افتح الخطوة":"Open")}</b></a>})}</div>
      </section>

      <div className="partnerKpiGrid"><div><span>{copy.publishingReadiness}</span><strong>{readinessDone}/{readiness.checks.length}</strong><small>{copy.requirementsComplete}</small></div><div><span>{copy.roomTypes}</span><strong>{workspace.roomTypes.length}</strong><small>{copy.configuredCategories}</small></div><div><span>{copy.ratePlans}</span><strong>{ratePlanCount}</strong><small>{copy.commercialPackages}</small></div><div><span>{copy.teamMembers}</span><strong>{workspace.memberships.length}</strong><small>{copy.propertyAccess}</small></div><div><span>{copy.serviceCharge}</span><strong>{serviceRate.toFixed(1)}%</strong><small>{copy.pricingConfiguration}</small></div><div><span>{copy.taxCharges}</span><strong>{taxRate.toFixed(1)}%</strong><small>{copy.pricingConfiguration}</small></div></div>
      <div className="partnerInsightGrid"><div className="partnerInsight"><ShieldCheck size={20}/><div><strong>{copy.reviewGated}</strong><p>{copy.reviewGatedBody}</p></div></div><div className="partnerInsight"><Building2 size={20}/><div><strong>{copy.completeListing}</strong><p>{copy.completeListingBody}</p></div></div></div>

      <div className="partnerWorkspaceStack">
        <div id="property-profile" className="dashboardAnchor"><PublicContentManager hotelId={workspace.id} content={{area:publicContent.area,description:publicContent.description,starRating:publicContent.starRating,latitude:publicContent.latitude,longitude:publicContent.longitude,checkInTime:publicContent.checkInTime,checkOutTime:publicContent.checkOutTime,amenities:publicContent.amenities.map((amenity)=>({code:amenity.code,name:amenity.name,category:amenity.category})),translations:publicContent.translations.map((translation)=>({locale:translation.locale,name:translation.name,description:translation.description}))}} locale={locale}/></div>
        <div id="property-photos" className="dashboardAnchor"><MediaManager hotelId={workspace.id} initialMedia={mediaProps} roomTypes={workspace.roomTypes.map((room)=>({id:room.id,name:room.name}))} locale={locale}/></div>
        <div id="rooms-rates" className="dashboardAnchor"><SetupManager hotelId={workspace.id} overbookingEnabled={workspace.overbookingEnabled} roomTypes={workspace.roomTypes.map((roomType)=>({id:roomType.id,name:roomType.name,code:roomType.code,ratePlans:roomType.ratePlans.map((plan)=>({id:plan.id,name:plan.name,code:plan.code,allowPayNow:plan.allowPayNow,allowPayAtHotel:plan.allowPayAtHotel,cancellationPolicy:plan.cancellationPolicy?{name:plan.cancellationPolicy.name}:null}))}))} locale={locale}/></div>
        <div id="publishing" className="dashboardAnchor"><PublishingManager hotelId={workspace.id} readiness={{...readiness,latestReview}} locale={locale}/></div>
      </div>
    </section>
  </main>;
}

function statusLabel(status:string,ar:boolean){
  if(!ar)return status.replaceAll("_"," ");
  const labels:Record<string,string>={DRAFT:"مسودة",PENDING_REVIEW:"قيد المراجعة",ACTIVE:"منشورة",SUSPENDED:"موقوفة"};
  return labels[status]??status.replaceAll("_"," ");
}
