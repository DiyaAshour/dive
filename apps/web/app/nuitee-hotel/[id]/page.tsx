import Link from "next/link";
import {publicStaySchema} from "@platform/contracts";
import {getNuiteeHotelDetails} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {requestGuestMarket} from "@/lib/request-guest-market";
import {defaultStayDates} from "@/lib/stay-dates";
import {NuiteeHotelPageV2} from "../../hotel/[id]/nuitee-page-v2";

type SearchParams=Record<string,string|string[]|undefined>;

export const metadata={robots:{index:false,follow:true}};

export default async function NuiteeHotelRoute({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<SearchParams>}) {
  const [{id},query,market]=await Promise.all([params,searchParams,requestGuestMarket()]);
  const defaults=defaultStayDates();
  const parsed=publicStaySchema.safeParse({
    arrival:first(query.arrival)??defaults.arrival,
    departure:first(query.departure)??defaults.departure,
    adults:first(query.adults)??"2",
    children:first(query.children)??"0",
    childrenAges:values(query.childrenAge),
  });
  const stay=parsed.success?parsed.data:{arrival:defaults.arrival,departure:defaults.departure,adults:2,children:0,childrenAges:[]};
  let hotel=null;
  try {
    hotel=await getNuiteeHotelDetails(id,{
      destination:"Nuitee",
      arrival:stay.arrival,
      departure:stay.departure,
      adults:stay.adults,
      children:stay.children,
      ...(stay.childrenAges.length?{childrenAges:stay.childrenAges}:{}),
      ...(market.countryCode?{guestNationality:market.countryCode}:{}),
      currency:"JOD",
      maxRatesPerHotel:20,
    });
  } catch(error) {
    console.error("Nuitee hotel detail unavailable",error);
  }
  if(!hotel)return <main className="hotelExperience" lang={market.intlLocale} dir={market.direction}><CustomerHeader/><section className="shell hotelDetailSection"><div className="premiumEmpty"><h3>{market.locale==="ar"?"السعر لم يعد متاحاً":"This Nuitee rate is no longer available"}</h3><p>{market.locale==="ar"?"ارجع إلى البحث واختر سعراً جديداً.":"Return to search and choose a fresh supplier rate."}</p><Link className="resultCta" href="/search">{market.locale==="ar"?"العودة إلى البحث":"Return to search"}</Link></div></section></main>;
  return <NuiteeHotelPageV2 hotel={hotel} stay={stay} market={market}/>;
}

function first(value:string|string[]|undefined):string|undefined{return Array.isArray(value)?value[0]:value;}
function values(value:string|string[]|undefined):string[]{const list=value?(Array.isArray(value)?value:[value]):[];return list.map((item)=>item.trim()).filter(Boolean);}
