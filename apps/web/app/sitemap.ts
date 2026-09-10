import type {MetadataRoute} from "next";
import {listBlogSitemapEntries,listDestinationSitemapEntries,listHotelSitemapEntries} from "@platform/server";
import {siteUrl} from "@/lib/site-url";

export const dynamic="force-dynamic";

const blogLocalePath=(locale:"AR"|"EN"|"ES")=>locale==="AR"?"ar":locale==="ES"?"es":"en";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const [posts,destinations,hotels]=await Promise.all([listBlogSitemapEntries(),listDestinationSitemapEntries(),listHotelSitemapEntries()]);
  const now=new Date();
  const blogAlternates={ar:siteUrl("/blog/ar"),en:siteUrl("/blog/en"),es:siteUrl("/blog/es"),"x-default":siteUrl("/blog/en")};
  const staticEntries:MetadataRoute.Sitemap=[
    {url:siteUrl(),lastModified:now,changeFrequency:"daily",priority:1},
    {url:siteUrl("/rewards/ar"),lastModified:now,changeFrequency:"weekly",priority:.9,alternates:{languages:{ar:siteUrl("/rewards/ar"),en:siteUrl("/rewards/en")}}},
    {url:siteUrl("/rewards/en"),lastModified:now,changeFrequency:"weekly",priority:.9,alternates:{languages:{en:siteUrl("/rewards/en"),ar:siteUrl("/rewards/ar")}}},
    {url:siteUrl("/blog/ar"),lastModified:now,changeFrequency:"daily",priority:.9,alternates:{languages:blogAlternates}},
    {url:siteUrl("/blog/en"),lastModified:now,changeFrequency:"daily",priority:.9,alternates:{languages:blogAlternates}},
    {url:siteUrl("/blog/es"),lastModified:now,changeFrequency:"daily",priority:.9,alternates:{languages:blogAlternates}},
  ];
  const destinationEntries:MetadataRoute.Sitemap=destinations.map((destination)=>({url:siteUrl(`/hotels/${destination.countrySlug}/${destination.slug}`),lastModified:destination.updatedAt,changeFrequency:"daily",priority:.88}));
  const hotelEntries:MetadataRoute.Sitemap=hotels.map((hotel)=>({url:siteUrl(`/hotel/${hotel.slug}`),lastModified:hotel.updatedAt,changeFrequency:"weekly",priority:.82}));
  const blogEntries:MetadataRoute.Sitemap=posts.map(post=>({url:siteUrl(`/blog/${blogLocalePath(post.locale)}/${post.slug}`),lastModified:post.updatedAt,changeFrequency:"monthly",priority:.78}));
  return [...staticEntries,...destinationEntries,...hotelEntries,...blogEntries];
}
