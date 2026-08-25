import {listBlogFeedEntries} from "@platform/server";
import {siteUrl} from "@/lib/site-url";

export async function GET(){
  const posts=await listBlogFeedEntries(50);
  const items=posts.map(post=>{
    const locale=post.locale==="AR"?"ar":"en";
    const url=siteUrl(`/blog/${locale}/${post.slug}`);
    return `<item><title>${xml(post.title)}</title><link>${xml(url)}</link><guid isPermaLink="true">${xml(url)}</guid><description>${xml(post.excerpt)}</description><category>${xml(post.category)}</category><author>${xml(post.authorName)}</author>${post.publishedAt?`<pubDate>${post.publishedAt.toUTCString()}</pubDate>`:""}</item>`;
  }).join("");
  const lastBuild=posts[0]?.updatedAt??new Date();
  const body=`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>HandMeKey Travel Guide</title><link>${xml(siteUrl("/blog/en"))}</link><description>Jordan travel guides, hotel booking advice and HandMeKey product explainers.</description><language>en-ar</language><lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate><atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${xml(siteUrl("/feed.xml"))}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(body,{headers:{"content-type":"application/rss+xml; charset=utf-8","cache-control":"public, max-age=300, s-maxage=3600"}});
}

function xml(value:string){return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");}
