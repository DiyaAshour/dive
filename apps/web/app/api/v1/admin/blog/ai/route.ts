import type {NextRequest} from "next/server";
import {z} from "zod";
import {handleApiError, validationError} from "@/lib/api";
import {requestAdminUser} from "@/lib/request-auth";

const actionSchema=z.enum(["IDEAS","DRAFT"]);
const inputSchema=z.object({
  action:actionSchema,
  locale:z.enum(["AR","EN"]),
  topic:z.string().trim().max(280).default(""),
  category:z.string().trim().max(60).default(""),
});

const ideaSchema=z.object({
  title:z.string(),
  keyword:z.string(),
  intent:z.string(),
  angle:z.string(),
});
const articleSchema=z.object({
  title:z.string(),
  slug:z.string(),
  excerpt:z.string(),
  body:z.string(),
  seoTitle:z.string(),
  seoDescription:z.string(),
  category:z.string(),
  tags:z.array(z.string()),
});
const outputSchema=z.object({
  ideas:z.array(ideaSchema),
  article:articleSchema,
  notes:z.array(z.string()),
});

type Input=z.infer<typeof inputSchema>;

const responseJsonSchema={
  type:"object",
  additionalProperties:false,
  properties:{
    ideas:{
      type:"array",
      maxItems:10,
      items:{
        type:"object",
        additionalProperties:false,
        properties:{
          title:{type:"string"},
          keyword:{type:"string"},
          intent:{type:"string"},
          angle:{type:"string"},
        },
        required:["title","keyword","intent","angle"],
      },
    },
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
        category:{type:"string"},
        tags:{type:"array",maxItems:12,items:{type:"string"}},
      },
      required:["title","slug","excerpt","body","seoTitle","seoDescription","category","tags"],
    },
    notes:{type:"array",maxItems:8,items:{type:"string"}},
  },
  required:["ideas","article","notes"],
} as const;

export async function POST(request:NextRequest){
  try{
    const user=await requestAdminUser(request);
    if(!user)return Response.json({data:null,error:{code:"UNAUTHORIZED",message:"Authentication required"}},{status:401});

    const parsed=inputSchema.safeParse(await request.json().catch(()=>null));
    if(!parsed.success)return validationError(parsed.error);

    const apiKey=process.env.OPENAI_API_KEY?.trim();
    if(!apiKey)return Response.json({data:null,error:{code:"AI_NOT_CONFIGURED",message:"OPENAI_API_KEY is not configured on the server."}},{status:503});

    const model=process.env.OPENAI_BLOG_MODEL?.trim()||"gpt-5.6-luna";
    const useWeb=true;
    const baseBody={
      model,
      instructions:systemInstructions(parsed.data.locale),
      input:buildPrompt(parsed.data),
      max_output_tokens:7000,
      reasoning:{effort:"low"},
      store:false,
      text:{
        verbosity:"medium",
        format:{
          type:"json_schema",
          name:"handmekey_blog_assistant",
          strict:true,
          schema:responseJsonSchema,
        },
      },
      ...(useWeb?{tools:[{type:"web_search"}],include:["web_search_call.action.sources"]}:{}),
    };

    let upstream=await callOpenAI(apiKey,baseBody);
    if(!upstream.ok&&upstream.status===400&&useWeb){
      const fallback={...baseBody} as Record<string,unknown>;
      delete fallback.tools;
      delete fallback.include;
      upstream=await callOpenAI(apiKey,fallback);
    }
    if(!upstream.ok){
      const raw=await upstream.text();
      console.error("Blog AI upstream error",upstream.status,raw.slice(0,1200));
      return Response.json({data:null,error:{code:"AI_UPSTREAM_ERROR",message:"The AI service could not generate content right now."}},{status:502});
    }

    const raw=await upstream.json() as unknown;
    const outputText=extractOutputText(raw);
    if(!outputText)throw new Error("AI response did not contain output text");
    const generated=outputSchema.parse(JSON.parse(outputText));
    const sources=collectSourceUrls(raw).slice(0,8);

    return Response.json({data:{...generated,sources,model},error:null},{status:200});
  }catch(error){return handleApiError(error);}
}

async function callOpenAI(apiKey:string,body:unknown){
  return fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json"},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(90_000),
  });
}

function systemInstructions(locale:"AR"|"EN"){
  const language=locale==="AR"?"Arabic":"English";
  return [
    "You are the senior SEO editor for HandMeKey, a car-rental comparison marketplace focused on useful travel and car-rental content.",
    `Write the reader-facing content in ${language}.`,
    "Prioritize genuinely useful, people-first information and clear search intent over keyword density.",
    "Never invent prices, laws, rental-company policies, availability, ratings, reviews, fees, market share, statistics, or safety claims.",
    "When a fact may change, use web research when available and phrase it carefully. If it cannot be verified, omit it or flag it in notes for human review.",
    "Do not pretend HandMeKey has inventory, partners, guarantees, verification, or features that are not explicitly provided in the prompt.",
    "Avoid filler, repetitive introductions, fake first-person experience, and obvious AI-style phrasing.",
    "The article body must use Markdown supported by the CMS: ## for H2, ### for H3, - for bullets, and **text** for emphasis.",
    "For a full draft, target roughly 900-1600 useful words, at least four H2 sections, practical guidance, and a concise FAQ when relevant.",
    "SEO title must be 30-65 characters where practical; SEO description 110-165 characters; excerpt 70-220 characters.",
    "Keep title <=140 characters, category <=60 characters, each tag <=50 characters, and use 3-8 specific tags.",
    "Return a concise lowercase English kebab-case slug even when the article language is Arabic.",
    "Do not include a Markdown H1 in body because the CMS renders the article title separately.",
  ].join("\n");
}

function buildPrompt(input:Input){
  const category=input.category|| (input.locale==="AR"?"أدلة تأجير السيارات":"Car Rental Guides");
  if(input.action==="IDEAS")return [
    "Task: discover 8 high-value article ideas for organic search.",
    "Focus on users who may rent a car in Jordan or need practical driving/travel guidance related to car rental.",
    "Mix commercial-investigation and informational intent. Avoid near-duplicate ideas.",
    input.topic?`Seed topic or direction: ${input.topic}`:"Seed topic: broad Jordan car-rental and road-trip opportunities.",
    `Preferred category: ${category}`,
    "Use current web research to improve relevance when available.",
    "Populate ideas. Leave every article string empty and article.tags empty. Put important editorial cautions in notes.",
  ].join("\n");

  return [
    "Task: create one complete, publication-quality SEO article draft.",
    `Topic / target query: ${input.topic||"Car rental in Jordan: a practical guide for travelers"}`,
    `Use this exact category: ${category}`,
    "Research the topic before writing when web search is available.",
    "Answer the query directly, add practical decision-making value, and make the article useful even if the reader never books.",
    "Mention HandMeKey only naturally and sparingly. Do not make unsupported claims about the platform.",
    "If legal, licensing, insurance, border-crossing, deposit, traffic-rule, price, or other changeable details are material, verify them or place a human-review warning in notes instead of guessing.",
    "Populate article and notes. Leave ideas as an empty array.",
  ].join("\n");
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
