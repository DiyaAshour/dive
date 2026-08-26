import { Activity, BadgeCheck, BedDouble, Car, ChevronDown, Coffee, Dumbbell, HeartPulse, MapPin, Plane, ShieldCheck, Sparkles, Star, Utensils, Waves, Wifi } from "lucide-react";
import type { getPublicHotelDetails, getPublicHotelReviews } from "@platform/server";
import type { Locale } from "@/lib/i18n";

type HotelDetails = Awaited<ReturnType<typeof getPublicHotelDetails>>;
type ReviewData = Awaited<ReturnType<typeof getPublicHotelReviews>>;

type HighlightKind = "clean" | "comfort" | "location" | "service" | "breakfast" | "transfer" | "wellness" | "activity" | "family" | "wifi";
type Highlight = Readonly<{kind: HighlightKind; title: string; body: string}>;
type BenefitGroup = Readonly<{kind: "food" | "wellness" | "activity" | "convenience"; title: string; items: string[]}>;
type Landmark = Readonly<{name: string; lat: number; lng: number}>;

export function HotelTrustLayer({hotel,reviews,locale}:{hotel:HotelDetails;reviews:ReviewData;locale:Locale}) {
  const copy=trustCopy(locale);
  const reviewCount=reviews.summary.count;
  const categories=[
    {label:copy.cleanliness,value:reviews.summary.cleanliness},
    {label:copy.service,value:reviews.summary.staff},
    {label:copy.location,value:reviews.summary.location},
    {label:copy.facilities,value:reviews.summary.facilities},
    {label:copy.comfort,value:reviews.summary.comfort},
    {label:copy.value,value:reviews.summary.value},
  ];
  const highlights=buildHighlights(hotel,reviews,locale).slice(0,6);
  const benefitGroups=buildBenefitGroups(hotel,locale);
  const priorityAmenities=["WIFI","BREAKFAST","POOL","BEACH_ACCESS","PARKING","SPA","FAMILY_ROOMS","AIRPORT_SHUTTLE","RESTAURANT","GYM"];
  const priorityRank=new Map(priorityAmenities.map((code,index)=>[code,index]));
  const quickAmenities=[...hotel.amenities]
    .sort((left,right)=>(priorityRank.get(left.code)??100)-(priorityRank.get(right.code)??100))
    .slice(0,6);
  const latestReview=reviews.reviews[0]??null;
  const limitedOffers=hotel.offers.filter((offer)=>offer.availableToSell<=3).length;
  const uniqueRooms=new Set(hotel.offers.map((offer)=>offer.roomTypeId)).size;
  const landmarks=nearbyLandmarks(hotel.city,hotel.location).slice(0,5);

  return <section className="hotelTrustLayer" aria-label={copy.overview}>
    <div className="liveStaySignal">
      <div><Sparkles size={20}/><span><strong>{copy.liveDates}</strong><small>{hotel.offers.length?`${hotel.offers.length} ${copy.liveRates} · ${uniqueRooms} ${copy.roomChoices}`:copy.noLiveRates}</small></span></div>
      {limitedOffers>0&&<strong className="liveStayScarcity">{limitedOffers} {copy.limitedChoices}</strong>}
    </div>

    <div className="trustOverviewGrid">
      <article className={`ratingSnapshot ${reviewCount===0?"isEmpty":""}`}>
        <div className="ratingSnapshotHead">
          <div><span className="sectionKicker">{copy.verifiedGuestRatings}</span><h2>{copy.guestRatings}</h2><p>{reviewCount?`${reviewCount} ${copy.verifiedReviews}`:copy.waitingReviews}</p></div>
          <div className="ratingHeroScore"><strong>{reviews.summary.overall?.toFixed(1)??"—"}</strong><span>{reviewCount?copy.excellent:copy.pending}</span><small>{copy.outOf10}</small></div>
        </div>
        <div className="ratingCategoryGrid">{categories.map((item)=><div className="ratingCategory" key={item.label}><div><span>{item.label}</span><strong>{item.value?.toFixed(1)??"—"}</strong></div><div className="ratingTrack"><span style={{width:item.value===null?"0%":`${Math.max(0,Math.min(100,item.value*10))}%`}}/></div></div>)}</div>
        {reviewCount===0&&<div className="ratingIntegrityNote"><ShieldCheck size={15}/>{copy.noSyntheticScores}</div>}
      </article>

      <aside className="propertyHighlightsPanel">
        <div className="sectionHeading"><span className="sectionKicker">{copy.highlights}</span><h2>{copy.propertyHighlights}</h2></div>
        <div className="propertyHighlightsGrid">{highlights.map((item)=><article key={`${item.kind}-${item.title}`}><div className={`highlightIcon ${item.kind}`}>{highlightIcon(item.kind)}</div><div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}</div>
      </aside>
    </div>

    {hotel.amenities.length>0&&<section className="stayEssentials">
      <div className="stayEssentialsHero">
        <div className="stayEssentialsIntro">
          <div className="stayEssentialsKicker"><Sparkles size={16}/><span>{copy.stayEssentials}</span></div>
          <h2>{copy.stayEssentialsTitle}</h2>
          <p>{copy.stayEssentialsBody}</p>
          <span className="stayEssentialsCount"><strong>{hotel.amenities.length}</strong> {copy.publishedAmenities}</span>
        </div>
        <div className="stayEssentialsQuick" aria-label={copy.quickLook}>
          <span className="stayEssentialsQuickLabel">{copy.quickLook}</span>
          <div>{quickAmenities.map((amenity)=><span className="quickAmenity" key={amenity.code}><i>{facilityIcon(amenity.code)}</i><strong>{amenityLabel(amenity.code,amenity.name,locale)}</strong></span>)}</div>
        </div>
      </div>

      {benefitGroups.length>0&&<div className="stayEssentialsGroups">{benefitGroups.map((group)=><article className={`stayEssentialGroup ${group.kind}`} key={group.kind}>
        <div className="stayEssentialGroupHead"><span>{benefitIcon(group.kind)}</span><h3>{group.title}</h3></div>
        <ul>{group.items.slice(0,3).map((item)=><li key={item}><BadgeCheck size={13}/>{item}</li>)}</ul>
        {group.items.length>3&&<small>+{group.items.length-3} {copy.more}</small>}
      </article>)}</div>}

      <details className="allFacilitiesDisclosure">
        <summary><span><strong>{copy.viewAllFacilities}</strong><small>{hotel.amenities.length} {copy.facilitiesCount}</small></span><ChevronDown size={18}/></summary>
        <div className="allFacilitiesGrid">{hotel.amenities.map((amenity)=><div key={amenity.code}><span>{facilityIcon(amenity.code)}</span><strong>{amenityLabel(amenity.code,amenity.name,locale)}</strong></div>)}</div>
      </details>
      <div className="stayEssentialsSource"><ShieldCheck size={14}/><span>{copy.facilitySource}</span></div>
    </section>}

    <div className="locationReviewGrid">
      <section className="locationDiscovery">
        <div className="sectionHeading"><span className="sectionKicker">{copy.location}</span><h2>{copy.discoverLocation}</h2><p>{hotel.area?`${hotel.area}, ${hotel.city}`:hotel.city}</p></div>
        <div className="locationBody">
          <div className="locationMapCard"><MapPin size={28}/><strong>{hotel.name}</strong><span>{hotel.address}</span>{hotel.location&&<a href={`https://www.google.com/maps/search/?api=1&query=${hotel.location.latitude},${hotel.location.longitude}`} target="_blank" rel="noreferrer">{copy.openMap}</a>}</div>
          <div className="nearbyList"><div className="nearbyListHead"><strong>{copy.nearby}</strong><small>{copy.approxDistance}</small></div>{landmarks.length?landmarks.map((place)=><div key={place.name}><span><MapPin size={14}/>{place.name}</span><strong>{formatDistance(place.distanceKm,locale)}</strong></div>):<p className="nearbyEmpty">{copy.noNearbyData}</p>}</div>
        </div>
      </section>

      <section className="verifiedGuestVoice">
        <div className="sectionHeading"><span className="sectionKicker">{copy.guestVoice}</span><h2>{copy.verifiedGuestVoice}</h2></div>
        {latestReview?<article className="guestQuote"><div className="guestQuoteScore"><Star size={17} fill="currentColor"/><strong>{latestReview.overall}/10</strong></div>{latestReview.title&&<h3>{latestReview.title}</h3>}<blockquote>“{latestReview.comment}”</blockquote><div><strong>{latestReview.guestName}</strong><span>{copy.verifiedStay} · {latestReview.stayCompleted}</span></div></article>:<div className="guestQuoteEmpty"><ShieldCheck size={25}/><h3>{copy.noQuoteYet}</h3><p>{copy.onlyVerifiedQuotes}</p></div>}
      </section>
    </div>
  </section>;
}

function buildHighlights(hotel:HotelDetails,reviews:ReviewData,locale:Locale):Highlight[] {
  const copy=trustCopy(locale);
  const codes=new Set(hotel.amenities.map((amenity)=>amenity.code));
  const output:Highlight[]=[];
  const push=(kind:HighlightKind,title:string,body:string)=>{if(!output.some((item)=>item.kind===kind))output.push({kind,title,body});};
  if((reviews.summary.cleanliness??0)>=8.5) push("clean",copy.spotless,copy.scoreSupport(copy.cleanliness,reviews.summary.cleanliness!));
  if((reviews.summary.comfort??0)>=8.5) push("comfort",copy.roomComfort,copy.scoreSupport(copy.comfort,reviews.summary.comfort!));
  if((reviews.summary.location??0)>=8.5) push("location",copy.greatLocation,copy.scoreSupport(copy.location,reviews.summary.location!));
  if((reviews.summary.staff??0)>=8.5) push("service",copy.greatService,copy.scoreSupport(copy.service,reviews.summary.staff!));
  if(codes.has("BREAKFAST")) push("breakfast",copy.breakfast,copy.breakfastBody);
  if(codes.has("AIRPORT_SHUTTLE")) push("transfer",copy.airportTransfer,copy.airportTransferBody);
  if(codes.has("SPA")||codes.has("GYM")) push("wellness",copy.wellness,copy.wellnessBody);
  if(["POOL","WATER_SPORTS","PLAY_AREA","MARINA","BEACH_ACCESS"].some((code)=>codes.has(code))) push("activity",copy.activities,copy.activitiesBody);
  if(codes.has("FAMILY_ROOMS")) push("family",copy.familyFriendly,copy.familyBody);
  if(codes.has("WIFI")) push("wifi",copy.freeWifi,copy.freeWifiBody);
  return output;
}

function buildBenefitGroups(hotel:HotelDetails,locale:Locale):BenefitGroup[] {
  const copy=trustCopy(locale);
  const groups:[BenefitGroup["kind"],string,string[]][]=[
    ["food",copy.food,["BREAKFAST","RESTAURANT","ROOM_SERVICE","ROOFTOP"]],
    ["wellness",copy.health,["SPA","GYM","POOL"]],
    ["activity",copy.activityGroup,["WATER_SPORTS","BEACH_ACCESS","MARINA","PLAY_AREA","TERRACE"]],
    ["convenience",copy.convenience,["WIFI","PARKING","AIRPORT_SHUTTLE","BUSINESS_CENTER","FAMILY_ROOMS"]],
  ];
  return groups.flatMap(([kind,title,codes])=>{
    const items=codes.flatMap((code)=>hotel.amenities.filter((amenity)=>amenity.code===code).map((amenity)=>amenityLabel(code,amenity.name,locale)));
    return items.length?[{kind,title,items}]:[];
  });
}

function highlightIcon(kind:HighlightKind) {
  if(kind==="clean") return <Sparkles size={22}/>;
  if(kind==="comfort") return <BedDouble size={22}/>;
  if(kind==="location") return <MapPin size={22}/>;
  if(kind==="service") return <ShieldCheck size={22}/>;
  if(kind==="breakfast") return <Coffee size={22}/>;
  if(kind==="transfer") return <Plane size={22}/>;
  if(kind==="wellness") return <HeartPulse size={22}/>;
  if(kind==="activity") return <Activity size={22}/>;
  if(kind==="family") return <BadgeCheck size={22}/>;
  return <Wifi size={22}/>;
}

function benefitIcon(kind:BenefitGroup["kind"]) {
  if(kind==="food") return <Utensils size={30}/>;
  if(kind==="wellness") return <HeartPulse size={30}/>;
  if(kind==="activity") return <Waves size={30}/>;
  return <Car size={30}/>;
}

function facilityIcon(code:string) {
  if(code==="WIFI") return <Wifi size={22}/>;
  if(code==="BREAKFAST"||code==="RESTAURANT"||code==="ROOM_SERVICE") return <Utensils size={22}/>;
  if(code==="POOL"||code==="BEACH_ACCESS"||code==="BEACH_SHUTTLE"||code==="WATER_SPORTS") return <Waves size={22}/>;
  if(code==="GYM") return <Dumbbell size={22}/>;
  if(code==="SPA") return <HeartPulse size={22}/>;
  if(code==="AIRPORT_SHUTTLE") return <Plane size={22}/>;
  if(code==="PARKING") return <Car size={22}/>;
  return <BadgeCheck size={22}/>;
}

function amenityLabel(code:string,fallback:string,locale:Locale) {
  if(locale!=="ar") return fallback;
  const ar:Record<string,string>={WIFI:"واي فاي مجاني",BREAKFAST:"إفطار",PARKING:"موقف سيارات",GYM:"مركز لياقة بدنية",POOL:"مسبح",SPA:"سبا",AIRPORT_SHUTTLE:"تنقلات المطار",FAMILY_ROOMS:"غرف عائلية",BUSINESS_CENTER:"مركز أعمال",RESTAURANT:"مطعم",ROOM_SERVICE:"خدمة الغرف",ROOFTOP:"تراس على السطح",PLAY_AREA:"منطقة ألعاب للأطفال",BEACH_SHUTTLE:"نقل إلى الشاطئ",BEACH_ACCESS:"وصول إلى الشاطئ",MARINA:"وصول إلى المارينا",WATER_SPORTS:"رياضات مائية",TERRACE:"تراس"};
  return ar[code]??fallback;
}

function nearbyLandmarks(city:string,location:HotelDetails["location"]) {
  if(!location) return [];
  const landmarks=landmarksFor(city);
  return landmarks.map((place)=>({...place,distanceKm:haversine(location.latitude,location.longitude,place.lat,place.lng)})).sort((a,b)=>a.distanceKm-b.distanceKm);
}

function landmarksFor(city:string):Landmark[] {
  const key=city.toLowerCase();
  if(key==="amman") return [
    {name:"Amman Citadel",lat:31.9543,lng:35.9349},
    {name:"Rainbow Street",lat:31.9496,lng:35.9264},
    {name:"The Jordan Museum",lat:31.9455,lng:35.9272},
    {name:"King Abdullah I Mosque",lat:31.9636,lng:35.9121},
  ];
  if(key==="aqaba") return [
    {name:"Aqaba Castle",lat:29.5267,lng:35.0058},
    {name:"Arab Revolt Plaza",lat:29.5264,lng:35.0050},
    {name:"Ayla Oasis",lat:29.5485,lng:35.0006},
    {name:"South Beach",lat:29.4420,lng:34.9730},
  ];
  if(key==="petra") return [
    {name:"Petra Visitor Center",lat:30.3249,lng:35.4746},
    {name:"The Treasury",lat:30.3285,lng:35.4444},
    {name:"Little Petra",lat:30.3752,lng:35.4516},
  ];
  if(key==="dead sea") return [
    {name:"Bethany Beyond the Jordan",lat:31.8360,lng:35.5500},
    {name:"Mount Nebo",lat:31.7670,lng:35.7250},
    {name:"Dead Sea Panorama",lat:31.5990,lng:35.5580},
  ];
  return [];
}

function haversine(lat1:number,lon1:number,lat2:number,lon2:number) {
  const toRad=(value:number)=>value*Math.PI/180;
  const dLat=toRad(lat2-lat1);const dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function formatDistance(value:number,locale:Locale) {
  if(value<1) return `${Math.max(50,Math.round(value*1000/50)*50)} ${locale==="ar"?"م":"m"}`;
  return `${value.toFixed(value<10?1:0)} ${locale==="ar"?"كم":"km"}`;
}

function trustCopy(locale:Locale) {
  if(locale==="ar") return {
    overview:"نظرة عامة على الفندق",liveDates:"تواريخك متاحة للحجز الآن",liveRates:"خيار سعر مباشر",roomChoices:"أنواع إقامة",noLiveRates:"لا توجد أسعار مباشرة لهذه التواريخ",limitedChoices:"خيارات بمخزون محدود",verifiedGuestRatings:"تقييمات إقامة موثقة",guestRatings:"ماذا يقول الضيوف؟",verifiedReviews:"تقييم موثق",waitingReviews:"بانتظار أول تقييمات من إقامات مكتملة",excellent:"ممتاز",pending:"قيد التقييم",outOf10:"من 10",cleanliness:"النظافة",service:"الخدمة والاستقبال",location:"الموقع",facilities:"المرافق",comfort:"راحة الغرفة",value:"القيمة مقابل السعر",noSyntheticScores:"لن نعرض أي درجة قبل وصول تقييم موثق من إقامة مكتملة.",highlights:"الأبرز",propertyHighlights:"أبرز ما يقدمه هذا الفندق",spotless:"نظافة بتقييم مرتفع",roomComfort:"راحة غرفة ممتازة",greatLocation:"موقع بتقييم مرتفع",greatService:"خدمة مميزة",scoreSupport:(label:string,score:number)=>`قيّم الضيوف الموثقون ${label} ${score.toFixed(1)}/10.`,breakfast:"إفطار متوفر",breakfastBody:"الفندق يدرج الإفطار ضمن مرافقه وخيارات الإقامة المتاحة.",airportTransfer:"تنقلات المطار",airportTransferBody:"خدمة تنقل المطار مدرجة ضمن مرافق الفندق؛ راجع الشروط قبل الحجز.",wellness:"سبا وعناية بالصحة",wellnessBody:"مرافق عناية أو لياقة متوفرة ضمن الفندق.",activities:"أنشطة داخل أو حول الفندق",activitiesBody:"تتوفر مرافق ترفيهية أو مائية أو شاطئية بحسب بيانات الفندق.",familyFriendly:"مناسب للعائلات",familyBody:"الفندق يوفر مرافق أو غرفًا مصممة لإقامات العائلات.",freeWifi:"واي فاي مجاني",freeWifiBody:"الاتصال اللاسلكي مدرج ضمن مرافق الفندق.",food:"المأكولات والمشروبات",health:"العناية بالصحة",activityGroup:"أنشطة وترفيه",convenience:"الراحة والخدمات",stayEssentials:"أساسيات الإقامة",stayEssentialsTitle:"كل ما يهمك في مكان واحد",stayEssentialsBody:"جمعنا أهم المرافق هنا حتى تصل للغرف والأسعار أسرع، بدون تكرار أو تمرير طويل.",publishedAmenities:"مرفق منشور",quickLook:"نظرة سريعة",viewAllFacilities:"عرض كل المرافق",facilitiesCount:"مرفق",more:"إضافية",facilitySource:"كل ما يظهر هنا مأخوذ من مرافق الفندق المنشورة، وليس اقتراحات آلية.",discoverLocation:"اكتشف الموقع",openMap:"فتح الموقع على الخريطة",nearby:"معالم قريبة",approxDistance:"مسافة تقريبية بخط مستقيم",noNearbyData:"لا تتوفر بيانات معالم قريبة لهذه الوجهة بعد.",guestVoice:"صوت الضيف",verifiedGuestVoice:"من إقامة موثقة",verifiedStay:"إقامة موثقة",noQuoteYet:"لا يوجد تعليق موثق بعد",onlyVerifiedQuotes:"عند وصول أول مراجعة من إقامة مكتملة ستظهر هنا تلقائيًا.",
  };
  return {
    overview:"Hotel overview",liveDates:"Your dates are available to book now",liveRates:"live rate options",roomChoices:"room products",noLiveRates:"No live rates for these dates",limitedChoices:"choices have limited inventory",verifiedGuestRatings:"Verified-stay ratings",guestRatings:"What guests say",verifiedReviews:"verified reviews",waitingReviews:"Waiting for the first completed-stay reviews",excellent:"Excellent",pending:"Pending",outOf10:"out of 10",cleanliness:"Cleanliness",service:"Service & staff",location:"Location",facilities:"Facilities",comfort:"Room comfort",value:"Value for money",noSyntheticScores:"No category score is shown until it is backed by a verified completed stay.",highlights:"Highlights",propertyHighlights:"Property highlights",spotless:"Highly rated cleanliness",roomComfort:"Excellent room comfort",greatLocation:"Highly rated location",greatService:"Excellent service",scoreSupport:(label:string,score:number)=>`Verified guests rated ${label.toLowerCase()} ${score.toFixed(1)}/10.`,breakfast:"Breakfast available",breakfastBody:"Breakfast is listed among the property's published amenities and stay options.",airportTransfer:"Airport transfers",airportTransferBody:"Airport transfer service is listed by the property; review conditions before booking.",wellness:"Spa & wellness",wellnessBody:"Wellness or fitness facilities are available at the property.",activities:"Activities on site",activitiesBody:"Leisure, water, beach or family activity facilities are listed by the property.",familyFriendly:"Family friendly",familyBody:"Family rooms or family-oriented facilities are available.",freeWifi:"Free Wi-Fi",freeWifiBody:"Wireless internet is listed among the property's facilities.",food:"Food & drink",health:"Wellness",activityGroup:"Activities & leisure",convenience:"Convenience",stayEssentials:"Stay essentials",stayEssentialsTitle:"Everything that matters, in one glance",stayEssentialsBody:"The useful facilities are grouped here so you can reach rooms and rates faster, without repeated sections.",publishedAmenities:"published amenities",quickLook:"Quick look",viewAllFacilities:"View all facilities",facilitiesCount:"facilities",more:"more",facilitySource:"Everything shown here comes from the property's published amenities, not generated suggestions.",discoverLocation:"Discover the location",openMap:"Open in maps",nearby:"Nearby landmarks",approxDistance:"Approx. straight-line distance",noNearbyData:"Nearby landmark data is not available for this destination yet.",guestVoice:"Guest voice",verifiedGuestVoice:"From a verified stay",verifiedStay:"Verified stay",noQuoteYet:"No verified guest quote yet",onlyVerifiedQuotes:"The first completed-stay review will appear here automatically.",
  };
}
