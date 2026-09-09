import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, CalendarDays, FolderOpen } from "lucide-react";
import {listPublishedBlogPosts} from "@platform/server";
import { CustomerHeader } from "@/components/customer-header";
import { siteUrl } from "@/lib/site-url";

export const dynamic="force-dynamic";

const pageCopy = {
  en: {
    title:"HandMeKey Travel Guide | Jordan hotels, stays and booking advice",
    description:"Practical Jordan travel guides, hotel booking advice, destination ideas and HandMeKey product explainers written to help travelers make clearer stay decisions.",
    eyebrow:"HandMeKey Travel Guide",
    heading:"Useful travel answers before you book.",
    intro:"Destination guides, hotel explainers, booking tips and local stay ideas built around the questions travelers actually search for.",
    empty:"No published guides yet.",
    emptyCategory:"No published guides in this category yet.",
    read:"Read guide",
    featured:"Featured guide",
    rewards:"Understand HandMeKey Rewards",
    search:"Search live stays",
    all:"All guides",
    categories:"Browse by topic",
    latest:"Latest guides",
  },
  ar: {
    title:"دليل HandMeKey للسفر | فنادق الأردن ونصائح الحجز والوجهات",
    description:"أدلة عملية للسفر في الأردن ونصائح حجز الفنادق وأفكار الوجهات وشرح خدمات HandMeKey لمساعدتك على اختيار الإقامة بوضوح أكبر.",
    eyebrow:"دليل HandMeKey للسفر",
    heading:"إجابات مفيدة قبل ما تحجز.",
    intro:"أدلة وجهات، شرح للفنادق والحجوزات، ونصائح محلية مبنية حول الأسئلة التي يبحث عنها المسافر فعلًا.",
    empty:"لا توجد أدلة منشورة حتى الآن.",
    emptyCategory:"لا توجد أدلة منشورة ضمن هذا التصنيف حتى الآن.",
    read:"اقرأ الدليل",
    featured:"دليل مميز",
    rewards:"تعرف على مكافآت HandMeKey",
    search:"ابحث عن إقامات متاحة",
    all:"كل الأدلة",
    categories:"استكشف حسب الموضوع",
    latest:"أحدث الأدلة",
  },
} as const;

type Locale = keyof typeof pageCopy;
type TopicKey = "stays"|"destinations"|"transport"|"planning"|"booking";

type Topic = {key:TopicKey; ar:string; en:string; keywords:string[]};

const topics: Topic[] = [
  {key:"stays",ar:"فنادق وإقامات",en:"Hotels & stays",keywords:["فندق","فنادق","إقامة","اقامة","سكن","غرفة","منتجع","hotel","stay","room","resort"]},
  {key:"destinations",ar:"وجهات وتجارب",en:"Destinations & experiences",keywords:["عمان","البتراء","وادي رم","العقبة","جرش","مادبا","البحر الميت","رحلة","وجهة","destination","petra","amman","aqaba","wadi rum","dead sea","jerash"]},
  {key:"transport",ar:"سيارات ومواصلات",en:"Cars & transport",keywords:["سيارة","سيارات","تأجير","مواصلات","نقل","طريق","قيادة","suv","car","rental","transport","drive"]},
  {key:"booking",ar:"الحجز والأسعار",en:"Booking & prices",keywords:["حجز","سعر","أسعار","إلغاء","الغاء","دفع","حجوزات","booking","price","rate","cancel","payment"]},
  {key:"planning",ar:"تخطيط ونصائح السفر",en:"Travel planning",keywords:["تخطيط","نصائح","دليل","برنامج","متى","كيف","أفضل وقت","موسم","طقس","planning","tips","guide","itinerary","when","how"]},
];

export function generateStaticParams(){return [{locale:"en"},{locale:"ar"}];}

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const {locale:raw}=await params;
  if(raw!=="en"&&raw!=="ar")return {};
  const locale=raw as Locale; const c=pageCopy[locale]; const canonical=siteUrl(`/blog/${locale}`);
  return {title:c.title,description:c.description,alternates:{canonical,languages:{en:siteUrl("/blog/en"),ar:siteUrl("/blog/ar"),"x-default":siteUrl("/blog/en")}},openGraph:{type:"website",url:canonical,title:c.title,description:c.description,siteName:"HandMeKey",locale:locale==="ar"?"ar_JO":"en_US"},twitter:{card:"summary_large_image",title:c.title,description:c.description}};
}

export default async function BlogLanding({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{category?:string}>}){
  const [{locale:raw},query]=await Promise.all([params,searchParams]); if(raw!=="en"&&raw!=="ar")notFound();
  const locale=raw as Locale; const c=pageCopy[locale]; const rtl=locale==="ar";
  const posts=await listPublishedBlogPosts(locale,100);
  const requestedTopic=topics.find(topic=>topic.key===query.category)?.key??null;
  const classified=posts.map(post=>({...post,editorialTopic:classifyTopic(`${post.title} ${post.excerpt} ${post.category}`)}));
  const topicCounts=new Map<TopicKey,number>();
  for(const post of classified) topicCounts.set(post.editorialTopic,(topicCounts.get(post.editorialTopic)??0)+1);
  const visiblePosts=requestedTopic?classified.filter(post=>post.editorialTopic===requestedTopic):classified;
  const featured=requestedTopic?null:(visiblePosts.find(post=>post.featured)??visiblePosts[0]??null);
  const rest=featured?visiblePosts.filter(post=>post.id!==featured.id):visiblePosts;
  const currentTopic=requestedTopic?topics.find(topic=>topic.key===requestedTopic)??null:null;
  const structuredData={"@context":"https://schema.org","@type":"Blog",name:c.eyebrow,description:c.description,url:siteUrl(`/blog/${locale}`),inLanguage:locale,publisher:{"@type":"Organization",name:"HandMeKey",url:siteUrl()}};

  return <main className="blogExperience blogPortal" dir={rtl?"rtl":"ltr"} lang={locale}>
    <CustomerHeader/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData)}}/>
    <section className="blogHero"><div className="shell blogHeroInner"><div><span className="eyebrow"><BookOpen size={16}/>{c.eyebrow}</span><h1>{c.heading}</h1><p>{c.intro}</p><div className="blogHeroLinks"><Link href={`/rewards/${locale}`}>{c.rewards}</Link><Link href="/search">{c.search}</Link></div></div><div className="blogLanguageLinks"><Link href="/blog/en" hrefLang="en">English</Link><Link href="/blog/ar" hrefLang="ar">العربية</Link></div></div></section>

    <section className="shell blogTopicNav"><div className="blogTopicHead"><span><FolderOpen size={17}/>{c.categories}</span>{currentTopic&&<strong>{locale==="ar"?currentTopic.ar:currentTopic.en}</strong>}</div><div className="blogTopicPills"><Link className={!requestedTopic?"active":""} href={`/blog/${locale}`}>{c.all}<span>{posts.length}</span></Link>{topics.map(topic=>{const count=topicCounts.get(topic.key)??0;if(!count)return null;return <Link className={requestedTopic===topic.key?"active":""} href={`/blog/${locale}?category=${topic.key}`} key={topic.key}>{locale==="ar"?topic.ar:topic.en}<span>{count}</span></Link>})}</div></section>

    <section className="shell blogListing">
      {visiblePosts.length===0?<div className="blogEmpty"><BookOpen size={34}/><strong>{requestedTopic?c.emptyCategory:c.empty}</strong></div>:<>
        {featured&&<article className="blogFeatured"><div className="blogFeaturedMarker">01</div><div className="blogFeaturedBody"><span className="blogCategory">{c.featured} · {topicLabel(featured.editorialTopic,locale)}</span><h2><Link href={`/blog/${locale}/${featured.slug}`}>{featured.title}</Link></h2><p>{featured.excerpt}</p><div className="blogFeaturedFooter"><div className="blogMeta"><CalendarDays size={15}/>{formatDate(featured.publishedAt,locale)} · {featured.readingMinutes} min</div><Link className="blogReadLink" href={`/blog/${locale}/${featured.slug}`}>{c.read}<ArrowRight size={16}/></Link></div></div></article>}
        <div className="blogListHeading"><h2>{currentTopic?(locale==="ar"?currentTopic.ar:currentTopic.en):c.latest}</h2><span>{rest.length} {locale==="ar"?"مقال":"guides"}</span></div>
        <div className="blogGrid">{rest.map((post,index)=><article className="blogCard" key={post.id}><div><div className="blogCardTop"><Link className="blogCategory" href={`/blog/${locale}?category=${post.editorialTopic}`}>{topicLabel(post.editorialTopic,locale)}</Link><span className="blogCardIndex">{String(index+(featured?2:1)).padStart(2,"0")}</span></div><h2><Link href={`/blog/${locale}/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p><div className="blogCardFooter"><div className="blogMeta"><CalendarDays size={14}/>{formatDate(post.publishedAt,locale)} · {post.readingMinutes} min</div><Link className="blogReadLink" href={`/blog/${locale}/${post.slug}`}>{c.read}<ArrowRight size={15}/></Link></div></div></article>)}</div>
      </>}
    </section>
  </main>;
}

function classifyTopic(text:string):TopicKey{
  const normalized=text.toLowerCase();
  let best:TopicKey="planning"; let bestScore=0;
  for(const topic of topics){let score=0;for(const keyword of topic.keywords){if(normalized.includes(keyword.toLowerCase()))score++;}if(score>bestScore){best=topic.key;bestScore=score;}}
  return best;
}
function topicLabel(key:TopicKey,locale:Locale){const topic=topics.find(item=>item.key===key);return topic?(locale==="ar"?topic.ar:topic.en):"";}
function formatDate(value:Date|null,locale:Locale){if(!value)return "";return value.toLocaleDateString(locale==="ar"?"ar-JO":"en-US",{year:"numeric",month:"long",day:"numeric"});}
