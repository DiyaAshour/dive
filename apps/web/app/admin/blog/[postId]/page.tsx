import {redirect} from "next/navigation";
import {getAdminBlogPost,getAdminNavigationCounts,listAdminBlogCategories} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {BlogEditor} from "../blog-editor";

export const dynamic="force-dynamic";

export default async function EditBlogPostPage({params}:{params:Promise<{postId:string}>}){
  const principal=await currentAdminPrincipal(); const {postId}=await params; if(!principal)redirect(`/admin/login?next=${encodeURIComponent(`/admin/blog/${postId}`)}`);
  const locale=await requestLocale();
  const [post,counts,categoryRows]=await Promise.all([getAdminBlogPost(principal.user.id,postId),getAdminNavigationCounts(principal.user.id),listAdminBlogCategories(principal.user.id)]);
  const categories=categoryRows.map((item)=>item.name);
  const ar=locale==="ar";
  return <AdminShell locale={locale} principal={principal} active="blog" counts={counts}><header className="adminTopbar"><div><span className="eyebrow">{ar?"تحرير وتحسين":"Edit & optimize"}</span><h1>{post.title}</h1><p>{ar?"الحفظ لا يغيّر حالة النشر تلقائيًا. استخدم زر النشر الصريح عندما تريد جعل النسخة عامة.":"Saving does not change publication state automatically. Use the explicit publish action when you want the version to go live."}</p></div></header><BlogEditor locale={locale} categories={categories} initial={{id:post.id,locale:post.locale,slug:post.slug,title:post.title,excerpt:post.excerpt,body:post.body,seoTitle:post.seoTitle,seoDescription:post.seoDescription,category:post.category,tags:post.tags,coverImageUrl:post.coverImageUrl,coverImageAlt:post.coverImageAlt,featured:post.featured,status:post.status,authorName:post.authorName,publishedAt:post.publishedAt?.toISOString()??null}}/></AdminShell>;
}
