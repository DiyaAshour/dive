import Link from "next/link";
import {redirect} from "next/navigation";
import {BookOpenText, FolderOpen, Globe2, Plus, Search, Sparkles} from "lucide-react";
import {getAdminNavigationCounts, listAdminBlogCategories, listAdminBlogPosts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";

export const dynamic="force-dynamic";

type Query={q?:string;status?:string;locale?:string;category?:string};

export default async function AdminBlogPage({searchParams}:{searchParams:Promise<Query>}){
  const principal=await currentAdminPrincipal(); if(!principal)redirect("/admin/login?next=%2Fadmin%2Fblog");
  const locale=await requestLocale(); const ar=locale==="ar"; const query=await searchParams;
  const filters:{query?:string;status?:string;locale?:string;category?:string}={};
  if(query.q)filters.query=query.q;if(query.status)filters.status=query.status;if(query.locale)filters.locale=query.locale;if(query.category)filters.category=query.category;
  const [posts,counts,categories]=await Promise.all([listAdminBlogPosts(principal.user.id,filters),getAdminNavigationCounts(principal.user.id),listAdminBlogCategories(principal.user.id)]);
  const allPosts=await listAdminBlogPosts(principal.user.id);
  const published=allPosts.filter(post=>post.status==="PUBLISHED").length;
  const drafts=allPosts.filter(post=>post.status==="DRAFT").length;
  const featured=allPosts.filter(post=>post.featured&&post.status==="PUBLISHED").length;

  return <AdminShell locale={locale} principal={principal} active="blog" counts={counts}>
    <header className="adminTopbar blogAdminTopbar"><div><span className="eyebrow">{ar?"مركز المحتوى العضوي وSEO":"Organic content & SEO center"}</span><h1>{ar?"استوديو HandMeKey للمحتوى":"HandMeKey Content Studio"}</h1><p>{ar?"أنشئ أدلة السفر، نظّمها بالتصنيفات، راقب حالة النشر وافتح النسخة العامة فقط بعد تأكيد النشر فعليًا.":"Create travel guides, organize them with categories, control publication state, and expose the live page only after publishing is confirmed."}</p></div><Link className="primaryButton" href="/admin/blog/new"><Plus size={16}/>{ar?"مقال جديد":"New article"}</Link></header>

    <section className="blogAdminMetrics">
      <article><span><BookOpenText size={18}/></span><div><small>{ar?"إجمالي المقالات":"All articles"}</small><strong>{allPosts.length}</strong></div></article>
      <article><span><Globe2 size={18}/></span><div><small>{ar?"منشور":"Published"}</small><strong>{published}</strong></div></article>
      <article><span><Sparkles size={18}/></span><div><small>{ar?"مسودات":"Drafts"}</small><strong>{drafts}</strong></div></article>
      <article><span><FolderOpen size={18}/></span><div><small>{ar?"التصنيفات":"Categories"}</small><strong>{categories.length}</strong></div></article>
      <article><span><Sparkles size={18}/></span><div><small>{ar?"مقالات مميزة":"Featured live"}</small><strong>{featured}</strong></div></article>
    </section>

    {categories.length>0&&<section className="adminPanel blogCategoryAdmin"><div className="blogAdminSectionHead"><div><span className="eyebrow"><FolderOpen size={15}/>{ar?"التصنيفات":"Categories"}</span><h2>{ar?"مكتبة الموضوعات":"Topic library"}</h2></div><Link href="/admin/blog/new">{ar?"إضافة تصنيف عبر مقال جديد":"Create through a new article"}<Plus size={14}/></Link></div><div className="blogCategoryAdminGrid">{categories.map(category=><Link className={query.category===category.name?"active":""} href={`/admin/blog?category=${encodeURIComponent(category.name)}`} key={category.name}><strong>{category.name}</strong><span>{category.count} {ar?"مقال":"articles"}</span><small>{category.updatedAt?category.updatedAt.toLocaleDateString(ar?"ar-JO":"en-US"):""}</small></Link>)}</div></section>}

    <section className="adminPanel adminSection">
      <form className="adminFilterBar blogAdminFilter" method="get"><label><Search size={16}/><input name="q" defaultValue={query.q??""} placeholder={ar?"ابحث بعنوان أو رابط أو تصنيف أو وسم":"Search title, slug, category or tag"}/></label><select name="status" defaultValue={query.status??""}><option value="">{ar?"كل الحالات":"All statuses"}</option><option value="DRAFT">DRAFT</option><option value="PUBLISHED">PUBLISHED</option><option value="ARCHIVED">ARCHIVED</option></select><select name="locale" defaultValue={query.locale??""}><option value="">{ar?"كل اللغات":"All languages"}</option><option value="AR">العربية</option><option value="EN">English</option></select><select name="category" defaultValue={query.category??""}><option value="">{ar?"كل التصنيفات":"All categories"}</option>{categories.map(category=><option value={category.name} key={category.name}>{category.name}</option>)}</select><button className="primaryButton" type="submit">{ar?"تطبيق":"Apply"}</button>{(query.q||query.status||query.locale||query.category)&&<Link className="secondaryButton" href="/admin/blog">{ar?"مسح":"Clear"}</Link>}</form>
      {posts.length===0?<div className="adminEmptyState"><BookOpenText size={28}/><strong>{ar?"لا توجد مقالات مطابقة.":"No matching articles."}</strong><Link href="/admin/blog/new">{ar?"اكتب مقالًا جديدًا":"Write a new article"}</Link></div>:<div className="adminBlogTable"><div className="adminBlogTableHead"><span>{ar?"المقال":"Article"}</span><span>{ar?"اللغة":"Language"}</span><span>{ar?"الحالة":"Status"}</span><span>{ar?"آخر تحديث":"Updated"}</span><span/></div>{posts.map(post=><article key={post.id}><div><strong>{post.title}</strong><small>/{post.slug}</small><span>{post.category}{post.featured?` · ${ar?"مميز":"Featured"}`:""}</span></div><div><b>{post.locale}</b></div><div><span className={`blogStatus ${post.status.toLowerCase()}`}>{post.status}</span></div><div><small>{post.updatedAt.toLocaleString(ar?"ar-JO":"en-US",{dateStyle:"medium",timeStyle:"short"})}</small>{post.publishedAt&&<small>{ar?"نشر":"Published"}: {post.publishedAt.toLocaleDateString(ar?"ar-JO":"en-US")}</small>}</div><div><Link className="secondaryButton" href={`/admin/blog/${post.id}`}>{ar?"تحرير":"Edit"}</Link>{post.status==="PUBLISHED"&&post.publishedAt&&<Link className="secondaryButton" target="_blank" href={`/blog/${post.locale==="AR"?"ar":"en"}/${post.slug}`}>{ar?"فتح المنشور":"Open live"}</Link>}</div></article>)}</div>}
    </section>
  </AdminShell>;
}
