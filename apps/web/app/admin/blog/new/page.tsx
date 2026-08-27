import {redirect} from "next/navigation";
import {blogTaxonomyPaths,getAdminBlogTaxonomy,getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {BlogEditor} from "../blog-editor";

export const dynamic="force-dynamic";

export default async function NewBlogPostPage(){
  const principal=await currentAdminPrincipal(); if(!principal)redirect("/admin/login?next=%2Fadmin%2Fblog%2Fnew");
  const locale=await requestLocale(); const taxonomyLocale=locale==="ar"?"AR":"EN";
  const [counts,taxonomy]=await Promise.all([getAdminNavigationCounts(principal.user.id),getAdminBlogTaxonomy(principal.user.id,taxonomyLocale)]);
  const categories=blogTaxonomyPaths(taxonomy);
  const ar=locale==="ar";
  return <AdminShell locale={locale} principal={principal} active="blog" counts={counts}><header className="adminTopbar"><div><span className="eyebrow">{ar?"من المسودة إلى Google":"From draft to discovery"}</span><h1>{ar?"مقال جديد":"New article"}</h1><p>{ar?"اكتب محتوى أصليًا، اختر مكانه داخل هيكل التصنيفات وارفع صورة الغلاف مباشرة.":"Write original content, place it inside the category hierarchy, and upload its cover image directly."}</p></div></header><BlogEditor locale={locale} categories={categories}/></AdminShell>;
}
