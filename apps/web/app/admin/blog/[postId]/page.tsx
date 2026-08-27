import {redirect} from "next/navigation";
import {blogTaxonomyPaths,getAdminBlogPost,getAdminBlogTaxonomy,getAdminNavigationCounts} from "@platform/server";
import {AdminShell} from "@/components/admin-shell";
import {currentAdminPrincipal} from "@/lib/server-session";
import {requestLocale} from "@/lib/request-locale";
import {BlogEditor} from "../blog-editor";

export const dynamic="force-dynamic";

export default async function EditBlogPostPage({params}:{params:Promise<{postId:string}>}){
  const principal=await currentAdminPrincipal(); const {postId}=await params; if(!principal)redirect(`/admin/login?next=${encodeURIComponent(`/admin/blog/${postId}`)}`);
  const locale=await requestLocale();
  const post=await getAdminBlogPost(principal.user.id,postId);
  const [counts,taxonomy]=await Promise.all([getAdminNavigationCounts(principal.user.id),getAdminBlogTaxonomy(principal.user.id,post.locale)]);
  const categories=blogTaxonomyPaths(taxonomy);
  const ar=locale==="ar";
  return <AdminShell locale={locale} principal={principal} active="blog" counts={counts}><header className="adminTopbar"><div><span className="eyebrow">{ar?"تحرير وتحسين":"Edit & optimize"}</span><h1>{post.title}</h1><p>{ar?"عدّل المحتوى والتصنيف وصورة الغلاف، ثم استخدم زر النشر الصريح عندما تريد تحديث النسخة العامة.":"Edit content, category and cover image, then use the explicit publish action when you want to update the live version."}</p></div></header><BlogEditor locale={locale} categories={categories} initial={{id:post.id,locale:post.locale,slug:post.slug,title:post.title,excerpt:post.excerpt,body:post.body,seoTitle:post.seoTitle,seoDescription:post.seoDescription,category:post.category,tags:post.tags,coverImageUrl:post.coverImageUrl,coverImageAlt:post.coverImageAlt,featured:post.featured,status:post.status,authorName:post.authorName,publishedAt:post.publishedAt?.toISOString()??null}}/></AdminShell>;
}
