import Link from "next/link";
import {redirect} from "next/navigation";
import {BookOpenText, Plus, Search} from "lucide-react";
import {getAdminNavigationCounts, listAdminBlogPosts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";

export const dynamic="force-dynamic";

export default async function AdminBlogPage({searchParams}:{searchParams:Promise<{q?:string;status?:string;locale?:string}>}){
  const principal=await currentAdminPrincipal(); if(!principal)redirect("/admin/login?next=%2Fadmin%2Fblog");
  const locale=await requestLocale(); const ar=locale==="ar"; const query=await searchParams;
  const filters:{query?:string;status?:string;locale?:string}={}; if(query.q)filters.query=query.q;if(query.status)filters.status=query.status;if(query.locale)filters.locale=query.locale;
  const [posts,counts]=await Promise.all([listAdminBlogPosts(principal.user.id,filters),getAdminNavigationCounts(principal.user.id)]);
  return <AdminShell locale={locale} principal={principal} active="blog" counts={counts}>
    <header className="adminTopbar"><div><span className="eyebrow">{ar?"المحتوى العضوي وSEO":"Organic content & SEO"}</span><h1>{ar?"مدونة HandMeKey":"HandMeKey Blog"}</h1><p>{ar?"اكتب وانشر أدلة سفر قابلة للفهرسة مع تحكم كامل بالعنوان والوصف والرابط وحالة النشر.":"Write and publish indexable travel guides with full control over search title, description, URL and publication status."}</p></div><Link className="primaryButton" href="/admin/blog/new"><Plus size={16}/>{ar?"مقال جديد":"New article"}</Link></header>
    <section className="adminPanel adminSection">
      <form className="adminFilterBar" method="get"><label><Search size={16}/><input name="q" defaultValue={query.q??""} placeholder={ar?"ابحث بعنوان أو رابط أو تصنيف":"Search title, slug or category"}/></label><select name="status" defaultValue={query.status??""}><option value="">{ar?"كل الحالات":"All statuses"}</option><option value="DRAFT">DRAFT</option><option value="PUBLISHED">PUBLISHED</option><option value="ARCHIVED">ARCHIVED</option></select><select name="locale" defaultValue={query.locale??""}><option value="">{ar?"كل اللغات":"All languages"}</option><option value="AR">العربية</option><option value="EN">English</option></select><button className="primaryButton" type="submit">{ar?"بحث":"Search"}</button>{(query.q||query.status||query.locale)&&<Link className="secondaryButton" href="/admin/blog">{ar?"مسح":"Clear"}</Link>}</form>
      {posts.length===0?<div className="adminEmptyState"><BookOpenText size={28}/><strong>{ar?"لا توجد مقالات مطابقة.":"No matching articles."}</strong><Link href="/admin/blog/new">{ar?"اكتب أول مقال":"Write the first article"}</Link></div>:<div className="adminBlogTable"><div className="adminBlogTableHead"><span>{ar?"المقال":"Article"}</span><span>{ar?"اللغة":"Language"}</span><span>{ar?"الحالة":"Status"}</span><span>{ar?"آخر تحديث":"Updated"}</span><span/></div>{posts.map(post=><article key={post.id}><div><strong>{post.title}</strong><small>/{post.slug}</small><span>{post.category}{post.featured?` · ${ar?"مميز":"Featured"}`:""}</span></div><div><b>{post.locale}</b></div><div><span className={`blogStatus ${post.status.toLowerCase()}`}>{post.status}</span></div><div><small>{post.updatedAt.toLocaleString(ar?"ar-JO":"en-US",{dateStyle:"medium",timeStyle:"short"})}</small>{post.publishedAt&&<small>{ar?"نشر":"Published"}: {post.publishedAt.toLocaleDateString(ar?"ar-JO":"en-US")}</small>}</div><div><Link className="secondaryButton" href={`/admin/blog/${post.id}`}>{ar?"تحرير":"Edit"}</Link>{post.status==="PUBLISHED"&&<Link className="secondaryButton" target="_blank" href={`/blog/${post.locale==="AR"?"ar":"en"}/${post.slug}`}>{ar?"فتح":"Open"}</Link>}</div></article>)}</div>}
    </section>
  </AdminShell>;
}
