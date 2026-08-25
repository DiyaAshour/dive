import type {MetadataRoute} from "next";
import {listBlogSitemapEntries} from "@platform/server";
import {siteUrl} from "@/lib/site-url";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const posts=await listBlogSitemapEntries();
  const now=new Date();
  const staticEntries:MetadataRoute.Sitemap=[
    {url:siteUrl(),lastModified:now,changeFrequency:"daily",priority:1},
    {url:siteUrl("/rewards/ar"),lastModified:now,changeFrequency:"weekly",priority:.9,alternates:{languages:{ar:siteUrl("/rewards/ar"),en:siteUrl("/rewards/en")}}},
    {url:siteUrl("/rewards/en"),lastModified:now,changeFrequency:"weekly",priority:.9,alternates:{languages:{en:siteUrl("/rewards/en"),ar:siteUrl("/rewards/ar")}}},
    {url:siteUrl("/blog/ar"),lastModified:now,changeFrequency:"daily",priority:.9,alternates:{languages:{ar:siteUrl("/blog/ar"),en:siteUrl("/blog/en")}}},
    {url:siteUrl("/blog/en"),lastModified:now,changeFrequency:"daily",priority:.9,alternates:{languages:{en:siteUrl("/blog/en"),ar:siteUrl("/blog/ar")}}},
  ];
  return [...staticEntries,...posts.map(post=>({url:siteUrl(`/blog/${post.locale==="AR"?"ar":"en"}/${post.slug}`),lastModified:post.updatedAt,changeFrequency:"monthly" as const,priority:.78}))];
}
