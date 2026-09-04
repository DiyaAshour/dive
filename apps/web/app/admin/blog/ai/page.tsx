import {redirect} from "next/navigation";
import {getAdminNavigationCounts,listAdminBlogCategories} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {BlogAiStudio} from "./blog-ai-studio";

export const dynamic="force-dynamic";

export default async function AdminBlogAiPage(){
  const principal=await currentAdminPrincipal();
  if(!principal)redirect("/admin/login?next=%2Fadmin%2Fblog%2Fai");
  const locale=await requestLocale();
  const [counts,categories]=await Promise.all([
    getAdminNavigationCounts(principal.user.id),
    listAdminBlogCategories(principal.user.id),
  ]);

  return <AdminShell locale={locale} principal={principal} active="blog" counts={counts}>
    <BlogAiStudio locale={locale} categories={categories.map(category=>category.name)}/>
  </AdminShell>;
}
