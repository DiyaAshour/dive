import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, CalendarDays, FolderOpen, Sparkles } from "lucide-react";
import {blogCategoryBreadcrumb, getPublicBlogTaxonomy, listPublishedBlogPosts, materializeBlogTaxonomy} from "@platform/server";
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
  const [posts,taxonomy]=await Promise.all([listPublishedBlogPosts(locale,100),getPublicBlogTaxonomy(locale)]);
  const taxonomyItems=materializeBlogTaxonomy(taxonomy);
  const usedPaths=Array.from(new Set(posts.map(post=>post.category)));
  const taxonomyPaths=new Set(taxonomyItems.map(item=>item.path));
  const orderedCategories=taxonomyItems
    .filter(item=>usedPaths.some(path=>path===item.path||path.startsWith(`${item.path} / `)))
    .sort((a,b)=>treePosition(a.id,taxonomy)-treePosition(b.id,taxonomy));
  const orphanCategories=usedPaths.filter(path=>!taxonomyPaths.has(path)).map((path,index)=>({id:`orphan-${index}`,name:path.split(" / ").at(-1)??path,slug:"",parentId:null,sortOrder:1000+index,path,depth:Math.max(0,path.split(" / ").length-1)}));
  const categories=[...orderedCategories,...orphanCategories].map(item=>({
    ...item,
    count:posts.filter(post=>post.category===item.path||post.category.startsWith(`${item.path} / `)).length,
  }));
  const validCategoryPaths=new Set(categories.map(item=>item.path));
  const selectedCategory=query.category&&validCategoryPaths.has(query.category)?query.category:null;
  const visiblePosts=selectedCategory?posts.filter(post=>post.category===selectedCategory||post.category.startsWith(`${selectedCategory} / `)):posts;
  const featured=selectedCategory?null:(visiblePosts.find(post=>post.featured)??visiblePosts[0]??null);
  const rest=featured?visiblePosts.filter(post=>post.id!==featured.id):visiblePosts;
  const structuredData={"@context":"https://schema.org","@type":"Blog",name:c.eyebrow,description:c.description,url:siteUrl(`/blog/${locale}`),inLanguage:locale,publisher:{"@type":"Organization",name:"HandMeKey",url:siteUrl()}};

  return <main className="blogExperience blogPortal" dir={rtl?"rtl":"ltr"} lang={locale}>
    <CustomerHeader/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structuredData)}}/>
    <section className="blogHero"><div className="shell blogHeroInner"><div><span className="eyebrow"><BookOpen size={16}/>{c.eyebrow}</span><h1>{c.heading}</h1><p>{c.intro}</p><div className="blogHeroLinks"><Link href={`/rewards/${locale}`}>{c.rewards}</Link><Link href="/search">{c.search}</Link></div></div><div className="blogLanguageLinks"><Link href="/blog/en" hrefLang="en">English</Link><Link href="/blog/ar" hrefLang="ar">العربية</Link></div></div></section>

    <section className="shell blogTopicNav"><div className="blogTopicHead"><span><FolderOpen size={17}/>{c.categories}</span>{selectedCategory&&<strong>{blogCategoryBreadcrumb(selectedCategory)}</strong>}</div><div className="blogTopicPills blogTopicHierarchy"><Link className={!selectedCategory?"active":""} href={`/blog/${locale}`}>{c.all}<span>{posts.length}</span></Link>{categories.map(category=><Link data-depth={category.depth} className={selectedCategory===category.path?"active":""} href={`/blog/${locale}?category=${encodeURIComponent(category.path)}`} key={category.id}>{category.depth>0&&<i>{"↳".repeat(Math.min(category.depth,3))}</i>}{category.name}<span>{category.count}</span></Link>)}</div></section>

    <section className="shell blogListing">
      {visiblePosts.length===0?<div className="blogEmpty"><BookOpen size={34}/><strong>{selectedCategory?c.emptyCategory:c.empty}</strong></div>:<>
        {featured&&<article className="blogFeatured">{featured.coverImageUrl?<img src={featured.coverImageUrl} alt={featured.coverImageAlt||featured.title}/>:<div className="blogImagePlaceholder"><Sparkles size={34}/></div>}<div><span className="blogCategory">{c.featured} · {blogCategoryBreadcrumb(featured.category)}</span><h2><Link href={`/blog/${locale}/${featured.slug}`}>{featured.title}</Link></h2><p>{featured.excerpt}</p><div className="blogMeta"><CalendarDays size={15}/>{formatDate(featured.publishedAt,locale)} · {featured.readingMinutes} min</div><Link className="blogReadLink" href={`/blog/${locale}/${featured.slug}`}>{c.read}<ArrowRight size={16}/></Link></div></article>}
        <div className="blogListHeading"><h2>{selectedCategory?blogCategoryBreadcrumb(selectedCategory):c.latest}</h2><span>{rest.length} {locale==="ar"?"مقال":"guides"}</span></div>
        <div className="blogGrid">{rest.map((post)=><article className="blogCard" key={post.id}>{post.coverImageUrl?<img src={post.coverImageUrl} alt={post.coverImageAlt||post.title} loading="lazy"/>:<div className="blogImagePlaceholder"><BookOpen size={28}/></div>}<div><Link className="blogCategory" href={`/blog/${locale}?category=${encodeURIComponent(post.category)}`}>{blogCategoryBreadcrumb(post.category)}</Link><h2><Link href={`/blog/${locale}/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p><div className="blogMeta"><CalendarDays size={14}/>{formatDate(post.publishedAt,locale)} · {post.readingMinutes} min</div><Link className="blogReadLink" href={`/blog/${locale}/${post.slug}`}>{c.read}<ArrowRight size={15}/></Link></div></article>)}</div>
      </>}
    </section>
  </main>;
}

function treePosition(id:string,nodes:readonly {id:string;parentId:string|null;sortOrder:number}[]){
  const byId=new Map(nodes.map(node=>[node.id,node]));const lineage:number[]=[];let current=byId.get(id);while(current){lineage.unshift(current.sortOrder);current=current.parentId?byId.get(current.parentId):undefined;}return lineage.reduce((value,part,index)=>value+part*Math.pow(100,3-index),0)+lineage.length;
}
function formatDate(value:Date|null,locale:Locale){if(!value)return "";return value.toLocaleDateString(locale==="ar"?"ar-JO":"en-US",{year:"numeric",month:"long",day:"numeric"});}
