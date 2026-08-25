import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {ArrowLeft, ArrowRight, CalendarDays, Clock3, UserRound} from "lucide-react";
import {ApplicationError, getPublishedBlogPost, listRelatedPublishedBlogPosts} from "@platform/server";
import {BlogArticleBody} from "@/components/blog-article-body";
import {CustomerHeader} from "@/components/customer-header";
import {siteUrl} from "@/lib/site-url";

export const dynamic="force-dynamic";

type Locale="en"|"ar";

export async function generateMetadata({params}:{params:Promise<{locale:string;slug:string}>}):Promise<Metadata>{
  const {locale:raw,slug}=await params; if(raw!=="en"&&raw!=="ar")return {};
  try{
    const locale=raw as Locale; const post=await getPublishedBlogPost(locale,slug); const canonical=siteUrl(`/blog/${locale}/${post.slug}`);
    const image=post.coverImageUrl?[{url:post.coverImageUrl,alt:post.coverImageAlt||post.title}]:null;
    return {title:post.seoTitle,description:post.seoDescription,alternates:{canonical},openGraph:{type:"article",url:canonical,title:post.seoTitle,description:post.seoDescription,siteName:"HandMeKey",locale:locale==="ar"?"ar_JO":"en_US",modifiedTime:post.updatedAt.toISOString(),authors:[post.authorName],tags:post.tags,...(post.publishedAt?{publishedTime:post.publishedAt.toISOString()}:{}),...(image?{images:image}:{})},twitter:{card:post.coverImageUrl?"summary_large_image":"summary",title:post.seoTitle,description:post.seoDescription,...(post.coverImageUrl?{images:[post.coverImageUrl]}:{})}};
  }catch{return {};}
}

export default async function BlogArticlePage({params}:{params:Promise<{locale:string;slug:string}>}){
  const {locale:raw,slug}=await params; if(raw!=="en"&&raw!=="ar")notFound(); const locale=raw as Locale;
  let post:Awaited<ReturnType<typeof getPublishedBlogPost>>;
  try{post=await getPublishedBlogPost(locale,slug);}catch(error){if(error instanceof ApplicationError&&error.status===404)notFound();throw error;}
  const related=await listRelatedPublishedBlogPosts(locale,post.id,post.category,3); const rtl=locale==="ar";
  const c=locale==="ar"?{back:"العودة إلى الدليل",min:"دقائق قراءة",updated:"آخر تحديث",related:"أدلة مرتبطة",read:"اقرأ الدليل",search:"ابحث عن فندق",rewards:"مكافآت HandMeKey"}:{back:"Back to Travel Guide",min:"min read",updated:"Updated",related:"Related guides",read:"Read guide",search:"Search hotels",rewards:"HandMeKey Rewards"};
  const url=siteUrl(`/blog/${locale}/${post.slug}`);
  const structuredData={"@context":"https://schema.org","@type":"Article",headline:post.title,description:post.seoDescription,image:post.coverImageUrl?[post.coverImageUrl]:undefined,datePublished:post.publishedAt?.toISOString(),dateModified:post.updatedAt.toISOString(),inLanguage:locale,mainEntityOfPage:{"@type":"WebPage","@id":url},author:{"@type":"Person",name:post.authorName},publisher:{"@type":"Organization",name:"HandMeKey",url:siteUrl()},articleSection:post.category,keywords:post.tags.join(", "),url};
  const breadcrumbs={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"HandMeKey",item:siteUrl()},{"@type":"ListItem",position:2,name:locale==="ar"?"دليل السفر":"Travel Guide",item:siteUrl(`/blog/${locale}`)},{"@type":"ListItem",position:3,name:post.title,item:url}]};
  return <main className="blogExperience" dir={rtl?"rtl":"ltr"} lang={locale}>
    <CustomerHeader/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData)}}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumbs)}}/>
    <article className="blogArticle shell">
      <Link className="blogBack" href={`/blog/${locale}`}>{rtl?<ArrowRight size={16}/>:<ArrowLeft size={16}/>} {c.back}</Link>
      <header className="blogArticleHead"><span className="blogCategory">{post.category}</span><h1>{post.title}</h1><p>{post.excerpt}</p><div className="blogArticleMeta"><span><UserRound size={15}/>{post.authorName}</span><span><CalendarDays size={15}/>{formatDate(post.publishedAt,locale)}</span><span><Clock3 size={15}/>{post.readingMinutes} {c.min}</span></div>{post.coverImageUrl&&<img className="blogArticleCover" src={post.coverImageUrl} alt={post.coverImageAlt||post.title}/>}</header>
      <div className="blogArticleLayout"><BlogArticleBody body={post.body}/><aside className="blogArticleRail"><div><strong>{c.updated}</strong><span>{formatDate(post.updatedAt,locale)}</span></div><Link href="/search">{c.search}</Link><Link href={`/rewards/${locale}`}>{c.rewards}</Link>{post.tags.length>0&&<div className="blogTags">{post.tags.map((tag)=><span key={tag}>{tag}</span>)}</div>}</aside></div>
      {related.length>0&&<section className="blogRelated"><h2>{c.related}</h2><div>{related.map((item)=><article key={item.id}><span>{item.category}</span><h3><Link href={`/blog/${locale}/${item.slug}`}>{item.title}</Link></h3><p>{item.excerpt}</p><Link className="blogReadLink" href={`/blog/${locale}/${item.slug}`}>{c.read}<ArrowRight size={15}/></Link></article>)}</div></section>}
    </article>
  </main>;
}

function formatDate(value:Date|null,locale:Locale){if(!value)return "";return value.toLocaleDateString(locale==="ar"?"ar-JO":"en-US",{year:"numeric",month:"long",day:"numeric"});}
