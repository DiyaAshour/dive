import {MapPin, ShieldCheck, Sparkles} from "lucide-react";
import type {NuiteeHotelDetails,NuiteePublicReviewData} from "@platform/server";
import type {GuestLocale} from "@/lib/guest-market";
import {HotelReviewsHub} from "./hotel-reviews-hub";

type Landmark=Readonly<{name:string;lat:number;lng:number}>;

export function NuiteeTrustLayer({hotel,reviews,locale}:Readonly<{hotel:NuiteeHotelDetails;reviews:NuiteePublicReviewData;locale:GuestLocale}>) {
  const ar=locale==="ar";
  const landmarks=nearbyLandmarks(hotel.city,hotel.location).slice(0,5);
  const hasSupplierReviews=reviews.summary.count>0;
  return <section className="hotelTrustLayer" aria-label={ar?"التقييمات والموقع":"Reviews and location"}>
    <div className="trustOverviewGrid">
      <HotelReviewsHub reviews={reviews} locale={locale} source="PROVIDER"/>
      <aside className="propertyHighlightsPanel">
        <div className="sectionHeading"><span className="sectionKicker">{ar?"معلومات موثوقة":"Useful signals"}</span><h2>{ar?"لماذا هذا الفندق مناسب؟":"Why this property stands out"}</h2></div>
        <div className="propertyHighlightsGrid">
          {hotel.starRating&&<article><div className="highlightIcon comfort"><Sparkles size={22}/></div><div><h3>{hotel.starRating} {ar?"نجوم":"star property"}</h3><p>{ar?"تصنيف الفندق كما يرد في بيانات المزود.":"Property class supplied by the hotel data provider."}</p></div></article>}
          {hotel.reviewSummary.overall!==null&&<article><div className="highlightIcon service"><ShieldCheck size={22}/></div><div><h3>{hotel.reviewSummary.overall.toFixed(1)}/10</h3><p>{hasSupplierReviews?(ar?"تقييمات ضيوف حقيقية يتم تحميلها من مزود الحجز.":"Real guest feedback loaded from the booking provider."):(ar?"درجة الضيوف متاحة في بيانات الفندق، وسيظهر نص المراجعات عند توفره.":"A guest score is available in hotel data; review text appears when supplied.")}</p></div></article>}
          {hotel.location&&<article><div className="highlightIcon location"><MapPin size={22}/></div><div><h3>{hotel.area||hotel.city}</h3><p>{ar?"الموقع والإحداثيات مأخوذة من بيانات الفندق.":"Location and coordinates come from the property data."}</p></div></article>}
        </div>
      </aside>
    </div>

    <div className="locationReviewGrid">
      <section className="locationDiscovery">
        <div className="sectionHeading"><span className="sectionKicker">{ar?"الموقع":"Location"}</span><h2>{ar?"اكتشف المنطقة حول الفندق":"Explore the area around the hotel"}</h2><p>{hotel.area?`${hotel.area}, ${hotel.city}`:hotel.city}</p></div>
        <div className="locationBody">
          <div className="locationMapCard"><MapPin size={28}/><strong>{hotel.name}</strong><span>{hotel.address||hotel.city}</span>{hotel.location&&<a href={`https://www.google.com/maps/search/?api=1&query=${hotel.location.latitude},${hotel.location.longitude}`} target="_blank" rel="noreferrer">{ar?"فتح الموقع على Google Maps":"Open in Google Maps"}</a>}</div>
          <div className="nearbyList"><div className="nearbyListHead"><strong>{ar?"أماكن قريبة":"Nearby"}</strong><small>{ar?"مسافة تقريبية":"Approx. distance"}</small></div>{landmarks.length?landmarks.map((place)=><div key={place.name}><span><MapPin size={14}/>{place.name}</span><strong>{formatDistance(place.distanceKm,locale)}</strong></div>):<p className="nearbyEmpty">{ar?"سيظهر دليل الأماكن القريبة عند توفر موقع دقيق للمدينة.":"Nearby landmarks appear when location coverage is available."}</p>}</div>
        </div>
      </section>
    </div>
  </section>;
}

function nearbyLandmarks(city:string,location:NuiteeHotelDetails["location"]) {
  if(!location)return[];
  return landmarksFor(city).map((place)=>({...place,distanceKm:haversine(location.latitude,location.longitude,place.lat,place.lng)})).sort((a,b)=>a.distanceKm-b.distanceKm);
}
function landmarksFor(city:string):Landmark[]{
  const key=city.toLowerCase().trim();
  if(key.includes("amman")||key.includes("عمان")||key.includes("عمّان"))return [
    {name:"Amman Citadel",lat:31.9543,lng:35.9349},
    {name:"Rainbow Street",lat:31.9496,lng:35.9264},
    {name:"The Jordan Museum",lat:31.9455,lng:35.9272},
    {name:"King Abdullah I Mosque",lat:31.9636,lng:35.9121},
    {name:"Abdali Boulevard",lat:31.9630,lng:35.9078},
  ];
  if(key.includes("aqaba")||key.includes("العقبة"))return [
    {name:"Aqaba Castle",lat:29.5267,lng:35.0058},
    {name:"Arab Revolt Plaza",lat:29.5264,lng:35.0050},
    {name:"Ayla Oasis",lat:29.5485,lng:35.0006},
    {name:"South Beach",lat:29.4420,lng:34.9730},
  ];
  if(key.includes("petra")||key.includes("البتراء"))return [
    {name:"Petra Visitor Center",lat:30.3249,lng:35.4746},
    {name:"The Treasury",lat:30.3285,lng:35.4444},
    {name:"Little Petra",lat:30.3752,lng:35.4516},
  ];
  return[];
}
function haversine(lat1:number,lon1:number,lat2:number,lon2:number){const toRad=(value:number)=>value*Math.PI/180;const dLat=toRad(lat2-lat1);const dLon=toRad(lon2-lon1);const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function formatDistance(value:number,locale:GuestLocale){const intl=locale==="ar"?"ar-JO":"en-GB";if(value<1){const meters=Math.max(50,Math.round(value*1000/50)*50);return new Intl.NumberFormat(intl,{style:"unit",unit:"meter",unitDisplay:"short",maximumFractionDigits:0}).format(meters);}return new Intl.NumberFormat(intl,{style:"unit",unit:"kilometer",unitDisplay:"short",maximumFractionDigits:value<10?1:0}).format(value);}
