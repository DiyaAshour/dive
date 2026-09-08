import type {NextRequest} from "next/server";
import {z} from "zod";
import {blogPostInputSchema} from "@platform/contracts";
import {
  assertPlatformOwnerConfigured,
  createAdminBlogPost,
  listAdminBlogPosts,
} from "@platform/server";
import {handleApiError, validationError} from "@/lib/api";

export const maxDuration=60;

const articleSchema=z.object({
  title:z.string(),
  slug:z.string(),
  excerpt:z.string(),
  body:z.string(),
  seoTitle:z.string(),
  seoDescription:z.string(),
  tags:z.array(z.string()),
});

const queuePayloadSchema=z.object({
  version:z.literal(1),
  locale:z.enum(["AR","EN"]),
  category:z.string().trim().min(2).max(60),
  primaryKeyword:z.string().trim().min(2).max(180),
  searchIntent:z.string().trim().min(2).max(300),
  sources:z.array(z.string().url()).min(2).max(12),
  article:articleSchema,
  notes:z.array(z.string()).max(8).default([]),
});

type QueuePayload=z.infer<typeof queuePayloadSchema>;
type ExistingPost=Awaited<ReturnType<typeof listAdminBlogPosts>>[number];

type GitHubIssue={
  number:number;
  title:string;
  body:string|null;
  html_url:string;
  author_association?:string;
  pull_request?:unknown;
  user?:{login?:string};
};

const QUEUE_PREFIX="[HMK-SEO-PUBLISH]";
const QUEUE_OWNER="DiyaAshour";
const QUEUE_REPO="dive";

export async function GET(request:NextRequest){
  try{
    const cronSecret=process.env.CRON_SECRET?.trim();
    const authorization=request.headers.get("authorization");
    if(!cronSecret)return Response.json({ok:false,error:"CRON_SECRET is not configured"},{status:503});
    if(authorization!==`Bearer ${cronSecret}`)return Response.json({ok:false,error:"Unauthorized"},{status:401});

    const owner=await assertPlatformOwnerConfigured();
    const posts=await listAdminBlogPosts(owner.id);
    const recentAutomated=posts.find((post)=>post.authorName==="HandMeKey SEO Engine"&&post.status==="PUBLISHED"&&post.publishedAt&&Date.now()-new Date(post.publishedAt).getTime()<50*60*1000);
    if(recentAutomated){
      return Response.json({ok:true,skipped:true,reason:"An automated article was already published in the last 50 minutes",article:{id:recentAutomated.id,slug:recentAutomated.slug,title:recentAutomated.title}},{status:200});
    }

    const queue=await fetchQueueIssues();
    const existingSlugs=new Set(posts.map((post)=>`${post.locale}:${post.slug}`));
    const rejections:Array<{issue:number;reason:string;details?:string[]}>=[];

    for(const issue of queue){
      const payload=parseQueuePayload(issue.body);
      if(!payload){
        rejections.push({issue:issue.number,reason:"Invalid queue JSON"});
        continue;
      }

      const slug=normalizeSlug(payload.article.slug);
      if(existingSlugs.has(`${payload.locale}:${slug}`))continue;

      const existing=posts.filter((post)=>post.locale===payload.locale);
      const quality=qualityIssues(payload,existing);
      if(quality.length>0){
        rejections.push({issue:issue.number,reason:"Quality gate rejected article",details:quality});
        continue;
      }

      const candidate={
        locale:payload.locale,
        slug,
        title:payload.article.title.trim(),
        excerpt:payload.article.excerpt.trim(),
        body:payload.article.body.trim(),
        seoTitle:payload.article.seoTitle.trim(),
        seoDescription:payload.article.seoDescription.trim(),
        category:payload.category.trim(),
        tags:[...new Set(payload.article.tags.map((tag)=>tag.trim()).filter(Boolean))].slice(0,8),
        coverImageUrl:"",
        coverImageAlt:"",
        featured:false,
        status:"PUBLISHED" as const,
        authorName:"HandMeKey SEO Engine",
      };

      const parsed=blogPostInputSchema.safeParse(candidate);
      if(!parsed.success)return validationError(parsed.error);

      const post=await createAdminBlogPost(owner.id,parsed.data);
      const publicUrl=`https://handmekey.com/blog/${payload.locale.toLowerCase()}/${post.slug}`;
      console.info("SEO queue publisher published article",{issue:issue.number,id:post.id,slug:post.slug,primaryKeyword:payload.primaryKeyword,sourceCount:payload.sources.length});

      return Response.json({
        ok:true,
        published:true,
        queueIssue:{number:issue.number,url:issue.html_url},
        article:{id:post.id,title:post.title,slug:post.slug,locale:post.locale,category:post.category,url:publicUrl},
        primaryKeyword:payload.primaryKeyword,
        searchIntent:payload.searchIntent,
        sourceCount:payload.sources.length,
        generator:"ChatGPT scheduled task",
        openAiApiUsed:false,
      },{status:201});
    }

    return Response.json({ok:true,published:false,reason:"No unpublished queue article passed the quality gates",queueCount:queue.length,rejections:rejections.slice(0,8)},{status:200});
  }catch(error){return handleApiError(error);}
}

async function fetchQueueIssues(){
  const url=new URL(`https://api.github.com/repos/${QUEUE_OWNER}/${QUEUE_REPO}/issues`);
  url.searchParams.set("state","open");
  url.searchParams.set("per_page","50");
  url.searchParams.set("sort","created");
  url.searchParams.set("direction","asc");

  const response=await fetch(url,{headers:{accept:"application/vnd.github+json","user-agent":"HandMeKey-SEO-Queue/1.0"},signal:AbortSignal.timeout(15_000),cache:"no-store"});
  if(!response.ok)throw new Error(`GitHub SEO queue request failed with status ${response.status}`);
  const raw=await response.json() as GitHubIssue[];
  return raw.filter((issue)=>
    !issue.pull_request&&
    issue.title.startsWith(QUEUE_PREFIX)&&
    issue.user?.login===QUEUE_OWNER&&
    issue.author_association==="OWNER"&&
    Boolean(issue.body?.trim()),
  );
}

function parseQueuePayload(body:string|null):QueuePayload|null{
  if(!body?.trim())return null;
  let raw=body.trim();
  const fenced=raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if(fenced?.[1])raw=fenced[1].trim();
  try{
    const parsed=queuePayloadSchema.safeParse(JSON.parse(raw));
    return parsed.success?parsed.data:null;
  }catch{return null;}
}

function qualityIssues(payload:QueuePayload,existing:ExistingPost[]){
  const article=payload.article;
  const issues:string[]=[];
  const words=article.body.trim()?article.body.trim().split(/\s+/).length:0;
  const h2Count=article.body.match(/^##\s+/gm)?.length??0;
  const faqPresent=/^##\s+.*(?:FAQ|Frequently Asked|الأسئلة الشائعة|أسئلة شائعة).*$/im.test(article.body);
  const internalLinks=article.body.match(/\]\((?:https:\/\/handmekey\.com)?\/(?:search|cars|blog\/(?:en|ar))(?:[^)]*)\)/gi)?.length??0;
  const warningText=payload.notes.join(" ");
  const warningPresent=/(human review required|needs human review|verify before publishing|cannot verify|unverified|مراجعة بشرية مطلوبة|يجب التحقق قبل النشر|غير مؤكد)/i.test(warningText);
  const similarity=Math.max(0,...existing.map((post)=>titleSimilarity(article.title,post.title)));

  if(words<1100)issues.push(`Article is too shallow (${words} words; minimum 1100)`);
  if(h2Count<5)issues.push(`Article needs more useful structure (${h2Count} H2 sections; minimum 5 including FAQ)`);
  if(!faqPresent)issues.push("A concise FAQ section based on follow-up search intent is required");
  if(internalLinks<2)issues.push(`At least 2 valid HandMeKey internal links are required (${internalLinks} found)`);
  if(payload.sources.length<2)issues.push(`Research must include at least 2 web sources (${payload.sources.length} found)`);
  if(article.seoTitle.trim().length<30||article.seoTitle.trim().length>65)issues.push("SEO title must be 30-65 characters");
  if(article.seoDescription.trim().length<110||article.seoDescription.trim().length>165)issues.push("SEO description must be 110-165 characters");
  if(article.excerpt.trim().length<70||article.excerpt.trim().length>220)issues.push("Excerpt must be 70-220 characters");
  if(article.tags.length<3||article.tags.length>8)issues.push("Use 3-8 specific topic tags");
  if(warningPresent)issues.push("Research notes contain a publication-blocking verification warning");
  if(similarity>=0.68)issues.push(`Title is too similar to an existing article (similarity ${similarity.toFixed(2)})`);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug.trim()))issues.push("Slug must be lowercase English ASCII kebab-case");
  return issues;
}

function normalizeSlug(value:string){
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120).replace(/-+$/g,"");
}

function titleSimilarity(a:string,b:string){
  const left=titleTokens(a);
  const right=titleTokens(b);
  if(left.size===0||right.size===0)return 0;
  let overlap=0;
  for(const token of left)if(right.has(token))overlap+=1;
  return overlap/(left.size+right.size-overlap);
}

function titleTokens(value:string){
  return new Set(value.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}\s]/gu," ").split(/\s+/).map((token)=>token.trim()).filter((token)=>token.length>2));
}
