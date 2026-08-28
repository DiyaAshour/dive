import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getPublicHotelSeoDetails } from "@platform/server";
import { requestLocale } from "@/lib/request-locale";
import { siteUrl } from "@/lib/site-url";

type Params = Promise<{id:string}>;

export async function generateMetadata({params}:Readonly<{params:Params}>):Promise<Metadata> {
  const [{id},locale] = await Promise.all([params,requestLocale()]);
  const hotel = await getPublicHotelSeoDetails(id);
  const canonical = siteUrl(`/hotel/${hotel.slug}`);
  const place = hotel.area ? `${hotel.area}, ${hotel.city}` : hotel.city;
  const title = locale === "ar" ? `${hotel.name} في ${place} | HandMeKey` : `${hotel.name}, ${place} | HandMeKey`;
  const description = hotel.description?.trim().slice(0,300) || (locale === "ar" ? `شاهد غرف وأسعار ${hotel.name} المباشرة في ${place} مع السعر النهائي وشروط الإلغاء قبل الحجز.` : `See live rooms and rates for ${hotel.name} in ${place}, with the final stay price and cancellation terms before booking.`);
  const images = hotel.photos.slice(0,4).map((photo)=>({url:photo.url,alt:photo.alt??hotel.name}));
  return {
    title: {absolute:title},
    description,
    alternates: {canonical},
    openGraph: {title,description,url:canonical,type:"website",...(images.length?{images}:{})},
    twitter: {card:"summary_large_image",title,description,...(images[0]?{images:[images[0].url]}:{})},
  };
}

export default async function HotelSeoLayout({children,params}:Readonly<{children:ReactNode;params:Params}>) {
  const [{id},locale] = await Promise.all([params,requestLocale()]);
  const hotel = await getPublicHotelSeoDetails(id);
  const canonical = siteUrl(`/hotel/${hotel.slug}`);
  const destination = hotel.primaryDestination;
  const destinationUrl = destination ? siteUrl(`/hotels/${countrySlug(hotel.countryCode)}/${destination.slug}`) : null;
  const schemas = [
    {
      "@context":"https://schema.org",
      "@type":"Hotel",
      "@id":`${canonical}#hotel`,
      name:hotel.name,
      url:canonical,
      description:hotel.description??undefined,
      image:hotel.photos.map((photo)=>photo.url),
      starRating:hotel.starRating?{"@type":"Rating",ratingValue:hotel.starRating,bestRating:5}:undefined,
      address:{"@type":"PostalAddress",streetAddress:hotel.address,addressLocality:hotel.city,addressCountry:hotel.countryCode},
      ...(hotel.location?{geo:{"@type":"GeoCoordinates",latitude:hotel.location.latitude,longitude:hotel.location.longitude}}:{}),
      amenityFeature:hotel.amenities.map((amenity)=>({"@type":"LocationFeatureSpecification",name:amenity.name,value:true})),
      ...(hotel.reviewSummary.count>0&&hotel.reviewSummary.overall!==null?{aggregateRating:{"@type":"AggregateRating",ratingValue:hotel.reviewSummary.overall,bestRating:10,worstRating:1,ratingCount:hotel.reviewSummary.count}}:{}),
    },
    {
      "@context":"https://schema.org",
      "@type":"BreadcrumbList",
      itemListElement:[
        {"@type":"ListItem",position:1,name:"HandMeKey",item:siteUrl()},
        ...(destination&&destinationUrl?[{"@type":"ListItem",position:2,name:locale==="ar"?destination.nameAr??destination.nameEn:destination.nameEn,item:destinationUrl}]:[]),
        {"@type":"ListItem",position:destination?3:2,name:hotel.name,item:canonical},
      ],
    },
  ];
  return <>{children}{schemas.map((schema,index)=><script key={index} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>)}</>;
}

function countrySlug(code:string){return code.toUpperCase()==="JO"?"jordan":code.toLowerCase();}
