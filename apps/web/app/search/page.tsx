import Link from "next/link";
import { BadgeCheck, SlidersHorizontal } from "lucide-react";
import { discoverySearchSchema } from "@platform/contracts";
import { searchHotels } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { defaultStayDates } from "@/lib/stay-dates";
import { SaveSearchButton } from "./save-search-button";

type SearchParams = Record<string, string | string[] | undefined>;
const commonAmenities = [["WIFI","Wi-Fi"],["PARKING","Parking"],["POOL","Pool"],["GYM","Gym"],["BREAKFAST","Breakfast"]] as const;

export default async function SearchPage({searchParams}: {searchParams: Promise<SearchParams>}) {
  const params = await searchParams;
  const defaults = defaultStayDates();
  const raw = {
    destination: first(params.destination) ?? "Amman",
    arrival: first(params.arrival) ?? defaults.arrival,
    departure: first(params.departure) ?? defaults.departure,
    adults: first(params.adults) ?? "2",
    children: first(params.children) ?? "0",
    minPrice: optional(first(params.minPrice)),
    maxPrice: optional(first(params.maxPrice)),
    stars: values(params.stars),
    amenities: values(params.amenities),
    freeCancellation: first(params.freeCancellation) === "true",
    paymentMode: optional(first(params.paymentMode)),
    sort: first(params.sort) ?? "RECOMMENDED",
  };
  const parsed = discoverySearchSchema.safeParse(raw);
  const data = parsed.success ? await searchHotels(parsed.data) : null;
  const selectedAmenities = new Set(raw.amenities.map((value)=>value.toUpperCase()));

  return <main className="searchExperience">
    <CustomerHeader/>
    <section className="searchSummaryBar"><div className="shell"><form className="searchSummaryForm" method="get" action="/search"><label><span>Destination</span><input name="destination" defaultValue={raw.destination} required/></label><label><span>Check in</span><input name="arrival" type="date" defaultValue={raw.arrival} required/></label><label><span>Check out</span><input name="departure" type="date" defaultValue={raw.departure} required/></label><label><span>Adults</span><input name="adults" type="number" min="1" max="20" defaultValue={raw.adults} required/></label><label><span>Children</span><input name="children" type="number" min="0" max="20" defaultValue={raw.children} required/></label><button type="submit">Search again</button></form></div></section>
    <section className="shell searchLayout">
      <aside className="searchFilters"><div className="filterHeading"><SlidersHorizontal size={18}/><strong>Filter your stay</strong></div><form method="get" action="/search" className="filterForm"><input type="hidden" name="destination" value={raw.destination}/><input type="hidden" name="arrival" value={raw.arrival}/><input type="hidden" name="departure" value={raw.departure}/><input type="hidden" name="adults" value={raw.adults}/><input type="hidden" name="children" value={raw.children}/><div className="filterBlock"><span>Nightly total</span><div className="priceFilterGrid"><label>Min<input name="minPrice" type="number" min="0" step="0.01" defaultValue={raw.minPrice}/></label><label>Max<input name="maxPrice" type="number" min="0" step="0.01" defaultValue={raw.maxPrice}/></label></div></div><div className="filterBlock"><label>Star rating<select name="stars" defaultValue={first(params.stars) ?? ""}><option value="">Any stars</option><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select></label><label>Payment<select name="paymentMode" defaultValue={raw.paymentMode ?? ""}><option value="">Any payment mode</option><option value="PAY_AT_HOTEL">Pay at hotel</option><option value="PAY_NOW">Pay now</option></select></label><label>Sort by<select name="sort" defaultValue={raw.sort}><option value="RECOMMENDED">Recommended</option><option value="PRICE_ASC">Lowest price</option><option value="PRICE_DESC">Highest price</option><option value="STARS_DESC">Highest stars</option></select></label></div><div className="filterBlock"><label className="filterCheck"><input type="checkbox" name="freeCancellation" value="true" defaultChecked={raw.freeCancellation}/>Free cancellation now</label><span>Facilities</span>{commonAmenities.map(([code,label])=><label className="filterCheck" key={code}><input type="checkbox" name="amenities" value={code} defaultChecked={selectedAmenities.has(code)}/>{label}</label>)}</div><button className="filterApply" type="submit">Apply filters</button></form></aside>
      <div className="searchResults"><div className="searchResultsHead"><div><span className="eyebrow">Live availability</span><h1>{raw.destination}</h1><p>{data?.count ?? 0} verified propert{data?.count===1?"y":"ies"} for {raw.arrival} → {raw.departure}</p></div>{parsed.success&&<SaveSearchButton destination={parsed.data.destination} arrival={parsed.data.arrival} departure={parsed.data.departure} adults={parsed.data.adults} children={parsed.data.children} filters={{minPrice:parsed.data.minPrice,maxPrice:parsed.data.maxPrice,stars:parsed.data.stars,amenities:parsed.data.amenities,freeCancellation:parsed.data.freeCancellation,paymentMode:parsed.data.paymentMode,sort:parsed.data.sort}}/>}</div>
        {!parsed.success&&<div className="premiumEmpty"><h3>Search details need attention</h3><p>{parsed.error.issues[0]?.message ?? "Invalid search"}</p></div>}
        {data&&data.results.length===0&&<div className="premiumEmpty"><h3>No live offers match this stay</h3><p>Try different dates, guest counts or fewer filters. Incomplete rates and unavailable inventory are intentionally excluded.</p></div>}
        <div className="searchResultList">{data?.results.map((hotel)=><article className="premiumResultCard" key={hotel.id}><Link prefetch={false} className="premiumResultMedia" href={hotelHref(hotel.id,parsed.success?parsed.data:null)}>{hotel.coverPhoto?<img src={hotel.coverPhoto.url} alt={hotel.coverPhoto.alt??hotel.name}/>:<div className="stayCardPlaceholder">Photo pending</div>}<span className="verifiedPill"><BadgeCheck size={14}/>Verified</span></Link><div className="premiumResultContent"><div className="premiumResultMain"><div className="stayCardMeta">{hotel.starRating?`${hotel.starRating}★ · `:""}{hotel.area?`${hotel.area}, `:""}{hotel.city}</div><Link prefetch={false} href={hotelHref(hotel.id,parsed.success?parsed.data:null)}><h2>{hotel.name}</h2></Link>{hotel.reviewSummary.overall!==null&&<div className="resultRating"><strong>{hotel.reviewSummary.overall.toFixed(1)}</strong><span>{hotel.reviewSummary.count} verified review{hotel.reviewSummary.count===1?"":"s"}</span></div>}<div className="resultTags">{hotel.from.promotion&&<span className="dealPill">{hotel.from.promotion.discountPercent}% off · {hotel.from.promotion.name}</span>}{hotel.amenities.slice(0,4).map((amenity)=><span key={amenity.code}>{amenity.name}</span>)}</div><div className="resultPolicy"><strong>{hotel.from.cancellationPolicy.name}</strong><span>{hotel.from.freeCancellationNow?"Free cancellation right now":"Cancellation penalty may apply"}</span></div>{hotel.from.availableToSell<=3&&<div className="scarcityNote">Only {hotel.from.availableToSell} room{hotel.from.availableToSell===1?"":"s"} left for these dates</div>}</div><div className="premiumResultPrice"><span>Final stay total</span><strong>{hotel.from.total.toFixed(2)} {hotel.currency}</strong><small>{hotel.from.averageNightlyTotal.toFixed(2)} {hotel.currency} average / night</small><div className="paymentModes">{hotel.from.paymentModes.map((mode)=><span key={mode}>{mode==="PAY_AT_HOTEL"?"Pay at hotel":"Pay now"}</span>)}</div><Link prefetch={false} className="resultCta" href={hotelHref(hotel.id,parsed.success?parsed.data:null)}>See rooms</Link></div></div></article>)}</div>
      </div>
    </section>
  </main>;
}

function first(value:string|string[]|undefined):string|undefined{return Array.isArray(value)?value[0]:value;}
function values(value:string|string[]|undefined):string[]{const items=value?(Array.isArray(value)?value:[value]):[];return items.map((item)=>item.trim()).filter(Boolean);}
function optional(value:string|undefined):string|undefined{return value&&value.trim()?value:undefined;}
function hotelHref(hotelId:string,input:{arrival:string;departure:string;adults:number;children:number}|null){if(!input)return `/hotel/${hotelId}`;const query=new URLSearchParams({arrival:input.arrival,departure:input.departure,adults:String(input.adults),children:String(input.children)});return `/hotel/${hotelId}?${query.toString()}`;}
