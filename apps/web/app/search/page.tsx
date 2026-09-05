import Link from "next/link";
import { BadgeCheck, MapPin, Megaphone, SlidersHorizontal } from "lucide-react";
import { discoverySearchSchema } from "@platform/contracts";
import { searchHotelsV2WithVisibilityBoost, visibilityBoostAttributionToken } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { DestinationAutocomplete } from "@/components/destination-autocomplete";
import { guestMoney, sourceAmountFromGuestInput } from "@/lib/guest-currency";
import { guestDictionary, guestMarketCopy } from "@/lib/guest-i18n";
import { requestGuestMarket } from "@/lib/request-guest-market";
import { searchUiCopy } from "@/lib/search-ui-copy";
import { defaultStayDates } from "@/lib/stay-dates";
import { SaveSearchButton } from "./save-search-button";

type SearchParams = Record<string, string | string[] | undefined>;
const commonAmenities = ["WIFI","PARKING","POOL","GYM","BREAKFAST"] as const;

export default async function SearchPage({searchParams}: {searchParams: Promise<SearchParams>}) {
  const [params,market] = await Promise.all([searchParams,requestGuestMarket()]);
  const locale=market.locale;
  const copy = guestDictionary(locale);
  const marketCopy=guestMarketCopy(locale);
  const searchUi=searchUiCopy(locale);
  const defaults = defaultStayDates();
  const displayMinPrice=optional(first(params.minPrice));
  const displayMaxPrice=optional(first(params.maxPrice));
  const raw = {
    destination: first(params.destination) ?? "Amman",
    arrival: first(params.arrival) ?? defaults.arrival,
    departure: first(params.departure) ?? defaults.departure,
    adults: first(params.adults) ?? "2",
    children: first(params.children) ?? "0",
    childrenAges: values(params.childrenAge),
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
  let data: Awaited<ReturnType<typeof searchHotelsV2WithVisibilityBoost>> | null = null;
  if (parsed.success) {
    try {
      data = await searchHotelsV2WithVisibilityBoost(parsed.data,{travelerCountry:market.countryCode ?? undefined});
    } catch (error) {
      console.error("Search data unavailable", error);
    }
  }
  const searchUnavailable = parsed.success && data === null;
  const selectedAmenities = new Set(raw.amenities.map((value)=>value.toUpperCase()));
  const selectedRating = raw.amenities.find((value)=>value.toUpperCase().startsWith("FILTER:RATING:"))?.toUpperCase() ?? "";
  const selectedProperty = raw.amenities.find((value)=>value.toUpperCase().startsWith("FILTER:PROPERTY:"))?.toUpperCase() ?? "";
  const dealsOnly = selectedAmenities.has("FILTER:DEAL:ONLY");
  const accessible = selectedAmenities.has("FILTER:ACCESSIBLE");
  const onlyDemoResults = Boolean(data?.count) && data!.results.every((hotel)=>hotel.slug.startsWith("demo-"));
  const resultKind = onlyDemoResults ? ((data?.count??0)===1?copy.search.demoProperty:copy.search.demoProperties) : ((data?.count??0)===1?copy.search.verifiedProperty:copy.search.verifiedProperties);
  const resolvedLabel = data?.resolvedDestination ? (locale === "ar" ? data.resolvedDestination.nameAr ?? data.resolvedDestination.nameEn : data.resolvedDestination.nameEn) : raw.destination;

  return <main className="searchExperience" lang={market.intlLocale} dir={market.direction}>
    <CustomerHeader/>
    <section className="searchSummaryBar"><div className="shell"><form className="searchSummaryForm" method="get" action="/search"><label><span>{copy.search.destination}</span><DestinationAutocomplete locale={market.baseLocale} defaultValue={raw.destination} required ariaLabel={copy.search.destination}/></label><label><span>{copy.search.checkIn}</span><input name="arrival" type="date" defaultValue={raw.arrival} required/></label><label><span>{copy.search.checkOut}</span><input name="departure" type="date" defaultValue={raw.departure} required/></label><label><span>{copy.search.adults}</span><input name="adults" type="number" min="1" max="20" defaultValue={raw.adults} required/></label><label><span>{copy.search.children}</span><input name="children" type="number" min="0" max="20" defaultValue={raw.children} required/></label>{raw.childrenAges.map((age,index)=><input key={`summary-child-age-${index}`} type="hidden" name="childrenAge" value={age}/>)}<input type="hidden" name="pageSize" value={raw.pageSize}/><button type="submit">{copy.search.again}</button></form></div></section>
    <section className="shell searchLayout">
      <aside className="searchFilters"><div className="filterHeading"><SlidersHorizontal size={18}/><strong>{copy.search.filter}</strong></div><form method="get" action="/search" className="filterForm"><input type="hidden" name="destination" value={raw.destination}/><input type="hidden" name="arrival" value={raw.arrival}/><input type="hidden" name="departure" value={raw.departure}/><input type="hidden" name="adults" value={raw.adults}/><input type="hidden" name="children" value={raw.children}/>{raw.childrenAges.map((age,index)=><input key={`filter-child-age-${index}`} type="hidden" name="childrenAge" value={age}/>)}<input type="hidden" name="pageSize" value={raw.pageSize}/>
        <div className="filterBlock"><span>{copy.search.nightly} · {market.currency}</span><div className="priceFilterGrid"><label>{copy.search.min}<input name="minPrice" type="number" min="0" step="0.01" defaultValue={displayMinPrice}/></label><label>{copy.search.max}<input name="maxPrice" type="number" min="0" step="0.01" defaultValue={displayMaxPrice}/></label></div></div>
        <div className="filterBlock">
          <label>{copy.search.stars}<select name="stars" defaultValue={first(params.stars) ?? ""}><option value="">{copy.search.anyStars}</option><option value="5">5 ★</option><option value="4">4 ★</option><option value="3">3 ★</option><option value="2">2 ★</option><option value="1">1 ★</option></select></label>
          <label>{searchUi.advanced.guestRating}<select name="amenities" defaultValue={selectedRating}><option value="">{searchUi.advanced.anyRating}</option><option value="FILTER:RATING:9">9+</option><option value="FILTER:RATING:8">8+</option><option value="FILTER:RATING:7">7+</option><option value="FILTER:RATING:6">6+</option></select></label>
          <label>{searchUi.advanced.propertyType}<select name="amenities" defaultValue={selectedProperty}><option value="">{searchUi.advanced.anyProperty}</option><option value="FILTER:PROPERTY:HOTEL">{searchUi.advanced.hotel}</option><option value="FILTER:PROPERTY:RESORT">{searchUi.advanced.resort}</option><option value="FILTER:PROPERTY:APARTMENT">{searchUi.advanced.apartment}</option><option value="FILTER:PROPERTY:VILLA">{searchUi.advanced.villa}</option></select></label>
          <label>{copy.search.payment}<select name="paymentMode" defaultValue={raw.paymentMode ?? ""}><option value="">{copy.search.anyPayment}</option><option value="PAY_AT_HOTEL">{copy.search.payHotel}</option><option value="PAY_NOW">{copy.search.payNow}</option></select></label>
          <label>{copy.search.sort}<select name="sort" defaultValue={raw.sort}><option value="RECOMMENDED">{copy.search.recommended}</option><option value="PRICE_ASC">{copy.search.lowPrice}</option><option value="PRICE_DESC">{copy.search.highPrice}</option><option value="STARS_DESC">{copy.search.highStars}</option><option value="RATING_DESC">{searchUi.advanced.topRated}</option></select></label>
        </div>
        <div className="filterBlock"><label className="filterCheck"><input type="checkbox" name="freeCancellation" value="true" defaultChecked={raw.freeCancellation}/>{copy.search.freeCancel}</label><label className="filterCheck"><input type="checkbox" name="amenities" value="FILTER:DEAL:ONLY" defaultChecked={dealsOnly}/>{searchUi.advanced.dealsOnly}</label><label className="filterCheck"><input type="checkbox" name="amenities" value="FILTER:ACCESSIBLE" defaultChecked={accessible}/>{searchUi.advanced.accessible}</label><span>{copy.search.facilities}</span>{commonAmenities.map((code)=><label className="filterCheck" key={code}><input type="checkbox" name="amenities" value={code} defaultChecked={selectedAmenities.has(code)}/>{searchUi.amenities[code]}</label>)}</div><button className="filterApply" type="submit">{copy.search.apply}</button></form></aside>
      <div className="searchResults"><div className="searchResultsHead"><div><span className="eyebrow">{copy.search.live}</span><h1>{resolvedLabel}</h1><p>{data?.count ?? 0} {resultKind} {copy.search.for} {raw.arrival} → {raw.departure}</p>{data?.resolvedDestination&&<span className="searchResolution"><MapPin size={13}/>{searchUi.destinationMatched} · {data.resolvedDestination.type.toLowerCase()}</span>}</div>{parsed.success&&!searchUnavailable&&<SaveSearchButton locale={market.baseLocale} destination={parsed.data.destination} arrival={parsed.data.arrival} departure={parsed.data.departure} adults={parsed.data.adults} children={parsed.data.children} filters={{minPrice:parsed.data.minPrice,maxPrice:parsed.data.maxPrice,stars:parsed.data.stars,amenities:parsed.data.amenities,freeCancellation:parsed.data.freeCancellation,paymentMode:parsed.data.paymentMode,sort:parsed.data.sort}}/>}</div>
        {!parsed.success&&<div className="premiumEmpty"><h3>{copy.search.badTitle}</h3><p>{parsed.error.issues[0]?.message ?? copy.search.invalid}</p></div>}
        {searchUnavailable&&<div className="premiumEmpty"><h3>{searchUi.unavailableTitle}</h3><p>{searchUi.unavailableBody}</p></div>}
        {data&&data.results.length===0&&<div className="premiumEmpty"><h3>{copy.search.noneTitle}</h3><p>{copy.search.noneBody}</p></div>}
        <div className="searchResultList">{data?.results.map((hotel)=>{
          const total=guestMoney(hotel.from.total,hotel.currency,market.currency,locale);
          const average=guestMoney(hotel.from.averageNightlyTotal,hotel.currency,market.currency,locale);
          const visibilityBoost="visibilityBoost" in hotel ? hotel.visibilityBoost : null;
          const isHotelbeds=hotel.slug.startsWith("hotelbeds-");
          const href=hotelHref(hotel.id,hotel.slug,parsed.success?parsed.data:null,visibilityBoost?.campaignId);
          return <article className="premiumResultCard" key={hotel.id}><Link prefetch={false} className="premiumResultMedia" href={href}>{hotel.coverPhoto?<img src={hotel.coverPhoto.url} alt={hotel.coverPhoto.alt??hotel.name} loading="lazy" decoding="async"/>:<div className="stayCardPlaceholder">{copy.search.photoPending}</div>}<span className="verifiedPill"><BadgeCheck size={14}/>{isHotelbeds?"Hotelbeds API":hotel.slug.startsWith("demo-")?copy.search.demoProperty:copy.search.verified}</span>{visibilityBoost&&<span className="sponsoredPill"><Megaphone size={12}/>{searchUi.sponsored}</span>}</Link><div className="premiumResultContent"><div className="premiumResultMain"><div className="stayCardMeta">{hotel.starRating?`${hotel.starRating}★ · `:""}{hotel.area?`${hotel.area}, `:""}{hotel.city}</div><Link prefetch={false} href={href}><h2>{hotel.name}</h2></Link>{hotel.reviewSummary.overall!==null&&<div className="resultRating"><strong>{hotel.reviewSummary.overall.toFixed(1)}</strong><span>{hotel.reviewSummary.count} {hotel.reviewSummary.count===1?copy.search.review:copy.search.reviews}</span></div>}<div className="resultTags">{hotel.from.promotion&&<span className="dealPill">{hotel.from.promotion.discountPercent}% {copy.search.off} · {hotel.from.promotion.name}</span>}{hotel.amenities.slice(0,4).map((amenity)=><span key={amenity.code}>{amenity.name}</span>)}</div><div className="resultPolicy"><strong>{hotel.from.cancellationPolicy.name}</strong><span>{hotel.from.freeCancellationNow?copy.search.freeNow:copy.search.penalty}</span></div>{hotel.from.availableToSell<=3&&<div className="scarcityNote">{copy.search.only} {hotel.from.availableToSell} {hotel.from.availableToSell===1?copy.search.roomLeft:copy.search.roomsLeft}</div>}</div><div className="premiumResultPrice"><span>{copy.search.finalTotal}</span><strong>{total.converted?`${marketCopy.approx} ${total.text}`:total.text}</strong><small>{average.converted?`${marketCopy.approx} ${average.text}`:average.text} {copy.search.average}</small>{total.converted&&<small className="fxSourceAmount">{total.sourceText} · {marketCopy.charged}</small>}<div className="paymentModes">{paymentModeLabels(hotel.from.paymentModes,copy.search.payNow,copy.search.payHotel).map((label)=><span key={label}>{label}</span>)}</div><Link prefetch={false} className="resultCta" href={href}>{copy.search.seeRooms}</Link></div></div></article>;
        })}</div>
        {data?.pagination.nextCursor&&parsed.success&&<nav className="searchPaginationV2"><Link href={nextPageHref(params,data.pagination.nextCursor)}>{searchUi.showMore}</Link></nav>}
      </div>
    </section>
  </main>;
}

function first(value:string|string[]|undefined):string|undefined{return Array.isArray(value)?value[0]:value;}
function values(value:string|string[]|undefined):string[]{const items=value?(Array.isArray(value)?value:[value]):[];return items.map((item)=>item.trim()).filter(Boolean);}
function optional(value:string|undefined):string|undefined{return value&&value.trim()?value:undefined;}
function hotelHref(hotelId:string,hotelSlug:string,input:{arrival:string;departure:string;adults:number;children:number;childrenAges:readonly number[]}|null,campaignId?:string){if(!input)return `/hotel/${hotelSlug}`;const stay=new URLSearchParams({arrival:input.arrival,departure:input.departure,adults:String(input.adults),children:String(input.children)});for(const age of input.childrenAges)stay.append("childrenAge",String(age));if(hotelSlug.startsWith("hotelbeds-")||!campaignId)return `/hotel/${hotelSlug}?${stay.toString()}`;const token=visibilityBoostAttributionToken(hotelId,campaignId);const click=new URLSearchParams({token,hotel:hotelSlug,...Object.fromEntries(stay.entries())});return `/api/v1/visibility-boost/click?${click.toString()}`;}
function nextPageHref(params:SearchParams,cursor:string){const next=new URLSearchParams();for(const [key,value] of Object.entries(params)){if(key==="cursor"||value===undefined)continue;for(const item of Array.isArray(value)?value:[value])next.append(key,item);}next.set("cursor",cursor);return `/search?${next.toString()}`;}
function paymentModeLabels(modes:readonly string[],payNow:string,payHotel:string):string[]{if(modes.length===0)return[];if(modes.length===1)return[modes[0]==="PAY_AT_HOTEL"?payHotel:payNow];return [`${payNow} / ${payHotel}`];}
