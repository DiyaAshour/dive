import Link from "next/link";
import {redirect} from "next/navigation";
import {BookOpenText, FolderOpen, Globe2, Plus, Search, Sparkles} from "lucide-react";
import {getAdminBlogTaxonomy, getAdminNavigationCounts, listAdminBlogCategories, listAdminBlogPosts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {BlogTaxonomyManager} from "./blog-taxonomy-manager";

export const dynamic="force-dynamic";

type Query={q?:string;status?:string;locale?:string;category?:string};

export default async function AdminBlogPage({searchParams}:{searchParams:Promise<Query>}){
  const principal=await currentAdminPrincipal(); if(!principal)redirect("/admin/login?next=%2Fadmin%2Fblog");
  const locale=await requestLocale(); const ar=locale==="ar"; const query=await searchParams; const taxonomyLocale=ar?"AR":"EN" as const;
  const filters:{query?:string;status?:string;locale?:string;category?:string}={};
  if(query.q)filters.query=query.q;if(query.status)filters.status=query.status;if(query.locale)filters.locale=query.locale;if(query.category)filters.category=query.category;
  const [posts,counts,categories,taxonomy,allPosts]=await Promise.all([
    listAdminBlogPosts(principal.user.id,filters),
    getAdminNavigationCounts(principal.user.id),
    listAdminBlogCategories(principal.user.id),
    getAdminBlogTaxonomy(principal.user.id,taxonomyLocale),
    listAdminBlogPosts(principal.user.id),
  ]);
  const published=allPosts.filter(post=>post.status==="PUBLISHED").length;
  const drafts=allPosts.filter(post=>post.status==="DRAFT").length;
  const featured=allPosts.filter(post=>post.featured&&post.status==="PUBLISHED").length;
  const taxonomyPostCounts=Object.fromEntries(allPosts.filter(post=>post.locale===taxonomyLocale).map(post=>post.category).filter((value,index,array)=>array.indexOf(value)===index).map(category=>[category,allPosts.filter(post=>post.locale===taxonomyLocale&&post.category===category).length]));

  return <AdminShell locale={locale} principal={principal} active="blog" counts={counts}>
    <header className="adminTopbar blogAdminTopbar"><div><span className="eyebrow">{ar?"مركز المحتوى العضوي وSEO":"Organic content & SEO center"}</span><h1>{ar?"استوديو HandMeKey للمحتوى":"HandMeKey Content Studio"}</h1><p>{ar?"أنشئ أدلة السفر، ارفع صورها، ونظّمها داخل هيكل تصنيفات قابل للسحب والإفلات.":"Create travel guides, upload their images, and organize them in a drag-and-drop category hierarchy."}</p></div><div className="blogAdminHeaderActions"><Link className="secondaryButton blogAiLaunchButton" href="/admin/blog/ai"><Sparkles size={16}/>{ar?"مساعد كتابة AI":"AI Article Studio"}</Link><Link className="primaryButton" href="/admin/blog/new"><Plus size={16}/>{ar?"مقال جديد":"New article"}</Link></div></header>

    <section className="blogAdminMetrics">
      <article><span><BookOpenText size={18}/></span><div><small>{ar?"إجمالي المقالات":"All articles"}</small><strong>{allPosts.length}</strong></div></article>
      <article><span><Globe2 size={18}/></span><div><small>{ar?"منشور":"Published"}</small><strong>{published}</strong></div></article>
      <article><span><Sparkles size={18}/></span><div><small>{ar?"مسودات":"Drafts"}</small><strong>{drafts}</strong></div></article>
      <article><span><FolderOpen size={18}/></span><div><small>{ar?"تصنيفات هذه اللغة":"Categories in this language"}</small><strong>{taxonomy.length}</strong></div></article>
      <article><span><Sparkles size={18}/></span><div><small>{ar?"مقالات مميزة":"Featured live"}</small><strong>{featured}</strong></div></article>
    </section>

    <BlogTaxonomyManager locale={locale} initial={taxonomy} counts={taxonomyPostCounts}/>

    <section className="adminPanel adminSection">
      <div className="blogAdminSectionHead"><div><span className="eyebrow"><BookOpenText size={15}/>{ar?"مكتبة المقالات":"Article library"}</span><h2>{ar?"كل المحتوى":"All content"}</h2></div></div>
      <form className="adminFilterBar blogAdminFilter" method="get"><label><Search size={16}/><input name="q" defaultValue={query.q??""} placeholder={ar?"ابحث بعنوان أو رابط أو تصنيف أو وسم":"Search title, slug, category or tag"}/></label><select name="status" defaultValue={query.status??""}><option value="">{ar?"كل الحالات":"All statuses"}</option><option value="DRAFT">DRAFT</option><option value="PUBLISHED">PUBLISHED</option><option value="ARCHIVED">ARCHIVED</option></select><select name="locale" defaultValue={query.locale??""}><option value="">{ar?"كل اللغات":"All languages"}</option><option value="AR">العربية</option><option value="EN">English</option></select><select name="category" defaultValue={query.category??""}><option value="">{ar?"كل التصنيفات":"All categories"}</option>{categories.map(category=><option value={category.name} key={category.name}>{category.name}</option>)}</select><button className="primaryButton" type="submit">{ar?"تطبيق":"Apply"}</button>{(query.q||query.status||query.locale||query.category)&&<Link className="secondaryButton" href="/admin/blog">{ar?"مسح":"Clear"}</Link>}</form>
      {posts.length===0?<div className="adminEmptyState"><BookOpenText size={28}/><strong>{ar?"لا توجد مقالات مطابقة.":"No matching articles."}</strong><Link href="/admin/blog/new">{ar?"اكتب مقالًا جديدًا":"Write a new article"}</Link></div>:<div className="adminBlogTable"><div className="adminBlogTableHead"><span>{ar?"المقال":"Article"}</span><span>{ar?"اللغة":"Language"}</span><span>{ar?"الحالة":"Status"}</span><span>{ar?"آخر تحديث":"Updated"}</span><span/></div>{posts.map(post=><article key={post.id}><div><strong>{post.title}</strong><small>/{post.slug}</small><span>{post.category.replaceAll(" / "," › ")}{post.featured?` · ${ar?"مميز":"Featured"}`:""}</span></div><div><b>{post.locale}</b></div><div><span className={`blogStatus ${post.status.toLowerCase()}`}>{post.status}</span></div><div><small>{post.updatedAt.toLocaleString(ar?"ar-JO":"en-US",{dateStyle:"medium",timeStyle:"short"})}</small>{post.publishedAt&&<small>{ar?"نشر":"Published"}: {post.publishedAt.toLocaleDateString(ar?"ar-JO":"en-US")}</small>}</div><div><Link className="secondaryButton" href={`/admin/blog/${post.id}`}>{ar?"تحرير":"Edit"}</Link>{post.status==="PUBLISHED"&&post.publishedAt&&<Link className="secondaryButton" target="_blank" href={`/blog/${post.locale==="AR"?"ar":"en"}/${post.slug}`}>{ar?"فتح المنشور":"Open live"}</Link>}</div></article>)}</div>}
    </section>
  </AdminShell>;
}
