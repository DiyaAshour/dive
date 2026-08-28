import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Search, Star } from "lucide-react";
import { getPublicDestinationLanding } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { requestLocale } from "@/lib/request-locale";
import { siteUrl } from "@/lib/site-url";
import { defaultStayDates } from "@/lib/stay-dates";

type Params = Promise<{country:string;destination:string}>;

export async function generateMetadata({params}:Readonly<{params:Params}>):Promise<Metadata> {
  const [{country,destination},locale] = await Promise.all([params,requestLocale()]);
  const data = await getPublicDestinationLanding(country,destination,locale);
  if (!data) return {title: "Hotels"};
  const canonical = siteUrl(`/hotels/${data.countrySlug}/${data.slug}`);
  const title = data.seoTitle ?? (locale === "ar" ? `فنادق ${data.name} | HandMeKey` : `Hotels in ${data.name} | HandMeKey`);
  const description = data.seoDescription ?? (locale === "ar" ? `اكتشف فنادق موثقة في ${data.name} مع توفر مباشر وأسعار إقامة نهائية واضحة.` : `Discover verified hotels in ${data.name} with live availability and clear final stay prices.`);
  const image = data.hotels.find((hotel)=>hotel.coverPhoto)?.coverPhoto?.url;
  return {
    title: {absolute:title},
    description,
    alternates: {canonical},
    openGraph: {title,description,url:canonical,type:"website",...(image?{images:[{url:image}]}:{})},
    twitter: {card:"summary_large_image",title,description,...(image?{images:[image]}:{})},
  };
}

export default async function DestinationLandingPage({params}:Readonly<{params:Params}>) {
  const [{country,destination},locale] = await Promise.all([params,requestLocale()]);
  const data = await getPublicDestinationLanding(country,destination,locale);
  if (!data) notFound();
  const stay = defaultStayDates();
  const ar = locale === "ar";
  const searchUrl = searchHref(ar ? data.nameAr ?? data.nameEn : data.nameEn,stay);
  const schemas = destinationSchemas(data,locale);

  return <main className="destinationLanding">
    <CustomerHeader/>
    <section className="destinationHero"><div className="shell destinationHeroGrid"><div><span className="eyebrow">{ar?"وجهة موثقة على HandMeKey":"HandMeKey destination"}</span><h1>{ar?`فنادق ${data.name}`:`Hotels in ${data.name}`}</h1><p>{data.seoDescription ?? (ar?`قارن الإقامات المتاحة في ${data.name} وشاهد السعر النهائي قبل الحجز.`:`Compare available stays in ${data.name} and see the final price before booking.`)}</p></div><div className="destinationHeroFacts"><div><span>{ar?"فنادق منشورة":"Published hotels"}</span><strong>{data.propertyCount}</strong></div><div><span>{ar?"الموقع":"Location"}</span><strong><MapPin size={16}/>{data.name}</strong></div></div></div></section>
    <section className="shell destinationContent">
      {data.children.length>0&&<nav className="destinationAreaChips" aria-label={ar?"مناطق الوجهة":"Destination areas"}>{data.children.map((child)=><Link key={child.id} href={searchHref(child.searchValue,stay)}>{child.name}</Link>)}</nav>}
      <div className="premiumSectionHead"><div><span className="eyebrow">{ar?"فنادق موثقة":"Verified properties"}</span><h2>{ar?`إقامات في ${data.name}`:`Stays in ${data.name}`}</h2><p>{ar?"كل فندق هنا منشور من بيانات HandMeKey الفعلية، بدون تقييمات أو مخزون مصطنع.":"Every property here comes from live HandMeKey publishing data, with no synthetic ratings or inventory."}</p></div><Link href={searchUrl}><Search size={16}/>{ar?"شاهد الأسعار المباشرة":"See live rates"}</Link></div>
      {data.hotels.length===0?<div className="premiumEmpty"><MapPin size={28}/><h3>{ar?"لا توجد فنادق منشورة حالياً":"No published hotels yet"}</h3><p>{ar?"ارجع لاحقاً أو ابحث في وجهة قريبة.":"Check again later or search a nearby destination."}</p></div>:<div className="destinationHotelGrid">{data.hotels.map((hotel)=><Link prefetch={false} className="destinationHotelCard" href={`/hotel/${hotel.slug}?arrival=${stay.arrival}&departure=${stay.departure}&adults=2&children=0`} key={hotel.id}><div className="destinationHotelCardMedia">{hotel.coverPhoto?<img src={hotel.coverPhoto.url} alt={hotel.coverPhoto.alt??hotel.name} loading="lazy" decoding="async"/>:<div className="destinationHotelCardPlaceholder">{ar?"الصورة قيد الإضافة":"Photo pending"}</div>}</div><div className="destinationHotelCardBody"><div className="destinationHotelMeta"><BadgeCheck size={13}/> {hotel.starRating?`${hotel.starRating}★ · `:""}{hotel.area?`${hotel.area}, `:""}{hotel.city}</div><h2>{hotel.name}</h2>{hotel.reviewSummary.overall!==null&&<div className="destinationHotelRating"><strong>{hotel.reviewSummary.overall.toFixed(1)}</strong><span>{hotel.reviewSummary.count} {ar?"تقييم إقامة موثق":"verified stay reviews"}</span></div>}<div className="destinationHotelAmenities">{hotel.amenities.slice(0,4).map((amenity)=><span key={amenity.code}>{amenity.name}</span>)}</div><span className="stayCardCta">{ar?"شاهد الغرف والأسعار":"See rooms & rates"}</span></div></Link>)}</div>}
      <div className="destinationSearchCta"><div><h2>{ar?`حدد تاريخك في ${data.name}`:`Choose your dates in ${data.name}`}</h2><p>{ar?"التوفر والسعر النهائي يتغيران حسب التاريخ والضيوف.":"Availability and final price change with dates and guests."}</p></div><Link href={searchUrl}><Search size={16}/>{ar?"بحث مباشر":"Live search"}</Link></div>
    </section>
    {schemas.map((schema,index)=><script key={index} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>)}
  </main>;
}

function searchHref(destination:string,stay:{arrival:string;departure:string}) {const query=new URLSearchParams({destination,arrival:stay.arrival,departure:stay.departure,adults:"2",children:"0"});return `/search?${query.toString()}`;}
function destinationSchemas(data:NonNullable<Awaited<ReturnType<typeof getPublicDestinationLanding>>>,locale:"ar"|"en") {
  const pageUrl=siteUrl(`/hotels/${data.countrySlug}/${data.slug}`);
  const itemList=data.hotels.map((hotel,index)=>({"@type":"ListItem",position:index+1,url:siteUrl(`/hotel/${hotel.slug}`),name:hotel.name}));
  return [
    {"@context":"https://schema.org","@type":"CollectionPage",name:locale==="ar"?`فنادق ${data.name}`:`Hotels in ${data.name}`,url:pageUrl,description:data.seoDescription??undefined,mainEntity:{"@type":"ItemList",numberOfItems:data.hotels.length,itemListElement:itemList}},
    {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"HandMeKey",item:siteUrl()},{"@type":"ListItem",position:2,name:data.countryCode==="JO"?(locale==="ar"?"الأردن":"Jordan"):data.countryCode,item:siteUrl(`/hotels/${data.countrySlug}`)},{"@type":"ListItem",position:3,name:data.name,item:pageUrl}]},
  ];
}
