import Link from "next/link";
import {redirect} from "next/navigation";
import {unstable_cache} from "next/cache";
import {publicStaySchema} from "@platform/contracts";
import {getNuiteeHotelDetails,getNuiteeHotelReviews,NUITEE_PAYMENT_CURRENCY,resolveClaimedNuiteeHotel,type NuiteeHotelDetails} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {requestGuestMarket} from "@/lib/request-guest-market";
import {defaultStayDates} from "@/lib/stay-dates";
import {HotelGalleryController} from "../../hotel/[id]/hotel-gallery-controller";
import {NuiteeHotelPageV2} from "../../hotel/[id]/nuitee-page-v2";
import {NuiteeTrustLayer} from "../../hotel/[id]/nuitee-trust-layer";

type SearchParams=Record<string,string|string[]|undefined>;

export const metadata={robots:{index:false,follow:true}};

const cachedNuiteeHotelDetails=unstable_cache(
  async (
    id:string,
    arrival:string,
    departure:string,
    adults:number,
    children:number,
    childrenAges:number[],
    guestNationality:string,
  )=>getNuiteeHotelDetails(id,{
    destination:"Nuitee",
    arrival,
    departure,
    adults,
    children,
    ...(childrenAges.length?{childrenAges}:{}),
    ...(guestNationality?{guestNationality}:{}),
    currency:NUITEE_PAYMENT_CURRENCY,
  }),
  ["nuitee-hotel-details-v1"],
  {revalidate:15},
);

export default async function NuiteeHotelRoute({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<SearchParams>}) {
  const [{id},query,market]=await Promise.all([params,searchParams,requestGuestMarket()]);
  const claimed=await resolveClaimedNuiteeHotel(id);
  if(claimed){
    const forwarded=new URLSearchParams();
    for(const [key,value] of Object.entries(query)){
      if(Array.isArray(value))value.forEach((item)=>forwarded.append(key,item));
      else if(typeof value==="string")forwarded.set(key,value);
    }
    const suffix=forwarded.toString();
    redirect(`/hotel/${claimed.slug}${suffix?`?${suffix}`:""}`);
  }

  const defaults=defaultStayDates();
  const parsed=publicStaySchema.safeParse({
    arrival:first(query.arrival)??defaults.arrival,
    departure:first(query.departure)??defaults.departure,
    adults:first(query.adults)??"2",
    children:first(query.children)??"0",
    childrenAges:values(query.childrenAge),
  });
  const stay=parsed.success?parsed.data:{arrival:defaults.arrival,departure:defaults.departure,adults:2,children:0,childrenAges:[]};
  const reviewsPromise=getNuiteeHotelReviews(id,1000);
  let hotel=null;
  try {
    hotel=await cachedNuiteeHotelDetails(
      id,
      stay.arrival,
      stay.departure,
      stay.adults,
      stay.children,
      stay.childrenAges,
      market.countryCode??"",
    );
  } catch(error) {
    console.error("Nuitee hotel detail unavailable",error);
  }
  if(!hotel)return <main className="hotelExperience" lang={market.intlLocale} dir={market.direction}><CustomerHeader/><section className="shell hotelDetailSection"><div className="premiumEmpty"><h3>{market.locale==="ar"?"السعر لم يعد متاحاً":"This Nuitee rate is no longer available"}</h3><p>{market.locale==="ar"?"ارجع إلى البحث واختر سعراً جديداً.":"Return to search and choose a fresh supplier rate."}</p><Link className="resultCta" href="/search">{market.locale==="ar"?"العودة إلى البحث":"Return to search"}</Link></div></section></main>;
  const supplierReviews=await reviewsPromise;
  const reviews={
    ...supplierReviews,
    summary:{
      ...supplierReviews.summary,
      count:Math.max(supplierReviews.summary.count,hotel.reviewSummary.count),
      overall:supplierReviews.summary.overall??hotel.reviewSummary.overall,
    },
  };
  const gallery=nuiteeGallery(hotel);
  return <>
    <NuiteeHotelPageV2 hotel={hotel} stay={stay} market={market}/>
    <section className="hotelExperience" lang={market.intlLocale} dir={market.direction}><div className="shell hotelDetailSection"><NuiteeTrustLayer hotel={hotel} reviews={reviews} locale={market.locale}/></div></section>
    <HotelGalleryController photos={gallery} hotelName={hotel.name} locale={market.locale}/>
  </>;
}

function nuiteeGallery(hotel:NuiteeHotelDetails){
  const seen=new Set<string>();
  const gallery:Array<{id:string;url:string;alt:string|null;sortOrder:number;roomTypeId:string|null;category:"OTHER"|"ROOM"}>=[];
  hotel.photos.forEach((photo,index)=>{
    if(!photo.url||seen.has(photo.url))return;
    seen.add(photo.url);
    gallery.push({id:`nuitee-hotel-${index}`,url:photo.url,alt:photo.alt??hotel.name,sortOrder:photo.sortOrder,roomTypeId:null,category:"OTHER"});
  });
  hotel.rooms.forEach((room,roomIndex)=>room.photos.forEach((photo,photoIndex)=>{
    if(!photo.url||seen.has(photo.url))return;
    seen.add(photo.url);
    gallery.push({id:`nuitee-room-${room.id}-${photoIndex}`,url:photo.url,alt:photo.alt??room.name,sortOrder:10_000+(roomIndex*100)+photo.sortOrder,roomTypeId:room.id,category:"ROOM"});
  }));
  return gallery.sort((left,right)=>left.sortOrder-right.sortOrder);
}

function first(value:string|string[]|undefined):string|undefined{return Array.isArray(value)?value[0]:value;}
function values(value:string|string[]|undefined):string[]{const list=value?(Array.isArray(value)?value:[value]):[];return list.map((item)=>item.trim()).filter(Boolean);}
