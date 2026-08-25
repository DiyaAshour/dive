import {redirect} from "next/navigation";
import {getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {BlogEditor} from "../blog-editor";

export const dynamic="force-dynamic";

export default async function NewBlogPostPage(){
  const principal=await currentAdminPrincipal(); if(!principal)redirect("/admin/login?next=%2Fadmin%2Fblog%2Fnew");
  const locale=await requestLocale(); const counts=await getAdminNavigationCounts(principal.user.id); const ar=locale==="ar";
  return <AdminShell locale={locale} principal={principal} active="blog" counts={counts}><header className="adminTopbar"><div><span className="eyebrow">{ar?"من المسودة إلى Google":"From draft to discovery"}</span><h1>{ar?"مقال جديد":"New article"}</h1><p>{ar?"اكتب محتوى أصليًا ومفيدًا للمسافر، ثم راجع جاهزية SEO قبل النشر.":"Write original, traveler-first content, then review the SEO readiness checks before publishing."}</p></div></header><BlogEditor locale={locale}/></AdminShell>;
}
