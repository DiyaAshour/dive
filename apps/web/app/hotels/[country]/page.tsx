import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowRight,MapPin} from "lucide-react";
import {countryCodeForSlug,listFeaturedDestinations} from "@platform/server";
import {CustomerHeader} from "@/components/customer-header";
import {requestLocale} from "@/lib/request-locale";
import {siteUrl} from "@/lib/site-url";

type Params=Promise<{country:string}>;

export async function generateMetadata({params}:Readonly<{params:Params}>):Promise<Metadata>{
  const [{country},locale]=await Promise.all([params,requestLocale()]);
  const code=countryCodeForSlug(country);
  if(!code)return {title:"Hotels"};
  const name=code==="JO"?(locale==="ar"?"الأردن":"Jordan"):code;
  const title=locale==="ar"?`فنادق ${name} | HandMeKey`:`Hotels in ${name} | HandMeKey`;
  const description=locale==="ar"?`استكشف وجهات وفنادق موثقة في ${name} مع توفر مباشر وأسعار نهائية واضحة.`:`Explore verified hotel destinations in ${name} with live availability and clear final stay prices.`;
  return {title:{absolute:title},description,alternates:{canonical:siteUrl(`/hotels/${country.toLowerCase()}`)},openGraph:{title,description,url:siteUrl(`/hotels/${country.toLowerCase()}`),type:"website"}};
}

export default async function CountryHotelLanding({params}:Readonly<{params:Params}>){
  const [{country},locale]=await Promise.all([params,requestLocale()]);
  const code=countryCodeForSlug(country);
  if(!code)notFound();
  const destinations=await listFeaturedDestinations({countryCode:code,limit:12});
  const ar=locale==="ar";
  const countryName=code==="JO"?(ar?"الأردن":"Jordan"):code;
  return <main className="destinationLanding"><CustomerHeader/><section className="destinationHero"><div className="shell destinationHeroGrid"><div><span className="eyebrow">{ar?"استكشف الوجهات":"Explore destinations"}</span><h1>{ar?`فنادق ${countryName}`:`Hotels in ${countryName}`}</h1><p>{ar?"اختر وجهتك ثم قارن التوفر والأسعار النهائية مباشرة.":"Choose a destination, then compare live availability and final stay prices."}</p></div><div className="destinationHeroFacts"><div><span>{ar?"وجهات منشورة":"Published destinations"}</span><strong>{destinations.length}</strong></div><div><span>{ar?"الدولة":"Country"}</span><strong>{countryName}</strong></div></div></div></section><section className="shell destinationContent"><div className="destinationHotelGrid">{destinations.map((destination)=><Link className="destinationHotelCard" href={destination.landingPath} key={destination.id}><div className="destinationHotelCardMedia">{destination.coverPhoto?<img src={destination.coverPhoto.url} alt={destination.coverPhoto.alt??destination.nameEn}/>:<div className="destinationHotelCardPlaceholder"><MapPin size={28}/></div>}</div><div className="destinationHotelCardBody"><div className="destinationHotelMeta"><MapPin size={13}/>{countryName}</div><h2>{ar?destination.nameAr??destination.nameEn:destination.nameEn}</h2><p>{destination.propertyCount} {ar?"إقامة موثقة":"verified stays"}</p><span className="stayCardCta">{ar?"استكشف الفنادق":"Explore hotels"}<ArrowRight size={15}/></span></div></Link>)}</div></section></main>;
}
