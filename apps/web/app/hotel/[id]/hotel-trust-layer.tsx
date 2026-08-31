import { Activity, BadgeCheck, BedDouble, Car, ChevronDown, Coffee, Dumbbell, HeartPulse, MapPin, Plane, ShieldCheck, Sparkles, Utensils, Waves, Wifi } from "lucide-react";
import type { getPublicHotelDetails, getPublicHotelReviews } from "@platform/server";
import { guestDictionary } from "@/lib/guest-i18n";
import { guestIntlLocale, type GuestLocale } from "@/lib/guest-market";
import { hotelAmenityLabel } from "@/lib/hotel-amenity-copy";
import { hotelTrustUiCopy } from "@/lib/hotel-trust-ui-copy";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { HotelReviewsHub } from "./hotel-reviews-hub";

type HotelDetails = Awaited<ReturnType<typeof getPublicHotelDetails>>;
type ReviewData = Awaited<ReturnType<typeof getPublicHotelReviews>>;

type HighlightKind = "clean" | "comfort" | "location" | "service" | "breakfast" | "transfer" | "wellness" | "activity" | "family" | "wifi";
type Highlight = Readonly<{kind: HighlightKind; title: string; body: string}>;
type BenefitGroup = Readonly<{kind: "food" | "wellness" | "activity" | "convenience"; title: string; items: string[]}>;
type Landmark = Readonly<{name: string; lat: number; lng: number}>;

export async function HotelTrustLayer({hotel,reviews}:{hotel:HotelDetails;reviews:ReviewData;locale?:GuestLocale}) {
  const market=await requestGuestMarket();
  const locale=market.locale;
  const copy=hotelTrustUiCopy(locale);
  const highlights=buildHighlights(hotel,reviews,locale).slice(0,6);
  const benefitGroups=buildBenefitGroups(hotel,locale);
  const priorityAmenities=["WIFI","BREAKFAST","POOL","BEACH_ACCESS","PARKING","SPA","FAMILY_ROOMS","AIRPORT_SHUTTLE","RESTAURANT","GYM"];
  const priorityRank=new Map(priorityAmenities.map((code,index)=>[code,index]));
  const quickAmenities=[...hotel.amenities]
    .sort((left,right)=>(priorityRank.get(left.code)??100)-(priorityRank.get(right.code)??100))
    .slice(0,6);
  const limitedOffers=hotel.offers.filter((offer)=>offer.availableToSell<=3).length;
  const uniqueRooms=new Set(hotel.offers.map((offer)=>offer.roomTypeId)).size;
  const landmarks=nearbyLandmarks(hotel.city,hotel.location).slice(0,5);

  return <section className="hotelTrustLayer" aria-label={copy.overview}>
    <div className="liveStaySignal">
      <div><Sparkles size={20}/><span><strong>{copy.liveDates}</strong><small>{hotel.offers.length?`${hotel.offers.length} ${copy.liveRates} · ${uniqueRooms} ${copy.roomChoices}`:copy.noLiveRates}</small></span></div>
      {limitedOffers>0&&<strong className="liveStayScarcity">{limitedOffers} {copy.limitedChoices}</strong>}
    </div>

    <div className="trustOverviewGrid">
      <HotelReviewsHub reviews={reviews} locale={locale}/>

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
          <div>{quickAmenities.map((amenity)=><span className="quickAmenity" key={amenity.code}><i>{facilityIcon(amenity.code)}</i><strong>{hotelAmenityLabel(locale,amenity.code,amenity.name)}</strong></span>)}</div>
        </div>
      </div>

      {benefitGroups.length>0&&<div className="stayEssentialsGroups">{benefitGroups.map((group)=><article className={`stayEssentialGroup ${group.kind}`} key={group.kind}>
        <div className="stayEssentialGroupHead"><span>{benefitIcon(group.kind)}</span><h3>{group.title}</h3></div>
        <ul>{group.items.slice(0,3).map((item)=><li key={item}><BadgeCheck size={13}/>{item}</li>)}</ul>
        {group.items.length>3&&<small>+{group.items.length-3} {copy.more}</small>}
      </article>)}</div>}

      <details className="allFacilitiesDisclosure">
        <summary><span><strong>{copy.viewAllFacilities}</strong><small>{hotel.amenities.length} {copy.facilitiesCount}</small></span><ChevronDown size={18}/></summary>
        <div className="allFacilitiesGrid">{hotel.amenities.map((amenity)=><div key={amenity.code}><span>{facilityIcon(amenity.code)}</span><strong>{hotelAmenityLabel(locale,amenity.code,amenity.name)}</strong></div>)}</div>
      </details>
      <div className="stayEssentialsSource"><ShieldCheck size={14}/><span>{copy.facilitySource}</span></div>
    </section>}

    <div className="locationReviewGrid">
      <section className="locationDiscovery">
        <div className="sectionHeading"><span className="sectionKicker">{guestDictionary(locale).hotel.location}</span><h2>{copy.discoverLocation}</h2><p>{hotel.area?`${hotel.area}, ${hotel.city}`:hotel.city}</p></div>
        <div className="locationBody">
          <div className="locationMapCard"><MapPin size={28}/><strong>{hotel.name}</strong><span>{hotel.address}</span>{hotel.location&&<a href={`https://www.google.com/maps/search/?api=1&query=${hotel.location.latitude},${hotel.location.longitude}`} target="_blank" rel="noreferrer">{copy.openMap}</a>}</div>
          <div className="nearbyList"><div className="nearbyListHead"><strong>{copy.nearby}</strong><small>{copy.approxDistance}</small></div>{landmarks.length?landmarks.map((place)=><div key={place.name}><span><MapPin size={14}/>{place.name}</span><strong>{formatDistance(place.distanceKm,locale)}</strong></div>):<p className="nearbyEmpty">{copy.noNearbyData}</p>}</div>
        </div>
      </section>
    </div>
  </section>;
}

function buildHighlights(hotel:HotelDetails,reviews:ReviewData,locale:GuestLocale):Highlight[] {
  const copy=hotelTrustUiCopy(locale);
  const hotelCopy=guestDictionary(locale).hotel;
  const codes=new Set(hotel.amenities.map((amenity)=>amenity.code));
  const output:Highlight[]=[];
  const push=(kind:HighlightKind,title:string,body:string)=>{if(!output.some((item)=>item.kind===kind))output.push({kind,title,body});};
  if((reviews.summary.cleanliness??0)>=8.5) push("clean",copy.spotless,copy.scoreSupport(hotelCopy.cleanliness,reviews.summary.cleanliness!));
  if((reviews.summary.comfort??0)>=8.5) push("comfort",copy.roomComfort,copy.scoreSupport(hotelCopy.comfort,reviews.summary.comfort!));
  if((reviews.summary.location??0)>=8.5) push("location",copy.greatLocation,copy.scoreSupport(hotelCopy.location,reviews.summary.location!));
  if((reviews.summary.staff??0)>=8.5) push("service",copy.greatService,copy.scoreSupport(hotelCopy.staff,reviews.summary.staff!));
  if(codes.has("BREAKFAST")) push("breakfast",copy.breakfast,copy.breakfastBody);
  if(codes.has("AIRPORT_SHUTTLE")) push("transfer",copy.airportTransfer,copy.airportTransferBody);
  if(codes.has("SPA")||codes.has("GYM")) push("wellness",copy.wellness,copy.wellnessBody);
  if(["POOL","WATER_SPORTS","PLAY_AREA","MARINA","BEACH_ACCESS"].some((code)=>codes.has(code))) push("activity",copy.activities,copy.activitiesBody);
  if(codes.has("FAMILY_ROOMS")) push("family",copy.familyFriendly,copy.familyBody);
  if(codes.has("WIFI")) push("wifi",copy.freeWifi,copy.freeWifiBody);
  return output;
}

function buildBenefitGroups(hotel:HotelDetails,locale:GuestLocale):BenefitGroup[] {
  const copy=hotelTrustUiCopy(locale);
  const groups:[BenefitGroup["kind"],string,string[]][]=[
    ["food",copy.food,["BREAKFAST","RESTAURANT","ROOM_SERVICE","ROOFTOP"]],
    ["wellness",copy.health,["SPA","GYM","POOL"]],
    ["activity",copy.activityGroup,["WATER_SPORTS","BEACH_ACCESS","MARINA","PLAY_AREA","TERRACE"]],
    ["convenience",copy.convenience,["WIFI","PARKING","AIRPORT_SHUTTLE","BUSINESS_CENTER","FAMILY_ROOMS"]],
  ];
  return groups.flatMap(([kind,title,codes])=>{
    const items=codes.flatMap((code)=>hotel.amenities.filter((amenity)=>amenity.code===code).map((amenity)=>hotelAmenityLabel(locale,code,amenity.name)));
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

function formatDistance(value:number,locale:GuestLocale) {
  if(value<1){
    const meters=Math.max(50,Math.round(value*1000/50)*50);
    return new Intl.NumberFormat(guestIntlLocale(locale),{style:"unit",unit:"meter",unitDisplay:"short",maximumFractionDigits:0}).format(meters);
  }
  return new Intl.NumberFormat(guestIntlLocale(locale),{style:"unit",unit:"kilometer",unitDisplay:"short",maximumFractionDigits:value<10?1:0}).format(value);
}
