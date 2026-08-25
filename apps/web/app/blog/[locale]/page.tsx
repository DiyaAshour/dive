import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, CalendarDays, Sparkles } from "lucide-react";
import { listPublishedBlogPosts } from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { siteUrl } from "@/lib/site-url";

const pageCopy = {
  en: {
    title:"HandMeKey Travel Guide | Jordan hotels, stays and booking advice",
    description:"Practical Jordan travel guides, hotel booking advice, destination ideas and HandMeKey product explainers written to help travelers make clearer stay decisions.",
    eyebrow:"HandMeKey Travel Guide",
    heading:"Useful travel answers before you book.",
    intro:"Destination guides, hotel explainers, booking tips and local stay ideas built around the questions travelers actually search for.",
    empty:"No published guides yet.",
    read:"Read guide",
    featured:"Featured guide",
    rewards:"Understand HandMeKey Rewards",
    search:"Search live stays",
  },
  ar: {
    title:"دليل HandMeKey للسفر | فنادق الأردن ونصائح الحجز والوجهات",
    description:"أدلة عملية للسفر في الأردن ونصائح حجز الفنادق وأفكار الوجهات وشرح خدمات HandMeKey لمساعدتك على اختيار الإقامة بوضوح أكبر.",
    eyebrow:"دليل HandMeKey للسفر",
    heading:"إجابات مفيدة قبل ما تحجز.",
    intro:"أدلة وجهات، شرح للفنادق والحجوزات، ونصائح محلية مبنية حول الأسئلة التي يبحث عنها المسافر فعلًا.",
    empty:"لا توجد أدلة منشورة حتى الآن.",
    read:"اقرأ الدليل",
    featured:"دليل مميز",
    rewards:"تعرف على مكافآت HandMeKey",
    search:"ابحث عن إقامات متاحة",
  },
} as const;

type Locale = keyof typeof pageCopy;

export function generateStaticParams(){return [{locale:"en"},{locale:"ar"}];}

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const {locale:raw}=await params;
  if(raw!=="en"&&raw!=="ar")return {};
  const locale=raw as Locale; const c=pageCopy[locale]; const canonical=siteUrl(`/blog/${locale}`);
  return {title:c.title,description:c.description,alternates:{canonical,languages:{en:siteUrl("/blog/en"),ar:siteUrl("/blog/ar"),"x-default":siteUrl("/blog/en")}},openGraph:{type:"website",url:canonical,title:c.title,description:c.description,siteName:"HandMeKey",locale:locale==="ar"?"ar_JO":"en_US"},twitter:{card:"summary_large_image",title:c.title,description:c.description}};
}

export default async function BlogLanding({params}:{params:Promise<{locale:string}>}){
  const {locale:raw}=await params; if(raw!=="en"&&raw!=="ar")notFound();
  const locale=raw as Locale; const c=pageCopy[locale]; const posts=await listPublishedBlogPosts(locale,60); const rtl=locale==="ar";
  const featured=posts.find((post)=>post.featured)??posts[0]??null; const rest=featured?posts.filter((post)=>post.id!==featured.id):posts;
  const structuredData={"@context":"https://schema.org","@type":"Blog",name:c.eyebrow,description:c.description,url:siteUrl(`/blog/${locale}`),inLanguage:locale,publisher:{"@type":"Organization",name:"HandMeKey",url:siteUrl()}};
  return <main className="blogExperience" dir={rtl?"rtl":"ltr"}>
    <CustomerHeader/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData)}}/>
    <section className="blogHero"><div className="shell blogHeroInner"><div><span className="eyebrow"><BookOpen size={16}/>{c.eyebrow}</span><h1>{c.heading}</h1><p>{c.intro}</p><div className="blogHeroLinks"><Link href={`/rewards/${locale}`}>{c.rewards}</Link><Link href="/search">{c.search}</Link></div></div><div className="blogLanguageLinks"><Link href="/blog/en" hrefLang="en">English</Link><Link href="/blog/ar" hrefLang="ar">العربية</Link></div></div></section>
    <section className="shell blogListing">
      {!featured?<div className="blogEmpty"><BookOpen size={34}/><strong>{c.empty}</strong></div>:<>
        <article className="blogFeatured">{featured.coverImageUrl?<img src={featured.coverImageUrl} alt={featured.coverImageAlt||featured.title}/>:<div className="blogImagePlaceholder"><Sparkles size={34}/></div>}<div><span className="blogCategory">{c.featured} · {featured.category}</span><h2><Link href={`/blog/${locale}/${featured.slug}`}>{featured.title}</Link></h2><p>{featured.excerpt}</p><div className="blogMeta"><CalendarDays size={15}/>{formatDate(featured.publishedAt,locale)} · {featured.readingMinutes} min</div><Link className="blogReadLink" href={`/blog/${locale}/${featured.slug}`}>{c.read}<ArrowRight size={16}/></Link></div></article>
        <div className="blogGrid">{rest.map((post)=><article className="blogCard" key={post.id}>{post.coverImageUrl?<img src={post.coverImageUrl} alt={post.coverImageAlt||post.title} loading="lazy"/>:<div className="blogImagePlaceholder"><BookOpen size={28}/></div>}<div><span className="blogCategory">{post.category}</span><h2><Link href={`/blog/${locale}/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p><div className="blogMeta"><CalendarDays size={14}/>{formatDate(post.publishedAt,locale)} · {post.readingMinutes} min</div><Link className="blogReadLink" href={`/blog/${locale}/${post.slug}`}>{c.read}<ArrowRight size={15}/></Link></div></article>)}</div>
      </>}
    </section>
  </main>;
}

function formatDate(value:Date|null,locale:Locale){if(!value)return "";return value.toLocaleDateString(locale==="ar"?"ar-JO":"en-US",{year:"numeric",month:"long",day:"numeric"});}
