import type {NextRequest} from "next/server";
import {z} from "zod";
import {blogPostInputSchema} from "@platform/contracts";
import {
  assertPlatformOwnerConfigured,
  createAdminBlogPost,
  listAdminBlogPosts,
} from "@platform/server";
import {handleApiError, validationError} from "@/lib/api";

export const maxDuration = 120;

const articleSchema=z.object({
  title:z.string(),
  slug:z.string(),
  excerpt:z.string(),
  body:z.string(),
  seoTitle:z.string(),
  seoDescription:z.string(),
  tags:z.array(z.string()),
});

const generationSchema=z.object({
  primaryKeyword:z.string(),
  searchIntent:z.string(),
  article:articleSchema,
  notes:z.array(z.string()),
});

type Generated=z.infer<typeof generationSchema>;
type ExistingPost=Awaited<ReturnType<typeof listAdminBlogPosts>>[number];

const responseJsonSchema={
  type:"object",
  additionalProperties:false,
  properties:{
    primaryKeyword:{type:"string"},
    searchIntent:{type:"string"},
    article:{
      type:"object",
      additionalProperties:false,
      properties:{
        title:{type:"string"},
        slug:{type:"string"},
        excerpt:{type:"string"},
        body:{type:"string"},
        seoTitle:{type:"string"},
        seoDescription:{type:"string"},
        tags:{type:"array",minItems:3,maxItems:8,items:{type:"string"}},
      },
      required:["title","slug","excerpt","body","seoTitle","seoDescription","tags"],
    },
    notes:{type:"array",maxItems:8,items:{type:"string"}},
  },
  required:["primaryKeyword","searchIntent","article","notes"],
} as const;

const pillars=[
  {
    en:"Jordan Hotels & Stays",
    ar:"فنادق وإقامات الأردن",
    focus:"hotels, neighborhoods, stay planning, property comparisons, booking decisions, resort areas and accommodation intent",
  },
  {
    en:"Jordan Destination Guides",
    ar:"دليل وجهات الأردن",
    focus:"Amman, Aqaba, Petra, Wadi Rum, Dead Sea, Jerash, Madaba and other Jordan destinations with practical trip-planning intent",
  },
  {
    en:"Jordan Itineraries",
    ar:"برامج سياحية في الأردن",
    focus:"realistic Jordan itineraries, trip lengths, route planning, timing, traveler types and practical day-by-day decisions",
  },
  {
    en:"Jordan Transport & Car Rental",
    ar:"المواصلات وتأجير السيارات في الأردن",
    focus:"car rental, airport transport, intercity travel, driving, road-trip decisions and practical mobility questions",
  },
  {
    en:"Things to Do in Jordan",
    ar:"أماكن وأنشطة في الأردن",
    focus:"attractions, experiences, seasonal planning, family activities, couples, solo travelers and high-intent things-to-do searches",
  },
  {
    en:"Jordan Travel Planning",
    ar:"التخطيط للسفر إلى الأردن",
    focus:"practical Jordan travel planning, budgets, timing, packing, booking choices, common mistakes and first-time visitor questions",
  },
] as const;

export async function GET(request:NextRequest){
  try{
    const cronSecret=process.env.CRON_SECRET?.trim();
    const authorization=request.headers.get("authorization");
    if(!cronSecret)return Response.json({ok:false,error:"CRON_SECRET is not configured"},{status:503});
    if(authorization!==`Bearer ${cronSecret}`)return Response.json({ok:false,error:"Unauthorized"},{status:401});

    const apiKey=process.env.OPENAI_API_KEY?.trim();
    if(!apiKey)return Response.json({ok:false,error:"OPENAI_API_KEY is not configured"},{status:503});

    const owner=await assertPlatformOwnerConfigured();
    const posts=await listAdminBlogPosts(owner.id);
    const recentAutomated=posts.find((post)=>post.authorName==="HandMeKey SEO Engine"&&post.status==="PUBLISHED"&&post.publishedAt&&Date.now()-new Date(post.publishedAt).getTime()<50*60*1000);
    if(recentAutomated){
      return Response.json({ok:true,skipped:true,reason:"An automated article was already published in the last 50 minutes",article:{id:recentAutomated.id,slug:recentAutomated.slug,title:recentAutomated.title}},{status:200});
    }

    const hourSlot=Math.floor(Date.now()/3_600_000);
    const locale: "EN"|"AR"=hourSlot%2===0?"EN":"AR";
    const pillar=pillars[Math.floor(hourSlot/2)%pillars.length]!;
    const category=locale==="AR"?pillar.ar:pillar.en;
    const existing=posts.filter((post)=>post.locale===locale);
    const model=process.env.OPENAI_BLOG_MODEL?.trim()||"gpt-5.6-luna";

    let generated:Generated|null=null;
    let sources:string[]=[];
    let issues:string[]=["Initial generation not yet evaluated"];

    for(let attempt=1;attempt<=2;attempt+=1){
      const result=await generateArticle({
        apiKey,
        model,
        locale,
        category,
        focus:pillar.focus,
        existing,
        qualityFeedback:attempt===1?[]:issues,
      });
      generated=result.generated;
      sources=result.sources;
      issues=qualityIssues(generated,existing,sources);
      if(issues.length===0)break;
    }

    if(!generated)return Response.json({ok:false,error:"AI did not return an article"},{status:502});
    if(issues.length>0){
      console.warn("SEO hourly publisher rejected generated article",{issues,title:generated.article.title});
      return Response.json({ok:false,published:false,error:"Generated article did not meet publishing quality gates",issues},{status:422});
    }

    const candidate={
      locale,
      slug:normalizeSlug(generated.article.slug),
      title:generated.article.title.trim(),
      excerpt:generated.article.excerpt.trim(),
      body:generated.article.body.trim(),
      seoTitle:generated.article.seoTitle.trim(),
      seoDescription:generated.article.seoDescription.trim(),
      category,
      tags:[...new Set(generated.article.tags.map((tag)=>tag.trim()).filter(Boolean))].slice(0,8),
      coverImageUrl:"",
      coverImageAlt:"",
      featured:false,
      status:"PUBLISHED" as const,
      authorName:"HandMeKey SEO Engine",
    };

    const parsed=blogPostInputSchema.safeParse(candidate);
    if(!parsed.success)return validationError(parsed.error);

    const post=await createAdminBlogPost(owner.id,parsed.data);
    const publicUrl=`https://handmekey.com/blog/${locale.toLowerCase()}/${post.slug}`;
    console.info("SEO hourly publisher published article",{id:post.id,locale,slug:post.slug,primaryKeyword:generated.primaryKeyword,sourceCount:sources.length});

    return Response.json({
      ok:true,
      published:true,
      article:{id:post.id,title:post.title,slug:post.slug,locale:post.locale,category:post.category,url:publicUrl},
      primaryKeyword:generated.primaryKeyword,
      searchIntent:generated.searchIntent,
      sourceCount:sources.length,
      model,
    },{status:201});
  }catch(error){return handleApiError(error);}
}

async function generateArticle(input:{
  apiKey:string;
  model:string;
  locale:"EN"|"AR";
  category:string;
  focus:string;
  existing:ExistingPost[];
  qualityFeedback:string[];
}){
  const language=input.locale==="AR"?"Arabic":"English";
  const existingTitles=input.existing.slice(0,120).map((post)=>`- ${post.title} [${post.slug}]`).join("\n")||"- None yet";
  const feedback=input.qualityFeedback.length?`\nA previous attempt failed these hard quality checks. Rewrite from scratch and fix every item:\n${input.qualityFeedback.map((item)=>`- ${item}`).join("\n")}`:"";
  const instructions=[
    "You are the senior organic-search editor for HandMeKey, a Jordan travel marketplace covering stays, destinations, transportation and car rental.",
    `Write all reader-facing copy in ${language}.`,
    "Your job is not to fill a content calendar. Publish only material that deserves to rank because it answers the search intent more completely and practically than generic travel articles.",
    "Use web search before writing. Inspect current search results and favor trustworthy current sources, especially official or primary sources for changeable facts.",
    "Never invent prices, laws, opening hours, hotel policies, transport schedules, fees, availability, ratings, statistics, distances or safety claims.",
    "When a material fact cannot be verified, omit it rather than hedging with filler or leaving a warning in the article.",
    "Add decision-making value: concrete comparisons, who an option suits, tradeoffs, realistic examples, common mistakes, practical next steps and local context.",
    "Avoid keyword stuffing, repetitive intros, fake personal experience, empty superlatives, generic AI phrasing and paragraphs that only restate the heading.",
    "Use Markdown supported by the CMS: ## for H2, ### for H3, - for bullets, Markdown tables when genuinely useful, and **text** sparingly.",
    "Do not include a Markdown H1 because the CMS renders the article title separately.",
    "Target roughly 1,300-2,200 useful words with at least four substantial H2 sections plus a concise FAQ section.",
    "Answer the main query clearly in the opening 120 words.",
    "Use at least two natural internal Markdown links chosen only from these known HandMeKey routes: /search, /cars, /blog/en, /blog/ar. Never invent HandMeKey URLs or product capabilities.",
    "Mention HandMeKey sparingly and never claim inventory, guarantees, partnerships, verification or prices unless the prompt explicitly provides them.",
    "SEO title should be 30-65 characters where practical; SEO description 110-165 characters; excerpt 70-220 characters; use 3-8 specific tags.",
    "Use a concise lowercase English ASCII kebab-case slug even for Arabic content.",
    "The FAQ should answer real follow-up search intent, not repeat earlier paragraphs.",
    "Return notes only for non-blocking editorial observations. If research is insufficient for safe publication, say so in notes and the article will be rejected.",
  ].join("\n");

  const prompt=[
    "Create one complete publication-ready SEO article.",
    `Editorial pillar/category: ${input.category}`,
    `Current focus: ${input.focus}`,
    "Choose a distinct high-value primary keyword/search query with realistic organic potential for HandMeKey and clear traveler value.",
    "Do not translate, lightly rewrite, or duplicate any existing article listed below. Find a genuine content gap.",
    "Existing articles in this language:",
    existingTitles,
    "Use current web research to understand competing pages and traveler questions before selecting the angle.",
    "Return the selected primary keyword and search intent along with the finished article.",
    feedback,
  ].join("\n");

  const body={
    model:input.model,
    instructions,
    input:prompt,
    max_output_tokens:12000,
    reasoning:{effort:"medium"},
    store:false,
    tools:[{type:"web_search"}],
    include:["web_search_call.action.sources"],
    text:{
      verbosity:"high",
      format:{
        type:"json_schema",
        name:"handmekey_hourly_seo_article",
        strict:true,
        schema:responseJsonSchema,
      },
    },
  };

  const upstream=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{authorization:`Bearer ${input.apiKey}`,"content-type":"application/json"},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(105_000),
  });
  if(!upstream.ok){
    const raw=await upstream.text();
    console.error("SEO hourly OpenAI error",upstream.status,raw.slice(0,1200));
    throw new Error(`SEO generation upstream failed with status ${upstream.status}`);
  }

  const raw=await upstream.json() as unknown;
  const outputText=extractOutputText(raw);
  if(!outputText)throw new Error("SEO generation response did not contain output text");
  return {generated:generationSchema.parse(JSON.parse(outputText)),sources:collectSourceUrls(raw).slice(0,12)};
}

function qualityIssues(generated:Generated,existing:ExistingPost[],sources:string[]){
  const article=generated.article;
  const issues:string[]=[];
  const words=article.body.trim()?article.body.trim().split(/\s+/).length:0;
  const h2Count=article.body.match(/^##\s+/gm)?.length??0;
  const faqPresent=/^##\s+.*(?:FAQ|Frequently Asked|الأسئلة الشائعة|أسئلة شائعة).*$/im.test(article.body);
  const internalLinks=article.body.match(/\]\((?:https:\/\/handmekey\.com)?\/(?:search|cars|blog\/(?:en|ar))(?:[^)]*)\)/gi)?.length??0;
  const warningText=generated.notes.join(" ");
  const warningPresent=/(human review required|needs human review|verify before publishing|cannot verify|unverified|مراجعة بشرية مطلوبة|يجب التحقق قبل النشر|غير مؤكد)/i.test(warningText);
  const similarity=Math.max(0,...existing.map((post)=>titleSimilarity(article.title,post.title)));

  if(words<1100)issues.push(`Article is too shallow (${words} words; minimum 1100)`);
  if(h2Count<5)issues.push(`Article needs more useful structure (${h2Count} H2 sections; minimum 5 including FAQ)`);
  if(!faqPresent)issues.push("A concise FAQ section based on follow-up search intent is required");
  if(internalLinks<2)issues.push(`At least 2 valid HandMeKey internal links are required (${internalLinks} found)`);
  if(sources.length<2)issues.push(`Research must include at least 2 web sources (${sources.length} found)`);
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

function extractOutputText(value:unknown):string{
  if(!value||typeof value!=="object")return "";
  const root=value as {output?:unknown[];output_text?:unknown};
  if(typeof root.output_text==="string"&&root.output_text.trim())return root.output_text;
  for(const item of root.output??[]){
    if(!item||typeof item!=="object")continue;
    const content=(item as {content?:unknown[]}).content;
    if(!Array.isArray(content))continue;
    for(const part of content){
      if(part&&typeof part==="object"&&typeof (part as {text?:unknown}).text==="string")return (part as {text:string}).text;
    }
  }
  return "";
}

function collectSourceUrls(value:unknown){
  const urls=new Set<string>();
  const visit=(node:unknown,depth:number)=>{
    if(depth>9||node==null)return;
    if(Array.isArray(node)){for(const child of node)visit(child,depth+1);return;}
    if(typeof node!=="object")return;
    for(const [key,child] of Object.entries(node as Record<string,unknown>)){
      if(key==="url"&&typeof child==="string"&&/^https?:\/\//i.test(child))urls.add(child);
      else visit(child,depth+1);
    }
  };
  visit(value,0);
  return [...urls];
}
