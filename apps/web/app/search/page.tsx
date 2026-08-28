import Link from "next/link";
import { BadgeCheck, MapPin, SlidersHorizontal } from "lucide-react";
import { discoverySearchSchema } from "@platform/contracts";
import { searchHotelsV2 } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { DestinationAutocomplete } from "@/components/destination-autocomplete";
import { guestMoney, sourceAmountFromGuestInput } from "@/lib/guest-currency";
import { guestDictionary, guestMarketCopy } from "@/lib/guest-i18n";
import { type GuestLocale } from "@/lib/guest-market";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { defaultStayDates } from "@/lib/stay-dates";
import { SaveSearchButton } from "./save-search-button";

type SearchParams = Record<string, string | string[] | undefined>;
const commonAmenities = [["WIFI","Wi-Fi"],["PARKING","Parking"],["POOL","Pool"],["GYM","Gym"],["BREAKFAST","Breakfast"]] as const;

export default async function SearchPage({searchParams}: {searchParams: Promise<SearchParams>}) {
  const [params,market] = await Promise.all([searchParams,requestGuestMarket()]);
  const locale=market.locale;
  const copy = guestDictionary(locale);
  const marketCopy=guestMarketCopy(locale);
  const defaults = defaultStayDates();
  const displayMinPrice=optional(first(params.minPrice));
  const displayMaxPrice=optional(first(params.maxPrice));
  const raw = {
    destination: first(params.destination) ?? "Amman",
    arrival: first(params.arrival) ?? defaults.arrival,
    departure: first(params.departure) ?? defaults.departure,
    adults: first(params.adults) ?? "2",
    children: first(params.children) ?? "0",
    minPrice: sourceAmountFromGuestInput(displayMinPrice,market.currency,"JOD"),
    maxPrice: sourceAmountFromGuestInput(displayMaxPrice,market.currency,"JOD"),
    stars: values(params.stars),
    amenities: values(params.amenities),
    freeCancellation: first(params.freeCancellation) === "true",
    paymentMode: optional(first(params.paymentMode)),
    sort: first(params.sort) ?? "RECOMMENDED",
    pageSize: first(params.pageSize) ?? "20",
    cursor: optional(first(params.cursor)),
  };
  const parsed = discoverySearchSchema.safeParse(raw);
  const data = parsed.success ? await searchHotelsV2(parsed.data) : null;
  const selectedAmenities = new Set(raw.amenities.map((value)=>value.toUpperCase()));
  const onlyDemoResults = Boolean(data?.count) && data!.results.every((hotel)=>hotel.slug.startsWith("demo-"));
  const resultKind = onlyDemoResults ? ((data?.count??0)===1?copy.search.demoProperty:copy.search.demoProperties) : ((data?.count??0)===1?copy.search.verifiedProperty:copy.search.verifiedProperties);
  const resolvedLabel = data?.resolvedDestination ? (locale === "ar" ? data.resolvedDestination.nameAr ?? data.resolvedDestination.nameEn : data.resolvedDestination.nameEn) : raw.destination;

  return <main className="searchExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <section className="searchSummaryBar"><div className="shell"><form className="searchSummaryForm" method="get" action="/search"><label><span>{copy.search.destination}</span><DestinationAutocomplete locale={market.baseLocale} defaultValue={raw.destination} required ariaLabel={copy.search.destination}/></label><label><span>{copy.search.checkIn}</span><input name="arrival" type="date" defaultValue={raw.arrival} required/></label><label><span>{copy.search.checkOut}</span><input name="departure" type="date" defaultValue={raw.departure} required/></label><label><span>{copy.search.adults}</span><input name="adults" type="number" min="1" max="20" defaultValue={raw.adults} required/></label><label><span>{copy.search.children}</span><input name="children" type="number" min="0" max="20" defaultValue={raw.children} required/></label><input type="hidden" name="pageSize" value={raw.pageSize}/><button type="submit">{copy.search.again}</button></form></div></section>
    <section className="shell searchLayout">
      <aside className="searchFilters"><div className="filterHeading"><SlidersHorizontal size={18}/><strong>{copy.search.filter}</strong></div><form method="get" action="/search" className="filterForm"><input type="hidden" name="destination" value={raw.destination}/><input type="hidden" name="arrival" value={raw.arrival}/><input type="hidden" name="departure" value={raw.departure}/><input type="hidden" name="adults" value={raw.adults}/><input type="hidden" name="children" value={raw.children}/><input type="hidden" name="pageSize" value={raw.pageSize}/><div className="filterBlock"><span>{copy.search.nightly} · {market.currency}</span><div className="priceFilterGrid"><label>{copy.search.min}<input name="minPrice" type="number" min="0" step="0.01" defaultValue={displayMinPrice}/></label><label>{copy.search.max}<input name="maxPrice" type="number" min="0" step="0.01" defaultValue={displayMaxPrice}/></label></div></div><div className="filterBlock"><label>{copy.search.stars}<select name="stars" defaultValue={first(params.stars) ?? ""}><option value="">{copy.search.anyStars}</option><option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option><option value="2">2 ★</option><option value="1">1 ★</option></select></label><label>{copy.search.payment}<select name="paymentMode" defaultValue={raw.paymentMode ?? ""}><option value="">{copy.search.anyPayment}</option><option value="PAY_AT_HOTEL">{copy.search.payHotel}</option><option value="PAY_NOW">{copy.search.payNow}</option></select></label><label>{copy.search.sort}<select name="sort" defaultValue={raw.sort}><option value="RECOMMENDED">{copy.search.recommended}</option><option value="PRICE_ASC">{copy.search.lowPrice}</option><option value="PRICE_DESC">{copy.search.highPrice}</option><option value="STARS_DESC">{copy.search.highStars}</option></select></label></div><div className="filterBlock"><label className="filterCheck"><input type="checkbox" name="freeCancellation" value="true" defaultChecked={raw.freeCancellation}/>{copy.search.freeCancel}</label><span>{copy.search.facilities}</span>{commonAmenities.map(([code,label])=><label className="filterCheck" key={code}><input type="checkbox" name="amenities" value={code} defaultChecked={selectedAmenities.has(code)}/>{amenityLabel(locale,code,label)}</label>)}</div><button className="filterApply" type="submit">{copy.search.apply}</button></form></aside>
      <div className="searchResults"><div className="searchResultsHead"><div><span className="eyebrow">{copy.search.live}</span><h1>{resolvedLabel}</h1><p>{data?.count ?? 0} {resultKind} {copy.search.for} {raw.arrival} → {raw.departure}</p>{data?.resolvedDestination&&<span className="searchResolution"><MapPin size={13}/>{locale==="ar"?"تم فهم الوجهة":locale==="zh"?"已匹配目的地":"Destination matched"} · {data.resolvedDestination.type.toLowerCase()}</span>}</div>{parsed.success&&<SaveSearchButton locale={market.baseLocale} destination={parsed.data.destination} arrival={parsed.data.arrival} departure={parsed.data.departure} adults={parsed.data.adults} children={parsed.data.children} filters={{minPrice:parsed.data.minPrice,maxPrice:parsed.data.maxPrice,stars:parsed.data.stars,amenities:parsed.data.amenities,freeCancellation:parsed.data.freeCancellation,paymentMode:parsed.data.paymentMode,sort:parsed.data.sort}}/>}</div>
        {!parsed.success&&<div className="premiumEmpty"><h3>{copy.search.badTitle}</h3><p>{parsed.error.issues[0]?.message ?? copy.search.invalid}</p></div>}
        {data&&data.results.length===0&&<div className="premiumEmpty"><h3>{copy.search.noneTitle}</h3><p>{copy.search.noneBody}</p></div>}
        <div className="searchResultList">{data?.results.map((hotel)=>{
          const total=guestMoney(hotel.from.total,hotel.currency,market.currency,locale);
          const average=guestMoney(hotel.from.averageNightlyTotal,hotel.currency,market.currency,locale);
          return <article className="premiumResultCard" key={hotel.id}><Link prefetch={false} className="premiumResultMedia" href={hotelHref(hotel.slug,parsed.success?parsed.data:null)}>{hotel.coverPhoto?<img src={hotel.coverPhoto.url} alt={hotel.coverPhoto.alt??hotel.name} loading="lazy" decoding="async"/>:<div className="stayCardPlaceholder">{copy.search.photoPending}</div>}<span className="verifiedPill"><BadgeCheck size={14}/>{hotel.slug.startsWith("demo-")?copy.search.demoProperty:copy.search.verified}</span></Link><div className="premiumResultContent"><div className="premiumResultMain"><div className="stayCardMeta">{hotel.starRating?`${hotel.starRating}★ · `:""}{hotel.area?`${hotel.area}, `:""}{hotel.city}</div><Link prefetch={false} href={hotelHref(hotel.slug,parsed.success?parsed.data:null)}><h2>{hotel.name}</h2></Link>{hotel.reviewSummary.overall!==null&&<div className="resultRating"><strong>{hotel.reviewSummary.overall.toFixed(1)}</strong><span>{hotel.reviewSummary.count} {hotel.reviewSummary.count===1?copy.search.review:copy.search.reviews}</span></div>}<div className="resultTags">{hotel.from.promotion&&<span className="dealPill">{hotel.from.promotion.discountPercent}% {copy.search.off} · {hotel.from.promotion.name}</span>}{hotel.amenities.slice(0,4).map((amenity)=><span key={amenity.code}>{amenity.name}</span>)}</div><div className="resultPolicy"><strong>{hotel.from.cancellationPolicy.name}</strong><span>{hotel.from.freeCancellationNow?copy.search.freeNow:copy.search.penalty}</span></div>{hotel.from.availableToSell<=3&&<div className="scarcityNote">{copy.search.only} {hotel.from.availableToSell} {hotel.from.availableToSell===1?copy.search.roomLeft:copy.search.roomsLeft}</div>}</div><div className="premiumResultPrice"><span>{copy.search.finalTotal}</span><strong>{total.converted?`${marketCopy.approx} ${total.text}`:total.text}</strong><small>{average.converted?`${marketCopy.approx} ${average.text}`:average.text} {copy.search.average}</small>{total.converted&&<small className="fxSourceAmount">{total.sourceText} · {marketCopy.charged}</small>}<div className="paymentModes">{hotel.from.paymentModes.map((mode)=><span key={mode}>{mode==="PAY_AT_HOTEL"?copy.search.payHotel:copy.search.payNow}</span>)}</div><Link prefetch={false} className="resultCta" href={hotelHref(hotel.slug,parsed.success?parsed.data:null)}>{copy.search.seeRooms}</Link></div></div></article>;
        })}</div>
        {data?.pagination.nextCursor&&parsed.success&&<nav className="searchPaginationV2"><Link href={nextPageHref(params,data.pagination.nextCursor)}>{locale==="ar"?"عرض المزيد من الفنادق":locale==="zh"?"查看更多酒店":"Show more hotels"}</Link></nav>}
      </div>
    </section>
  </main>;
}

function first(value:string|string[]|undefined):string|undefined{return Array.isArray(value)?value[0]:value;}
function values(value:string|string[]|undefined):string[]{const items=value?(Array.isArray(value)?value:[value]):[];return items.map((item)=>item.trim()).filter(Boolean);}
function optional(value:string|undefined):string|undefined{return value&&value.trim()?value:undefined;}
function hotelHref(hotelSlug:string,input:{arrival:string;departure:string;adults:number;children:number}|null){if(!input)return `/hotel/${hotelSlug}`;const query=new URLSearchParams({arrival:input.arrival,departure:input.departure,adults:String(input.adults),children:String(input.children)});return `/hotel/${hotelSlug}?${query.toString()}`;}
function amenityLabel(locale:GuestLocale,code:string,fallback:string){if(locale==="ar")return ({WIFI:"واي فاي",PARKING:"مواقف سيارات",POOL:"مسبح",GYM:"نادي رياضي",BREAKFAST:"إفطار"} as Record<string,string>)[code]??fallback;if(locale==="zh")return ({WIFI:"无线网络",PARKING:"停车场",POOL:"游泳池",GYM:"健身房",BREAKFAST:"早餐"} as Record<string,string>)[code]??fallback;return fallback;}
function nextPageHref(params:SearchParams,cursor:string){const next=new URLSearchParams();for(const [key,value] of Object.entries(params)){if(key==="cursor"||value===undefined)continue;for(const item of Array.isArray(value)?value:[value])next.append(key,item);}next.set("cursor",cursor);return `/search?${next.toString()}`;}
