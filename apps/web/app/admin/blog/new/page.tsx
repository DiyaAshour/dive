import {redirect} from "next/navigation";
import {getAdminNavigationCounts,listAdminBlogCategories} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {BlogEditor} from "../blog-editor";

export const dynamic="force-dynamic";

export default async function NewBlogPostPage(){
  const principal=await currentAdminPrincipal(); if(!principal)redirect("/admin/login?next=%2Fadmin%2Fblog%2Fnew");
  const locale=await requestLocale();
  const [counts,categoryRows]=await Promise.all([getAdminNavigationCounts(principal.user.id),listAdminBlogCategories(principal.user.id)]);
  const categories=categoryRows.map((item)=>item.name);
  const ar=locale==="ar";
  return <AdminShell locale={locale} principal={principal} active="blog" counts={counts}><header className="adminTopbar"><div><span className="eyebrow">{ar?"من المسودة إلى Google":"From draft to discovery"}</span><h1>{ar?"مقال جديد":"New article"}</h1><p>{ar?"اكتب محتوى أصليًا ومفيدًا للمسافر، نظّمه داخل تصنيف واضح، ثم انشره عندما يصبح جاهزًا.":"Write original traveler-first content, organize it in a clear category, then publish only when it is ready."}</p></div></header><BlogEditor locale={locale} categories={categories}/></AdminShell>;
}
